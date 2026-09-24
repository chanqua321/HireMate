using APIs.Authorization;
using APIs.Extensions;
using Common;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.RateLimiting;
using HireMate.Modules.Onboarding.Storage;
using Microsoft.AspNetCore.HttpOverrides;
using System.Net;

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    if (IPAddress.TryParse(builder.Configuration["ReverseProxy:Address"], out var proxyAddress))
        options.KnownProxies.Add(proxyAddress);
});

// Production requires an explicitly configured persistent Linux volume.
var fileStorageProvider = builder.Configuration["FileStorage:Provider"];
var fileStorageRoot = builder.Configuration["FileStorage:RootPath"];
if (builder.Environment.IsProduction())
{
    if (!string.Equals(fileStorageProvider, "PersistentVolume", StringComparison.OrdinalIgnoreCase))
        throw new InvalidOperationException("Production requires FileStorage:Provider=PersistentVolume and a dedicated mount.");
    builder.Services.AddSingleton<IFileStorageService>(PersistentVolumeStorage.Create(
        fileStorageRoot, builder.Environment.ContentRootPath));
}
else
{
if (!builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing"))
    throw new InvalidOperationException("File storage is only configured for Development/Testing.");
if (!string.IsNullOrWhiteSpace(fileStorageProvider) && !fileStorageProvider.Equals("Local", StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException($"Unsupported FileStorage:Provider '{fileStorageProvider}'.");
if (string.IsNullOrWhiteSpace(fileStorageRoot))
    fileStorageRoot = Path.Combine(builder.Environment.ContentRootPath, "private-files");
if (!Path.IsPathFullyQualified(fileStorageRoot))
    fileStorageRoot = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, fileStorageRoot));
builder.Services.AddSingleton<IFileStorageService>(new LocalFileStorage(
    fileStorageRoot,
    Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads", "cv"),
    Path.Combine(builder.Environment.ContentRootPath, "private-uploads", "cv")));
}

// Cloud hosts (Render/Railway) inject PORT
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://*:{port}");

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
builder.Services.AddDbContext<HireMateContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddHireMateModules(builder.Configuration);

builder.Services.AddIdentity<UserAccount, Role>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequiredLength = 8;
    options.User.RequireUniqueEmail = true;
})
.AddEntityFrameworkStores<HireMateContext>()
.AddErrorDescriber<VietnameseIdentityErrorDescriber>()
.AddDefaultTokenProviders();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
        RoleClaimType = "role",
        NameClaimType = "email"
    };
    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var userId = context.Principal?.FindFirst("userId")?.Value
                ?? context.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                context.Fail("Token không hợp lệ.");
                return;
            }

            var userManager = context.HttpContext.RequestServices
                .GetRequiredService<UserManager<UserAccount>>();
            var user = await userManager.FindByIdAsync(userId);
            if (user == null || user.IsDeleted)
            {
                context.Fail("Tài khoản không tồn tại.");
                return;
            }

            if (userManager.SupportsUserLockout && await userManager.IsLockedOutAsync(user))
            {
                context.Fail("Tài khoản đã bị khóa.");
                return;
            }

            var dbRoles = (await userManager.GetRolesAsync(user))
                .Where(AppRoles.IsKnown)
                .ToList();
            if (dbRoles.Count == 0)
            {
                context.Fail("Tài khoản chưa được gán vai trò.");
                return;
            }

            // Luôn lấy role từ DB (không tin token cũ) — hạ quyền có hiệu lực ngay
            if (context.Principal?.Identity is ClaimsIdentity identity)
            {
                foreach (var c in identity.FindAll("role").ToList())
                    identity.RemoveClaim(c);
                foreach (var c in identity.FindAll(ClaimTypes.Role).ToList())
                    identity.RemoveClaim(c);
                foreach (var role in dbRoles)
                {
                    identity.AddClaim(new Claim("role", role));
                    identity.AddClaim(new Claim(ClaimTypes.Role, role));
                }
            }
        }
    };
});

builder.Services.AddHireMateAuthorization();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.PermitLimit = 20;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
        opt.AutoReplenishment = true;
    });
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.PermitLimit = 120;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
        opt.AutoReplenishment = true;
    });
    options.AddFixedWindowLimiter("public", opt =>
    {
        opt.PermitLimit = 60;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
        opt.AutoReplenishment = true;
    });
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 200,
                Window = TimeSpan.FromMinutes(1)
            }));
});

builder.Services.AddControllers(options =>
    options.Filters.Add<APIs.Filters.UnauthorizedAccessExceptionFilter>());
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(option =>
{
    option.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "HireMate API",
        Version = "v1",
        Description = "HireMate Backend - modular monolith (Identity, Onboarding, Interview, Billing, Career, .)"
    });
    option.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "JWT Bearer token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "Bearer"
    });
    option.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var corsOrigins = (builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .Where(origin => !string.IsNullOrWhiteSpace(origin)).ToArray();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowConfigured", policy =>
    {
        if (builder.Environment.IsDevelopment() && (corsOrigins.Length == 0 || corsOrigins.Contains("*")))
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        else if (corsOrigins.Length > 0 && !corsOrigins.Contains("*"))
            policy.WithOrigins(corsOrigins).AllowAnyMethod().AllowAnyHeader().AllowCredentials();
        else
            policy.SetIsOriginAllowed(_ => false);
    });
});

var app = builder.Build();
app.UseForwardedHeaders();

await DbSeeder.SeedAsync(app.Services, app.Environment.IsDevelopment());

if (builder.Configuration.GetValue("Swagger:Enabled", app.Environment.IsDevelopment()))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        // CV uploads must not be anonymously downloadable via /uploads/...
        var path = ctx.Context.Request.Path.Value ?? "";
        if (path.StartsWith("/uploads", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.StatusCode = StatusCodes.Status404NotFound;
            ctx.Context.Response.ContentLength = 0;
            ctx.Context.Response.Body = Stream.Null;
        }
    }
});
app.UseHttpsRedirection();
app.UseCors("AllowConfigured");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.Run();


using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using APIs.Authorization;
using APIs.Controllers.Admin;
using APIs.Controllers.Content;
using Common;
using Common.DTOs.PublicDto;
using HireMate.Modules.Admin.Abstractions;
using HireMate.Modules.Admin.Services;
using HireMate.Modules.Content.Abstractions;
using HireMate.Modules.Content.Services;
using HireMate.Modules.Onboarding.Storage;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

internal static class BlogSmoke
{
    internal static readonly Guid AdminId = Guid.Parse("8f2ea409-889d-490b-84ad-cf3bab21893e");
    public static async Task RunAsync(Action<bool, string> check)
    {
        var migration = new Infrastructure.Migrations.AddBlogPostManagementMetadata();
        var columns = migration.UpOperations.OfType<Microsoft.EntityFrameworkCore.Migrations.Operations.AddColumnOperation>().ToArray();
        check(columns.Length == 4 && columns.All(c => c.Table == "BlogPosts" && c.IsNullable), "Migration adds exactly four nullable Blog columns");
        check(!migration.UpOperations.Concat(migration.DownOperations).Any(o => o is Microsoft.EntityFrameworkCore.Migrations.Operations.DropTableOperation), "Migration never drops a table");
        check(migration.DownOperations.First() is Microsoft.EntityFrameworkCore.Migrations.Operations.SqlOperation guard && guard.Sql.Contains("THROW"), "Rollback refuses to fabricate publication timestamps");
        var root = Path.Combine(Path.GetTempPath(), "hiremate-blog-tests-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Testing" });
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddDbContext<HireMateContext>(o => o.UseSqlite($"Data Source={Path.Combine(root, "blog.db")}"));
        builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
        builder.Services.AddSingleton<IFileStorageService>(new LocalFileStorage(Path.Combine(root, "files"),
            Path.Combine(root, "wwwroot", "uploads", "cv"), Path.Combine(root, "legacy", "cv")));
        builder.Services.AddScoped<IAdminService>(sp => new AdminService(sp.GetRequiredService<IUnitOfWork>(), null!, null!, sp.GetRequiredService<IFileStorageService>()));
        builder.Services.AddScoped<IPublicContentService, PublicContentService>();
        builder.Services.AddControllers().AddApplicationPart(typeof(AdminController).Assembly).AddControllersAsServices();
        builder.Services.AddTransient(sp => new AdminController(sp.GetRequiredService<IAdminService>(), null!));
        builder.Services.AddAuthentication("BlogTest").AddScheme<AuthenticationSchemeOptions, BlogTestAuth>("BlogTest", _ => { });
        builder.Services.AddHireMateAuthorization();
        await using var app = builder.Build();
        app.UseAuthentication(); app.UseAuthorization(); app.MapControllers();
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HireMateContext>();
            await db.Database.EnsureCreatedAsync();
            db.Users.Add(new UserAccount { Id = AdminId, UserName = "blog-test", FullName = "Test Admin" });
            await db.SaveChangesAsync();
            var fk = db.Model.FindEntityType(typeof(BlogPost))!.GetForeignKeys().Single();
            check(fk.DeleteBehavior == DeleteBehavior.NoAction, "Blog author FK never cascades deletion");
        }
        await app.StartAsync();
        using var http = new HttpClient { BaseAddress = new Uri(app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single()) };
        http.DefaultRequestHeaders.Add("X-Blog-Test-Role", AppRoles.Admin);
        async Task<BlogReadDto> Read(HttpResponseMessage response)
        {
            var text = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode) throw new Exception($"Unexpected HTTP {(int)response.StatusCode}: {text}");
            using var doc = JsonDocument.Parse(text);
            return doc.RootElement.GetProperty("data").Deserialize<BlogReadDto>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        }
        BlogWriteDto Draft(string slug) => new() { Title = "  Mẹo trả lời phỏng vấn  ", Slug = slug, Tag = BlogContract.Categories[0] };
        async Task<int> Count()
        {
            using var scope = app.Services.CreateScope();
            return await scope.ServiceProvider.GetRequiredService<HireMateContext>().BlogPosts.CountAsync();
        }
        try
        {
            var create = await http.PostAsJsonAsync("/api/Admin/blog", new {
                title = "  Mẹo trả lời phỏng vấn  ", slug = "Mẹo Trả Lời", tag = BlogContract.Categories[0], summary = "", body = "", isPublished = false,
                authorId = Guid.NewGuid(), createdAt = "1999-01-01", updatedAt = "1999-01-01", coverImageKey = "C:/secret"
            });
            check(create.StatusCode == HttpStatusCode.Created, "Create draft returns 201");
            var draft = await Read(create);
            check(await Count() == 1 && draft.Slug == "meo-tra-loi" && draft.Title == "Mẹo trả lời phỏng vấn", "One draft; Vietnamese slug normalization and title trim");
            check(!draft.IsPublished && draft.PublishedAt == null && draft.CreatedAt != null && draft.UpdatedAt == draft.CreatedAt, "Draft lifecycle uses null publication date and server timestamps");
            using (var scope = app.Services.CreateScope())
            {
                var row = await scope.ServiceProvider.GetRequiredService<HireMateContext>().BlogPosts.SingleAsync();
                check(row.AuthorId == AdminId && row.CoverImageKey == null && row.CreatedAt!.Value.Year != 1999, "Forged author, timestamp and storage key ignored");
            }
            check((await http.GetAsync("/api/Blog/meo-tra-loi")).StatusCode == HttpStatusCode.NotFound, "Direct draft slug returns 404");
            check((await http.GetStringAsync("/api/Blog")).Contains("\"data\":[]"), "Public list excludes draft");
            check((await http.GetStringAsync("/api/Admin/blog")).Contains(draft.Id.ToString()), "Admin list includes draft");
            var duplicate = await http.PostAsJsonAsync("/api/Admin/blog", Draft("meo-tra-loi"));
            check(duplicate.StatusCode == HttpStatusCode.BadRequest && await Count() == 1, "Duplicate slug rejected without insert");
            var invalid = Draft("empty-title"); invalid.Title = "  ";
            check((await http.PostAsJsonAsync("/api/Admin/blog", invalid)).StatusCode == HttpStatusCode.BadRequest, "Empty title rejected");
            invalid = Draft("empty-content"); invalid.IsPublished = true;
            check((await http.PostAsJsonAsync("/api/Admin/blog", invalid)).StatusCode == HttpStatusCode.BadRequest, "Empty content cannot publish");
            invalid = Draft("invalid-category"); invalid.Tag = "unknown";
            check((await http.PostAsJsonAsync("/api/Admin/blog", invalid)).StatusCode == HttpStatusCode.BadRequest, "Invalid category rejected");
            var edit = Draft(draft.Slug); edit.IsPublished = true;
            edit.Body = "<script>window.pwned=1</script><img src=x onerror=alert(1)> javascript:alert(1)";
            var published = await Read(await http.PutAsJsonAsync($"/api/Admin/blog/{draft.Id}", edit));
            check(published.Id == draft.Id && await Count() == 1 && published.CreatedAt == draft.CreatedAt && published.UpdatedAt > draft.UpdatedAt, "Edit preserves ID/CreatedAt, changes UpdatedAt, no INSERT");
            check(published.PublishedAt != null && published.IsPublished, "First publish assigns publication date");
            var publicPost = await Read(await http.GetAsync($"/api/Blog/{draft.Slug}"));
            check(publicPost.Body == edit.Body, "XSS payload remains plain text contract, never interpreted as HTML by API");
            check((await http.GetStringAsync("/api/Blog")).Contains(draft.Slug), "Public list includes published article");
            var again = await Read(await http.PutAsJsonAsync($"/api/Admin/blog/{draft.Id}", edit));
            check(again.PublishedAt == published.PublishedAt, "Editing published article preserves publication date");
            using (var scope = app.Services.CreateScope())
                check((await scope.ServiceProvider.GetRequiredService<HireMateContext>().BlogPosts.SingleAsync()).AuthorId == AdminId, "Edit preserves author");
            var missing = await http.PutAsJsonAsync($"/api/Admin/blog/{Guid.NewGuid()}", edit);
            check(missing.StatusCode == HttpStatusCode.NotFound && await Count() == 1, "Edit missing ID returns 404 without INSERT");

            var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=");
            var jpeg = Convert.FromBase64String("/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDiKKKK9g8s/9k=");
            check(BlogCoverValidator.Extension(jpeg, "image/jpeg") == "jpg", "Valid JPEG header and dimensions accepted");
            check(BlogCoverValidator.Extension(png[..24], "image/png") == null, "Truncated image header rejected");
            var fakeJpeg = new byte[24]; fakeJpeg[0] = 255; fakeJpeg[1] = 216; fakeJpeg[2] = 255; fakeJpeg[^2] = 255; fakeJpeg[^1] = 217;
            check(BlogCoverValidator.Extension(fakeJpeg, "image/jpeg") == null, "JPEG magic bytes alone are insufficient");
            async Task<HttpResponseMessage> Upload(byte[] bytes, string type, string name)
            {
                using var form = new MultipartFormDataContent();
                var file = new ByteArrayContent(bytes); file.Headers.ContentType = new(type);
                form.Add(file, "file", name);
                return await http.PostAsync($"/api/Admin/blog/{draft.Id}/cover", form);
            }
            check((await Upload("<script>bad</script>"u8.ToArray(), "image/png", "fake.png")).StatusCode == HttpStatusCode.BadRequest, "Cover rejects renamed HTML file");
            check((await Upload(png, "image/svg+xml", "fake.svg")).StatusCode == HttpStatusCode.BadRequest, "Cover rejects unsupported MIME");
            check((await Upload(new byte[BlogCoverValidator.MaxBytes + 1], "image/png", "large.png")).StatusCode == HttpStatusCode.BadRequest, "Cover rejects over 5 MB");
            var withCover = await Read(await Upload(png, "image/png", "cover.png"));
            check(withCover.CoverUrl != null, "Valid PNG stored with derived cover URL");
            var image = await http.GetAsync($"/api/Blog/{draft.Slug}/cover");
            check(image.IsSuccessStatusCode && (await image.Content.ReadAsByteArrayAsync()).SequenceEqual(png) && image.Headers.Contains("X-Content-Type-Options"), "Published cover bytes persisted and served with nosniff");
            edit.IsPublished = false;
            var hidden = await Read(await http.PutAsJsonAsync($"/api/Admin/blog/{draft.Id}", edit));
            check(hidden.PublishedAt == null && (await http.GetAsync($"/api/Blog/{draft.Slug}")).StatusCode == HttpStatusCode.NotFound
                && (await http.GetAsync($"/api/Blog/{draft.Slug}/cover")).StatusCode == HttpStatusCode.NotFound, "Unpublish hides body and cover and clears publication date");
            edit.IsPublished = true;
            var republished = await Read(await http.PutAsJsonAsync($"/api/Admin/blog/{draft.Id}", edit));
            check(republished.PublishedAt > published.PublishedAt, "Republish starts new publication period");
            await Read(await Upload(png, "image/png", "replacement.png"));
            check(Directory.GetFiles(Path.Combine(root, "files"), "*", SearchOption.AllDirectories).Length == 1, "Replacing cover removes old stored file");
            await Read(await http.DeleteAsync($"/api/Admin/blog/{draft.Id}/cover"));
            check((await http.GetAsync($"/api/Blog/{draft.Slug}/cover")).StatusCode == HttpStatusCode.NotFound, "Remove cover persisted");

            http.DefaultRequestHeaders.Remove("X-Blog-Test-Role");
            http.DefaultRequestHeaders.Add("X-Blog-Test-Role", AppRoles.User);
            foreach (var (verb, route) in new[] {
                (HttpMethod.Get, "/api/Admin/blog"), (HttpMethod.Get, $"/api/Admin/blog/{draft.Id}"),
                (HttpMethod.Post, "/api/Admin/blog"), (HttpMethod.Put, $"/api/Admin/blog/{draft.Id}"),
                (HttpMethod.Delete, $"/api/Admin/blog/{draft.Id}"), (HttpMethod.Post, $"/api/Admin/blog/{draft.Id}/cover"),
                (HttpMethod.Delete, $"/api/Admin/blog/{draft.Id}/cover"), (HttpMethod.Get, $"/api/Admin/blog/{draft.Id}/cover") })
            {
                using var req = new HttpRequestMessage(verb, route) { Content = JsonContent.Create(edit) };
                if (verb == HttpMethod.Post && route.EndsWith("/cover"))
                {
                    req.Content.Dispose();
                    var form = new MultipartFormDataContent();
                    var file = new ByteArrayContent(png); file.Headers.ContentType = new("image/png");
                    form.Add(file, "file", "cover.png"); req.Content = form;
                }
                check((await http.SendAsync(req)).StatusCode == HttpStatusCode.Forbidden, $"Normal User gets 403: {verb} {route}");
            }
            http.DefaultRequestHeaders.Remove("X-Blog-Test-Role");
            check((await http.GetAsync("/api/Admin/blog")).StatusCode == HttpStatusCode.Unauthorized, "Anonymous admin request gets 401");
            check((await http.GetAsync($"/api/Blog/{draft.Slug}")).IsSuccessStatusCode, "Anonymous public request can read published article");
            http.DefaultRequestHeaders.Add("X-Blog-Test-Role", AppRoles.Admin);
            var requests = await Task.WhenAll(Enumerable.Range(0, 2).Select(_ => http.PostAsJsonAsync("/api/Admin/blog", Draft("double-submit"))));
            check(requests.Count(r => r.StatusCode == HttpStatusCode.Created) == 1 && requests.Count(r => r.StatusCode == HttpStatusCode.BadRequest) == 1 && await Count() == 2, "Concurrent duplicate submissions create exactly one row");
            var newPublished = Draft("created-published"); newPublished.IsPublished = true; newPublished.Body = "Content";
            check((await Read(await http.PostAsJsonAsync("/api/Admin/blog", newPublished))).IsPublished, "Create published article succeeds");
            await Read(await Upload(png, "image/png", "delete-cover.png"));
            check((await http.DeleteAsync($"/api/Admin/blog/{draft.Id}")).IsSuccessStatusCode && await Count() == 2, "Delete removes persisted row");
            check(Directory.GetFiles(Path.Combine(root, "files"), "*", SearchOption.AllDirectories).Length == 0, "Delete cleans up stored cover");
            check((await http.GetAsync($"/api/Admin/blog/{draft.Id}")).StatusCode == HttpStatusCode.NotFound, "Deleted admin detail returns 404");
        }
        finally
        {
            await app.StopAsync();
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            // Only the unique directory allocated by this test is removed.
            Directory.Delete(root, true);
        }
    }
}

internal sealed class BlogTestAuth(IOptionsMonitor<AuthenticationSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var role = Request.Headers["X-Blog-Test-Role"].ToString();
        if (role is not (AppRoles.Admin or AppRoles.User)) return Task.FromResult(AuthenticateResult.NoResult());
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, BlogSmoke.AdminId.ToString()), new Claim(ClaimTypes.Role, role)], Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name)));
    }
}

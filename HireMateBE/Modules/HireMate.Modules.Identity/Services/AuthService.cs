using HireMate.Modules.Ai;
using HireMate.Modules.Identity.Abstractions;
using HireMate.BuildingBlocks;

using Common;
using Common.DTOs.AuthDto;
using Google.Apis.Auth;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace HireMate.Modules.Identity.Services;

public class AuthService(
    UserManager<UserAccount> userManager,
    SignInManager<UserAccount> signInManager,
    IConfiguration configuration,
    IEmailService emailService,
    IWebHostEnvironment env,
    IUnitOfWork unitOfWork,
    IAiQuotaService aiQuota) : IAuthService
{
    private readonly UserManager<UserAccount> _userManager = userManager;
    private readonly SignInManager<UserAccount> _signInManager = signInManager;
    private readonly IConfiguration _configuration = configuration;
    private readonly IEmailService _emailService = emailService;
    private readonly IWebHostEnvironment _env = env;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly IAiQuotaService _aiQuota = aiQuota;

    private bool ExposeDevTokens =>
        string.Equals(_configuration["EmailSettings:ExposeDevTokens"], "true", StringComparison.OrdinalIgnoreCase);

    /// <summary>Demo: false = bỏ bước xác nhận email khi đăng ký/đăng nhập.</summary>
    private bool RequireEmailConfirmation =>
        !string.Equals(_configuration["EmailSettings:RequireEmailConfirmation"], "false", StringComparison.OrdinalIgnoreCase);

    public async Task<IServiceResult> RegisterAsync(RegisterDto dto)
    {
        var existing = await _userManager.FindByEmailAsync(dto.Email);
        if (existing != null)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Email đã được đăng ký");

        var skipConfirm = !RequireEmailConfirmation;
        var user = new UserAccount
        {
            Id = Guid.NewGuid(),
            UserName = dto.Email,
            Email = dto.Email,
            FullName = dto.FullName,
            EmailConfirmed = skipConfirm,
            OnboardingCompleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return new ServiceResult(Const.FAIL_CREATE_CODE, Const.FAIL_CREATE_MSG, result.Errors.Select(e => e.Description).ToList());

        var roleResult = await _userManager.AddToRoleAsync(user, "User");
        if (!roleResult.Succeeded)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Gán vai trò thất bại", roleResult.Errors.Select(e => e.Description).ToList());

        if (skipConfirm)
        {
            return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đăng ký thành công. Bạn có thể đăng nhập ngay.", new Dictionary<string, object?>
            {
                ["email"] = user.Email,
                ["emailConfirmed"] = true,
                ["requireEmailConfirmation"] = false,
                ["message"] = "Tài khoản đã sẵn sàng — bỏ qua xác thực email (demo)."
            });
        }

        var confirmLink = await SendConfirmEmailAsync(user);

        var data = new Dictionary<string, object?>
        {
            ["email"] = user.Email,
            ["emailConfirmed"] = false,
            ["requireEmailConfirmation"] = true,
            ["message"] = "Vui lòng kiểm tra hộp thư để xác nhận email trước khi đăng nhập."
        };
        if (ExposeDevTokens)
            data["confirmLinkDev"] = confirmLink;

        return new ServiceResult(Const.SUCCESS_CREATE_CODE,
            "Đăng ký thành công. Vui lòng xác nhận email trước khi đăng nhập.", data);
    }

    public async Task<IServiceResult> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.FAIL_READ_CODE, Const.INVALID_CREDENTIALS_MSG);

        if (await _userManager.IsLockedOutAsync(user))
            return new ServiceResult(Const.FAIL_READ_CODE, Const.ACCOUNT_LOCKED_MSG);

        if (!user.EmailConfirmed)
        {
            if (!RequireEmailConfirmation)
            {
                user.EmailConfirmed = true;
                user.UpdatedAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);
            }
            else
            {
                return new ServiceResult(Const.FAIL_READ_CODE, Const.EMAIL_NOT_CONFIRMED_MSG);
            }
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return new ServiceResult(Const.FAIL_READ_CODE, Const.ACCOUNT_LOCKED_MSG);
        if (!result.Succeeded)
            return new ServiceResult(Const.FAIL_READ_CODE, Const.INVALID_CREDENTIALS_MSG);

        user.LastLogin = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var auth = await IssueTokensAsync(user, null);
        return new ServiceResult(Const.SUCCESS_LOGIN_CODE, Const.SUCCESS_READ_MSG, auth);
    }

    public async Task<IServiceResult> LoginWithGoogleAsync(string idToken, string? ip)
    {
        var audiences = _configuration.GetSection("Authentication:Google:Audiences").Get<string[]>()?
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray() ?? [];

        var primaryClientId = _configuration["Authentication:Google:ClientId"]?.Trim();
        if (!string.IsNullOrWhiteSpace(primaryClientId) &&
            !audiences.Contains(primaryClientId, StringComparer.Ordinal))
        {
            audiences = [primaryClientId, .. audiences];
        }

        if (audiences.Length == 0)
            return new ServiceResult(Const.FAIL_READ_CODE, "Đăng nhập Google chưa được cấu hình. Vui lòng thiết lập Authentication:Google:ClientId.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = audiences
            });
        }
        catch (Exception ex)
        {
            string? tokenAud = null;
            try
            {
                var parts = idToken.Split('.');
                if (parts.Length >= 2)
                {
                    var json = Encoding.UTF8.GetString(Base64UrlDecode(parts[1]));
                    using var doc = System.Text.Json.JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("aud", out var audEl))
                        tokenAud = audEl.ValueKind == System.Text.Json.JsonValueKind.Array
                            ? string.Join(",", audEl.EnumerateArray().Select(x => x.GetString()))
                            : audEl.GetString();
                }
            }
            catch { /* ignore decode errors */ }

            var expected = string.Join(" | ", audiences);
            var detail = string.IsNullOrWhiteSpace(tokenAud)
                ? $"Mã Google idToken không hợp lệ ({ex.Message})"
                : $"Mã Google idToken không hợp lệ ({ex.Message}). Token aud={tokenAud}; BE expect={expected}";
            return new ServiceResult(Const.FAIL_READ_CODE, detail);
        }

        var email = payload.Email;
        if (string.IsNullOrWhiteSpace(email))
            return new ServiceResult(Const.FAIL_READ_CODE, "Tài khoản Google không có email");

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            user = new UserAccount
            {
                Id = Guid.NewGuid(),
                Email = email,
                UserName = email,
                FullName = payload.Name ?? email.Split('@')[0],
                EmailConfirmed = payload.EmailVerified,
                OnboardingCompleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var create = await _userManager.CreateAsync(user);
            if (!create.Succeeded)
                return new ServiceResult(Const.FAIL_CREATE_CODE, "Không thể tạo tài khoản từ Google", create.Errors.Select(e => e.Description).ToList());

            await _userManager.AddToRoleAsync(user, "User");
        }
        else if (user.IsDeleted)
        {
            return new ServiceResult(Const.FAIL_READ_CODE, "Tài khoản đã bị vô hiệu hóa");
        }
        else if (!user.EmailConfirmed && payload.EmailVerified)
        {
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);
        }

        if (!user.EmailConfirmed)
            return new ServiceResult(Const.FAIL_READ_CODE, "Email chưa được xác nhận");

        user.LastLogin = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var auth = await IssueTokensAsync(user, ip);
        return new ServiceResult(Const.SUCCESS_LOGIN_CODE, "Đăng nhập Google thành công", auth);
    }

    public async Task<IServiceResult> RefreshAsync(string refreshToken, string? ip)
    {
        var existing = await _unitOfWork.RefreshTokenRepository.GetQueryable()
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (existing == null || !existing.IsActive)
            return new ServiceResult(Const.FAIL_READ_CODE, "Refresh token không hợp lệ hoặc đã hết hạn");

        var user = await _userManager.FindByIdAsync(existing.UserId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.FAIL_READ_CODE, "Không tìm thấy người dùng");

        existing.RevokedAt = DateTime.UtcNow;
        var auth = await IssueTokensAsync(user, ip);
        existing.ReplacedByToken = auth.RefreshToken;
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_READ_CODE, "Làm mới token thành công", auth);
    }

    public async Task<IServiceResult> LogoutAsync(string refreshToken)
    {
        var existing = await _unitOfWork.RefreshTokenRepository.GetQueryable()
            .FirstOrDefaultAsync(t => t.Token == refreshToken);
        if (existing != null && existing.RevokedAt == null)
        {
            existing.RevokedAt = DateTime.UtcNow;
            await _unitOfWork.SaveChangesAsync();
        }
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đăng xuất thành công");
    }

    public async Task<IServiceResult> GetMeAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, Const.WARNING_NO_DATA_MSG);

        var roles = await _userManager.GetRolesAsync(user);
        var snap = await _aiQuota.GetSnapshotAsync(user);
        var planCode = snap.PlanCode;
        var hasCv = await _unitOfWork.CvDocumentRepository.GetQueryable().AsNoTracking()
            .AnyAsync(c => c.UserId == user.Id);
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new MeDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Roles = roles,
            OnboardingCompleted = user.OnboardingCompleted,
            IsPremium = user.IsPremium,
            CurrentPlanCode = planCode,
            PlanSelectedAt = user.PlanSelectedAt,
            HasSelectedPlan = user.PlanSelectedAt != null,
            HasCv = hasCv,
            MonthlyAiCharBudget = snap.MonthlyBudget,
            UsedAiChars = snap.UsedChars,
            RemainingAiChars = snap.MonthlyBudget <= 0 ? -1 : snap.RemainingChars,
            PlanExpiresAt = snap.PlanExpiresAt,
            PlanExpired = snap.IsExpired
        });
    }

    public async Task<IServiceResult> ConfirmEmailAsync(string userId, string token)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        if (user.EmailConfirmed)
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Email đã được xác nhận");

        var result = await _userManager.ConfirmEmailAsync(user, token);
        if (!result.Succeeded)
            result = await _userManager.ConfirmEmailAsync(user, Uri.UnescapeDataString(token));

        if (!result.Succeeded)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Mã xác nhận không hợp lệ hoặc đã hết hạn",
                result.Errors.Select(e => e.Description).ToList());

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Xác nhận email thành công. Bạn có thể đăng nhập ngay.");
    }

    public async Task<IServiceResult> ResendConfirmEmailAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.SUCCESS_READ_CODE, "Nếu email tồn tại, liên kết xác nhận đã được gửi.");

        if (user.EmailConfirmed)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Email đã được xác nhận");

        var link = await SendConfirmEmailAsync(user);
        if (ExposeDevTokens)
            return new ServiceResult(Const.SUCCESS_READ_CODE, "Đã gửi email xác nhận.", new { confirmLinkDev = link });
        return new ServiceResult(Const.SUCCESS_READ_CODE, "Đã gửi email xác nhận.");
    }

    public async Task<IServiceResult> ForgotPasswordAsync(string email)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.SUCCESS_READ_CODE, "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.");

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var encoded = Uri.EscapeDataString(token);
        var apiUrl = (_configuration["EmailSettings:ApiPublicUrl"] ?? "https://localhost:7080").TrimEnd('/');
        var frontUrl = (_configuration["EmailSettings:FrontendUrl"] ?? apiUrl).TrimEnd('/');
        var resetFrontLink = $"{frontUrl}/reset-password.html?email={Uri.EscapeDataString(user.Email!)}&token={encoded}";

        var tokenBlock = ExposeDevTokens
            ? $"<p>Token (Dev/Swagger):</p><p><code>{WebUtility.HtmlEncode(token)}</code></p>"
            : "";

        var html = $"""
            <p>Xin chào {WebUtility.HtmlEncode(user.FullName)},</p>
            <p>Bạn yêu cầu đặt lại mật khẩu HireMate.</p>
            <p><a href="{resetFrontLink}">Nhấn vào đây để đặt lại mật khẩu</a></p>
            {tokenBlock}
            <p>Nếu không phải bạn, hãy bỏ qua email này.</p>
            <p>— HireMate</p>
            """;

        await _emailService.SendAsync(user.Email!, "HireMate — Đặt lại mật khẩu", html);

        if (ExposeDevTokens)
            return new ServiceResult(Const.SUCCESS_READ_CODE, "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.",
                new { email = user.Email, resetToken = token, resetLink = resetFrontLink });

        return new ServiceResult(Const.SUCCESS_READ_CODE, "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.");
    }

    public async Task<IServiceResult> ResetPasswordAsync(string email, string token, string newPassword)
    {
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var result = await _userManager.ResetPasswordAsync(user, token, newPassword);
        if (!result.Succeeded)
            result = await _userManager.ResetPasswordAsync(user, Uri.UnescapeDataString(token), newPassword);

        if (!result.Succeeded)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Đặt lại mật khẩu thất bại", result.Errors.Select(e => e.Description).ToList());

        var tokens = await _unitOfWork.RefreshTokenRepository.GetQueryable()
            .Where(t => t.UserId == user.Id && t.RevokedAt == null).ToListAsync();
        foreach (var t in tokens)
            t.RevokedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đặt lại mật khẩu thành công");
    }

    private async Task<string> SendConfirmEmailAsync(UserAccount user)
    {
        var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        var encoded = Uri.EscapeDataString(token);
        var apiUrl = (_configuration["EmailSettings:ApiPublicUrl"] ?? "https://localhost:7080").TrimEnd('/');
        var link = $"{apiUrl}/api/Auth/confirm-email?userId={user.Id}&token={encoded}";

        var html = $"""
            <p>Xin chào {WebUtility.HtmlEncode(user.FullName)},</p>
            <p>Cảm ơn bạn đã đăng ký <b>HireMate</b>.</p>
            <p><a href="{link}">Nhấn vào đây để xác nhận email</a></p>
            <p>— HireMate</p>
            """;

        await _emailService.SendAsync(user.Email!, "HireMate — Xác nhận email", html);
        return link;
    }

    private async Task<AuthResponseDto> IssueTokensAsync(UserAccount user, string? ip)
    {
        var roles = await _userManager.GetRolesAsync(user);
        var claims = new List<Claim>
        {
            new("userId", user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new("email", user.Email ?? string.Empty),
            new("fullName", user.FullName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
            claims.Add(new Claim("role", role));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var accessMinutes = double.TryParse(_configuration["Jwt:AccessExpireMinutes"], out var m) ? m : 30;
        var refreshDays = double.TryParse(_configuration["Jwt:RefreshExpireDays"], out var d) ? d : 14;

        var jwt = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            expires: DateTime.UtcNow.AddMinutes(accessMinutes),
            claims: claims,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        var refresh = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = DateTime.UtcNow.AddDays(refreshDays),
            CreatedAt = DateTime.UtcNow,
            CreatedByIp = ip
        };
        await _unitOfWork.RefreshTokenRepository.CreateAsync(refresh);
        await _unitOfWork.SaveChangesAsync();

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(jwt),
            Expiration = jwt.ValidTo,
            RefreshToken = refresh.Token,
            RefreshExpiration = refresh.ExpiresAt,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Roles = roles,
            OnboardingCompleted = user.OnboardingCompleted,
            IsPremium = user.IsPremium
        };
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var s = input.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4)
        {
            case 2: s += "=="; break;
            case 3: s += "="; break;
        }
        return Convert.FromBase64String(s);
    }
}

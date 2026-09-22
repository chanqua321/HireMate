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
        if (AppRoles.IsSystemAdminEmail(dto.Email))
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "Không thể đăng ký bằng email quản trị. Vui lòng đăng nhập tài khoản Admin.");

        var existing = await _userManager.FindByEmailAsync(dto.Email);
        if (existing != null)
        {
            if (!existing.IsDeleted && !existing.EmailConfirmed && RequireEmailConfirmation
                && !AppRoles.IsSystemAdminEmail(existing.Email))
            {
                var otpPlainExisting = await IssueAndSendEmailOtpAsync(existing);
                var retryData = new Dictionary<string, object?>
                {
                    ["email"] = existing.Email,
                    ["emailConfirmed"] = false,
                    ["requireEmailConfirmation"] = true,
                    ["verifyOtp"] = true,
                    ["message"] = "Email đã đăng ký nhưng chưa xác nhận. Đã gửi lại mã OTP."
                };
                if (ExposeDevTokens)
                    retryData["otpDev"] = otpPlainExisting;

                return new ServiceResult(Const.SUCCESS_CREATE_CODE,
                    "Email chưa xác nhận. Vui lòng nhập mã OTP đã gửi lại.", retryData);
            }

            return new ServiceResult(Const.FAIL_CREATE_CODE, "Email đã được đăng ký");
        }

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

        var roleResult = await EnsureIdentityRolesAsync(user);
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

        var otpPlain = await IssueAndSendEmailOtpAsync(user);

        var data = new Dictionary<string, object?>
        {
            ["email"] = user.Email,
            ["emailConfirmed"] = false,
            ["requireEmailConfirmation"] = true,
            ["verifyOtp"] = true,
            ["message"] = "Vui lòng nhập mã OTP đã gửi tới email để xác nhận tài khoản."
        };
        if (ExposeDevTokens)
            data["otpDev"] = otpPlain;

        return new ServiceResult(Const.SUCCESS_CREATE_CODE,
            "Đăng ký thành công. Vui lòng nhập mã OTP gửi tới email.", data);
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
            // Admin hệ thống không dùng OTP — luôn coi email đã xác nhận
            if (AppRoles.IsSystemAdminEmail(user.Email) || !RequireEmailConfirmation)
            {
                user.EmailConfirmed = true;
                user.EmailOtpHash = null;
                user.EmailOtpExpiresAt = null;
                user.EmailOtpAttempts = 0;
                user.UpdatedAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);
            }
            else
            {
                return new ServiceResult(Const.FAIL_READ_CODE,
                    "Email chưa được xác nhận. Vui lòng nhập mã OTP đã gửi khi đăng ký.",
                    new Dictionary<string, object?>
                    {
                        ["requireOtp"] = true,
                        ["email"] = user.Email
                    });
            }
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return new ServiceResult(Const.FAIL_READ_CODE, Const.ACCOUNT_LOCKED_MSG);
        if (!result.Succeeded)
            return new ServiceResult(Const.FAIL_READ_CODE, Const.INVALID_CREDENTIALS_MSG);

        await EnsureIdentityRolesAsync(user);

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
        catch (Exception)
        {
            return new ServiceResult(Const.FAIL_READ_CODE, "Mã Google idToken không hợp lệ");
        }

        var email = payload.Email;
        if (string.IsNullOrWhiteSpace(email))
            return new ServiceResult(Const.FAIL_READ_CODE, "Tài khoản Google không có email");

        var googleName = ResolveGoogleDisplayName(payload, email);
        var googleAvatar = string.IsNullOrWhiteSpace(payload.Picture) ? null : payload.Picture.Trim();
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null)
        {
            // OTP chỉ áp dụng đăng ký email/mật khẩu — Google coi email đã xác thực
            user = new UserAccount
            {
                Id = Guid.NewGuid(),
                Email = email,
                UserName = email,
                FullName = googleName,
                AvatarUrl = googleAvatar,
                EmailConfirmed = true,
                OnboardingCompleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var create = await _userManager.CreateAsync(user);
            if (!create.Succeeded)
                return new ServiceResult(Const.FAIL_CREATE_CODE, "Không thể tạo tài khoản từ Google", create.Errors.Select(e => e.Description).ToList());

            await EnsureIdentityRolesAsync(user);
        }
        else if (user.IsDeleted)
        {
            return new ServiceResult(Const.FAIL_READ_CODE, "Tài khoản đã bị vô hiệu hóa");
        }

        // Google login không chạy OTP; nếu user chưa confirm (đăng ký form dở) thì xác nhận luôn qua Google
        if (!user.EmailConfirmed)
        {
            user.EmailConfirmed = true;
            user.EmailOtpHash = null;
            user.EmailOtpExpiresAt = null;
            user.EmailOtpAttempts = 0;
            user.UpdatedAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);
        }

        await EnsureIdentityRolesAsync(user);

        if (IsPlaceholderFullName(user.FullName, email))
            user.FullName = googleName;

        if (!string.IsNullOrWhiteSpace(googleAvatar))
            user.AvatarUrl = googleAvatar;

        var career = await _unitOfWork.CareerProfileRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.UserId == user.Id);
        HireMate.Modules.Onboarding.Services.OnboardingService.ClearAutoFilledDemo(career);

        user.LastLogin = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        await _unitOfWork.SaveChangesAsync();

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
            PlanExpired = snap.IsExpired,
            AvatarUrl = user.AvatarUrl
        });
    }

    public async Task<IServiceResult> VerifyEmailOtpAsync(string email, string otp)
    {
        if (AppRoles.IsSystemAdminEmail(email))
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "Tài khoản Admin không cần xác thực OTP. Vui lòng đăng nhập trực tiếp.");

        var user = await _userManager.FindByEmailAsync(email.Trim());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Mã OTP không hợp lệ hoặc đã hết hạn.");

        if (user.EmailConfirmed)
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Email đã được xác nhận. Bạn có thể đăng nhập.");

        if (user.EmailOtpAttempts >= 5)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Bạn đã nhập sai quá nhiều lần. Hãy yêu cầu gửi lại mã OTP.");

        if (string.IsNullOrWhiteSpace(user.EmailOtpHash) || user.EmailOtpExpiresAt == null || user.EmailOtpExpiresAt < DateTime.UtcNow)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Mã OTP đã hết hạn. Hãy yêu cầu gửi lại mã mới.");

        var incoming = (otp ?? string.Empty).Trim();
        if (incoming.Length != 6 || !incoming.All(char.IsDigit))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Mã OTP phải gồm 6 chữ số.");

        if (!string.Equals(user.EmailOtpHash, HashOtp(user.Id, incoming), StringComparison.OrdinalIgnoreCase))
        {
            user.EmailOtpAttempts += 1;
            user.UpdatedAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);
            var left = Math.Max(0, 5 - user.EmailOtpAttempts);
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                left > 0 ? $"Mã OTP không đúng. Còn {left} lần thử." : "Bạn đã nhập sai quá nhiều lần. Hãy gửi lại OTP.");
        }

        user.EmailConfirmed = true;
        user.EmailOtpHash = null;
        user.EmailOtpExpiresAt = null;
        user.EmailOtpAttempts = 0;
        user.EmailOtpSentAt = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Xác nhận email thành công. Bạn có thể đăng nhập ngay.");
    }

    public async Task<IServiceResult> ResendConfirmEmailAsync(string email)
    {
        if (AppRoles.IsSystemAdminEmail(email))
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "Tài khoản Admin không cần xác thực OTP. Vui lòng đăng nhập trực tiếp.");

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.SUCCESS_READ_CODE, "Nếu email tồn tại, mã OTP xác nhận đã được gửi.");

        if (user.EmailConfirmed)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Email đã được xác nhận");

        if (user.EmailOtpSentAt != null && user.EmailOtpSentAt > DateTime.UtcNow.AddSeconds(-60))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Vui lòng đợi khoảng 60 giây trước khi gửi lại OTP.");

        var otpPlain = await IssueAndSendEmailOtpAsync(user);
        if (ExposeDevTokens)
            return new ServiceResult(Const.SUCCESS_READ_CODE, "Đã gửi mã OTP xác nhận.", new { otpDev = otpPlain });
        return new ServiceResult(Const.SUCCESS_READ_CODE, "Đã gửi mã OTP xác nhận tới email.");
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

    private async Task<string> IssueAndSendEmailOtpAsync(UserAccount user)
    {
        var otp = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        user.EmailOtpHash = HashOtp(user.Id, otp);
        user.EmailOtpExpiresAt = DateTime.UtcNow.AddMinutes(10);
        user.EmailOtpAttempts = 0;
        user.EmailOtpSentAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var html = $"""
            <p>Xin chào {WebUtility.HtmlEncode(user.FullName)},</p>
            <p>Mã OTP xác nhận email HireMate của bạn là:</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:6px;">{otp}</p>
            <p>Mã có hiệu lực trong <b>10 phút</b>. Không chia sẻ mã này cho任何人.</p>
            <p>— HireMate</p>
            """;

        await _emailService.SendAsync(user.Email!, "HireMate — Mã OTP xác nhận email", html);
        return otp;
    }

    private static string HashOtp(Guid userId, string otp)
    {
        var raw = $"{userId:N}:{otp.Trim()}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
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
            IsPremium = user.IsPremium,
            AvatarUrl = user.AvatarUrl
        };
    }

    private async Task<IdentityResult> EnsureIdentityRolesAsync(UserAccount user)
    {
        var target = AppRoles.IsSystemAdminEmail(user.Email) ? AppRoles.Admin : AppRoles.User;
        var current = await _userManager.GetRolesAsync(user);
        if (current.Count == 1 && current.Contains(target))
            return IdentityResult.Success;

        if (current.Count > 0)
        {
            var removed = await _userManager.RemoveFromRolesAsync(user, current);
            if (!removed.Succeeded)
                return removed;
        }

        return await _userManager.AddToRoleAsync(user, target);
    }

    private static string ResolveGoogleDisplayName(GoogleJsonWebSignature.Payload payload, string email)
    {
        var name = payload.Name?.Trim();
        if (!string.IsNullOrWhiteSpace(name))
            return name;

        var given = payload.GivenName?.Trim();
        var family = payload.FamilyName?.Trim();
        var combined = string.Join(" ", new[] { given, family }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();
        if (!string.IsNullOrWhiteSpace(combined))
            return combined;

        var local = email.Split('@')[0]
            .Replace('.', ' ')
            .Replace('_', ' ')
            .Replace('-', ' ')
            .Trim();
        return string.IsNullOrWhiteSpace(local) ? email : local;
    }

    private static bool IsPlaceholderFullName(string? fullName, string email)
    {
        if (string.IsNullOrWhiteSpace(fullName))
            return true;

        var trimmed = fullName.Trim();
        string[] placeholders =
        [
            "Người dùng Google",
            "Người dùng",
            "Ứng viên",
            "Ứng viên HireMate"
        ];
        if (placeholders.Any(p => trimmed.Equals(p, StringComparison.OrdinalIgnoreCase)))
            return true;

        var local = email.Split('@')[0];
        return !string.IsNullOrWhiteSpace(local) && trimmed.Equals(local, StringComparison.OrdinalIgnoreCase);
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

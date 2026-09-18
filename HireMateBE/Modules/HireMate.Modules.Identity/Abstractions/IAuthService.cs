using HireMate.BuildingBlocks;
using Common.DTOs.AuthDto;

namespace HireMate.Modules.Identity.Abstractions;

public interface IAuthService
{
    Task<IServiceResult> RegisterAsync(RegisterDto dto);
    Task<IServiceResult> LoginAsync(LoginDto dto);
    Task<IServiceResult> GetMeAsync(Guid userId);
    Task<IServiceResult> ForgotPasswordAsync(string email);
    Task<IServiceResult> ResetPasswordAsync(string email, string token, string newPassword);
    Task<IServiceResult> ConfirmEmailAsync(string userId, string token);
    Task<IServiceResult> ResendConfirmEmailAsync(string email);
    Task<IServiceResult> RefreshAsync(string refreshToken, string? ip);
    Task<IServiceResult> LogoutAsync(string refreshToken);
    Task<IServiceResult> LoginWithGoogleAsync(string idToken, string? ip);
}


using HireMate.Modules.Identity.Abstractions;
using APIs;

using Common;
using Common.DTOs.AuthDto;
using Common.DTOs.PublicDto;
using Common.Helper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace APIs.Controllers.Identity;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController(IAuthService authService) : ControllerBase
{
    private readonly IAuthService _authService = authService;

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.RegisterAsync(dto);

        if (result.Status == Const.FAIL_CREATE_CODE)
            return BadRequest(new { message = result.Message, errors = result.Errors });

        return Created(string.Empty, new { data = result.Data, message = result.Message });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.LoginAsync(dto);

        if (result.Status == Const.FAIL_READ_CODE)
        {
            // Cần OTP → 200 (không 401) để FE nhảy /verify-otp, tránh đỏ console
            if (IsRequireOtpPayload(result.Data))
                return Ok(new { data = result.Data, message = result.Message });
            return Unauthorized(new { message = result.Message, data = result.Data });
        }

        return Ok(new { data = result.Data, message = result.Message });
    }

    [HttpPost("login-google")]
    [AllowAnonymous]
    public async Task<IActionResult> LoginGoogle([FromBody] GoogleLoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.IdToken))
            return BadRequest(new { message = "IdToken là bắt buộc" });

        var result = await _authService.LoginWithGoogleAsync(dto.IdToken, HttpContext.Connection.RemoteIpAddress?.ToString());
        if (result.Status == Const.FAIL_READ_CODE || result.Status == Const.FAIL_CREATE_CODE)
        {
            if (IsRequireOtpPayload(result.Data))
                return Ok(new { data = result.Data, message = result.Message });
            return Unauthorized(new { message = result.Message, data = result.Data, errors = result.Errors });
        }

        return Ok(new { data = result.Data, message = result.Message });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.RefreshToken))
            return BadRequest(new { message = "RefreshToken là bắt buộc" });

        var result = await _authService.RefreshAsync(dto.RefreshToken, HttpContext.Connection.RemoteIpAddress?.ToString());
        if (result.Status == Const.FAIL_READ_CODE)
            return Unauthorized(new { message = result.Message });

        return Ok(new { data = result.Data, message = result.Message });
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] LogoutRequestDto dto)
    {
        var result = await _authService.LogoutAsync(dto.RefreshToken ?? string.Empty);
        return Ok(new { message = result.Message });
    }

    [HttpPost("verify-otp")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyOtp([FromBody] VerifyEmailOtpDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.VerifyEmailOtpAsync(dto.Email, dto.Otp);
        if (result.Status < 0)
            return BadRequest(new { message = result.Message, errors = result.Errors });
        return Ok(new { message = result.Message, data = result.Data });
    }

    [HttpPost("resend-confirm-email")]
    [AllowAnonymous]
    public async Task<IActionResult> ResendConfirm([FromBody] ForgotPasswordDto dto)
    {
        var result = await _authService.ResendConfirmEmailAsync(dto.Email);
        if (result.Status == Const.FAIL_UPDATE_CODE)
            return BadRequest(new { message = result.Message });
        return Ok(new { data = result.Data, message = result.Message });
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        var result = await _authService.ForgotPasswordAsync(dto.Email);
        return Ok(new { data = result.Data, message = result.Message });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var result = await _authService.ResetPasswordAsync(dto.Email, dto.Token, dto.NewPassword);
        if (result.Status < 0)
            return BadRequest(new { message = result.Message, errors = result.Errors });
        return Ok(new { message = result.Message });
    }

    [HttpGet("me")]
    [Authorize(Policy = AppPolicies.Authenticated)]
    public async Task<IActionResult> Me()
        => this.FromService(await _authService.GetMeAsync(User.GetUserId()));

    private static bool IsRequireOtpPayload(object? data)
    {
        if (data is IDictionary<string, object?> typed)
        {
            return typed.TryGetValue("requireOtp", out var v) && v is true;
        }

        if (data is System.Collections.IDictionary dict)
        {
            foreach (System.Collections.DictionaryEntry entry in dict)
            {
                if (string.Equals(entry.Key?.ToString(), "requireOtp", StringComparison.OrdinalIgnoreCase)
                    && entry.Value is true)
                    return true;
            }
        }

        return false;
    }
}



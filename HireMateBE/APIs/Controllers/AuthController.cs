using BusinessLogic.IServices;
using Common;
using Common.DTOs.AuthDto;
using Common.DTOs.PublicDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace APIs.Controllers;

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
            return Unauthorized(new { message = result.Message });

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
            return Unauthorized(new { message = result.Message, errors = result.Errors });

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

    /// <summary>Click from email — returns simple HTML so browser works without FE.</summary>
    [HttpGet("confirm-email")]
    [AllowAnonymous]
    public async Task<IActionResult> ConfirmEmailGet([FromQuery] string userId, [FromQuery] string token)
    {
        var result = await _authService.ConfirmEmailAsync(userId, token);
        var ok = result.Status > 0;
        var html = $"""
            <!DOCTYPE html><html><head><meta charset="utf-8"><title>HireMate</title></head>
            <body style="font-family:sans-serif;max-width:520px;margin:40px auto;">
              <h1>{(ok ? "Email đã được xác nhận" : "Xác nhận thất bại")}</h1>
              <p>{System.Net.WebUtility.HtmlEncode(result.Message)}</p>
              <p><a href="/swagger">Back to Swagger</a></p>
            </body></html>
            """;
        return Content(html, "text/html");
    }

    [HttpPost("confirm-email")]
    [AllowAnonymous]
    public async Task<IActionResult> ConfirmEmailPost([FromQuery] string userId, [FromQuery] string token)
    {
        var result = await _authService.ConfirmEmailAsync(userId, token);
        if (result.Status < 0)
            return BadRequest(new { message = result.Message, errors = result.Errors });
        if (result.Status == Const.WARNING_NO_DATA_CODE)
            return NotFound(new { message = result.Message });
        return Ok(new { message = result.Message });
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
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var userIdClaim = User.FindFirstValue("userId")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });

        var result = await _authService.GetMeAsync(userId);

        if (result.Status == Const.WARNING_NO_DATA_CODE)
            return NotFound(new { message = result.Message });

        return Ok(new { data = result.Data, message = result.Message });
    }
}

using BusinessLogic.IServices;
using Common;
using Common.DTOs.OnboardingDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace APIs.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class OnboardingController(IOnboardingService onboardingService) : ControllerBase
{
    private readonly IOnboardingService _onboardingService = onboardingService;

    [HttpPut("goal")]
    public async Task<IActionResult> SaveGoal([FromBody] OnboardingGoalDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid token" });

        var result = await _onboardingService.SaveGoalAsync(userId, dto);
        return Map(result);
    }

    [HttpPut("personal")]
    public async Task<IActionResult> SavePersonal([FromBody] OnboardingPersonalDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid token" });

        var result = await _onboardingService.SavePersonalAsync(userId, dto);
        return Map(result);
    }

    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Invalid token" });

        var result = await _onboardingService.ConfirmAsync(userId);
        return Map(result);
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var claim = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return !string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out userId);
    }

    private IActionResult Map(BusinessLogic.Base.IServiceResult result)
    {
        if (result.Status == Const.WARNING_NO_DATA_CODE)
            return NotFound(new { message = result.Message });
        if (result.Status == Const.FAIL_UPDATE_CODE || result.Status == Const.FAIL_CREATE_CODE)
            return BadRequest(new { message = result.Message, errors = result.Errors });
        return Ok(new { data = result.Data, message = result.Message });
    }
}

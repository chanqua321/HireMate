using HireMate.Modules.Onboarding.Abstractions;
using APIs;

using Common;
using Common.DTOs.OnboardingDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Onboarding;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class OnboardingController(IOnboardingService onboardingService) : HireMateControllerBase
{
    [HttpGet("status")]
    public async Task<IActionResult> Status()
        => this.FromService(await onboardingService.GetStatusAsync(UserId));

    [HttpPut("goal")]
    public async Task<IActionResult> SaveGoal([FromBody] OnboardingGoalDto dto)
        => this.FromService(await onboardingService.SaveGoalAsync(UserId, dto));

    [HttpPut("personal")]
    public async Task<IActionResult> SavePersonal([FromBody] OnboardingPersonalDto dto)
        => this.FromService(await onboardingService.SavePersonalAsync(UserId, dto));

    [HttpPost("confirm")]
    public async Task<IActionResult> Confirm([FromBody] ConfirmOnboardingDto? dto)
        => this.FromService(await onboardingService.ConfirmAsync(UserId, dto));
}


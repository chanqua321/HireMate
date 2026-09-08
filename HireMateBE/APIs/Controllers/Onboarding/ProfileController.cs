using HireMate.Modules.Onboarding.Abstractions;
using APIs;

using Common;
using Common.DTOs.ProfileDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Onboarding;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class ProfileController(IProfileService profileService) : HireMateControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
        => this.FromService(await profileService.GetAsync(UserId));

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateProfileDto dto)
        => this.FromService(await profileService.UpdateAsync(UserId, dto));
}


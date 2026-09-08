using HireMate.Modules.Growth.Abstractions;
using APIs;

using Common;
using Common.DTOs.PublicDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Growth;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class ReferralController(IGrowthService svc) : HireMateControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> Me()
        => this.FromService(await svc.GetReferralAsync(UserId));

    [HttpPost("apply")]
    public async Task<IActionResult> Apply([FromBody] ApplyReferralDto dto)
        => this.FromService(await svc.ApplyReferralAsync(UserId, dto));
}


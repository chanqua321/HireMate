using HireMate.Modules.Growth.Abstractions;
using APIs;

using Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Growth;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class GamificationController(IGrowthService svc) : HireMateControllerBase
{
    [HttpGet("badges")]
    public async Task<IActionResult> Badges()
        => this.FromService(await svc.GetBadgesAsync(UserId));

    [HttpGet("leaderboard")]
    [AllowAnonymous]
    public async Task<IActionResult> Leaderboard()
        => this.FromService(await svc.GetLeaderboardAsync());
}


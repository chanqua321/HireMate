using HireMate.Modules.Career.Abstractions;
using APIs;

using Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Career;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class CareerController(ICareerOsService svc) : HireMateControllerBase
{
    [HttpGet("memory")]
    public async Task<IActionResult> Memory()
        => this.FromService(await svc.GetMemoryAsync(UserId));

    [HttpGet("profile")]
    public async Task<IActionResult> ProfileHub()
        => this.FromService(await svc.GetProfileHubAsync(UserId));

    [HttpGet("progress")]
    public async Task<IActionResult> Progress()
        => this.FromService(await svc.GetProgressAsync(UserId));

    [HttpGet("development")]
    public async Task<IActionResult> Development()
        => this.FromService(await svc.GetDevelopmentAsync(UserId));

    [HttpGet("path")]
    public async Task<IActionResult> Path()
        => this.FromService(await svc.GetPathAsync(UserId));

    [HttpGet("learning")]
    public async Task<IActionResult> Learning()
        => this.FromService(await svc.GetLearningAsync(UserId));
}


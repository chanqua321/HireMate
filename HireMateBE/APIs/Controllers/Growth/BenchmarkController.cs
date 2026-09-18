using HireMate.Modules.Growth.Abstractions;
using APIs;

using Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Growth;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class BenchmarkController(IGrowthService svc) : HireMateControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
        => this.FromService(await svc.GetBenchmarkAsync(UserId));
}


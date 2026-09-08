using HireMate.Modules.Onboarding.Abstractions;
using APIs;

using Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Onboarding;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class DashboardController(IDashboardService dashboardService) : HireMateControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
        => this.FromService(await dashboardService.GetAsync(UserId));
}


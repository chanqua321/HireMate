using BusinessLogic.IServices;
using Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace APIs.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    private readonly IDashboardService _dashboardService = dashboardService;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var claim = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(claim) || !Guid.TryParse(claim, out var userId))
            return Unauthorized(new { message = "Invalid token" });

        var result = await _dashboardService.GetAsync(userId);
        if (result.Status == Const.WARNING_NO_DATA_CODE)
            return NotFound(new { message = result.Message });
        return Ok(new { data = result.Data, message = result.Message });
    }
}

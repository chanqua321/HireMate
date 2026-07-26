using BusinessLogic.IServices;
using Common;
using Common.DTOs.ProfileDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace APIs.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ProfileController(IProfileService profileService) : ControllerBase
{
    private readonly IProfileService _profileService = profileService;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });

        var result = await _profileService.GetAsync(userId);
        if (result.Status == Const.WARNING_NO_DATA_CODE)
            return NotFound(new { message = result.Message });
        return Ok(new { data = result.Data, message = result.Message });
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] UpdateProfileDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });

        var result = await _profileService.UpdateAsync(userId, dto);
        if (result.Status == Const.WARNING_NO_DATA_CODE)
            return NotFound(new { message = result.Message });
        if (result.Status == Const.FAIL_UPDATE_CODE)
            return BadRequest(new { message = result.Message });
        return Ok(new { data = result.Data, message = result.Message });
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var claim = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return !string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out userId);
    }
}

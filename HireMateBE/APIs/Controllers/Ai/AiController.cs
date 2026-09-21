using HireMate.Modules.Ai;
using APIs;
using Common;
using Common.DTOs.AiDto;
using HireMate.BuildingBlocks;
using Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Ai;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class AiController(IAiTextAssistService assist, IAiQuotaService quota, UserManager<UserAccount> users) : HireMateControllerBase
{
    /// <summary>
    /// Hỗ trợ diễn đạt CV / dịch Anh↔Việt.
    /// mode: polish | expand | shorten | translate (+ targetLang vi|en)
    /// </summary>
    [HttpPost("assist")]
    public async Task<IActionResult> Assist([FromBody] AiTextAssistRequestDto dto)
        => this.FromService(await assist.AssistAsync(UserId, dto));

    /// <summary>Monthly feature quotas (Interview, CV Analysis, JD Match, CV/Email generation).</summary>
    [HttpGet("usage")]
    public async Task<IActionResult> Usage()
    {
        var user = await users.FindByIdAsync(UserId.ToString());
        if (user == null || user.IsDeleted)
            return this.FromService(new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng"));
        var data = await quota.GetUsageSummaryAsync(user);
        return this.FromService(new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data));
    }
}

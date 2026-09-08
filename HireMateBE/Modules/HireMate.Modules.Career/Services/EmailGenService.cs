using HireMate.BuildingBlocks;
using Common;
using Common.DTOs.PublicDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using HireMate.Modules.Career.Abstractions;
using HireMate.Modules.Ai;

namespace HireMate.Modules.Career.Services;

public class EmailGenService(IAiQuotaService aiQuota, UserManager<UserAccount> users) : IEmailGenService
{
    public async Task<IServiceResult> GenerateAsync(Guid userId, EmailGenerateDto dto)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng hoàn thiện hồ sơ (cần CV) trước.");
        var planBlock = await aiQuota.RequireActivePlanAsync(user, minRank: 1);
        if (planBlock != null)
            return planBlock;

        var system = "You write Vietnamese job application emails.";
        var userPrompt = $"Type={dto.Type}; Position={dto.Position}; Company={dto.Company}; Tone={dto.Tone}. Write the email body.";
        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var aiResult = await aiQuota.CompleteAndLogAsync(user, system, userPrompt, "email_gen");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            email = aiResult.Content,
            provider = aiResult.Provider,
            usedFallback = aiResult.UsedFallback
        });
    }
}



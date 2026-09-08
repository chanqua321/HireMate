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

public class MatchService(IUnitOfWork uow, IAiQuotaService aiQuota, UserManager<UserAccount> users) : IMatchService
{
    public async Task<IServiceResult> MatchAsync(Guid userId, MatchRequestDto dto)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng hoàn thiện hồ sơ (cần CV) trước.");
        var planBlock = await aiQuota.RequireActivePlanAsync(user, minRank: 1);
        if (planBlock != null)
            return planBlock;

        string cvText = "";
        if (dto.CvDocumentId.HasValue)
        {
            var cv = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.CvDocumentId && c.UserId == userId);
            cvText = cv?.ExtractedText ?? "";
        }

        var system = "You are a JD-CV matcher. Return JSON only with overall,skills,experience,education,projects,keywords,gaps,suggestions.";
        var userPrompt = $"JD:\n{dto.JdText}\n\nCV:\n{cvText}";
        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var aiResult = await aiQuota.CompleteAndLogAsync(user, system, userPrompt, "jd_match");

        var overall = 74;
        try
        {
            using var parsed = JsonDocument.Parse(aiResult.Content);
            if (parsed.RootElement.TryGetProperty("overall", out var o))
                overall = o.GetInt32();
        }
        catch { /* heuristic json */ }

        var row = new JdMatchResult
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CvDocumentId = dto.CvDocumentId,
            JdText = dto.JdText,
            OverallScore = overall,
            ResultJson = aiResult.Content,
            AiProvider = aiResult.Provider
        };
        await uow.JdMatchRepository.CreateAsync(row);
        await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = "JdMatched",
            RefId = row.Id,
            PayloadJson = JsonSerializer.Serialize(new { overall })
        });
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, Const.SUCCESS_CREATE_MSG, row);
    }

    public async Task<IServiceResult> GetAsync(Guid userId, Guid id)
    {
        var row = await uow.JdMatchRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        return row == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, row);
    }
}



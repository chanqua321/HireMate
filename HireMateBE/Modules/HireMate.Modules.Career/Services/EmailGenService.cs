using HireMate.BuildingBlocks;
using Common;
using Common.DTOs.PublicDto;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
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

        await aiQuota.RefreshExpiryAsync(user);

        var quotaCheck = await aiQuota.EnsureFeatureQuotaAsync(user, AiQuotaFeature.CvEmailGeneration);
        if (quotaCheck != null)
            return quotaCheck;

        if (string.IsNullOrWhiteSpace(dto.Position) || string.IsNullOrWhiteSpace(dto.Company))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Cần vị trí và tên công ty để tạo email.");

        var consumeBlock = await aiQuota.TryConsumeFeatureAsync(user, AiQuotaFeature.CvEmailGeneration);
        if (consumeBlock != null)
            return consumeBlock;

        try
        {
            var system = "You write Vietnamese job application emails.";
            var userPrompt = $"Type={dto.Type}; Position={dto.Position}; Company={dto.Company}; Tone={dto.Tone}. Write the email body.";
            var charBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
            if (charBlock != null)
            {
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvEmailGeneration);
                return charBlock;
            }

            var aiResult = await aiQuota.CompleteAndLogAsync(user, system, userPrompt, "email_gen");
            if (string.IsNullOrWhiteSpace(aiResult.Content) || aiResult.UsedFallback)
            {
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvEmailGeneration);
                return new ServiceResult(Const.FAIL_CREATE_CODE, "AI tạo email thất bại. Vui lòng thử lại (không trừ hạn mức).");
            }

            return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
            {
                email = aiResult.Content,
                provider = aiResult.Provider,
                usedFallback = aiResult.UsedFallback
            });
        }
        catch
        {
            await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvEmailGeneration);
            throw;
        }
    }
}

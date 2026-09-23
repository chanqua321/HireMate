using HireMate.BuildingBlocks;
using Common;
using Common.DTOs.JdDto;
using Common.DTOs.PublicDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using HireMate.Modules.Career.Abstractions;
using HireMate.Modules.Ai;
// OperationCvResolvePolicy: Explicit → ownership; null → Confirmed; else ACTIVE_CV_REQUIRED.

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

        await aiQuota.RefreshExpiryAsync(user);

        // Resolve JD ownership BEFORE quota — do not leak existence via quota errors.
        JobDescription? savedJd = null;
        string jdText;
        if (dto.JobDescriptionId.HasValue)
        {
            savedJd = await uow.JobDescriptionRepository.GetQueryable()
                .FirstOrDefaultAsync(j => j.Id == dto.JobDescriptionId && j.UserId == userId && !j.IsArchived);
            if (savedJd == null)
                return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy JD");
            jdText = savedJd.Content;
        }
        else
        {
            jdText = (dto.JdText ?? "").Trim();
        }

        if (string.IsNullOrWhiteSpace(jdText) || jdText.Length < 30)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "JD quá ngắn hoặc trống. Dán mô tả công việc đầy đủ hơn.");
        if (jdText.Length > 20000)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Nội dung JD vượt quá 20.000 ký tự.");

        var profile = await uow.CareerProfileRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        // Explicit → ownership (404, no Active fallback). Null → Confirmed only. Never latest/first.
        // Does not change ConfirmedCvDocumentId / IsConfirmed. Resolve BEFORE quota/AI.
        var outcome = OperationCvResolvePolicy.Decide(dto.CvDocumentId, profile?.ConfirmedCvDocumentId);
        CvDocument? cv = null;

        if (outcome == OperationCvResolveOutcome.ResolveExplicit)
        {
            cv = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.CvDocumentId && c.UserId == userId);
            if (OperationCvResolvePolicy.IsExplicitNotFound(dto.CvDocumentId, cv != null))
                return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");
        }
        else if (outcome == OperationCvResolveOutcome.ResolveActive)
        {
            cv = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == profile!.ConfirmedCvDocumentId && c.UserId == userId);
            if (cv == null)
            {
                return new ServiceResult(Const.FAIL_CREATE_CODE,
                    $"{OperationCvResolvePolicy.ActiveCvRequiredCode}: Hãy kích hoạt một CV trước khi so khớp JD.",
                    new { errorCode = OperationCvResolvePolicy.ActiveCvRequiredCode });
            }
        }
        else
        {
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                $"{OperationCvResolvePolicy.ActiveCvRequiredCode}: Hãy kích hoạt một CV trước khi so khớp JD.",
                new { errorCode = OperationCvResolvePolicy.ActiveCvRequiredCode });
        }

        if (cv is null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        if (string.IsNullOrWhiteSpace(cv.ExtractedText))
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "Cần CV đã có nội dung (Active CV hoặc chọn CV trong kho) để so khớp JD.");

        var quotaCheck = await aiQuota.EnsureFeatureQuotaAsync(user, AiQuotaFeature.JdMatch);
        if (quotaCheck != null)
            return quotaCheck;

        // Optionally persist pasted JD after ownership/quota checks (before consume).
        if (savedJd == null && dto.SaveJd)
        {
            savedJd = new JobDescription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = string.IsNullOrWhiteSpace(dto.JdTitle)
                    ? Truncate(jdText.Split('\n', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "JD đã lưu", 200)
                    : dto.JdTitle!.Trim(),
                Content = jdText,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await uow.JobDescriptionRepository.CreateAsync(savedJd);
            await uow.SaveChangesAsync();
        }

        var consumeBlock = await aiQuota.TryConsumeFeatureAsync(user, AiQuotaFeature.JdMatch);
        if (consumeBlock != null)
            return consumeBlock;

        try
        {
            var profileBrief = BuildCvBrief(profile, cv);
            var system =
                "You are a JD-CV matcher for Vietnamese fresher/junior candidates. Return ONE compact JSON object ONLY with keys: " +
                "overall (int 0-100), matchedSkills (string[]), missingSkills (string[] — use 'Not evidenced in CV: X' wording, " +
                "do NOT assert the candidate lacks the skill), experienceGaps (string[]), keywordGaps (string[] — JD keywords " +
                "not literally found; semantic equivalents may still be matchedSkills), strengths (string[]), recommendations (string[]). " +
                "Keyword gap ≠ skill deficiency. Max 5 short items per array. No markdown fences. Keep total under 1200 characters.";
            var userPrompt = $"JD:\n{Truncate(jdText, 12000)}\n\nCV structured:\n{profileBrief}\n\nCV text:\n{Truncate(cv.ExtractedText!, 8000)}";
            var charBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
            if (charBlock != null)
            {
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.JdMatch);
                return charBlock;
            }

            var aiResult = await aiQuota.CompleteAndLogAsync(user, system, userPrompt, "jd_match");

            if (string.IsNullOrWhiteSpace(aiResult.Content) || aiResult.UsedFallback)
            {
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.JdMatch);
                return new ServiceResult(Const.FAIL_CREATE_CODE, "AI so khớp thất bại. Vui lòng thử lại (không trừ hạn mức).");
            }

            var normalizedJson = ExtractJsonObject(aiResult.Content);
            if (normalizedJson == null)
            {
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.JdMatch);
                return new ServiceResult(Const.FAIL_CREATE_CODE, "AI không trả JSON hợp lệ. Vui lòng thử lại (không trừ hạn mức).");
            }

            int? overall = null;
            try
            {
                using var parsed = JsonDocument.Parse(normalizedJson);
                if (parsed.RootElement.TryGetProperty("overall", out var o) && o.TryGetInt32(out var score))
                    overall = Math.Clamp(score, 0, 100);
                else if (parsed.RootElement.TryGetProperty("overallScore", out var o2) && o2.TryGetInt32(out var score2))
                    overall = Math.Clamp(score2, 0, 100);
            }
            catch
            {
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.JdMatch);
                return new ServiceResult(Const.FAIL_CREATE_CODE, "AI JSON malformed. Vui lòng thử lại (không trừ hạn mức).");
            }

            if (overall is null)
            {
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.JdMatch);
                return new ServiceResult(Const.FAIL_CREATE_CODE, "AI không trả về điểm so khớp hợp lệ. Vui lòng thử lại.");
            }

            var row = new JdMatchResult
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CvDocumentId = cv.Id,
                JobDescriptionId = savedJd?.Id,
                JdText = jdText,
                OverallScore = overall.Value,
                ResultJson = normalizedJson,
                AiProvider = aiResult.Provider
            };
            await uow.JdMatchRepository.CreateAsync(row);
            await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                EventType = "JdMatched",
                RefId = row.Id,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    overall = overall.Value,
                    jobDescriptionId = savedJd?.Id,
                    cvDocumentId = cv.Id
                })
            });
            await uow.SaveChangesAsync();

            var dtoOut = MatchResultMapper.Map(row, savedJd?.Title, cv.FileName);
            return new ServiceResult(Const.SUCCESS_CREATE_CODE, Const.SUCCESS_CREATE_MSG, dtoOut);
        }
        catch
        {
            await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.JdMatch);
            throw;
        }
    }

    public async Task<IServiceResult> GetAsync(Guid userId, Guid id)
    {
        var row = await uow.JdMatchRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (row == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy");

        string? jdTitle = null;
        if (row.JobDescriptionId.HasValue)
        {
            jdTitle = await uow.JobDescriptionRepository.GetQueryable().AsNoTracking()
                .Where(j => j.Id == row.JobDescriptionId && j.UserId == userId)
                .Select(j => j.Title)
                .FirstOrDefaultAsync();
        }

        string? cvName = null;
        if (row.CvDocumentId.HasValue)
        {
            cvName = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .Where(c => c.Id == row.CvDocumentId && c.UserId == userId)
                .Select(c => c.DisplayName != null && c.DisplayName != "" ? c.DisplayName : c.FileName)
                .FirstOrDefaultAsync();
        }

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, MatchResultMapper.Map(row, jdTitle, cvName));
    }

    public async Task<IServiceResult> ListHistoryAsync(Guid userId)
    {
        var rows = await uow.JdMatchRepository.GetQueryable().AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(50)
            .ToListAsync();

        var jdIds = rows.Where(r => r.JobDescriptionId.HasValue).Select(r => r.JobDescriptionId!.Value).Distinct().ToList();
        var cvIds = rows.Where(r => r.CvDocumentId.HasValue).Select(r => r.CvDocumentId!.Value).Distinct().ToList();

        var jdTitles = await uow.JobDescriptionRepository.GetQueryable().AsNoTracking()
            .Where(j => j.UserId == userId && jdIds.Contains(j.Id))
            .Select(j => new { j.Id, j.Title })
            .ToListAsync();
        var cvNames = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .Where(c => c.UserId == userId && cvIds.Contains(c.Id))
            .Select(c => new
            {
                c.Id,
                Name = c.DisplayName != null && c.DisplayName != "" ? c.DisplayName : c.FileName
            })
            .ToListAsync();

        var jdMap = jdTitles.ToDictionary(x => x.Id, x => x.Title);
        var cvMap = cvNames.ToDictionary(x => x.Id, x => x.Name);

        var data = rows.Select(r => MatchResultMapper.Map(
            r,
            r.JobDescriptionId.HasValue ? jdMap.GetValueOrDefault(r.JobDescriptionId.Value) : null,
            r.CvDocumentId.HasValue ? cvMap.GetValueOrDefault(r.CvDocumentId.Value) : null)).ToList();

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data);
    }

    private static string BuildCvBrief(CareerProfile? profile, CvDocument cv)
    {
        return JsonSerializer.Serialize(new
        {
            fileName = cv.FileName,
            displayName = string.IsNullOrWhiteSpace(cv.DisplayName) ? cv.FileName : cv.DisplayName,
            readiness = cv.ReadinessScore,
            skills = profile?.SkillsJson,
            experienceLevel = profile?.ExperienceLevel,
            desiredPosition = profile?.DesiredPosition,
            university = profile?.University,
            major = profile?.Major
        });
    }

    private static string? ExtractJsonObject(string content)
    {
        var t = content.Trim();
        var start = t.IndexOf('{');
        var end = t.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        var slice = t[start..(end + 1)];
        try
        {
            using var _ = JsonDocument.Parse(slice);
            return slice;
        }
        catch { return null; }
    }

    private static string Truncate(string s, int max)
        => string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s[..max]);
}

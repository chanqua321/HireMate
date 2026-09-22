using HireMate.Modules.Platform.Abstractions;
using HireMate.Modules.Ai;
using HireMate.BuildingBlocks;
using Common;
using Common.DTOs.AiDto;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HireMate.Modules.Ai;

public sealed class AiQuotaSnapshot
{
    public string PlanCode { get; init; } = "free";
    public int MaxOutputChars { get; init; } = 1400;
    public int MonthlyBudget { get; init; }
    public int UsedChars { get; init; }
    public int RemainingChars { get; init; }
    public DateTime PeriodStart { get; init; }
    public DateTime? PlanExpiresAt { get; init; }
    public bool IsExpired { get; init; }
}

public interface IAiQuotaService
{
    /// <summary>Demote expired paid plans to Free. Call before reading entitlements.</summary>
    Task RefreshExpiryAsync(UserAccount user);

    /// <summary>Effective plan after RefreshExpiry (source of truth for quotas).</summary>
    Task<string> GetEffectivePlanCodeAsync(UserAccount user);

    /// <summary>Voice allowed when effective plan is paid (premium / combo).</summary>
    Task<bool> IsVoiceAllowedAsync(UserAccount user);

    Task<AiQuotaSnapshot> GetSnapshotAsync(UserAccount user);
    Task<IServiceResult?> EnsureCanCallAsync(UserAccount user, int estimatedInputChars);
    /// <summary>Chặn tính năng trả phí khi gói hết hạn hoặc chưa nâng cấp.</summary>
    Task<IServiceResult?> RequireActivePlanAsync(UserAccount user, int minRank = 1);
    Task<AiCompletionResult> CompleteAndLogAsync(
        UserAccount user,
        string systemPrompt,
        string userPrompt,
        string kind,
        Guid? refId = null,
        string settingKey = SettingKeys.AiMaxOutputChars);

    /// <summary>UTC calendar month key shared by all feature quotas (yyyy-MM).</summary>
    string CurrentPeriodKey();

    Task<FeatureQuotaDto> GetFeatureQuotaAsync(UserAccount user, string feature);
    Task<QuotaUsageDto> GetUsageSummaryAsync(UserAccount user);

    /// <summary>Check only — does not consume.</summary>
    Task<IServiceResult?> EnsureFeatureQuotaAsync(UserAccount user, string feature);

    /// <summary>
    /// Atomic reserve (+1) if Used &lt; Limit. Call before AI; Release on failure.
    /// </summary>
    Task<IServiceResult?> TryConsumeFeatureAsync(UserAccount user, string feature);

    /// <summary>Rollback one reserved unit after failed AI / validation.</summary>
    Task ReleaseFeatureAsync(UserAccount user, string feature);
}

public class AiQuotaService(
    IUnitOfWork uow,
    HireMateContext db,
    IAiClient ai,
    ISystemConfigService config,
    UserManager<UserAccount> users) : IAiQuotaService
{
    public string CurrentPeriodKey()
    {
        var now = DateTime.UtcNow;
        return $"{now:yyyy-MM}";
    }

    public async Task RefreshExpiryAsync(UserAccount user)
    {
        var code = user.CurrentPlanCode?.Trim().ToLowerInvariant() ?? "free";
        if (PlanTier.Rank(code) == 0)
            return;

        var lastPaid = await uow.InvoiceRepository.GetQueryable().AsNoTracking()
            .Include(i => i.Plan)
            .Where(i => i.UserId == user.Id && i.Status == InvoiceStatuses.Paid && i.AmountVnd > 0)
            .OrderByDescending(i => i.PaidAt ?? i.CreatedAt)
            .FirstOrDefaultAsync();
        if (lastPaid?.PaidAt == null || lastPaid.Plan == null)
        {
            // Paid flag without paid invoice → Free
            user.CurrentPlanCode = "free";
            user.IsPremium = false;
            user.UpdatedAt = DateTime.UtcNow;
            await users.UpdateAsync(user);
            return;
        }

        var expires = lastPaid.PaidAt.Value.AddDays(Math.Max(1, lastPaid.Plan.DurationDays));
        if (expires > DateTime.UtcNow)
            return;

        // Hết kỳ → về free; giữ PlanSelectedAt để Free vẫn Interview theo quota (không bắt chọn gói lại)
        user.CurrentPlanCode = "free";
        user.IsPremium = false;
        user.PlanSelectedAt ??= DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
        await users.UpdateAsync(user);
    }

    public async Task<string> GetEffectivePlanCodeAsync(UserAccount user)
    {
        await RefreshExpiryAsync(user);
        return PlanTier.Normalize(user.CurrentPlanCode);
    }

    public async Task<bool> IsVoiceAllowedAsync(UserAccount user)
    {
        var plan = await GetEffectivePlanCodeAsync(user);
        return PlanTier.IsVoiceAllowed(plan);
    }

    public async Task<AiQuotaSnapshot> GetSnapshotAsync(UserAccount user)
    {
        await RefreshExpiryAsync(user);
        var rawCode = user.CurrentPlanCode?.Trim().ToLowerInvariant() ?? "free";
        var code = PlanTier.Normalize(rawCode);
        var plan = await uow.PlanRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(p => p.Code == rawCode)
            ?? await uow.PlanRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(p => p.Code == code);
        var globalMax = await config.GetIntAsync(SettingKeys.AiMaxOutputChars, 1400);
        var planMax = plan is { MaxAiOutputChars: > 0 } ? plan.MaxAiOutputChars : globalMax;
        var maxOut = Math.Min(globalMax, planMax);
        var budget = plan?.MonthlyAiCharBudget ?? 0;

        var (periodStart, expires) = await ResolvePeriodAsync(user);
        var used = await SumUsedCharsAsync(user.Id, periodStart);
        var remaining = budget <= 0 ? int.MaxValue : Math.Max(0, budget - used);
        var isExpired = expires != null && expires <= DateTime.UtcNow && PlanTier.Rank(rawCode) == 0;

        return new AiQuotaSnapshot
        {
            PlanCode = rawCode,
            MaxOutputChars = maxOut,
            MonthlyBudget = budget,
            UsedChars = used,
            RemainingChars = remaining,
            PeriodStart = periodStart,
            PlanExpiresAt = expires,
            IsExpired = isExpired
        };
    }

    public async Task<IServiceResult?> RequireActivePlanAsync(UserAccount user, int minRank = 1)
    {
        var snap = await GetSnapshotAsync(user);
        var rank = PlanTier.Rank(snap.PlanCode);
        if (rank >= minRank)
            return null;

        if (snap.IsExpired || (snap.PlanExpiresAt != null && snap.PlanExpiresAt <= DateTime.UtcNow))
        {
            return new ServiceResult(Const.FAIL_QUOTA_CODE,
                "Gói của bạn đã hết hạn. Vui lòng gia hạn hoặc nâng cấp gói mới để tiếp tục sử dụng.");
        }

        return new ServiceResult(Const.FAIL_QUOTA_CODE,
            minRank >= 2
                ? "Tính năng này chỉ dành cho gói Cao cấp."
                : "Tính năng này chỉ dành cho gói Tiêu chuẩn và Cao cấp.");
    }

    public async Task<IServiceResult?> EnsureCanCallAsync(UserAccount user, int estimatedInputChars)
    {
        var snap = await GetSnapshotAsync(user);
        if (snap.MonthlyBudget <= 0)
            return null;
        var estimate = estimatedInputChars + snap.MaxOutputChars;
        if (snap.UsedChars + estimate <= snap.MonthlyBudget)
            return null;
        return new ServiceResult(Const.FAIL_QUOTA_CODE,
            "Đã hết hạn mức ký tự AI của gói trong chu kỳ này. Nâng cấp gói hoặc đợi chu kỳ mới.");
    }

    public async Task<AiCompletionResult> CompleteAndLogAsync(
        UserAccount user,
        string systemPrompt,
        string userPrompt,
        string kind,
        Guid? refId = null,
        string settingKey = SettingKeys.AiMaxOutputChars)
    {
        var snap = await GetSnapshotAsync(user);
        var kindMax = await config.GetIntAsync(settingKey, snap.MaxOutputChars);
        var maxOut = Math.Min(snap.MaxOutputChars, kindMax);
        var result = await ai.CompleteAsync(systemPrompt, userPrompt, maxOutputChars: maxOut);

        // Chỉ ghi AiUsage khi có kết quả hợp lệ — failed AI không trừ char budget
        if (!string.IsNullOrWhiteSpace(result.Content) && !result.UsedFallback)
        {
            await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                EventType = "AiUsage",
                RefId = refId,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    kind,
                    inputChars = result.InputChars,
                    outputChars = result.OutputChars,
                    provider = result.Provider
                })
            });
            await uow.SaveChangesAsync();
        }

        return result;
    }

    public async Task<FeatureQuotaDto> GetFeatureQuotaAsync(UserAccount user, string feature)
    {
        await RefreshExpiryAsync(user);
        var limit = ResolveLimit(user.CurrentPlanCode, feature);
        var used = await GetUsedCountAsync(user, feature);
        var remaining = Math.Max(0, limit - used);
        return new FeatureQuotaDto
        {
            Used = used,
            Limit = limit,
            Remaining = remaining,
            Allowed = used < limit
        };
    }

    public async Task<QuotaUsageDto> GetUsageSummaryAsync(UserAccount user)
    {
        await RefreshExpiryAsync(user);
        var interview = await GetFeatureQuotaAsync(user, AiQuotaFeature.Interview);
        var cv = await GetFeatureQuotaAsync(user, AiQuotaFeature.CvAnalysis);
        var jd = await GetFeatureQuotaAsync(user, AiQuotaFeature.JdMatch);
        var email = await GetFeatureQuotaAsync(user, AiQuotaFeature.CvEmailGeneration);
        return new QuotaUsageDto
        {
            PlanCode = PlanTier.Normalize(user.CurrentPlanCode),
            Period = CurrentPeriodKey(),
            Interview = interview,
            CvAnalysis = cv,
            JdMatch = jd,
            CvEmailGeneration = email
        };
    }

    public async Task<IServiceResult?> EnsureFeatureQuotaAsync(UserAccount user, string feature)
    {
        var q = await GetFeatureQuotaAsync(user, feature);
        if (q.Limit <= 0)
            return new ServiceResult(Const.FAIL_QUOTA_CODE,
                FeatureBlockedMessage(feature, user.CurrentPlanCode));
        if (q.Used >= q.Limit)
            return new ServiceResult(Const.FAIL_QUOTA_CODE,
                FeatureExceededMessage(feature, q.Limit, user.CurrentPlanCode));
        return null;
    }

    public async Task<IServiceResult?> TryConsumeFeatureAsync(UserAccount user, string feature)
    {
        await RefreshExpiryAsync(user);
        var limit = ResolveLimit(user.CurrentPlanCode, feature);
        if (limit <= 0)
            return new ServiceResult(Const.FAIL_QUOTA_CODE,
                FeatureBlockedMessage(feature, user.CurrentPlanCode));

        var period = CurrentPeriodKey();
        await EnsureUsageRowAsync(user.Id, feature, period);

        // Atomic: only increment when Used < Limit (concurrency-safe)
        var now = DateTime.UtcNow;
        var affected = await db.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE UserFeatureUsages
SET Used = Used + 1, UpdatedAt = {now}
WHERE UserId = {user.Id} AND Feature = {feature} AND Period = {period} AND Used < {limit}");

        if (affected == 0)
            return new ServiceResult(Const.FAIL_QUOTA_CODE,
                FeatureExceededMessage(feature, limit, user.CurrentPlanCode));

        return null;
    }

    public async Task ReleaseFeatureAsync(UserAccount user, string feature)
    {
        var period = CurrentPeriodKey();
        var now = DateTime.UtcNow;
        await db.Database.ExecuteSqlInterpolatedAsync($@"
UPDATE UserFeatureUsages
SET Used = CASE WHEN Used > 0 THEN Used - 1 ELSE 0 END, UpdatedAt = {now}
WHERE UserId = {user.Id} AND Feature = {feature} AND Period = {period}");
    }

    private async Task EnsureUsageRowAsync(Guid userId, string feature, string period)
    {
        var exists = await db.UserFeatureUsages.AsNoTracking()
            .AnyAsync(x => x.UserId == userId && x.Feature == feature && x.Period == period);
        if (exists) return;

        var seed = await SeedUsedFromDomainAsync(userId, feature, period);
        try
        {
            db.UserFeatureUsages.Add(new UserFeatureUsage
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Feature = feature,
                Period = period,
                Used = seed,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Race: unique index — another request created the row
            db.ChangeTracker.Clear();
        }
    }

    private async Task<int> SeedUsedFromDomainAsync(Guid userId, string feature, string period)
    {
        var start = PeriodStartUtc(period);
        return feature switch
        {
            AiQuotaFeature.JdMatch => await uow.JdMatchRepository.GetQueryable().AsNoTracking()
                .CountAsync(x => x.UserId == userId && x.CreatedAt >= start),
            AiQuotaFeature.Interview => await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
                .CountAsync(s => s.UserId == userId && s.StartedAt >= start
                    && (s.VoiceStartedAt != null || s.Mode != "Voice")),
            AiQuotaFeature.CvAnalysis => await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .CountAsync(c => c.UserId == userId && c.ParseSucceeded && c.AnalyzedAt != null && c.AnalyzedAt >= start),
            _ => 0
        };
    }

    private async Task<int> GetUsedCountAsync(UserAccount user, string feature)
    {
        // Interview + CvAnalysis: keep existing domain counters as source of truth (no double table write yet)
        var start = PeriodStartUtc(CurrentPeriodKey());
        if (feature == AiQuotaFeature.Interview)
        {
            return await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
                .CountAsync(s => s.UserId == user.Id && s.StartedAt >= start
                    && (s.VoiceStartedAt != null || s.Mode != "Voice"));
        }

        if (feature == AiQuotaFeature.CvAnalysis)
        {
            return await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .CountAsync(c => c.UserId == user.Id && c.ParseSucceeded && c.AnalyzedAt != null && c.AnalyzedAt >= start);
        }

        var period = CurrentPeriodKey();
        await EnsureUsageRowAsync(user.Id, feature, period);
        return await db.UserFeatureUsages.AsNoTracking()
            .Where(x => x.UserId == user.Id && x.Feature == feature && x.Period == period)
            .Select(x => x.Used)
            .FirstOrDefaultAsync();
    }

    private static int ResolveLimit(string? planCode, string feature) => feature switch
    {
        AiQuotaFeature.Interview => PlanTier.MonthlyInterviewSessions(planCode),
        AiQuotaFeature.CvAnalysis => PlanTier.MonthlyCvAnalyzeLimit(planCode),
        AiQuotaFeature.JdMatch => PlanTier.MonthlyJdMatchLimit(planCode),
        AiQuotaFeature.CvEmailGeneration => PlanTier.MonthlyCvEmailGenerationLimit(planCode),
        _ => 0
    };

    private static string FeatureBlockedMessage(string feature, string? planCode) => feature switch
    {
        AiQuotaFeature.JdMatch =>
            "Gói Miễn phí không hỗ trợ so khớp JD-CV. Nâng cấp Tiêu chuẩn hoặc Cao cấp để sử dụng.",
        AiQuotaFeature.CvEmailGeneration =>
            "Gói Miễn phí không hỗ trợ tạo Email/CV bằng AI. Nâng cấp gói để sử dụng.",
        _ => $"Gói {PlanTier.DisplayName(planCode)} không còn hạn mức cho tính năng này."
    };

    private static string FeatureExceededMessage(string feature, int limit, string? planCode)
    {
        var name = feature switch
        {
            AiQuotaFeature.JdMatch => "so khớp JD-CV",
            AiQuotaFeature.CvEmailGeneration => "tạo Email/CV AI",
            AiQuotaFeature.Interview => "phỏng vấn AI",
            AiQuotaFeature.CvAnalysis => "phân tích CV",
            _ => "AI"
        };
        return $"Đã hết hạn mức {limit} lượt {name}/tháng của gói {PlanTier.DisplayName(planCode)}. Nâng cấp hoặc đợi chu kỳ mới.";
    }

    private static DateTime PeriodStartUtc(string periodKey)
    {
        if (DateTime.TryParseExact(periodKey + "-01", "yyyy-MM-dd", null,
                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal,
                out var dt))
            return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
        var now = DateTime.UtcNow;
        return new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    private async Task<(DateTime Start, DateTime? Expires)> ResolvePeriodAsync(UserAccount user)
    {
        var lastPaid = await uow.InvoiceRepository.GetQueryable().AsNoTracking()
            .Include(i => i.Plan)
            .Where(i => i.UserId == user.Id && i.Status == "Paid" && i.AmountVnd > 0)
            .OrderByDescending(i => i.PaidAt ?? i.CreatedAt)
            .FirstOrDefaultAsync();

        DateTime? expires = null;
        if (lastPaid?.PaidAt != null && lastPaid.Plan != null)
            expires = lastPaid.PaidAt.Value.AddDays(Math.Max(1, lastPaid.Plan.DurationDays));

        if (lastPaid?.PaidAt != null && lastPaid.Plan != null && PlanTier.Rank(user.CurrentPlanCode) > 0)
            return (lastPaid.PaidAt.Value, expires);

        var now = DateTime.UtcNow;
        return (new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc), expires);
    }

    private async Task<int> SumUsedCharsAsync(Guid userId, DateTime since)
    {
        var rows = await uow.CareerMemoryEventRepository.GetQueryable().AsNoTracking()
            .Where(e => e.UserId == userId && e.CreatedAt >= since
                        && (e.EventType == "AiUsage" || e.EventType == "CvAnalyzed"))
            .Select(e => e.PayloadJson)
            .ToListAsync();
        var total = 0;
        foreach (var json in rows)
        {
            if (string.IsNullOrWhiteSpace(json)) continue;
            try
            {
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;
                if (root.TryGetProperty("inputChars", out var i) && i.TryGetInt32(out var ic))
                    total += ic;
                if (root.TryGetProperty("outputChars", out var o) && o.TryGetInt32(out var oc))
                    total += oc;
            }
            catch
            {
                // ignore bad payload
            }
        }
        return total;
    }
}

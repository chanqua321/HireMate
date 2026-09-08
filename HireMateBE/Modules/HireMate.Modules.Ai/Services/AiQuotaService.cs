using HireMate.Modules.Platform.Abstractions;
using HireMate.Modules.Ai;
using HireMate.BuildingBlocks;
using Common;
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
    Task RefreshExpiryAsync(UserAccount user);
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
}

public class AiQuotaService(
    IUnitOfWork uow,
    IAiClient ai,
    ISystemConfigService config,
    UserManager<UserAccount> users) : IAiQuotaService
{
    public async Task RefreshExpiryAsync(UserAccount user)
    {
        var code = PlanTier.Normalize(user.CurrentPlanCode);
        if (PlanTier.Rank(code) == 0)
            return;

        var lastPaid = await uow.InvoiceRepository.GetQueryable().AsNoTracking()
            .Include(i => i.Plan)
            .Where(i => i.UserId == user.Id && i.Status == "Paid" && i.AmountVnd > 0)
            .OrderByDescending(i => i.PaidAt ?? i.CreatedAt)
            .FirstOrDefaultAsync();
        if (lastPaid?.PaidAt == null || lastPaid.Plan == null)
            return;

        var expires = lastPaid.PaidAt.Value.AddDays(Math.Max(1, lastPaid.Plan.DurationDays));
        if (expires > DateTime.UtcNow)
            return;

        user.CurrentPlanCode = "free";
        user.IsPremium = false;
        user.UpdatedAt = DateTime.UtcNow;
        await users.UpdateAsync(user);
    }

    public async Task<AiQuotaSnapshot> GetSnapshotAsync(UserAccount user)
    {
        await RefreshExpiryAsync(user);
        var code = PlanTier.Normalize(user.CurrentPlanCode);
        var plan = await uow.PlanRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(p => p.Code == code);
        var globalMax = await config.GetIntAsync(SettingKeys.AiMaxOutputChars, 1400);
        var planMax = plan is { MaxAiOutputChars: > 0 } ? plan.MaxAiOutputChars : globalMax;
        var maxOut = Math.Min(globalMax, planMax);
        var budget = plan?.MonthlyAiCharBudget ?? 0;

        var (periodStart, expires) = await ResolvePeriodAsync(user);
        var used = await SumUsedCharsAsync(user.Id, periodStart);
        var remaining = budget <= 0 ? int.MaxValue : Math.Max(0, budget - used);
        var isExpired = expires != null && expires <= DateTime.UtcNow && PlanTier.Rank(code) == 0;

        return new AiQuotaSnapshot
        {
            PlanCode = code,
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
        return result;
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



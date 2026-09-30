using HireMate.BuildingBlocks;
using Common;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace HireMate.Modules.Admin.Services;

public partial class AdminService
{
    public async Task<IServiceResult> RevenueSeriesAsync(string? granularity, DateTime? from, DateTime? to)
    {
        var grain = (granularity ?? "month").Trim().ToLowerInvariant();
        if (grain is not ("day" or "week" or "month"))
            grain = "month";

        var end = AsUtcDate(to ?? DateTime.UtcNow).AddDays(1);
        var start = from.HasValue ? AsUtcDate(from.Value) : DefaultStart(grain, end);
        if (start >= end)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Khoảng ngày không hợp lệ");

        if (grain == "week")
            start = start.AddDays(-(((int)start.DayOfWeek + 6) % 7));
        if (grain == "month")
            start = new DateTime(start.Year, start.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var invoices = await uow.InvoiceRepository.GetQueryable().AsNoTracking().ToListAsync();
        var plans = await uow.PlanRepository.GetQueryable().AsNoTracking()
            .ToDictionaryAsync(p => p.Id, p => p.Name);
        var userIds = invoices.Select(i => i.UserId).Distinct().ToList();
        var accounts = await users.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Email, u.FullName })
            .ToListAsync();
        var accountMap = accounts.ToDictionary(a => a.Id);

        var span = end - start;
        var currentRevenue = SumPaid(invoices, start, end);
        var previousRevenue = SumPaid(invoices, start - span, start);
        var changePercent = previousRevenue == 0
            ? (currentRevenue > 0 ? 100d : 0d)
            : Math.Round((double)((currentRevenue - previousRevenue) / previousRevenue * 100m), 1);

        var signups = await users.Users.AsNoTracking()
            .Where(u => !u.IsDeleted && u.CreatedAt >= start && u.CreatedAt < end)
            .Select(u => u.CreatedAt)
            .ToListAsync();

        var buckets = new List<object>();
        var cursor = start;
        while (cursor < end && buckets.Count < 120)
        {
            var next = grain switch
            {
                "day" => cursor.AddDays(1),
                "week" => cursor.AddDays(7),
                _ => cursor.AddMonths(1)
            };
            if (next > end) next = end;
            var paid = invoices.Where(i => IsPaidFinancial(i) && InRange(i, cursor, next)).ToList();
            buckets.Add(new
            {
                label = BucketLabel(cursor, next, grain),
                start = cursor,
                end = next,
                revenue = paid.Sum(i => i.AmountVnd),
                invoices = paid.Count,
                newUsers = signups.Count(d => d >= cursor && d < next)
            });
            cursor = next;
        }

        var inRange = invoices
            .Where(i => IsFinancial(i) && InRange(i, start, end))
            .OrderByDescending(i => i.PaidAt ?? i.CreatedAt)
            .Take(200)
            .Select(i =>
            {
                accountMap.TryGetValue(i.UserId, out var account);
                plans.TryGetValue(i.PlanId, out var planName);
                return new
                {
                    i.Id,
                    i.InvoiceNumber,
                    i.UserId,
                    email = account?.Email ?? string.Empty,
                    fullName = account?.FullName ?? string.Empty,
                    planName = planName ?? string.Empty,
                    i.AmountVnd,
                    i.Status,
                    i.PaymentMethod,
                    i.CreatedAt,
                    i.PaidAt
                };
            })
            .ToList();

        var usersCount = Math.Max(1, await users.Users.CountAsync(u => !u.IsDeleted));
        var premium = await users.Users.CountAsync(u => u.IsPremium && !u.IsDeleted);
        var payingUsers = invoices.Where(i => IsPaidFinancial(i) && InRange(i, start, end))
            .Select(i => i.UserId).Distinct().Count();

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            granularity = grain,
            from = start,
            to = end.AddDays(-1),
            summary = new
            {
                totalRevenue = currentRevenue,
                previousRevenue,
                changePercent,
                paidInvoices = invoices.Count(i => IsPaidFinancial(i) && InRange(i, start, end)),
                allTimeRevenue = invoices.Where(IsPaidFinancial).Sum(i => i.AmountVnd),
                mrr = invoices.Where(i => IsPaidFinancial(i) && (i.PaidAt ?? i.CreatedAt) >= DateTime.UtcNow.AddDays(-30)).Sum(i => i.AmountVnd),
                arpu = Math.Round(currentRevenue / Math.Max(1, payingUsers), 0),
                conversionRate = Math.Round(100.0 * premium / usersCount, 1),
                premiumUsers = premium
            },
            buckets,
            invoices = inRange
        });
    }

    public async Task<IServiceResult> ListFaqsAsync()
    {
        var list = await uow.FaqRepository.GetQueryable().AsNoTracking()
            .OrderBy(f => f.SortOrder).ThenBy(f => f.Question).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> DeleteFaqAsync(Guid id)
    {
        var item = await uow.FaqRepository.GetQueryable().FirstOrDefaultAsync(f => f.Id == id);
        if (item == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy FAQ");
        await uow.FaqRepository.RemoveAsync(item);
        await uow.SaveChangesAsync();
        return new ServiceResult(1, "Đã xóa.");
    }

    public async Task<IServiceResult> ListResourcesAsync()
    {
        var list = await uow.ResourceRepository.GetQueryable().AsNoTracking()
            .OrderByDescending(r => r.CreatedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list.Select(ResourceContent.ToView));
    }

    public async Task<IServiceResult> DeleteResourceAsync(Guid id)
    {
        var item = await uow.ResourceRepository.GetQueryable().FirstOrDefaultAsync(r => r.Id == id);
        if (item == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy tài nguyên");
        await uow.ResourceRepository.RemoveAsync(item);
        await uow.SaveChangesAsync();
        return new ServiceResult(1, "Đã xóa.");
    }

    public async Task<IServiceResult> ListPromosAsync()
    {
        var list = await uow.PromoCodeRepository.GetQueryable().AsNoTracking()
            .OrderBy(p => p.Code).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> DeletePromoAsync(Guid id)
    {
        var item = await uow.PromoCodeRepository.GetQueryable().FirstOrDefaultAsync(p => p.Id == id);
        if (item == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy mã khuyến mãi");
        await uow.PromoCodeRepository.RemoveAsync(item);
        await uow.SaveChangesAsync();
        return new ServiceResult(1, "Đã xóa.");
    }

    public async Task<IServiceResult> ListBadgesAsync()
    {
        var badges = await uow.BadgeRepository.GetQueryable().AsNoTracking().OrderBy(b => b.Name).ToListAsync();
        var earned = await uow.UserBadgeRepository.GetQueryable().AsNoTracking()
            .GroupBy(b => b.BadgeId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToListAsync();
        var counts = earned.ToDictionary(x => x.Key, x => x.Count);
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, badges.Select(b => new
        {
            b.Id,
            b.Code,
            b.Name,
            b.Description,
            earnedCount = counts.GetValueOrDefault(b.Id)
        }));
    }

    public async Task<IServiceResult> UpsertBadgeAsync(Badge badge)
    {
        var code = badge.Code.Trim();
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(badge.Name))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mã và tên huy hiệu là bắt buộc");

        var existing = await uow.BadgeRepository.GetQueryable().FirstOrDefaultAsync(b => b.Code == code);
        if (existing == null)
        {
            badge.Id = Guid.NewGuid();
            badge.Code = code;
            badge.Name = badge.Name.Trim();
            badge.Description = badge.Description?.Trim() ?? string.Empty;
            await uow.BadgeRepository.CreateAsync(badge);
        }
        else
        {
            existing.Name = badge.Name.Trim();
            existing.Description = badge.Description?.Trim() ?? string.Empty;
        }
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG);
    }

    private static DateTime AsUtcDate(DateTime value)
        => DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);

    private static DateTime DefaultStart(string grain, DateTime end) => grain switch
    {
        "day" => end.AddDays(-14),
        "week" => end.AddDays(-56),
        _ => new DateTime(end.Year, end.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-5)
    };

    private static bool InRange(Invoice invoice, DateTime start, DateTime end)
    {
        var at = invoice.PaidAt ?? invoice.CreatedAt;
        return at >= start && at < end;
    }

    private static bool IsFinancial(Invoice invoice)
        => InvoiceFinance.IsFinancial(invoice.AmountVnd, invoice.PaymentMethod);

    private static bool IsPaidFinancial(Invoice invoice)
        => invoice.Status == InvoiceStatuses.Paid && IsFinancial(invoice);

    private static decimal SumPaid(IEnumerable<Invoice> invoices, DateTime start, DateTime end)
        => invoices.Where(i => IsPaidFinancial(i) && InRange(i, start, end)).Sum(i => i.AmountVnd);

    private static string BucketLabel(DateTime start, DateTime end, string grain) => grain switch
    {
        "day" => start.ToString("dd/MM"),
        "week" => $"{start:dd/MM}–{end.AddDays(-1):dd/MM}",
        _ => start.ToString("MM/yyyy")
    };
}

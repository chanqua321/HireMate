using HireMate.BuildingBlocks;
using Common;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace HireMate.Modules.Admin.Services;

public partial class AdminService
{
    public async Task<IServiceResult> DashboardAsync(string? range, DateTime? from, DateTime? to, string? granularity)
    {
        if (!AdminDateRange.TryResolve(range, from, to, granularity, DateTime.UtcNow, out var window, out var error))
            return new ServiceResult(Const.FAIL_CREATE_CODE, error ?? "Khoảng ngày không hợp lệ");

        var span = window.EndUtc - window.StartUtc;
        var prevStart = window.StartUtc - span;
        var prevEnd = window.StartUtc;

        var usersTotal = await users.Users.CountAsync(u => !u.IsDeleted);
        var newUsers = await users.Users.CountAsync(u => !u.IsDeleted && u.CreatedAt >= window.StartUtc && u.CreatedAt < window.EndUtc);
        var prevUsers = await users.Users.CountAsync(u => !u.IsDeleted && u.CreatedAt >= prevStart && u.CreatedAt < prevEnd);
        var activePaid = await users.Users.CountAsync(u => !u.IsDeleted && u.IsPremium);

        var sessions = uow.InterviewSessionRepository.GetQueryable().AsNoTracking();
        var interviews = await sessions.CountAsync(s => s.StartedAt >= window.StartUtc && s.StartedAt < window.EndUtc);
        var prevInterviews = await sessions.CountAsync(s => s.StartedAt >= prevStart && s.StartedAt < prevEnd);
        var completed = await sessions.CountAsync(s => s.Status == "Completed" && s.CompletedAt >= window.StartUtc && s.CompletedAt < window.EndUtc);
        var prevCompleted = await sessions.CountAsync(s => s.Status == "Completed" && s.CompletedAt >= prevStart && s.CompletedAt < prevEnd);
        var averageScore = await sessions
            .Where(s => s.Status == "Completed" && s.OverallScore != null && s.CompletedAt >= window.StartUtc && s.CompletedAt < window.EndUtc)
            .Select(s => (double?)s.OverallScore)
            .AverageAsync();

        var cvs = uow.CvDocumentRepository.GetQueryable().AsNoTracking();
        var cvsCreated = await cvs.CountAsync(c => c.UploadedAt >= window.StartUtc && c.UploadedAt < window.EndUtc);
        var prevCvs = await cvs.CountAsync(c => c.UploadedAt >= prevStart && c.UploadedAt < prevEnd);
        var cvsAnalyzed = await cvs.CountAsync(c => c.AnalyzedAt != null && c.AnalyzedAt >= window.StartUtc && c.AnalyzedAt < window.EndUtc);

        var matches = uow.JdMatchRepository.GetQueryable().AsNoTracking();
        var jdTotal = await matches.CountAsync(m => m.CreatedAt >= window.StartUtc && m.CreatedAt < window.EndUtc);
        var prevJd = await matches.CountAsync(m => m.CreatedAt >= prevStart && m.CreatedAt < prevEnd);

        var revenue = await SumPaid(window.StartUtc, window.EndUtc);
        var prevRevenue = await SumPaid(prevStart, prevEnd);
        var paidCount = await CountPaid(window.StartUtc, window.EndUtc);

        var planRows = await users.Users.AsNoTracking().Where(u => !u.IsDeleted)
            .GroupBy(u => u.CurrentPlanCode)
            .Select(g => new { code = g.Key, count = g.Count() })
            .ToListAsync();

        var userTimes = await users.Users.AsNoTracking()
            .Where(u => !u.IsDeleted && u.CreatedAt >= window.StartUtc && u.CreatedAt < window.EndUtc)
            .Select(u => u.CreatedAt).ToListAsync();
        var interviewTimes = await sessions
            .Where(s => s.StartedAt >= window.StartUtc && s.StartedAt < window.EndUtc)
            .Select(s => s.StartedAt).ToListAsync();
        var revenueRows = await PaidInWindow(window.StartUtc, window.EndUtc)
            .Select(i => new { i.PaidAt, i.CreatedAt, i.AmountVnd }).ToListAsync();
        var cvTimes = await cvs.Where(c => c.UploadedAt >= window.StartUtc && c.UploadedAt < window.EndUtc)
            .Select(c => c.UploadedAt).ToListAsync();
        var analyzedTimes = await cvs.Where(c => c.AnalyzedAt != null && c.AnalyzedAt >= window.StartUtc && c.AnalyzedAt < window.EndUtc)
            .Select(c => c.AnalyzedAt!.Value).ToListAsync();

        var series = AdminDateRange.Buckets(window).Select(bucket =>
        {
            bool InBucket(DateTime utc) => AdminDateRange.BucketOf(utc, window.Granularity) == bucket;
            return new
            {
                date = bucket.ToString("yyyy-MM-dd"),
                newUsers = userTimes.Count(InBucket),
                interviews = interviewTimes.Count(InBucket),
                revenueVnd = revenueRows.Where(i => InBucket(i.PaidAt ?? i.CreatedAt)).Sum(i => i.AmountVnd),
                cvsCreated = cvTimes.Count(InBucket),
                cvsAnalyzed = analyzedTimes.Count(InBucket)
            };
        }).ToList();

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            range = new
            {
                key = window.Key,
                from = window.FromDate.ToString("yyyy-MM-dd"),
                to = window.ToDate.ToString("yyyy-MM-dd"),
                timezone = AdminDateRange.TimeZoneId,
                granularity = window.Granularity
            },
            users = new { total = usersTotal, @new = newUsers, previous = prevUsers, percentageChange = AdminDateRange.ChangePercent(newUsers, prevUsers) },
            interviews = new
            {
                total = interviews,
                completed,
                previous = prevInterviews,
                previousCompleted = prevCompleted,
                percentageChange = AdminDateRange.ChangePercent(interviews, prevInterviews),
                completionRate = interviews == 0 ? (double?)null : Math.Round(100.0 * completed / interviews, 1),
                averageScore = averageScore == null ? (double?)null : Math.Round(averageScore.Value, 1)
            },
            cvs = new { created = cvsCreated, analyzed = cvsAnalyzed, previous = prevCvs, percentageChange = AdminDateRange.ChangePercent(cvsCreated, prevCvs) },
            jdMatches = new { total = jdTotal, previous = prevJd, percentageChange = AdminDateRange.ChangePercent(jdTotal, prevJd) },
            revenue = new
            {
                totalVnd = revenue,
                previousVnd = prevRevenue,
                percentageChange = AdminDateRange.ChangePercent(revenue, prevRevenue),
                successfulPayments = paidCount
            },
            activePaidUsers = activePaid,
            plans = planRows.Select(p => new { code = string.IsNullOrWhiteSpace(p.code) ? "free" : p.code, p.count }),
            series
        });
    }

    public async Task<IServiceResult> UserDetailAsync(Guid id)
    {
        var user = await users.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id && !u.IsDeleted);
        if (user == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        var roles = await users.GetRolesAsync(user);
        var cvCount = await uow.CvDocumentRepository.GetQueryable().CountAsync(c => c.UserId == id);
        var interviewCount = await uow.InterviewSessionRepository.GetQueryable().CountAsync(s => s.UserId == id);
        var completed = await uow.InterviewSessionRepository.GetQueryable().CountAsync(s => s.UserId == id && s.Status == "Completed");
        var jdCount = await uow.JdMatchRepository.GetQueryable().CountAsync(m => m.UserId == id);
        var paidAmount = await PaidInvoices().Where(i => i.UserId == id).SumAsync(i => (decimal?)i.AmountVnd) ?? 0m;
        var paidInvoices = await PaidInvoices().CountAsync(i => i.UserId == id);
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            user.Id,
            user.Email,
            user.FullName,
            roles,
            currentPlanCode = string.IsNullOrWhiteSpace(user.CurrentPlanCode) ? "free" : user.CurrentPlanCode,
            user.IsPremium,
            user.LockoutEnd,
            emailConfirmed = user.EmailConfirmed,
            user.CreatedAt,
            user.LastLogin,
            user.OnboardingCompleted,
            cvCount,
            interviewCount,
            completedInterviews = completed,
            jdCount,
            paidAmountVnd = paidAmount,
            paidInvoices
        });
    }

    public async Task<IServiceResult> PaymentsAsync(string? q, string? status, string? plan, DateTime? from, DateTime? to, int page, int pageSize)
    {
        DateTime? start = null;
        DateTime? end = null;
        if (from != null || to != null)
        {
            if (!AdminDateRange.TryResolve("custom", from, to, "day", DateTime.UtcNow, out var window, out var error))
                return new ServiceResult(Const.FAIL_CREATE_CODE, error ?? "Khoảng ngày không hợp lệ");
            start = window.StartUtc;
            end = window.EndUtc;
        }

        var query = uow.InvoiceRepository.GetQueryable().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(i => i.Status == status.Trim());
        if (start != null && end != null)
            query = query.Where(i => i.CreatedAt >= start && i.CreatedAt < end);
        if (!string.IsNullOrWhiteSpace(plan))
        {
            var code = plan.Trim().ToLowerInvariant();
            var planIds = await uow.PlanRepository.GetQueryable().AsNoTracking()
                .Where(p => p.Code == code).Select(p => p.Id).ToListAsync();
            query = query.Where(i => planIds.Contains(i.PlanId));
        }
        if (!string.IsNullOrWhiteSpace(q))
        {
            var text = q.Trim();
            var userIds = await users.Users.AsNoTracking()
                .Where(u => u.Email!.Contains(text) || u.FullName.Contains(text))
                .Select(u => u.Id).ToListAsync();
            query = query.Where(i => i.InvoiceNumber.Contains(text) || userIds.Contains(i.UserId));
        }

        var size = Math.Clamp(pageSize, 1, 50);
        var index = Math.Max(1, page);
        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(i => i.CreatedAt).Skip((index - 1) * size).Take(size).ToListAsync();
        var ids = rows.Select(i => i.Id).ToList();
        var ownerIds = rows.Select(i => i.UserId).Distinct().ToList();
        var planIdsOnPage = rows.Select(i => i.PlanId).Distinct().ToList();
        var owners = await users.Users.AsNoTracking().Where(u => ownerIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Email, u.FullName }).ToListAsync();
        var plans = await uow.PlanRepository.GetQueryable().AsNoTracking().Where(p => planIdsOnPage.Contains(p.Id))
            .Select(p => new { p.Id, p.Code, p.Name }).ToListAsync();
        var payments = await uow.PaymentRepository.GetQueryable().AsNoTracking().Where(p => ids.Contains(p.InvoiceId)).ToListAsync();
        var ownerMap = owners.ToDictionary(u => u.Id);
        var planMap = plans.ToDictionary(p => p.Id);

        var items = rows.Select(invoice =>
        {
            ownerMap.TryGetValue(invoice.UserId, out var owner);
            planMap.TryGetValue(invoice.PlanId, out var planRow);
            var payment = payments.Where(p => p.InvoiceId == invoice.Id).OrderByDescending(p => p.CreatedAt).FirstOrDefault();
            return new
            {
                invoice.Id,
                invoice.InvoiceNumber,
                email = owner?.Email,
                fullName = owner?.FullName,
                planCode = planRow?.Code,
                planName = planRow?.Name,
                invoice.AmountVnd,
                invoice.Status,
                invoice.CreatedAt,
                invoice.PaidAt,
                provider = payment?.Provider ?? invoice.PaymentMethod,
                paymentStatus = payment?.Status,
                transactionRef = payment?.TransactionRef
            };
        }).ToList();

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new { page = index, pageSize = size, total, items });
    }

    private IQueryable<Invoice> PaidInvoices()
        => uow.InvoiceRepository.GetQueryable().AsNoTracking().Where(i => i.Status == InvoiceStatuses.Paid);

    private IQueryable<Invoice> PaidInWindow(DateTime start, DateTime end)
        => PaidInvoices().Where(i =>
            (i.PaidAt != null && i.PaidAt >= start && i.PaidAt < end) ||
            (i.PaidAt == null && i.CreatedAt >= start && i.CreatedAt < end));

    private async Task<decimal> SumPaid(DateTime start, DateTime end)
    {
        var amounts = await PaidInWindow(start, end).Select(i => i.AmountVnd).ToListAsync();
        return amounts.Sum();
    }

    private async Task<int> CountPaid(DateTime start, DateTime end)
        => await PaidInWindow(start, end).CountAsync();
}

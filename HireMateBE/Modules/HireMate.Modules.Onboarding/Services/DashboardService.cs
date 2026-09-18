using HireMate.Modules.Ai;
using HireMate.Modules.Onboarding.Abstractions;
using HireMate.BuildingBlocks;

using Common;
using Common.DTOs.DashboardDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace HireMate.Modules.Onboarding.Services;

public class DashboardService(
    UserManager<UserAccount> userManager,
    IUnitOfWork unitOfWork,
    IAiQuotaService aiQuota) : IDashboardService
{
    private const int FreeMonthlyLimit = 3;
    private readonly UserManager<UserAccount> _userManager = userManager;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly IAiQuotaService _aiQuota = aiQuota;

    public async Task<IServiceResult> GetAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_READ_CODE, "Vui lòng hoàn thiện hồ sơ (cần CV) trước khi vào Dashboard");

        var snap = await _aiQuota.GetSnapshotAsync(user);
        var isPaidActive = PlanTier.Rank(snap.PlanCode) > 0;

        var completed = await _unitOfWork.InterviewSessionRepository.GetQueryable()
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed")
            .OrderByDescending(s => s.CompletedAt)
            .ToListAsync();

        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var usedThisMonth = completed.Count(s => s.CompletedAt >= monthStart);
        var remaining = isPaidActive ? int.MaxValue : Math.Max(0, FreeMonthlyLimit - usedThisMonth);

        InterviewRecentDto? recent = null;
        if (completed.Count > 0)
        {
            var r = completed[0];
            recent = new InterviewRecentDto
            {
                Id = r.Id,
                Position = r.Position,
                OverallScore = r.OverallScore,
                CompletedAt = r.CompletedAt
            };
        }

        var weekly = BuildWeeklyScores(completed);
        CompetencySummaryDto? competency = null;
        if (completed.Count > 0)
        {
            competency = new CompetencySummaryDto
            {
                AvgS = completed.Average(x => x.ScoreS ?? 0),
                AvgT = completed.Average(x => x.ScoreT ?? 0),
                AvgA = completed.Average(x => x.ScoreA ?? 0),
                AvgR = completed.Average(x => x.ScoreR ?? 0),
                AvgClarity = completed.Average(x => x.ClarityScore ?? 0)
            };
        }

        var cv = await _unitOfWork.CvDocumentRepository.GetQueryable().AsNoTracking()
            .Where(c => c.UserId == userId && c.IsConfirmed)
            .OrderByDescending(c => c.ConfirmedAt)
            .FirstOrDefaultAsync();

        var dto = new DashboardDto
        {
            InterviewScore = completed.Count > 0 ? completed.Average(x => x.OverallScore ?? 0) : null,
            SessionsCount = completed.Count,
            SessionsThisMonth = usedThisMonth,
            RecentSession = recent,
            WeeklyScores = weekly,
            CompetencySummary = competency,
            RemainingFreeSessionsThisMonth = isPaidActive ? -1 : remaining,
            IsPremium = isPaidActive,
            CvReadinessScore = cv?.ReadinessScore,
            CvFitT1Score = cv?.FitT1Score,
            ConfirmedCvId = cv?.Id
        };

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, dto);
    }

    private static List<WeeklyScoreDto> BuildWeeklyScores(List<InterviewSession> completed)
    {
        var cutoff = DateTime.UtcNow.Date.AddDays(-28);
        var recent = completed.Where(s => s.CompletedAt >= cutoff).ToList();
        var groups = recent
            .GroupBy(s =>
            {
                var d = s.CompletedAt!.Value.Date;
                var diff = (7 + (d.DayOfWeek - DayOfWeek.Monday)) % 7;
                return d.AddDays(-diff);
            })
            .OrderBy(g => g.Key)
            .Select(g => new WeeklyScoreDto
            {
                WeekLabel = g.Key.ToString("yyyy-MM-dd"),
                AverageScore = g.Average(x => x.OverallScore ?? 0),
                Count = g.Count()
            })
            .ToList();
        return groups;
    }
}



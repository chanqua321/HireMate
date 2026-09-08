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

public class CareerOsService(IUnitOfWork uow, UserManager<UserAccount> users, IAiQuotaService aiQuota) : ICareerOsService
{
    public async Task<IServiceResult> GetMemoryAsync(Guid userId)
    {
        var events = await uow.CareerMemoryEventRepository.GetQueryable().AsNoTracking()
            .Where(e => e.UserId == userId).OrderByDescending(e => e.CreatedAt).Take(100).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, events);
    }

    public async Task<IServiceResult> GetProfileHubAsync(Guid userId)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        var profile = await uow.CareerProfileRepository.GetQueryable().AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        var sessions = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed").OrderByDescending(s => s.CompletedAt).Take(5).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            fullName = user?.FullName,
            profile,
            sessionsCount = sessions.Count,
            averageScore = sessions.Count == 0 ? (double?)null : sessions.Average(s => s.OverallScore ?? 0),
            recent = sessions
        });
    }

    public async Task<IServiceResult> GetProgressAsync(Guid userId)
    {
        var sessions = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed")
            .OrderBy(s => s.CompletedAt).ToListAsync();
        var monthly = sessions.GroupBy(s => s.CompletedAt!.Value.ToString("yyyy-MM"))
            .Select(g => new { month = g.Key, avg = g.Average(x => x.OverallScore ?? 0), count = g.Count() });
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new { monthly, milestones = BuildMilestones(sessions.Count) });
    }

    public async Task<IServiceResult> GetDevelopmentAsync(Guid userId)
    {
        var interviews = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed").ToListAsync();
        var cvs = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .Where(c => c.UserId == userId && c.AnalyzedAt != null).ToListAsync();
        var matches = await uow.JdMatchRepository.GetQueryable().AsNoTracking()
            .Where(m => m.UserId == userId).ToListAsync();

        double interviewScore = interviews.Count == 0 ? 0 : interviews.Average(i => i.OverallScore ?? 0);
        double cvScore = cvs.Count == 0 ? 0 : cvs.Average(c =>
            ((c.FormatScore ?? 0) + (c.KeywordsScore ?? 0) + (c.ReadabilityScore ?? 0) + (c.ProfessionalismScore ?? 0)) / 4.0);
        double matchScore = matches.Count == 0 ? 0 : matches.Average(m => m.OverallScore);
        var careerScore = Math.Round((interviewScore * 0.5) + (cvScore * 0.25) + (matchScore * 0.25), 1);

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            careerScore,
            interviewScore,
            cvScore,
            matchScore,
            readiness = careerScore >= 75 ? "Sẵn sàng" : careerScore >= 55 ? "Gần đạt" : "Đang xây dựng"
        });
    }

    public async Task<IServiceResult> GetPathAsync(Guid userId)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_READ_CODE, "Vui lòng hoàn thiện hồ sơ (cần CV) trước.");
        var planBlock = await aiQuota.RequireActivePlanAsync(user, minRank: 1);
        if (planBlock != null)
            return planBlock;

        var profile = await uow.CareerProfileRepository.GetQueryable().AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        var system = "Return JSON career path stages for Vietnamese fresher.";
        var userPrompt = $"Position={profile?.DesiredPosition}; Industry={profile?.DesiredIndustry}; Level={profile?.ExperienceLevel}. Trả về lộ trình nghề nghiệp theo giai đoạn.";
        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var aiResult = await aiQuota.CompleteAndLogAsync(user, system, userPrompt, "career_path");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            path = aiResult.Content,
            provider = aiResult.Provider,
            usedFallback = aiResult.UsedFallback
        });
    }

    public async Task<IServiceResult> GetLearningAsync(Guid userId)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_READ_CODE, "Vui lòng hoàn thiện hồ sơ (cần CV) trước.");
        var planBlock = await aiQuota.RequireActivePlanAsync(user, minRank: 1);
        if (planBlock != null)
            return planBlock;

        var profile = await uow.CareerProfileRepository.GetQueryable().AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        var system = "Return JSON learning recommendations.";
        var userPrompt = $"Recommend learning resources and skills for {profile?.DesiredPosition} in {profile?.DesiredIndustry}. Trả về gợi ý học tập.";
        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var aiResult = await aiQuota.CompleteAndLogAsync(user, system, userPrompt, "career_learning");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            learning = aiResult.Content,
            provider = aiResult.Provider,
            usedFallback = aiResult.UsedFallback
        });
    }

    public async Task<IServiceResult> GetResourcesAsync(string? category)
    {
        var q = uow.ResourceRepository.GetQueryable().AsNoTracking().Where(r => r.IsPublished);
        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(r => r.Category == category);
        var list = await q.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> GetResourceAsync(Guid id)
    {
        var item = await uow.ResourceRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id && r.IsPublished);
        return item == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, item);
    }

    private static object BuildMilestones(int count) => new[]
    {
        new { code = "first_interview", unlocked = count >= 1 },
        new { code = "five_sessions", unlocked = count >= 5 },
        new { code = "ten_sessions", unlocked = count >= 10 }
    };
}



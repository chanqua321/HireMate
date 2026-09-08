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
using HireMate.Modules.Growth.Abstractions;

namespace HireMate.Modules.Growth.Services;

public class GrowthService(IUnitOfWork uow, UserManager<UserAccount> users) : IGrowthService
{
    public async Task<IServiceResult> GetReferralAsync(Guid userId)
    {
        var code = await uow.ReferralCodeRepository.GetQueryable().FirstOrDefaultAsync(r => r.UserId == userId);
        if (code == null)
        {
            code = new ReferralCode
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Code = $"HM{userId.ToString("N")[..8].ToUpperInvariant()}"
            };
            await uow.ReferralCodeRepository.CreateAsync(code);
            await uow.SaveChangesAsync();
        }
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            code.Code,
            code.InviteCount,
            shareUrl = $"https://hiremate.app/r/{code.Code}"
        });
    }

    public async Task<IServiceResult> ApplyReferralAsync(Guid userId, ApplyReferralDto dto)
    {
        var refCode = await uow.ReferralCodeRepository.GetQueryable()
            .FirstOrDefaultAsync(r => r.Code == dto.Code);
        if (refCode == null || refCode.UserId == userId)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mã giới thiệu không hợp lệ");

        var already = await uow.ReferralInviteRepository.GetQueryable()
            .AnyAsync(i => i.InviteeUserId == userId);
        if (already)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mã giới thiệu đã được áp dụng");

        await uow.ReferralInviteRepository.CreateAsync(new ReferralInvite
        {
            Id = Guid.NewGuid(),
            ReferrerUserId = refCode.UserId,
            InviteeUserId = userId,
            Code = dto.Code
        });
        refCode.InviteCount++;
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Áp dụng mã giới thiệu thành công");
    }

    public async Task<IServiceResult> GetBadgesAsync(Guid userId)
    {
        var all = await uow.BadgeRepository.GetQueryable().AsNoTracking().ToListAsync();
        var earned = await uow.UserBadgeRepository.GetQueryable().AsNoTracking()
            .Where(ub => ub.UserId == userId).ToListAsync();
        var sessions = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .CountAsync(s => s.UserId == userId && s.Status == "Completed");

        await EnsureBadge(userId, "first_interview", sessions >= 1);
        await EnsureBadge(userId, "ten_sessions", sessions >= 10);
        var topList = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed" && s.OverallScore != null)
            .Select(s => s.OverallScore!.Value).ToListAsync();
        var top = topList.Count == 0 ? 0 : topList.Max();
        await EnsureBadge(userId, "top_performer", top >= 85);

        earned = await uow.UserBadgeRepository.GetQueryable().AsNoTracking()
            .Where(ub => ub.UserId == userId).ToListAsync();

        var data = all.Select(b => new
        {
            b.Code, b.Name, b.Description,
            earned = earned.Any(e => e.BadgeId == b.Id),
            earnedAt = earned.FirstOrDefault(e => e.BadgeId == b.Id)?.EarnedAt
        });
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data);
    }

    private async Task EnsureBadge(Guid userId, string code, bool condition)
    {
        if (!condition) return;
        var badge = await uow.BadgeRepository.GetQueryable().FirstOrDefaultAsync(b => b.Code == code);
        if (badge == null) return;
        var has = await uow.UserBadgeRepository.GetQueryable().AnyAsync(ub => ub.UserId == userId && ub.BadgeId == badge.Id);
        if (has) return;
        await uow.UserBadgeRepository.CreateAsync(new UserBadge { Id = Guid.NewGuid(), UserId = userId, BadgeId = badge.Id });
        await uow.SaveChangesAsync();
    }

    public async Task<IServiceResult> GetLeaderboardAsync()
    {
        var scores = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.Status == "Completed" && s.OverallScore != null)
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, Avg = g.Average(x => x.OverallScore ?? 0), Count = g.Count() })
            .OrderByDescending(x => x.Avg).Take(20).ToListAsync();

        var result = new List<object>();
        foreach (var s in scores)
        {
            var u = await users.FindByIdAsync(s.UserId.ToString());
            result.Add(new { fullName = u?.FullName ?? "User", averageScore = Math.Round(s.Avg, 1), sessions = s.Count });
        }
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, result);
    }

    public async Task<IServiceResult> GetBenchmarkAsync(Guid userId)
    {
        var profile = await uow.CareerProfileRepository.GetQueryable().AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
        var my = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "Completed").ToListAsync();
        var myAvg = my.Count == 0 ? 0 : my.Average(s => s.OverallScore ?? 0);

        var peerQuery = uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.Status == "Completed");
        if (!string.IsNullOrEmpty(profile?.DesiredIndustry))
            peerQuery = peerQuery.Where(s => s.Industry == profile.DesiredIndustry);

        var peerScores = await peerQuery.Select(s => s.OverallScore ?? 0).ToListAsync();
        var peerAvg = peerScores.Count == 0 ? 0 : peerScores.Average();
        var betterThan = peerScores.Count == 0 ? 0 :
            Math.Round(100.0 * peerScores.Count(p => myAvg >= p) / peerScores.Count, 1);

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            myAverage = Math.Round(myAvg, 1),
            peerAverage = Math.Round(peerAvg, 1),
            percentile = betterThan,
            industry = profile?.DesiredIndustry,
            star = new
            {
                s = my.Count == 0 ? 0 : my.Average(x => x.ScoreS ?? 0),
                t = my.Count == 0 ? 0 : my.Average(x => x.ScoreT ?? 0),
                a = my.Count == 0 ? 0 : my.Average(x => x.ScoreA ?? 0),
                r = my.Count == 0 ? 0 : my.Average(x => x.ScoreR ?? 0)
            }
        });
    }
}



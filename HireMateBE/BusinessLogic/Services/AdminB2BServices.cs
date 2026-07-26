using BusinessLogic.Base;
using BusinessLogic.IServices;
using Common;
using Common.DTOs.PublicDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BusinessLogic.Services;

public class AdminService(IUnitOfWork uow, UserManager<UserAccount> users, RoleManager<Role> roles) : IAdminService
{
    public async Task<IServiceResult> AnalyticsAsync()
    {
        var usersCount = await users.Users.CountAsync(u => !u.IsDeleted);
        var sessions = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking().ToListAsync();
        var completed = sessions.Count(s => s.Status == "Completed");
        var invoices = await uow.InvoiceRepository.GetQueryable().AsNoTracking().CountAsync(i => i.Status == "Paid");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            registrations = usersCount,
            interviewCompletionRate = sessions.Count == 0 ? 0 : Math.Round(100.0 * completed / sessions.Count, 1),
            avgSessionScore = completed == 0 ? 0 : Math.Round(sessions.Where(s => s.Status == "Completed").Average(s => s.OverallScore ?? 0), 1),
            paidInvoices = invoices
        });
    }

    public async Task<IServiceResult> InterviewStatsAsync()
    {
        var completed = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.Status == "Completed").ToListAsync();
        var popular = completed.GroupBy(s => s.Position)
            .OrderByDescending(g => g.Count()).Take(10)
            .Select(g => new { position = g.Key, count = g.Count(), avg = Math.Round(g.Average(x => x.OverallScore ?? 0), 1) });
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            total = completed.Count,
            avgStar = completed.Count == 0 ? 0 : Math.Round(completed.Average(s => s.OverallScore ?? 0), 1),
            avgS = completed.Count == 0 ? 0 : completed.Average(s => s.ScoreS ?? 0),
            avgT = completed.Count == 0 ? 0 : completed.Average(s => s.ScoreT ?? 0),
            avgA = completed.Count == 0 ? 0 : completed.Average(s => s.ScoreA ?? 0),
            avgR = completed.Count == 0 ? 0 : completed.Average(s => s.ScoreR ?? 0),
            popularPositions = popular
        });
    }

    public async Task<IServiceResult> UsersAsync(string? q)
    {
        var query = users.Users.AsNoTracking().Where(u => !u.IsDeleted);
        if (!string.IsNullOrWhiteSpace(q))
            query = query.Where(u => u.Email!.Contains(q) || u.FullName.Contains(q));
        var list = await query.OrderByDescending(u => u.CreatedAt).Take(100).ToListAsync();
        var data = new List<object>();
        foreach (var u in list)
        {
            var r = await users.GetRolesAsync(u);
            data.Add(new { u.Id, u.Email, u.FullName, u.IsPremium, u.OnboardingCompleted, u.LockoutEnd, roles = r });
        }
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data);
    }

    public async Task<IServiceResult> PatchUserAsync(Guid id, PatchUserDto dto)
    {
        var user = await users.FindByIdAsync(id.ToString());
        if (user == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        if (dto.Lock == true)
            user.LockoutEnd = DateTimeOffset.UtcNow.AddYears(100);
        if (dto.Lock == false)
            user.LockoutEnd = null;
        if (dto.IsPremium.HasValue)
            user.IsPremium = dto.IsPremium.Value;
        await users.UpdateAsync(user);

        if (!string.IsNullOrWhiteSpace(dto.Role))
        {
            if (!await roles.RoleExistsAsync(dto.Role))
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không tìm thấy vai trò");
            var current = await users.GetRolesAsync(user);
            await users.RemoveFromRolesAsync(user, current);
            await users.AddToRoleAsync(user, dto.Role);
        }
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG);
    }

    public async Task<IServiceResult> RevenueAsync()
    {
        var paid = await uow.InvoiceRepository.GetQueryable().AsNoTracking()
            .Where(i => i.Status == "Paid").ToListAsync();
        var mrr = paid.Where(i => i.PaidAt >= DateTime.UtcNow.AddDays(-30)).Sum(i => i.AmountVnd);
        var usersCount = Math.Max(1, await users.Users.CountAsync(u => !u.IsDeleted));
        var premium = await users.Users.CountAsync(u => u.IsPremium && !u.IsDeleted);
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            mrr,
            totalRevenue = paid.Sum(i => i.AmountVnd),
            arpu = Math.Round(paid.Sum(i => i.AmountVnd) / usersCount, 0),
            conversionRate = Math.Round(100.0 * premium / usersCount, 1),
            premiumUsers = premium
        });
    }

    public async Task<IServiceResult> ListTicketsAsync()
    {
        var list = await uow.SupportTicketRepository.GetQueryable().AsNoTracking()
            .OrderByDescending(t => t.CreatedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> PatchTicketAsync(Guid id, PatchTicketDto dto)
    {
        var t = await uow.SupportTicketRepository.GetQueryable().FirstOrDefaultAsync(x => x.Id == id);
        if (t == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy ticket");
        t.Status = dto.Status;
        t.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, t);
    }

    public async Task<IServiceResult> UpsertBlogAsync(BlogPost post)
    {
        var existing = post.Id == Guid.Empty ? null : await uow.BlogPostRepository.GetQueryable().FirstOrDefaultAsync(b => b.Id == post.Id);
        if (existing == null)
        {
            post.Id = Guid.NewGuid();
            await uow.BlogPostRepository.CreateAsync(post);
        }
        else
        {
            existing.Title = post.Title;
            existing.Slug = post.Slug;
            existing.Summary = post.Summary;
            existing.Body = post.Body;
            existing.Tag = post.Tag;
            existing.IsPublished = post.IsPublished;
        }
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, post.Id == Guid.Empty ? existing : post);
    }

    public async Task<IServiceResult> UpsertFaqAsync(FaqItem item)
    {
        if (item.Id == Guid.Empty)
        {
            item.Id = Guid.NewGuid();
            await uow.FaqRepository.CreateAsync(item);
        }
        else
        {
            var e = await uow.FaqRepository.GetQueryable().FirstOrDefaultAsync(x => x.Id == item.Id);
            if (e == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy FAQ");
            e.Question = item.Question;
            e.Answer = item.Answer;
            e.Category = item.Category;
            e.SortOrder = item.SortOrder;
            e.IsPublished = item.IsPublished;
        }
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG);
    }

    public async Task<IServiceResult> UpsertResourceAsync(ResourceItem item)
    {
        if (item.Id == Guid.Empty)
        {
            item.Id = Guid.NewGuid();
            await uow.ResourceRepository.CreateAsync(item);
        }
        else
        {
            var e = await uow.ResourceRepository.GetQueryable().FirstOrDefaultAsync(x => x.Id == item.Id);
            if (e == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy tài nguyên");
            e.Title = item.Title;
            e.Summary = item.Summary;
            e.Body = item.Body;
            e.Category = item.Category;
            e.Industry = item.Industry;
            e.IsPublished = item.IsPublished;
        }
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG);
    }

    public async Task<IServiceResult> UpsertPageAsync(ContentPage page)
    {
        var e = await uow.ContentPageRepository.GetQueryable().FirstOrDefaultAsync(x => x.Slug == page.Slug);
        if (e == null)
        {
            page.Id = Guid.NewGuid();
            await uow.ContentPageRepository.CreateAsync(page);
        }
        else
        {
            e.Title = page.Title;
            e.Body = page.Body;
            e.IsPublished = page.IsPublished;
            e.UpdatedAt = DateTime.UtcNow;
        }
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG);
    }

    public async Task<IServiceResult> UpsertPlanAsync(SubscriptionPlan plan)
    {
        var e = await uow.PlanRepository.GetQueryable().FirstOrDefaultAsync(x => x.Code == plan.Code);
        if (e == null)
        {
            plan.Id = Guid.NewGuid();
            await uow.PlanRepository.CreateAsync(plan);
        }
        else
        {
            e.Name = plan.Name;
            e.PriceVnd = plan.PriceVnd;
            e.DurationDays = plan.DurationDays;
            e.Description = plan.Description;
            e.IsActive = plan.IsActive;
        }
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG);
    }

    public async Task<IServiceResult> UpsertPromoAsync(PromoCode promo)
    {
        var e = await uow.PromoCodeRepository.GetQueryable().FirstOrDefaultAsync(x => x.Code == promo.Code);
        if (e == null)
        {
            promo.Id = Guid.NewGuid();
            await uow.PromoCodeRepository.CreateAsync(promo);
        }
        else
        {
            e.DiscountPercent = promo.DiscountPercent;
            e.IsActive = promo.IsActive;
            e.ExpiresAt = promo.ExpiresAt;
        }
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG);
    }
}

public class B2BService(IUnitOfWork uow, UserManager<UserAccount> users) : IB2BService
{
    public async Task<IServiceResult> UniversityDashboardAsync(Guid userId)
    {
        var org = await GetOrgAsync(userId, "University");
        if (org == null) return new ServiceResult(Const.FAIL_READ_CODE, "Không phải thành viên quản trị trường");

        var memberIds = await uow.OrganizationMemberRepository.GetQueryable().AsNoTracking()
            .Where(m => m.OrganizationId == org.Id && m.Role == "Member")
            .Select(m => m.UserId).ToListAsync();

        var sessions = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => memberIds.Contains(s.UserId) && s.Status == "Completed").ToListAsync();

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            organization = org.Name,
            students = memberIds.Count,
            avgReadiness = sessions.Count == 0 ? 0 : Math.Round(sessions.Average(s => s.OverallScore ?? 0), 1),
            sessions = sessions.Count,
            skillGaps = new[] { "Giao tiếp", "STAR Result", "Chiều sâu kỹ thuật" }
        });
    }

    public async Task<IServiceResult> UniversityStudentsAsync(Guid userId)
    {
        var org = await GetOrgAsync(userId, "University");
        if (org == null) return new ServiceResult(Const.FAIL_READ_CODE, "Không phải thành viên quản trị trường");

        var members = await uow.OrganizationMemberRepository.GetQueryable().AsNoTracking()
            .Where(m => m.OrganizationId == org.Id && m.Role == "Member").ToListAsync();
        var data = new List<object>();
        foreach (var m in members)
        {
            var u = await users.FindByIdAsync(m.UserId.ToString());
            var avg = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
                .Where(s => s.UserId == m.UserId && s.Status == "Completed")
                .Select(s => (double?)s.OverallScore).AverageAsync() ?? 0;
            data.Add(new { m.UserId, fullName = u?.FullName, email = u?.Email, avgScore = Math.Round(avg, 1) });
        }
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data);
    }

    public async Task<IServiceResult> EnterpriseInsightsAsync(Guid userId)
    {
        var org = await GetOrgAsync(userId, "Enterprise");
        if (org == null) return new ServiceResult(Const.FAIL_READ_CODE, "Không phải thành viên quản trị doanh nghiệp");

        var sessions = await uow.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .Where(s => s.Status == "Completed").ToListAsync();
        var byIndustry = sessions.GroupBy(s => s.Industry)
            .Select(g => new { industry = g.Key, avg = Math.Round(g.Average(x => x.OverallScore ?? 0), 1), count = g.Count() })
            .OrderByDescending(x => x.count).Take(10);
        var byPosition = sessions.GroupBy(s => s.Position)
            .Select(g => new { position = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count).Take(10);

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            organization = org.Name,
            hotSkills = new[] { "Giải quyết vấn đề", "Giao tiếp", "Thiết kế API" },
            missingSkills = new[] { "Thiết kế hệ thống", "Lãnh đạo" },
            byIndustry,
            interestedPositions = byPosition
        });
    }

    private async Task<Organization?> GetOrgAsync(Guid userId, string type)
    {
        return await uow.OrganizationMemberRepository.GetQueryable().AsNoTracking()
            .Where(m => m.UserId == userId && (m.Role == "Admin" || m.Role == "UniversityAdmin" || m.Role == "EnterpriseAdmin"))
            .Join(uow.OrganizationRepository.GetQueryable().AsNoTracking().Where(o => o.Type == type),
                m => m.OrganizationId, o => o.Id, (m, o) => o)
            .FirstOrDefaultAsync();
    }
}

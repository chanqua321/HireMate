using HireMate.Modules.Admin.Abstractions;
using HireMate.Modules.Onboarding.Cv;
using HireMate.BuildingBlocks;

using Common;
using Common.DTOs.PublicDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace HireMate.Modules.Admin.Services;

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
            data.Add(new
            {
                u.Id,
                u.Email,
                u.FullName,
                u.IsPremium,
                u.OnboardingCompleted,
                u.LockoutEnd,
                emailConfirmed = u.EmailConfirmed,
                avatarUrl = u.AvatarUrl,
                roles = r
            });
        }
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data);
    }

    public async Task<IServiceResult> PatchUserAsync(Guid id, PatchUserDto dto)
    {
        var user = await users.FindByIdAsync(id.ToString());
        if (user == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        if (AppRoles.IsSystemAdminEmail(user.Email) && dto.Lock == true)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không thể khóa tài khoản admin hệ thống.");

        if (dto.Lock == true)
            user.LockoutEnd = DateTimeOffset.UtcNow.AddYears(100);
        if (dto.Lock == false)
            user.LockoutEnd = null;
        if (dto.IsPremium.HasValue)
        {
            user.IsPremium = dto.IsPremium.Value;
            // Keep CurrentPlanCode consistent with IsPremium for admin toggles.
            if (!dto.IsPremium.Value)
            {
                user.CurrentPlanCode = "free";
            }
            else if (PlanTier.Rank(user.CurrentPlanCode) == 0)
            {
                user.CurrentPlanCode = "premium";
                user.PlanSelectedAt = DateTime.UtcNow;
            }
        }
        await users.UpdateAsync(user);

        if (!string.IsNullOrWhiteSpace(dto.Role))
        {
            var role = dto.Role.Trim();
            if (!AppRoles.IsKnown(role))
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Vai trò không hợp lệ");
            if (role == AppRoles.Admin)
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không thể gán quyền Admin qua API. Chỉ có admin@gmail.com.");
            if (AppRoles.IsSystemAdminEmail(user.Email))
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không thể đổi role tài khoản admin hệ thống.");
            if (!await roles.RoleExistsAsync(role))
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không tìm thấy vai trò");
            var current = await users.GetRolesAsync(user);
            await users.RemoveFromRolesAsync(user, current);
            await users.AddToRoleAsync(user, role);
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

    public async Task<IServiceResult> CreateTicketAsync(AdminCreateTicketDto dto)
    {
        if (dto.UserId.HasValue)
        {
            var linked = await users.FindByIdAsync(dto.UserId.Value.ToString());
            if (linked == null || linked.IsDeleted)
                return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        }

        var status = string.IsNullOrWhiteSpace(dto.Status) ? "Open" : dto.Status.Trim();
        var ticket = new SupportTicket
        {
            Id = Guid.NewGuid(),
            UserId = dto.UserId,
            Email = dto.Email.Trim(),
            Subject = dto.Subject.Trim(),
            Body = dto.Body.Trim(),
            Status = status,
            CreatedAt = DateTime.UtcNow
        };
        await uow.SupportTicketRepository.CreateAsync(ticket);
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã tạo ticket hỗ trợ", ticket);
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
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, existing ?? post);
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
        plan.Code = NormalizePlanCode(plan.Code, plan.Name);
        if (string.IsNullOrWhiteSpace(plan.Code))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mã gói (code) bắt buộc — nhập slug hoặc tên gói.");

        SubscriptionPlan? e = null;
        if (plan.Id != Guid.Empty)
            e = await uow.PlanRepository.GetQueryable().FirstOrDefaultAsync(x => x.Id == plan.Id);

        e ??= await uow.PlanRepository.GetQueryable()
            .FirstOrDefaultAsync(x => x.Code == plan.Code);

        // Sửa gói cũ bị lưu code rỗng (cùng tên/giá)
        if (e == null && !string.IsNullOrWhiteSpace(plan.Name))
        {
            e = await uow.PlanRepository.GetQueryable()
                .FirstOrDefaultAsync(x => string.IsNullOrWhiteSpace(x.Code) && x.Name == plan.Name);
        }

        if (e == null)
        {
            plan.Id = plan.Id == Guid.Empty ? Guid.NewGuid() : plan.Id;
            await uow.PlanRepository.CreateAsync(plan);
        }
        else
        {
            if (string.IsNullOrWhiteSpace(e.Code) || e.Code != plan.Code)
            {
                var clash = await uow.PlanRepository.GetQueryable()
                    .AnyAsync(x => x.Code == plan.Code && x.Id != e.Id);
                if (clash)
                    return new ServiceResult(Const.FAIL_CREATE_CODE, $"Mã gói '{plan.Code}' đã tồn tại.");
                e.Code = plan.Code;
            }
            e.Name = plan.Name;
            e.Tagline = plan.Tagline;
            e.PriceVnd = plan.PriceVnd;
            e.DurationDays = plan.DurationDays;
            e.Description = plan.Description;
            e.SortOrder = plan.SortOrder;
            e.IsPopular = plan.IsPopular;
            e.IsActive = plan.IsActive;
            e.MaxAiOutputChars = plan.MaxAiOutputChars;
            e.MonthlyAiCharBudget = plan.MonthlyAiCharBudget;
        }
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG);
    }

    private static string NormalizePlanCode(string? code, string? name)
    {
        var raw = !string.IsNullOrWhiteSpace(code) ? code : name;
        if (string.IsNullOrWhiteSpace(raw))
            return string.Empty;

        var sb = new System.Text.StringBuilder();
        foreach (var ch in raw.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch))
                sb.Append(ch);
            else if (ch is ' ' or '-' or '_' && sb.Length > 0 && sb[^1] != '-')
                sb.Append('-');
        }
        return sb.ToString().Trim('-');
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

    public async Task<IServiceResult> QuestionsAsync(string? search, string? language, string? industry,
        string? position, string? category, string? difficulty, string? seniority, bool? isActive)
    {
        var query = uow.QuestionRepository.GetQueryable().AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(q => q.Content.Contains(search.Trim()));
        if (!string.IsNullOrWhiteSpace(language)) query = query.Where(q => q.Language == language.Trim());
        if (!string.IsNullOrWhiteSpace(industry)) query = query.Where(q => q.Industry == industry.Trim());
        if (!string.IsNullOrWhiteSpace(position)) query = query.Where(q => q.RoleHint == position.Trim());
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(q => q.Category == category.Trim());
        if (!string.IsNullOrWhiteSpace(difficulty)) query = query.Where(q => q.Difficulty == difficulty.Trim());
        if (!string.IsNullOrWhiteSpace(seniority)) query = query.Where(q => q.Seniority == seniority.Trim());
        if (isActive.HasValue) query = query.Where(q => q.IsActive == isActive.Value);
        var list = await query.OrderByDescending(q => q.UpdatedAt).Take(200).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> QuestionAsync(Guid id)
    {
        var question = await uow.QuestionRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(q => q.Id == id);
        return question == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy câu hỏi")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, question);
    }

    public async Task<IServiceResult> CreateQuestionAsync(Guid adminId, AdminQuestionWriteDto dto)
    {
        var error = ValidateQuestion(dto);
        if (error != null) return error;
        if (await QuestionExistsAsync(dto, null))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Question already exists.");
        var question = new Question { Id = Guid.NewGuid(), CreatedBy = adminId, CreatedAt = DateTime.UtcNow };
        ApplyQuestion(question, dto);
        await uow.QuestionRepository.CreateAsync(question);
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, Const.SUCCESS_CREATE_MSG, question);
    }

    public async Task<IServiceResult> UpdateQuestionAsync(Guid id, AdminQuestionWriteDto dto)
    {
        var error = ValidateQuestion(dto);
        if (error != null) return error;
        var question = await uow.QuestionRepository.GetQueryable().FirstOrDefaultAsync(q => q.Id == id);
        if (question == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy câu hỏi");
        if (await QuestionExistsAsync(dto, id))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Question already exists.");
        ApplyQuestion(question, dto);
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, question);
    }

    public async Task<IServiceResult> SetQuestionActiveAsync(Guid id, bool isActive)
    {
        var question = await uow.QuestionRepository.GetQueryable().FirstOrDefaultAsync(q => q.Id == id);
        if (question == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy câu hỏi");
        question.IsActive = isActive;
        question.UpdatedAt = DateTime.UtcNow;
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, question);
    }

    private async Task<bool> QuestionExistsAsync(AdminQuestionWriteDto dto, Guid? exceptId)
    {
        var content = dto.Content.Trim().ToLower();
        var language = dto.Language.Trim();
        var industry = dto.Industry?.Trim() ?? string.Empty;
        var role = dto.RoleHint?.Trim() ?? string.Empty;
        var category = dto.Category.Trim();
        return await uow.QuestionRepository.GetQueryable().AsNoTracking().AnyAsync(q =>
            q.Id != exceptId && q.Content.ToLower() == content && q.Language == language
            && (q.Industry ?? "") == industry && (q.RoleHint ?? "") == role && q.Category == category);
    }

    private static IServiceResult? ValidateQuestion(AdminQuestionWriteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Content) || dto.Content.Trim().Length > 1000)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Question Text là bắt buộc (tối đa 1000 ký tự)");
        if (dto.Language is not ("vi" or "en"))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Language phải là vi hoặc en");
        if (string.IsNullOrWhiteSpace(dto.Category) || dto.Category.Length > 100)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Category không hợp lệ");
        if (dto.Difficulty is not ("Easy" or "Medium" or "Hard"))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Difficulty không hợp lệ");
        if (dto.Seniority != null && dto.Seniority is not ("Student" or "Fresher" or "Junior" or "Mid" or "Senior"))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Seniority không hợp lệ");
        if (!string.IsNullOrWhiteSpace(dto.Industry)
            && CareerFieldCatalog.GetRoles(dto.Industry).Count == 0)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Career Field không hợp lệ");
        if (!string.IsNullOrWhiteSpace(dto.RoleHint) && string.IsNullOrWhiteSpace(dto.Industry))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Chọn Career Field trước khi chọn Position");
        if (!string.IsNullOrWhiteSpace(dto.Industry) && !CareerFieldCatalog.IsSuggestedRole(dto.RoleHint, dto.Industry))
        {
            var knownElsewhere = CareerFieldCatalog.IndustryRoles
                .Where(pair => !pair.Key.Equals(dto.Industry.Trim(), StringComparison.OrdinalIgnoreCase))
                .Any(pair => pair.Value.Any(role => role.Equals(dto.RoleHint!.Trim(), StringComparison.OrdinalIgnoreCase)));
            if (knownElsewhere) return new ServiceResult(Const.FAIL_CREATE_CODE, "Position không thuộc Career Field");
        }
        return null;
    }

    private static void ApplyQuestion(Question question, AdminQuestionWriteDto dto)
    {
        question.Content = dto.Content.Trim();
        question.Language = dto.Language.Trim();
        question.Industry = string.IsNullOrWhiteSpace(dto.Industry) ? null : dto.Industry.Trim();
        question.RoleHint = string.IsNullOrWhiteSpace(dto.RoleHint) ? null : dto.RoleHint.Trim();
        question.Category = dto.Category.Trim();
        question.Difficulty = dto.Difficulty.Trim();
        question.Seniority = dto.Seniority;
        question.Hint = string.IsNullOrWhiteSpace(dto.Hint) ? null : dto.Hint.Trim();
        question.IsActive = dto.IsActive;
        question.UpdatedAt = DateTime.UtcNow;
    }
}


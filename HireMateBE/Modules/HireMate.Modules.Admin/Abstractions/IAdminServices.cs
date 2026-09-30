using HireMate.BuildingBlocks;
using Common.DTOs.PublicDto;
using Infrastructure.Models;

namespace HireMate.Modules.Admin.Abstractions;

public interface IAdminService
{
    Task<IServiceResult> AnalyticsAsync();
    Task<IServiceResult> InterviewStatsAsync();
    Task<IServiceResult> UsersAsync(string? q, string? role, string? plan, string? status, int page, int pageSize);
    Task<IServiceResult> UserDetailAsync(Guid id);
    Task<IServiceResult> DashboardAsync(string? range, DateTime? from, DateTime? to, string? granularity);
    Task<IServiceResult> PaymentsAsync(string? q, string? status, string? plan, DateTime? from, DateTime? to, int page, int pageSize);
    Task<IServiceResult> PatchUserAsync(Guid id, PatchUserDto dto);
    Task<IServiceResult> RevenueAsync();
    Task<IServiceResult> RevenueSeriesAsync(string? granularity, DateTime? from, DateTime? to);
    Task<IServiceResult> ListTicketsAsync();
    Task<IServiceResult> CreateTicketAsync(AdminCreateTicketDto dto);
    Task<IServiceResult> PatchTicketAsync(Guid id, PatchTicketDto dto);
    Task<IServiceResult> BlogsAsync();
    Task<IServiceResult> BlogAsync(Guid id);
    Task<IServiceResult> SaveBlogAsync(Guid? id, Guid adminId, BlogWriteDto dto);
    Task<IServiceResult> DeleteBlogAsync(Guid id);
    Task<IServiceResult> SetBlogCoverAsync(Guid id, Microsoft.AspNetCore.Http.IFormFile? file);
    Task<IServiceResult> ListFaqsAsync();
    Task<IServiceResult> UpsertFaqAsync(FaqItem item);
    Task<IServiceResult> DeleteFaqAsync(Guid id);
    Task<IServiceResult> ListResourcesAsync();
    Task<IServiceResult> UpsertResourceAsync(ResourceItem item);
    Task<IServiceResult> DeleteResourceAsync(Guid id);
    Task<IServiceResult> UpsertPageAsync(ContentPage page);
    Task<IServiceResult> UpsertPlanAsync(SubscriptionPlan plan);
    Task<IServiceResult> ListPromosAsync();
    Task<IServiceResult> UpsertPromoAsync(PromoCode promo);
    Task<IServiceResult> DeletePromoAsync(Guid id);
    Task<IServiceResult> ListBadgesAsync();
    Task<IServiceResult> UpsertBadgeAsync(Badge badge);
    Task<IServiceResult> QuestionsAsync(string? search, string? language, string? industry,
        string? position, string? category, string? difficulty, string? seniority, bool? isActive);
    Task<IServiceResult> QuestionAsync(Guid id);
    Task<IServiceResult> CreateQuestionAsync(Guid adminId, AdminQuestionWriteDto dto);
    Task<IServiceResult> UpdateQuestionAsync(Guid id, AdminQuestionWriteDto dto);
    Task<IServiceResult> SetQuestionActiveAsync(Guid id, bool isActive);
}

public interface IB2BService
{
    Task<IServiceResult> UniversityDashboardAsync(Guid userId);
    Task<IServiceResult> UniversityStudentsAsync(Guid userId);
    Task<IServiceResult> EnterpriseInsightsAsync(Guid userId);
}


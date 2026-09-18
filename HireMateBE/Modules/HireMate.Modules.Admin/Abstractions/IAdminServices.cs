using HireMate.BuildingBlocks;
using Common.DTOs.PublicDto;
using Infrastructure.Models;

namespace HireMate.Modules.Admin.Abstractions;

public interface IAdminService
{
    Task<IServiceResult> AnalyticsAsync();
    Task<IServiceResult> InterviewStatsAsync();
    Task<IServiceResult> UsersAsync(string? q);
    Task<IServiceResult> PatchUserAsync(Guid id, PatchUserDto dto);
    Task<IServiceResult> RevenueAsync();
    Task<IServiceResult> ListTicketsAsync();
    Task<IServiceResult> CreateTicketAsync(AdminCreateTicketDto dto);
    Task<IServiceResult> PatchTicketAsync(Guid id, PatchTicketDto dto);
    Task<IServiceResult> UpsertBlogAsync(BlogPost post);
    Task<IServiceResult> UpsertFaqAsync(FaqItem item);
    Task<IServiceResult> UpsertResourceAsync(ResourceItem item);
    Task<IServiceResult> UpsertPageAsync(ContentPage page);
    Task<IServiceResult> UpsertPlanAsync(SubscriptionPlan plan);
    Task<IServiceResult> UpsertPromoAsync(PromoCode promo);
}

public interface IB2BService
{
    Task<IServiceResult> UniversityDashboardAsync(Guid userId);
    Task<IServiceResult> UniversityStudentsAsync(Guid userId);
    Task<IServiceResult> EnterpriseInsightsAsync(Guid userId);
}


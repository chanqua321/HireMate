using BusinessLogic.Base;
using Common.DTOs.PublicDto;
using Infrastructure.Models;
using Microsoft.AspNetCore.Http;

namespace BusinessLogic.IServices;
public interface IPublicContentService
{
    Task<IServiceResult> JoinWaitlistAsync(WaitlistDto dto);
    Task<IServiceResult> ContactAsync(ContactDto dto);
    Task<IServiceResult> GetPageAsync(string slug);
    Task<IServiceResult> GetBlogListAsync();
    Task<IServiceResult> GetBlogAsync(string slug);
    Task<IServiceResult> GetFaqAsync();
    Task<IServiceResult> CreateTicketAsync(CreateTicketDto dto);
}

public interface ICvService
{
    Task<IServiceResult> UploadAsync(Guid userId, IFormFile file, string webRoot);
    Task<IServiceResult> ListAsync(Guid userId);
    Task<IServiceResult> GetAsync(Guid userId, Guid id);
    Task<IServiceResult> AnalyzeAsync(Guid userId, Guid id);
}

public interface IMatchService
{
    Task<IServiceResult> MatchAsync(Guid userId, MatchRequestDto dto);
    Task<IServiceResult> GetAsync(Guid userId, Guid id);
}

public interface IEmailGenService
{
    Task<IServiceResult> GenerateAsync(Guid userId, EmailGenerateDto dto);
}

public interface ICareerOsService
{
    Task<IServiceResult> GetMemoryAsync(Guid userId);
    Task<IServiceResult> GetProfileHubAsync(Guid userId);
    Task<IServiceResult> GetProgressAsync(Guid userId);
    Task<IServiceResult> GetDevelopmentAsync(Guid userId);
    Task<IServiceResult> GetPathAsync(Guid userId);
    Task<IServiceResult> GetLearningAsync(Guid userId);
    Task<IServiceResult> GetResourcesAsync(string? category);
    Task<IServiceResult> GetResourceAsync(Guid id);
}

public interface IBillingService
{
    Task<IServiceResult> GetPlansAsync();
    Task<IServiceResult> CheckoutAsync(Guid userId, CheckoutDto dto, string? clientIp);
    Task<IServiceResult> HandleVnPayReturnAsync(IDictionary<string, string> query);
    Task<IServiceResult> HandleVnPayIpnAsync(IDictionary<string, string> query);
    Task<IServiceResult> HandlePayOsWebhookAsync(string jsonBody);
    Task<IServiceResult> GetInvoicesAsync(Guid userId);
    Task<IServiceResult> GetInvoiceAsync(Guid userId, Guid id);
}

public interface IGrowthService
{
    Task<IServiceResult> GetReferralAsync(Guid userId);
    Task<IServiceResult> ApplyReferralAsync(Guid userId, ApplyReferralDto dto);
    Task<IServiceResult> GetBadgesAsync(Guid userId);
    Task<IServiceResult> GetLeaderboardAsync();
    Task<IServiceResult> GetBenchmarkAsync(Guid userId);
}

public interface IAdminService
{
    Task<IServiceResult> AnalyticsAsync();
    Task<IServiceResult> InterviewStatsAsync();
    Task<IServiceResult> UsersAsync(string? q);
    Task<IServiceResult> PatchUserAsync(Guid id, PatchUserDto dto);
    Task<IServiceResult> RevenueAsync();
    Task<IServiceResult> ListTicketsAsync();
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


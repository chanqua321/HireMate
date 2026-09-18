using HireMate.Modules.Admin;
using HireMate.Modules.Ai;
using HireMate.Modules.Billing;
using HireMate.Modules.Career;
using HireMate.Modules.Content;
using HireMate.Modules.Growth;
using HireMate.Modules.Identity;
using HireMate.Modules.Interview;
using HireMate.Modules.Onboarding;
using HireMate.Modules.Platform;

namespace APIs.Extensions;

/// <summary>
/// Modular monolith composition — mỗi module có thể tách thành microservice riêng sau này.
/// </summary>
public static class HireMateModulesExtensions
{
    public static IServiceCollection AddHireMateModules(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddPlatformModule();
        services.AddAiModule(configuration);
        services.AddIdentityModule();
        services.AddOnboardingModule();
        services.AddInterviewModule();
        services.AddBillingModule(configuration);
        services.AddCareerModule();
        services.AddGrowthModule();
        services.AddContentModule();
        services.AddAdminModule();
        return services;
    }
}


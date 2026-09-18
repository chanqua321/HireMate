using HireMate.Modules.Onboarding.Abstractions;
using HireMate.Modules.Onboarding.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Onboarding;

public static class DependencyInjection
{
    public static IServiceCollection AddOnboardingModule(this IServiceCollection services)
    {
        services.AddScoped<IOnboardingService, OnboardingService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<ICvService, CvService>();
        services.AddScoped<IDashboardService, DashboardService>();
        return services;
    }
}


using HireMate.Modules.Identity.Abstractions;
using HireMate.Modules.Identity.Background;
using HireMate.Modules.Identity.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Identity;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddHostedService<RefreshTokenCleanupService>();
        return services;
    }
}


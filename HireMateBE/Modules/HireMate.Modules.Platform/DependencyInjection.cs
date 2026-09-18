using HireMate.Modules.Platform.Abstractions;
using HireMate.Modules.Platform.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Platform;

public static class DependencyInjection
{
    public static IServiceCollection AddPlatformModule(this IServiceCollection services)
    {
        services.AddScoped<ISystemConfigService, SystemConfigService>();
        return services;
    }
}


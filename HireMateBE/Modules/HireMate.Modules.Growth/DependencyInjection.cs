using HireMate.Modules.Growth.Abstractions;
using HireMate.Modules.Growth.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Growth;

public static class DependencyInjection
{
    public static IServiceCollection AddGrowthModule(this IServiceCollection services)
    {
        services.AddScoped<IGrowthService, GrowthService>();
        return services;
    }
}


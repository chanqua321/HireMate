using HireMate.Modules.Career.Abstractions;
using HireMate.Modules.Career.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Career;

public static class DependencyInjection
{
    public static IServiceCollection AddCareerModule(this IServiceCollection services)
    {
        services.AddScoped<IMatchService, MatchService>();
        services.AddScoped<IEmailGenService, EmailGenService>();
        services.AddScoped<ICareerOsService, CareerOsService>();
        return services;
    }
}


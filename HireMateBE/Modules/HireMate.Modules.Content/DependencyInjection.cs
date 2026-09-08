using HireMate.Modules.Content.Abstractions;
using HireMate.Modules.Content.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Content;

public static class DependencyInjection
{
    public static IServiceCollection AddContentModule(this IServiceCollection services)
    {
        services.AddScoped<IPublicContentService, PublicContentService>();
        return services;
    }
}


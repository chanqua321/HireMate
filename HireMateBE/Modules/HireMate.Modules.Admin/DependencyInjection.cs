using HireMate.Modules.Admin.Abstractions;
using HireMate.Modules.Admin.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Admin;

public static class DependencyInjection
{
    public static IServiceCollection AddAdminModule(this IServiceCollection services)
    {
        services.AddScoped<IAdminService, AdminService>();
        return services;
    }
}


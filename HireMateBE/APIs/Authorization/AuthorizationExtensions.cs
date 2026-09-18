using Common;
using Microsoft.AspNetCore.Authorization;

namespace APIs.Authorization;

public static class AuthorizationExtensions
{
    public static IServiceCollection AddHireMateAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .RequireRole(AppRoles.All)
                .Build();

            options.AddPolicy(AppPolicies.Authenticated, policy =>
                policy.RequireAuthenticatedUser()
                    .RequireRole(AppRoles.All));

            options.AddPolicy(AppPolicies.AdminOnly, policy =>
                policy.RequireAuthenticatedUser()
                    .RequireRole(AppRoles.Admin));
        });

        return services;
    }
}


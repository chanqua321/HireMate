using HireMate.Modules.Billing.Abstractions;
using HireMate.Modules.Billing.Payments;
using HireMate.Modules.Billing.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Billing;

public static class DependencyInjection
{
    public static IServiceCollection AddBillingModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PayOsOptions>(configuration.GetSection(PayOsOptions.SectionName));
        services.AddHttpClient<PayOsClient>((sp, client) =>
        {
            var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<PayOsOptions>>().Value;
            var baseUrl = string.IsNullOrWhiteSpace(opts.ApiBaseUrl) ? "https://api-merchant.payos.vn" : opts.ApiBaseUrl;
            client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(30);
        });
        services.AddScoped<IBillingService, BillingService>();
        return services;
    }
}


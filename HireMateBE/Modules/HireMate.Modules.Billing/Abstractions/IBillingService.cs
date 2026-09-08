using HireMate.BuildingBlocks;
using Common.DTOs.PublicDto;

namespace HireMate.Modules.Billing.Abstractions;

public interface IBillingService
{
    Task<IServiceResult> GetPlansAsync();
    Task<IServiceResult> CheckoutAsync(Guid userId, CheckoutDto dto, string? clientIp);
    Task<string> ProcessVNPayIpnAsync(Dictionary<string, string> queryParams);
    Task<IServiceResult> HandlePayOsWebhookAsync(string jsonBody);
    Task<IServiceResult> GetInvoicesAsync(Guid userId);
    Task<IServiceResult> GetInvoiceAsync(Guid userId, Guid id);
}


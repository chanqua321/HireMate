using HireMate.BuildingBlocks;
using Common.DTOs.PublicDto;

namespace HireMate.Modules.Billing.Abstractions;

public interface IBillingService
{
    Task<IServiceResult> GetPlansAsync();
    Task<IServiceResult> CheckoutAsync(Guid userId, CheckoutDto dto, string? clientIp);
    Task<string> ProcessVNPayIpnAsync(Dictionary<string, string> queryParams);
    Task<IServiceResult> HandlePayOsWebhookAsync(string jsonBody);
    /// <summary>Authenticated confirm — ownership checked against userId.</summary>
    Task<IServiceResult> ConfirmPayOsAsync(Guid userId, ConfirmPayOsDto dto);
    Task<IServiceResult> GetInvoicesAsync(Guid userId);
    Task<IServiceResult> GetInvoiceAsync(Guid userId, Guid id);
    Task<IServiceResult> GetPaymentsAsync(Guid userId);
}

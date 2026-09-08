using HireMate.BuildingBlocks;
using Common;
using Common.DTOs.PublicDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using HireMate.Modules.Billing.Abstractions;
using HireMate.Modules.Ai;
using HireMate.Modules.Billing.Payments;

namespace HireMate.Modules.Billing.Services;

public class BillingService(
    IUnitOfWork uow,
    UserManager<UserAccount> users,
    IAiQuotaService aiQuota,
    IConfiguration config,
    Microsoft.Extensions.Options.IOptions<HireMate.Modules.Billing.Payments.PayOsOptions> payOsOptions,
    HireMate.Modules.Billing.Payments.PayOsClient payOsClient) : IBillingService
{
    private readonly HireMate.Modules.Billing.Payments.PayOsOptions _payOs = payOsOptions.Value;
    private readonly HireMate.Modules.Billing.Payments.PayOsClient _payOsClient = payOsClient;

    public async Task<IServiceResult> GetPlansAsync()
    {
        var plans = await uow.PlanRepository.GetQueryable().AsNoTracking()
            .Where(p => p.IsActive).OrderBy(p => p.SortOrder).ThenBy(p => p.PriceVnd).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, plans);
    }

    public async Task<IServiceResult> CheckoutAsync(Guid userId, CheckoutDto dto, string? clientIp)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var plan = await uow.PlanRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.Code == dto.PlanCode && p.IsActive);
        if (plan == null) return new ServiceResult(Const.FAIL_CREATE_CODE, "Không tìm thấy gói");

        await aiQuota.RefreshExpiryAsync(user);
        var currentRank = PlanTier.Rank(user.CurrentPlanCode);
        var targetRank = PlanTier.Rank(plan.Code);
        if (user.PlanSelectedAt != null && targetRank <= currentRank && currentRank > 0)
        {
            var currentName = PlanTier.DisplayName(user.CurrentPlanCode);
            var targetName = PlanTier.DisplayName(plan.Code);
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                targetRank == currentRank
                    ? $"Bạn đang dùng gói {currentName} (còn hạn). Không thể mua lại cùng cấp — hãy nâng cấp lên gói cao hơn hoặc đợi hết hạn để gia hạn."
                    : $"Bạn đang dùng gói {currentName} (cao hơn {targetName}). Chỉ được nâng cấp lên gói cao hơn.");
        }

        decimal amount = plan.PriceVnd;
        if (!string.IsNullOrWhiteSpace(dto.PromoCode))
        {
            var promo = await uow.PromoCodeRepository.GetQueryable()
                .FirstOrDefaultAsync(p => p.Code == dto.PromoCode && p.IsActive
                    && (p.ExpiresAt == null || p.ExpiresAt > DateTime.UtcNow));
            if (promo != null)
                amount = Math.Round(amount * (1 - promo.DiscountPercent / 100m), 0);
        }

        var method = string.IsNullOrWhiteSpace(dto.PaymentMethod)
            ? "VNPay"
            : dto.PaymentMethod.Trim();

        if (plan.PriceVnd <= 0 || PlanTier.Rank(plan.Code) == 0)
            return await ActivateFreeAsync(user, userId, plan);

        var allowMock = await GetSettingBoolAsync(SettingKeys.PaymentsAllowMock);
        if (method.Equals("Mock", StringComparison.OrdinalIgnoreCase))
        {
            if (!allowMock)
                return new ServiceResult(Const.FAIL_CREATE_CODE,
                    "Thanh toán thử (Mock) đã tắt. Dùng VNPay (sandbox/tiền thật).");
            return await CheckoutMockAsync(user, userId, plan, amount);
        }

        if (method.Equals("PayOS", StringComparison.OrdinalIgnoreCase))
            return await CheckoutPayOsAsync(user, userId, plan, amount);

        return await CheckoutVnPayAsync(user, userId, plan, amount, clientIp);
    }

    private async Task<IServiceResult> CheckoutPayOsAsync(UserAccount user, Guid userId, SubscriptionPlan plan, decimal amount)
    {
        if (!_payOs.Enabled)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "PayOS chưa được cấu hình. Thiết lập PayOS:Enabled + ClientId + ApiKey + ChecksumKey.");

        var orderCode = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 900_000_000_000L + Random.Shared.Next(1, 999);
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlanId = plan.Id,
            InvoiceNumber = $"HM-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            AmountVnd = amount,
            Status = "Pending",
            PaymentMethod = "PayOS"
        };
        await uow.InvoiceRepository.CreateAsync(invoice);
        await uow.PaymentRepository.CreateAsync(new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            AmountVnd = amount,
            Provider = "PayOS",
            Status = "Pending",
            TransactionRef = orderCode.ToString()
        });
        await uow.SaveChangesAsync();

        var created = await _payOsClient.CreatePaymentLinkAsync(orderCode, (int)amount, "HireMate");
        if (!created.Ok || string.IsNullOrWhiteSpace(created.CheckoutUrl))
            return new ServiceResult(Const.FAIL_CREATE_CODE, created.Error ?? "Tạo thanh toán PayOS thất bại");

        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Chuyển hướng tới PayOS", new
        {
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.AmountVnd,
            invoice.Status,
            paymentMethod = "PayOS",
            paymentUrl = created.CheckoutUrl,
            qrCode = created.QrCode,
            orderCode,
            paymentLinkId = created.PaymentLinkId,
            isPremium = user.IsPremium,
            plan = plan.Code
        });
    }

    private async Task<IServiceResult> CheckoutVnPayAsync(UserAccount user, Guid userId, SubscriptionPlan plan, decimal amount, string? clientIp)
    {
        var tmnCode = config["VnPay:TmnCode"];
        var hashSecret = config["VnPay:HashSecret"];
        var returnUrl = config["VnPay:ReturnUrl"];
        var paymentUrlBase = config["VnPay:PaymentUrl"] ?? "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

        if (string.IsNullOrWhiteSpace(tmnCode) || string.IsNullOrWhiteSpace(hashSecret) || string.IsNullOrWhiteSpace(returnUrl))
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "VNPay chưa được cấu hình. Thiết lập VnPay:TmnCode + HashSecret + ReturnUrl trong appsettings.");

        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlanId = plan.Id,
            InvoiceNumber = $"HM-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            AmountVnd = amount,
            Status = "Pending",
            PaymentMethod = "VNPay"
        };
        var txnRef = Common.Helper.PaymentHelper.GenerateTxnRef(invoice.Id);
        await uow.InvoiceRepository.CreateAsync(invoice);
        await uow.PaymentRepository.CreateAsync(new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            AmountVnd = amount,
            Provider = "VNPay",
            Status = "Pending",
            TransactionRef = txnRef
        });
        await uow.SaveChangesAsync();

        var orderInfo = Uri.EscapeDataString($"HireMate {plan.Name} {invoice.InvoiceNumber}");
        var vnpParameters = Common.Helper.PaymentHelper.CreateVnPayParameters(
            tmnCode,
            (long)amount * 100,
            txnRef,
            orderInfo,
            returnUrl,
            string.IsNullOrWhiteSpace(clientIp) ? "127.0.0.1" : clientIp,
            "vn");
        var url = Common.Helper.PaymentHelper.CreateVnPayUrl(paymentUrlBase, vnpParameters, hashSecret);

        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Tạo url thanh toán thành công", url);
    }

    private async Task<IServiceResult> CheckoutMockAsync(UserAccount user, Guid userId, SubscriptionPlan plan, decimal amount)
    {
        var mockInvoice = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlanId = plan.Id,
            InvoiceNumber = $"HM-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            AmountVnd = amount,
            Status = "Paid",
            PaymentMethod = "Mock",
            PaidAt = DateTime.UtcNow
        };
        await uow.InvoiceRepository.CreateAsync(mockInvoice);
        await uow.PaymentRepository.CreateAsync(new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = mockInvoice.Id,
            AmountVnd = amount,
            Provider = "Mock",
            Status = "Success",
            TransactionRef = Guid.NewGuid().ToString("N")[..12]
        });

        user.IsPremium = plan.Code is not "free";
        ApplyPlanFlags(user, plan, renew: true);
        user.UpdatedAt = DateTime.UtcNow;
        await users.UpdateAsync(user);
        await uow.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Thanh toán thành công", new
        {
            mockInvoice.Id,
            mockInvoice.InvoiceNumber,
            mockInvoice.AmountVnd,
            mockInvoice.Status,
            paymentMethod = "Mock",
            isPremium = user.IsPremium,
            plan = plan.Code,
            planName = plan.Name
        });
    }

    public async Task<IServiceResult> HandlePayOsWebhookAsync(string jsonBody)
    {
        if (!_payOs.Enabled)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "PayOS đang tắt");

        using var doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(jsonBody) ? "{}" : jsonBody);
        var root = doc.RootElement;
        var signature = root.TryGetProperty("signature", out var sig) ? sig.GetString() ?? "" : "";
        if (!root.TryGetProperty("data", out var data) || data.ValueKind == JsonValueKind.Null)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Webhook PayOS không hợp lệ");

        if (!HireMate.Modules.Billing.Payments.PayOsHelper.VerifyWebhookSignature(data, signature, _payOs.ChecksumKey))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Chữ ký PayOS không hợp lệ");

        var orderCode = data.TryGetProperty("orderCode", out var oc)
            ? (oc.ValueKind == JsonValueKind.Number ? oc.GetInt64().ToString() : oc.GetString())
            : null;
        var code = data.TryGetProperty("code", out var dc) ? dc.GetString() : root.TryGetProperty("code", out var rc) ? rc.GetString() : null;

        var payment = await uow.PaymentRepository.GetQueryable()
            .Include(p => p.Invoice)!.ThenInclude(i => i!.Plan)
            .FirstOrDefaultAsync(p => p.TransactionRef == orderCode && p.Provider == "PayOS");

        if (payment?.Invoice == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy đơn hàng");

        if (payment.Status == "Success" && payment.Invoice.Status == "Paid")
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đơn hàng đã được thanh toán", new { success = true });

        if (code == "00" || (root.TryGetProperty("success", out var ok) && ok.ValueKind == JsonValueKind.True))
        {
            payment.Status = "Success";
            payment.Invoice.Status = "Paid";
            payment.Invoice.PaidAt = DateTime.UtcNow;
            var user = await users.FindByIdAsync(payment.Invoice.UserId.ToString());
            if (user != null)
            {
                ApplyPlanFlags(user, payment.Invoice.Plan, renew: true);
                user.UpdatedAt = DateTime.UtcNow;
                await users.UpdateAsync(user);
            }
            await uow.SaveChangesAsync();
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Thanh toán thành công", new { success = true });
        }

        payment.Status = "Failed";
        payment.Invoice.Status = "Failed";
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.FAIL_UPDATE_CODE, "Thanh toán thất bại", new { success = false });
    }

    public async Task<string> ProcessVNPayIpnAsync(Dictionary<string, string> queryParams)
    {
        try
        {
            var hashSecret = config["VnPay:HashSecret"];
            if (string.IsNullOrWhiteSpace(hashSecret))
                return VnPayJsonResponse("99", "VNPay chưa cấu hình");

            if (!queryParams.TryGetValue("vnp_SecureHash", out var receivedHash) || string.IsNullOrWhiteSpace(receivedHash))
                return VnPayJsonResponse("97", "Invalid signature");

            var verifyParams = new Dictionary<string, string>(queryParams, StringComparer.Ordinal);
            verifyParams.Remove("vnp_SecureHash");
            verifyParams.Remove("vnp_SecureHashType");

            var calculatedHash = Common.Helper.PaymentHelper.CreateHmac512(
                hashSecret, Common.Helper.PaymentHelper.CreateDataString(verifyParams));
            if (!receivedHash.Equals(calculatedHash, StringComparison.InvariantCultureIgnoreCase))
                return VnPayJsonResponse("97", "Invalid signature");

            queryParams.TryGetValue("vnp_TxnRef", out var txnRef);
            queryParams.TryGetValue("vnp_ResponseCode", out var responseCode);
            queryParams.TryGetValue("vnp_TransactionStatus", out var transactionStatus);

            if (string.IsNullOrWhiteSpace(txnRef))
                return VnPayJsonResponse("01", "Không tìm thấy đơn thanh toán");

            var payment = await uow.PaymentRepository.GetQueryable()
                .Include(p => p.Invoice)!.ThenInclude(i => i!.Plan)
                .FirstOrDefaultAsync(p => p.TransactionRef == txnRef && p.Provider == "VNPay");

            if (payment?.Invoice == null)
                return VnPayJsonResponse("01", "Không tìm thấy đơn thanh toán");

            if (payment.Status == "Success" && payment.Invoice.Status == "Paid")
                return VnPayJsonResponse("00", "Đơn hàng đã được thanh toán");

            if (responseCode == "00" && (string.IsNullOrWhiteSpace(transactionStatus) || transactionStatus == "00"))
            {
                payment.Status = "Success";
                payment.Invoice.Status = "Paid";
                payment.Invoice.PaidAt = DateTime.UtcNow;

                var user = await users.FindByIdAsync(payment.Invoice.UserId.ToString());
                if (user != null)
                {
                    ApplyPlanFlags(user, payment.Invoice.Plan, renew: true);
                    user.UpdatedAt = DateTime.UtcNow;
                    await users.UpdateAsync(user);
                }
                await uow.SaveChangesAsync();
                return VnPayJsonResponse("00", "Thanh toán thành công");
            }

            payment.Status = "Failed";
            payment.Invoice.Status = "Failed";
            await uow.SaveChangesAsync();
            return VnPayJsonResponse("02", "Thanh toán thất bại");
        }
        catch (Exception ex)
        {
            return VnPayJsonResponse("99", "Lỗi không xác định: " + ex.Message);
        }
    }

    private static string VnPayJsonResponse(string rspCode, string message)
        => System.Text.Json.JsonSerializer.Serialize(new { RspCode = rspCode, Message = message });

    public async Task<IServiceResult> GetInvoicesAsync(Guid userId)
    {
        var list = await uow.InvoiceRepository.GetQueryable().AsNoTracking()
            .Include(i => i.Plan)
            .Where(i => i.UserId == userId).OrderByDescending(i => i.CreatedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> GetInvoiceAsync(Guid userId, Guid id)
    {
        var inv = await uow.InvoiceRepository.GetQueryable().AsNoTracking()
            .Include(i => i.Plan)
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
        return inv == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy hóa đơn")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, inv);
    }

    private async Task<IServiceResult> ActivateFreeAsync(UserAccount user, Guid userId, SubscriptionPlan plan)
    {
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlanId = plan.Id,
            InvoiceNumber = $"HM-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}",
            AmountVnd = 0,
            Status = "Paid",
            PaymentMethod = "Free",
            PaidAt = DateTime.UtcNow
        };
        await uow.InvoiceRepository.CreateAsync(invoice);
        ApplyPlanFlags(user, plan);
        user.UpdatedAt = DateTime.UtcNow;
        await users.UpdateAsync(user);
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã kích hoạt gói Miễn phí", new
        {
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.AmountVnd,
            invoice.Status,
            paymentMethod = "Free",
            isPremium = user.IsPremium,
            plan = plan.Code,
            planName = plan.Name
        });
    }

    private static void ApplyPlanFlags(UserAccount user, SubscriptionPlan? plan, bool renew = false)
    {
        var code = PlanTier.Normalize(plan?.Code);
        user.CurrentPlanCode = code;
        if (renew || PlanTier.Rank(code) > 0)
            user.PlanSelectedAt = DateTime.UtcNow;
        else
            user.PlanSelectedAt ??= DateTime.UtcNow;
        user.IsPremium = PlanTier.Rank(code) > 0;
    }

    private async Task<string?> GetSettingAsync(string key)
    {
        var row = await uow.SystemSettingRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == key);
        return row?.Value;
    }

    private async Task<bool> GetSettingBoolAsync(string key)
    {
        var raw = await GetSettingAsync(key);
        return raw is "true" or "1" or "True";
    }
}



using HireMate.BuildingBlocks;
using Common;
using Common.DTOs.PublicDto;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.Data.SqlClient;
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
    HireMateContext db,
    UserManager<UserAccount> users,
    IAiQuotaService aiQuota,
    IConfiguration config,
    Microsoft.Extensions.Options.IOptions<PayOsOptions> payOsOptions,
    PayOsClient payOsClient) : IBillingService
{
    private readonly PayOsOptions _payOs = payOsOptions.Value;
    private readonly PayOsClient _payOsClient = payOsClient;

    public async Task<IServiceResult> GetPlansAsync()
    {
        var plans = await uow.PlanRepository.GetQueryable()
            .Where(p => p.IsActive)
            .OrderBy(p => p.SortOrder).ThenBy(p => p.PriceVnd)
            .ToListAsync();

        var broken = plans.Where(p => string.IsNullOrWhiteSpace(p.Code)).ToList();
        if (broken.Count > 0)
        {
            foreach (var p in broken)
            {
                var slug = SlugifyPlanCode(p.Name);
                if (string.IsNullOrWhiteSpace(slug))
                    slug = $"plan-{p.Id.ToString("N")[..8]}";
                var baseSlug = slug;
                var n = 2;
                while (await uow.PlanRepository.GetQueryable().AnyAsync(x => x.Code == slug && x.Id != p.Id))
                    slug = $"{baseSlug}-{n++}";
                p.Code = slug;
            }
            await uow.SaveChangesAsync();
        }

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, plans);
    }

    private static string SlugifyPlanCode(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return string.Empty;
        var sb = new System.Text.StringBuilder();
        foreach (var ch in name.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(ch))
                sb.Append(ch);
            else if (ch is ' ' or '-' or '_' && sb.Length > 0 && sb[^1] != '-')
                sb.Append('-');
        }
        return sb.ToString().Trim('-');
    }

    public async Task<IServiceResult> CheckoutAsync(Guid userId, CheckoutDto dto, string? clientIp)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null) return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        // Plan + amount from server DB only — never trust FE amount.
        var plan = await uow.PlanRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.Code == dto.PlanCode && p.IsActive);
        if (plan == null) return new ServiceResult(Const.FAIL_CREATE_CODE, "Không tìm thấy gói");

        await aiQuota.RefreshExpiryAsync(user);

        var currentCode = user.CurrentPlanCode?.Trim().ToLowerInvariant() ?? "free";
        var currentRank = PlanTier.Rank(currentCode);
        var targetRank = PlanTier.Rank(plan.Code);
        var targetCode = plan.Code.Trim().ToLowerInvariant();

        if (currentRank > 0)
        {
            var snap = await aiQuota.GetSnapshotAsync(user);
            var stillActive = snap.PlanExpiresAt == null || snap.PlanExpiresAt > DateTime.UtcNow;
            if (stillActive)
            {
                var currentPlanEntity = await uow.PlanRepository.GetQueryable().AsNoTracking()
                    .FirstOrDefaultAsync(p => p.Code == currentCode);
                var currentPrice = currentPlanEntity?.PriceVnd ?? 0m;
                var currentName = currentPlanEntity?.Name ?? PlanTier.DisplayName(currentCode);
                var targetName = plan.Name;

                if (string.Equals(currentCode, targetCode, StringComparison.OrdinalIgnoreCase))
                {
                    return new ServiceResult(Const.FAIL_CREATE_CODE,
                        $"Bạn đang dùng gói {currentName} (còn hạn đến {(snap.PlanExpiresAt?.ToLocalTime().ToString("dd/MM/yyyy") ?? "hết kỳ")}). Không thể mua lại cùng gói — hãy nâng cấp lên gói cao hơn hoặc đợi hết hạn để gia hạn/đổi gói.");
                }

                var isDowngrade = targetRank < currentRank || plan.PriceVnd < currentPrice;
                var isSameTier = targetRank == currentRank && plan.PriceVnd <= currentPrice;
                if (isDowngrade || isSameTier)
                {
                    return new ServiceResult(Const.FAIL_CREATE_CODE,
                        isDowngrade
                            ? $"Bạn đang dùng gói {currentName} (cao hơn {targetName}). Không thể hạ gói trong kỳ hiện tại — đợi hết hạn rồi chọn lại."
                            : $"Bạn đang dùng gói {currentName} (cùng cấp với {targetName}). Chỉ được nâng cấp lên gói cao hơn hoặc đợi hết hạn.");
                }
            }
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

        if (plan.PriceVnd <= 0)
        {
            if (PlanTier.Rank(plan.Code) > 0)
                return new ServiceResult(Const.FAIL_CREATE_CODE,
                    "Gói trả phí không được đặt giá 0đ. Hãy đặt giá hoặc dùng mã gói free.");
            return await ActivateFreeAsync(user, userId, plan);
        }

        if (amount <= 0)
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "Số tiền sau giảm giá không hợp lệ. Kiểm tra mã khuyến mãi.");

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

        const int maxPersistenceAttempts = 6;
        Invoice? invoice = null;
        Payment? payment = null;
        long orderCode = 0;

        // The unique DB index is the final authority. A pre-check can still race another checkout,
        // so retry only a confirmed Provider + TransactionRef unique-constraint collision.
        for (var attempt = 1; attempt <= maxPersistenceAttempts; attempt++)
        {
            try
            {
                orderCode = await AllocateUniquePayOsOrderCodeAsync();
            }
            catch
            {
                return new ServiceResult(Const.FAIL_CREATE_CODE, "Không tạo được mã đơn PayOS duy nhất. Thử lại.");
            }

            invoice = new Invoice
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                PlanId = plan.Id,
                InvoiceNumber = await AllocateInvoiceNumberAsync(),
                AmountVnd = amount,
                Status = InvoiceStatuses.Pending,
                PaymentMethod = "PayOS"
            };
            payment = new Payment
            {
                Id = Guid.NewGuid(),
                InvoiceId = invoice.Id,
                AmountVnd = amount,
                Provider = "PayOS",
                Status = PaymentStatuses.Pending,
                TransactionRef = orderCode.ToString()
            };

            try
            {
                await uow.InvoiceRepository.CreateAsync(invoice);
                await uow.PaymentRepository.CreateAsync(payment);
                await uow.SaveChangesAsync();
                break;
            }
            catch (DbUpdateException ex) when (IsPaymentTransactionRefCollision(ex))
            {
                db.ChangeTracker.Clear();
                invoice = null;
                payment = null;
            }
        }

        if (invoice == null || payment == null)
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "Không tạo được mã đơn PayOS duy nhất sau nhiều lần thử. Vui lòng thử lại.");

        var created = await _payOsClient.CreatePaymentLinkAsync(orderCode, (int)amount, "HireMate");
        if (!created.Ok || string.IsNullOrWhiteSpace(created.CheckoutUrl))
        {
            payment.Status = PaymentStatuses.Failed;
            invoice.Status = InvoiceStatuses.Failed;
            await uow.SaveChangesAsync();
            return new ServiceResult(Const.FAIL_CREATE_CODE, created.Error ?? "Tạo thanh toán PayOS thất bại");
        }

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
            InvoiceNumber = await AllocateInvoiceNumberAsync(),
            AmountVnd = amount,
            Status = InvoiceStatuses.Pending,
            PaymentMethod = "VNPay"
        };
        var txnRef = await AllocateUniqueTxnRefAsync("VNPay", () => Common.Helper.PaymentHelper.GenerateTxnRef(invoice.Id));
        await uow.InvoiceRepository.CreateAsync(invoice);
        await uow.PaymentRepository.CreateAsync(new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = invoice.Id,
            AmountVnd = amount,
            Provider = "VNPay",
            Status = PaymentStatuses.Pending,
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
            InvoiceNumber = await AllocateInvoiceNumberAsync(),
            AmountVnd = amount,
            Status = InvoiceStatuses.Paid,
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
            Status = PaymentStatuses.Success,
            TransactionRef = Guid.NewGuid().ToString("N")[..12]
        });

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

        JsonDocument doc;
        try { doc = JsonDocument.Parse(string.IsNullOrWhiteSpace(jsonBody) ? "{}" : jsonBody); }
        catch (JsonException) { return new ServiceResult(Const.FAIL_UPDATE_CODE, "Webhook PayOS không hợp lệ"); }
        using var parsedWebhook = doc;
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Object)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Webhook PayOS không hợp lệ");
        var signature = root.TryGetProperty("signature", out var sig) && sig.ValueKind == JsonValueKind.String
            ? sig.GetString() ?? "" : "";
        if (!root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Webhook PayOS không hợp lệ");

        if (!PayOsHelper.VerifyWebhookSignature(data, signature, _payOs.ChecksumKey))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Chữ ký PayOS không hợp lệ");

        var orderCode = data.TryGetProperty("orderCode", out var oc)
            && oc.ValueKind == JsonValueKind.Number && oc.TryGetInt64(out var code) && code > 0
                ? code.ToString(System.Globalization.CultureInfo.InvariantCulture) : null;
        if (orderCode == null)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Mã đơn PayOS không hợp lệ");
        var webhookAmount = PayOsHelper.ReadPaidAmount(data);

        var payment = await uow.PaymentRepository.GetQueryable()
            .Include(p => p.Invoice)!.ThenInclude(i => i!.Plan)
            .FirstOrDefaultAsync(p => p.TransactionRef == orderCode && p.Provider == "PayOS");

        if (payment?.Invoice == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy đơn hàng");

        if (PayOsHelper.IsSuccessfulWebhookData(data)
            && (!webhookAmount.HasValue || webhookAmount.Value != payment.Invoice.AmountVnd
                || webhookAmount.Value != payment.AmountVnd))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Số tiền PayOS không hợp lệ hoặc không khớp hóa đơn.");

        if (IsAlreadySettled(payment))
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đơn hàng đã được thanh toán", new { success = true, idempotent = true });

        // Only the signed data.code determines success. Root-level fields are unsigned.
        if (PayOsHelper.IsSuccessfulWebhookData(data))
        {
            var settle = await TrySettlePaymentAsync(payment.Id, webhookAmount, source: "payos_webhook");
            return settle.Ok
                ? new ServiceResult(Const.SUCCESS_UPDATE_CODE, settle.Message, new { success = true, idempotent = settle.Idempotent })
                : new ServiceResult(Const.FAIL_UPDATE_CODE, settle.Message, new { success = false });
        }

        await MarkPaymentFailedAsync(payment.Id);
        return new ServiceResult(Const.FAIL_UPDATE_CODE, "Thanh toán thất bại", new { success = false });
    }

    public async Task<IServiceResult> ConfirmPayOsAsync(Guid userId, ConfirmPayOsDto dto)
    {
        if (!_payOs.Enabled)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "PayOS đang tắt");

        Payment? payment = null;
        if (!string.IsNullOrWhiteSpace(dto.OrderCode))
        {
            payment = await uow.PaymentRepository.GetQueryable()
                .Include(p => p.Invoice)!.ThenInclude(i => i!.Plan)
                .FirstOrDefaultAsync(p => p.TransactionRef == dto.OrderCode && p.Provider == "PayOS");
        }
        else if (dto.InvoiceId.HasValue)
        {
            payment = await uow.PaymentRepository.GetQueryable()
                .Include(p => p.Invoice)!.ThenInclude(i => i!.Plan)
                .FirstOrDefaultAsync(p => p.InvoiceId == dto.InvoiceId && p.Provider == "PayOS");
        }

        // Ownership: do not leak other users' payment existence details.
        if (payment?.Invoice == null || payment.Invoice.UserId != userId)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy đơn hàng PayOS");

        if (dto.Cancel)
        {
            if (payment.Status == PaymentStatuses.Pending)
                await MarkPaymentCancelledAsync(payment.Id);
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Người dùng hủy thanh toán", new { success = false, status = "cancel" });
        }

        if (IsAlreadySettled(payment))
        {
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đơn hàng đã được thanh toán", new
            {
                success = true,
                idempotent = true,
                invoiceId = payment.InvoiceId,
                invoiceNumber = payment.Invoice.InvoiceNumber,
                plan = payment.Invoice.Plan?.Code,
                amountVnd = payment.Invoice.AmountVnd
            });
        }

        // Ignore FE Status/Code — verify with PayOS merchant API only.
        if (!long.TryParse(payment.TransactionRef, out var orderCode))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Mã đơn PayOS không hợp lệ");

        PayOsLinkDetail? detail;
        try
        {
            detail = await _payOsClient.GetPaymentLinkDetailAsync(orderCode);
        }
        catch
        {
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không xác minh được trạng thái PayOS (timeout/lỗi mạng). Thử lại sau.");
        }

        if (detail != null && detail.OrderCode != orderCode)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Mã đơn PayOS không khớp");
        var paidByApi = string.Equals(detail?.Status, "PAID", StringComparison.OrdinalIgnoreCase);
        if (!paidByApi)
        {
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Thanh toán chưa hoàn tất", new
            {
                success = false,
                invoiceId = payment.InvoiceId,
                status = detail?.Status ?? "pending"
            });
        }

        var settle = await TrySettlePaymentAsync(payment.Id, detail?.Amount, source: "payos_confirm");
        if (!settle.Ok)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, settle.Message, new { success = false });

        // Reload for response
        payment = await uow.PaymentRepository.GetQueryable().AsNoTracking()
            .Include(p => p.Invoice)!.ThenInclude(i => i!.Plan)
            .FirstAsync(p => p.Id == payment.Id);

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, settle.Message, new
        {
            success = true,
            idempotent = settle.Idempotent,
            invoiceId = payment.InvoiceId,
            invoiceNumber = payment.Invoice!.InvoiceNumber,
            plan = payment.Invoice.Plan?.Code,
            amountVnd = payment.Invoice.AmountVnd,
            isPremium = PlanTier.Rank(payment.Invoice.Plan?.Code) > 0
        });
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
            queryParams.TryGetValue("vnp_Amount", out var amountRaw);

            if (string.IsNullOrWhiteSpace(txnRef))
                return VnPayJsonResponse("01", "Không tìm thấy đơn thanh toán");

            var payment = await uow.PaymentRepository.GetQueryable()
                .Include(p => p.Invoice)!.ThenInclude(i => i!.Plan)
                .FirstOrDefaultAsync(p => p.TransactionRef == txnRef && p.Provider == "VNPay");

            if (payment?.Invoice == null)
                return VnPayJsonResponse("01", "Không tìm thấy đơn thanh toán");

            if (IsAlreadySettled(payment))
                return VnPayJsonResponse("00", "Đơn hàng đã được thanh toán");

            if (responseCode == "00" && (string.IsNullOrWhiteSpace(transactionStatus) || transactionStatus == "00"))
            {
                decimal? paidVnd = null;
                if (long.TryParse(amountRaw, out var amountCents))
                    paidVnd = amountCents / 100m;

                var settle = await TrySettlePaymentAsync(payment.Id, paidVnd, source: "vnpay_ipn");
                return settle.Ok
                    ? VnPayJsonResponse("00", settle.Message)
                    : VnPayJsonResponse("04", settle.Message);
            }

            await MarkPaymentFailedAsync(payment.Id);
            return VnPayJsonResponse("02", "Thanh toán thất bại");
        }
        catch (Exception)
        {
            return VnPayJsonResponse("99", "Lỗi không xác định");
        }
    }

    private static string VnPayJsonResponse(string rspCode, string message)
        => JsonSerializer.Serialize(new { RspCode = rspCode, Message = message });

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

    public async Task<IServiceResult> GetPaymentsAsync(Guid userId)
    {
        var list = await uow.PaymentRepository.GetQueryable().AsNoTracking()
            .Include(p => p.Invoice)
            .Where(p => p.Invoice != null && p.Invoice.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Take(50)
            .Select(p => new
            {
                p.Id,
                p.InvoiceId,
                invoiceNumber = p.Invoice!.InvoiceNumber,
                p.AmountVnd,
                p.Provider,
                p.Status,
                p.TransactionRef,
                p.CreatedAt,
                invoiceStatus = p.Invoice.Status,
                planId = p.Invoice.PlanId
            })
            .ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    /// <summary>
    /// Atomic settle: only Pending → Success. Duplicate calls are idempotent.
    /// Requires an exact provider amount matching the server-side invoice before any paid transition.
    /// </summary>
    private async Task<SettleResult> TrySettlePaymentAsync(Guid paymentId, decimal? verifiedAmountVnd, string source)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        try
        {
            var payment = await db.Payments
                .Include(p => p.Invoice)!.ThenInclude(i => i!.Plan)
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment?.Invoice == null)
            {
                await tx.RollbackAsync();
                return SettleResult.Fail("Không tìm thấy đơn thanh toán");
            }

            if (!verifiedAmountVnd.HasValue || verifiedAmountVnd.Value <= 0 || payment.Invoice.AmountVnd <= 0)
            {
                await tx.RollbackAsync();
                return SettleResult.Fail("Không xác minh được số tiền thanh toán hợp lệ.");
            }
            if (payment.Invoice.Id != payment.InvoiceId || payment.AmountVnd != payment.Invoice.AmountVnd
                || verifiedAmountVnd.Value != payment.Invoice.AmountVnd)
            {
                await tx.RollbackAsync();
                return SettleResult.Fail("Số tiền thanh toán không khớp hóa đơn (từ chối cấp gói).");
            }

            if (payment.Status == PaymentStatuses.Success && payment.Invoice.Status == InvoiceStatuses.Paid)
            {
                await tx.CommitAsync();
                return SettleResult.Already("Đơn hàng đã được thanh toán");
            }

            if (payment.Status is PaymentStatuses.Cancelled or PaymentStatuses.Expired)
            {
                await tx.RollbackAsync();
                return SettleResult.Fail($"Đơn hàng ở trạng thái {payment.Status}, không thể thanh toán.");
            }

            // Conditional update — race-safe if two handlers run together.
            var updated = await db.Payments
                .Where(p => p.Id == paymentId && p.Status == PaymentStatuses.Pending)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, PaymentStatuses.Success));

            if (updated == 0)
            {
                await db.Entry(payment).ReloadAsync();
                if (payment.Status == PaymentStatuses.Success)
                {
                    await tx.CommitAsync();
                    return SettleResult.Already("Đơn hàng đã được thanh toán");
                }
                await tx.RollbackAsync();
                return SettleResult.Fail("Không thể cập nhật trạng thái thanh toán.");
            }

            payment.Invoice.Status = InvoiceStatuses.Paid;
            payment.Invoice.PaidAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            var user = await users.FindByIdAsync(payment.Invoice.UserId.ToString());
            if (user == null || payment.Invoice.Plan == null)
                throw new InvalidOperationException("Payment invoice has no valid user or plan.");
            ApplyPlanFlags(user, payment.Invoice.Plan, renew: true);
            user.UpdatedAt = DateTime.UtcNow;
            var updateUser = await users.UpdateAsync(user);
            if (!updateUser.Succeeded)
                throw new InvalidOperationException("Unable to apply paid plan entitlement.");

            await tx.CommitAsync();
            return SettleResult.Success($"Thanh toán thành công ({source})");
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }
    }

    private async Task MarkPaymentFailedAsync(Guid paymentId)
    {
        await db.Payments
            .Where(p => p.Id == paymentId && p.Status == PaymentStatuses.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, PaymentStatuses.Failed));

        var invoiceId = await db.Payments.AsNoTracking()
            .Where(p => p.Id == paymentId)
            .Select(p => p.InvoiceId)
            .FirstOrDefaultAsync();
        if (invoiceId != Guid.Empty)
        {
            await db.Invoices
                .Where(i => i.Id == invoiceId && i.Status == InvoiceStatuses.Pending)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.Status, InvoiceStatuses.Failed));
        }
    }

    private async Task MarkPaymentCancelledAsync(Guid paymentId)
    {
        await db.Payments
            .Where(p => p.Id == paymentId && p.Status == PaymentStatuses.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.Status, PaymentStatuses.Cancelled));

        var invoiceId = await db.Payments.AsNoTracking()
            .Where(p => p.Id == paymentId)
            .Select(p => p.InvoiceId)
            .FirstOrDefaultAsync();
        if (invoiceId != Guid.Empty)
        {
            await db.Invoices
                .Where(i => i.Id == invoiceId && i.Status == InvoiceStatuses.Pending)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.Status, InvoiceStatuses.Cancelled));
        }
    }

    private static bool IsAlreadySettled(Payment payment)
        => payment.Status == PaymentStatuses.Success
           && payment.Invoice != null
           && payment.Invoice.Status == InvoiceStatuses.Paid;

    private static bool IsPaymentTransactionRefCollision(DbUpdateException ex)
        => ex.InnerException is SqlException { Number: 2601 or 2627 }
            && ex.InnerException.Message.Contains("IX_Payments_Provider_TransactionRef", StringComparison.OrdinalIgnoreCase);

    private async Task<long> AllocateUniquePayOsOrderCodeAsync()
    {
        for (var attempt = 0; attempt < 12; attempt++)
        {
            var code = (DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() % 800_000_000_000L) * 1000L
                       + Random.Shared.Next(0, 1000);
            if (code <= 0) code = Math.Abs(code) + 1;
            var key = code.ToString();
            var exists = await uow.PaymentRepository.GetQueryable()
                .AnyAsync(p => p.Provider == "PayOS" && p.TransactionRef == key);
            if (!exists) return code;
            await Task.Delay(5);
        }
        throw new InvalidOperationException("Unable to allocate unique PayOS orderCode");
    }

    private async Task<string> AllocateUniqueTxnRefAsync(string provider, Func<string> factory)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var refCode = factory();
            var exists = await uow.PaymentRepository.GetQueryable()
                .AnyAsync(p => p.Provider == provider && p.TransactionRef == refCode);
            if (!exists) return refCode;
        }
        return $"{factory()}-{Random.Shared.Next(1000, 9999)}";
    }

    private async Task<string> AllocateInvoiceNumberAsync()
    {
        for (var i = 0; i < 6; i++)
        {
            var num = $"HM-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
            var exists = await uow.InvoiceRepository.GetQueryable().AnyAsync(x => x.InvoiceNumber == num);
            if (!exists) return num;
        }
        return $"HM-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..6]}";
    }

    private async Task<IServiceResult> ActivateFreeAsync(UserAccount user, Guid userId, SubscriptionPlan plan)
    {
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PlanId = plan.Id,
            InvoiceNumber = await AllocateInvoiceNumberAsync(),
            AmountVnd = 0,
            Status = InvoiceStatuses.Paid,
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

    /// <summary>
    /// Renewal semantics (existing): set PlanSelectedAt = now on paid renew/upgrade.
    /// Expiration is derived from last Paid invoice + DurationDays (AiQuotaService.RefreshExpiryAsync).
    /// Business has not confirmed stack-remaining-time renewal — keep current simple reset of period start.
    /// </summary>
    private static void ApplyPlanFlags(UserAccount user, SubscriptionPlan? plan, bool renew = false)
    {
        var code = string.IsNullOrWhiteSpace(plan?.Code)
            ? "free"
            : plan!.Code.Trim().ToLowerInvariant();
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

    private sealed class SettleResult
    {
        public bool Ok { get; private init; }
        public bool Idempotent { get; private init; }
        public string Message { get; private init; } = "";

        public static SettleResult Success(string msg) => new() { Ok = true, Message = msg };
        public static SettleResult Already(string msg) => new() { Ok = true, Idempotent = true, Message = msg };
        public static SettleResult Fail(string msg) => new() { Ok = false, Message = msg };
    }
}

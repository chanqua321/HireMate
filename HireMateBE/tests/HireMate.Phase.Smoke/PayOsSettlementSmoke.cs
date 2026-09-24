using System.Net;
using System.Text;
using System.Text.Json;
using Common;
using Common.DTOs.PublicDto;
using HireMate.BuildingBlocks;
using HireMate.Modules.Billing.Payments;
using HireMate.Modules.Billing.Services;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

internal static class PayOsSettlementSmoke
{
    private const string TestChecksum = "local-deterministic-test-key";
    private const int ExpectedAmount = 79_000;

    public static async Task RunAsync(Action<bool, string> check)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<HireMateContext>(options => options.UseSqlite(connection));
        services.AddIdentity<UserAccount, Role>().AddEntityFrameworkStores<HireMateContext>();
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HireMateContext>();
        await db.Database.EnsureCreatedAsync();
        using var uow = new UnitOfWork(db);
        var users = scope.ServiceProvider.GetRequiredService<UserManager<UserAccount>>();
        var responses = new Dictionary<long, string>();
        var payOsOptions = Options.Create(new PayOsOptions { Enabled = true, ChecksumKey = TestChecksum,
            ClientId = "test-client", ApiKey = "test-api-key" });
        using var client = new HttpClient(new MerchantHandler(responses)) { BaseAddress = new Uri("https://payos.test/") };
        var service = new BillingService(uow, db, users, null!, new ConfigurationBuilder().Build(),
            payOsOptions, new PayOsClient(client, payOsOptions));
        var plan = new SubscriptionPlan { Id = Guid.NewGuid(), Code = "premium", Name = "Premium",
            PriceVnd = ExpectedAmount, IsActive = true };
        db.SubscriptionPlans.Add(plan);
        await db.SaveChangesAsync();

        long nextOrder = 91_000_000;
        async Task<(Guid UserId, Guid PaymentId, Guid InvoiceId, long Order)> NewPendingAsync()
        {
            var order = ++nextOrder;
            var userId = Guid.NewGuid();
            var invoiceId = Guid.NewGuid();
            var paymentId = Guid.NewGuid();
            db.Users.Add(new UserAccount { Id = userId, UserName = $"pay-{order}@example.test",
                Email = $"pay-{order}@example.test", FullName = "PayOS Smoke",
                SecurityStamp = Guid.NewGuid().ToString(), ConcurrencyStamp = Guid.NewGuid().ToString(),
                CurrentPlanCode = "free", IsPremium = false });
            db.Invoices.Add(new Invoice { Id = invoiceId, UserId = userId, PlanId = plan.Id,
                InvoiceNumber = $"TEST-{order}", AmountVnd = ExpectedAmount,
                Status = InvoiceStatuses.Pending, PaymentMethod = "PayOS" });
            db.Payments.Add(new Payment { Id = paymentId, InvoiceId = invoiceId, AmountVnd = ExpectedAmount,
                Provider = "PayOS", Status = PaymentStatuses.Pending, TransactionRef = order.ToString() });
            await db.SaveChangesAsync();
            db.ChangeTracker.Clear();
            return (userId, paymentId, invoiceId, order);
        }

        async Task<bool> IsUnsettledAsync(Guid paymentId, Guid invoiceId, Guid userId)
        {
            db.ChangeTracker.Clear();
            var payment = await db.Payments.AsNoTracking().SingleAsync(p => p.Id == paymentId);
            var invoice = await db.Invoices.AsNoTracking().SingleAsync(i => i.Id == invoiceId);
            var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId);
            return payment.Status != PaymentStatuses.Success && invoice.Status != InvoiceStatuses.Paid
                   && invoice.PaidAt == null && !user.IsPremium && user.CurrentPlanCode == "free"
                   && user.PlanSelectedAt == null;
        }

        static string Webhook(long order, object? amount, string code = "00", bool sign = true)
        {
            var dataJson = amount == null
                ? JsonSerializer.Serialize(new { orderCode = order, code })
                : JsonSerializer.Serialize(new { orderCode = order, code, amount });
            using var data = JsonDocument.Parse(dataJson);
            var signature = sign ? PayOsHelper.SignDataObject(data.RootElement, TestChecksum) : "invalid-signature";
            return JsonSerializer.Serialize(new { data = data.RootElement, signature, code = "00" });
        }

        void MerchantDetail(long order, string status, object? amount, long? returnedOrder = null)
        {
            var data = new Dictionary<string, object?> { ["orderCode"] = returnedOrder ?? order, ["status"] = status };
            if (amount != null) data["amount"] = amount;
            responses[order] = JsonSerializer.Serialize(new { code = "00", data });
        }

        var valid = await NewPendingAsync();
        var validWebhook = Webhook(valid.Order, ExpectedAmount);
        var validResult = await service.HandlePayOsWebhookAsync(validWebhook);
        db.ChangeTracker.Clear();
        var paid = await db.Payments.AsNoTracking().SingleAsync(p => p.Id == valid.PaymentId);
        var paidInvoice = await db.Invoices.AsNoTracking().SingleAsync(i => i.Id == valid.InvoiceId);
        var premium = await db.Users.AsNoTracking().SingleAsync(u => u.Id == valid.UserId);
        check(validResult.Status == Const.SUCCESS_UPDATE_CODE && paid.Status == PaymentStatuses.Success
              && paidInvoice.Status == InvoiceStatuses.Paid && paidInvoice.PaidAt != null
              && premium.IsPremium && premium.CurrentPlanCode == "premium" && premium.PlanSelectedAt != null,
            "Valid signed PayOS webhook settles exact invoice amount and grants plan once");
        var firstPaidAt = paidInvoice.PaidAt;
        var firstPlanAt = premium.PlanSelectedAt;
        var duplicateWebhook = await service.HandlePayOsWebhookAsync(validWebhook);
        db.ChangeTracker.Clear();
        check(duplicateWebhook.Status == Const.SUCCESS_UPDATE_CODE
              && (await db.Invoices.AsNoTracking().SingleAsync(i => i.Id == valid.InvoiceId)).PaidAt == firstPaidAt
              && (await db.Users.AsNoTracking().SingleAsync(u => u.Id == valid.UserId)).PlanSelectedAt == firstPlanAt
              && await db.Payments.CountAsync(p => p.TransactionRef == valid.Order.ToString()) == 1,
            "Duplicate signed webhook does not renew entitlement twice");

        foreach (var (label, amount) in new (string, object?)[]
                 { ("missing", null), ("mismatch", ExpectedAmount - 1), ("zero", 0),
                   ("string", "79000"), ("fraction", 79000.5m) })
        {
            var sample = await NewPendingAsync();
            var result = await service.HandlePayOsWebhookAsync(Webhook(sample.Order, amount));
            check(result.Status == Const.FAIL_UPDATE_CODE
                  && await IsUnsettledAsync(sample.PaymentId, sample.InvoiceId, sample.UserId),
                $"Signed PayOS webhook {label} amount is rejected without payment or entitlement changes");
        }

        var failed = await NewPendingAsync();
        var failedResult = await service.HandlePayOsWebhookAsync(Webhook(failed.Order, ExpectedAmount, code: "01"));
        check(failedResult.Status == Const.FAIL_UPDATE_CODE
              && await IsUnsettledAsync(failed.PaymentId, failed.InvoiceId, failed.UserId),
            "Failed signed provider status does not grant a plan");
        var badSignature = await NewPendingAsync();
        var badSignatureResult = await service.HandlePayOsWebhookAsync(Webhook(badSignature.Order, ExpectedAmount, sign: false));
        check(badSignatureResult.Status == Const.FAIL_UPDATE_CODE
              && await IsUnsettledAsync(badSignature.PaymentId, badSignature.InvoiceId, badSignature.UserId),
            "Invalid PayOS signature cannot settle");
        using (var signedData = JsonDocument.Parse(JsonSerializer.Serialize(new
               { orderCode = badSignature.Order, code = "00", amount = ExpectedAmount })))
            check(!PayOsHelper.VerifyWebhookSignature(signedData.RootElement, "present", ""),
                "Missing checksum configuration cannot validate a PayOS signature");
        var unknownResult = await service.HandlePayOsWebhookAsync(Webhook(++nextOrder, ExpectedAmount));
        check(unknownResult.Status == Const.WARNING_NO_DATA_CODE, "Unknown PayOS order cannot settle");

        var inconsistent = await NewPendingAsync();
        await db.Payments.Where(p => p.Id == inconsistent.PaymentId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.AmountVnd, ExpectedAmount - 1));
        var inconsistentResult = await service.HandlePayOsWebhookAsync(Webhook(inconsistent.Order, ExpectedAmount));
        check(inconsistentResult.Status == Const.FAIL_UPDATE_CODE
              && await IsUnsettledAsync(inconsistent.PaymentId, inconsistent.InvoiceId, inconsistent.UserId),
            "Payment amount inconsistent with server invoice cannot settle");

        var confirm = await NewPendingAsync();
        MerchantDetail(confirm.Order, "PAID", ExpectedAmount);
        var confirmDto = new ConfirmPayOsDto { OrderCode = confirm.Order.ToString(), Status = "PAID", Code = "00" };
        var foreignConfirm = await service.ConfirmPayOsAsync(Guid.NewGuid(), confirmDto);
        check(foreignConfirm.Status == Const.WARNING_NO_DATA_CODE
              && await IsUnsettledAsync(confirm.PaymentId, confirm.InvoiceId, confirm.UserId),
            "Other users cannot confirm a known PayOS order");
        var firstConfirm = await service.ConfirmPayOsAsync(confirm.UserId, confirmDto);
        db.ChangeTracker.Clear();
        var confirmedAt = (await db.Users.AsNoTracking().SingleAsync(u => u.Id == confirm.UserId)).PlanSelectedAt;
        var secondConfirm = await service.ConfirmPayOsAsync(confirm.UserId, confirmDto);
        db.ChangeTracker.Clear();
        check(firstConfirm.Status == Const.SUCCESS_UPDATE_CODE && secondConfirm.Status == Const.SUCCESS_UPDATE_CODE
              && confirmedAt != null
              && (await db.Users.AsNoTracking().SingleAsync(u => u.Id == confirm.UserId)).PlanSelectedAt == confirmedAt
              && await db.Payments.CountAsync(p => p.TransactionRef == confirm.Order.ToString()) == 1,
            "Duplicate merchant-confirm requests grant the plan once");

        foreach (var (label, amount) in new (string, object?)[]
                 { ("missing", null), ("mismatch", ExpectedAmount + 1), ("zero", 0), ("string", "79000") })
        {
            var sample = await NewPendingAsync();
            MerchantDetail(sample.Order, "PAID", amount);
            var result = await service.ConfirmPayOsAsync(sample.UserId,
                new ConfirmPayOsDto { OrderCode = sample.Order.ToString() });
            check(result.Status == Const.FAIL_UPDATE_CODE
                  && await IsUnsettledAsync(sample.PaymentId, sample.InvoiceId, sample.UserId),
                $"Merchant-confirm {label} amount is rejected without entitlement");
        }
        var wrongOrder = await NewPendingAsync();
        MerchantDetail(wrongOrder.Order, "PAID", ExpectedAmount, wrongOrder.Order + 1000);
        var wrongOrderResult = await service.ConfirmPayOsAsync(wrongOrder.UserId,
            new ConfirmPayOsDto { OrderCode = wrongOrder.Order.ToString() });
        check(wrongOrderResult.Status == Const.FAIL_UPDATE_CODE
              && await IsUnsettledAsync(wrongOrder.PaymentId, wrongOrder.InvoiceId, wrongOrder.UserId),
            "Merchant detail with another order code cannot settle");
        var pending = await NewPendingAsync();
        MerchantDetail(pending.Order, "CANCELLED", ExpectedAmount);
        var pendingResult = await service.ConfirmPayOsAsync(pending.UserId,
            new ConfirmPayOsDto { OrderCode = pending.Order.ToString() });
        check(pendingResult.Status == Const.FAIL_UPDATE_CODE
              && await IsUnsettledAsync(pending.PaymentId, pending.InvoiceId, pending.UserId),
            "Non-PAID merchant status cannot settle");

        // Both entry points race against the same row from separate DbContexts.
        await RunWebhookConfirmRaceAsync(check);
    }

    private static async Task RunWebhookConfirmRaceAsync(Action<bool, string> check)
    {
        var connectionString = $"Data Source=payos-race-{Guid.NewGuid():N};Mode=Memory;Cache=Shared;Default Timeout=5";
        await using var anchor = new SqliteConnection(connectionString);
        await anchor.OpenAsync();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<HireMateContext>(options => options.UseSqlite(connectionString));
        services.AddIdentity<UserAccount, Role>().AddEntityFrameworkStores<HireMateContext>();
        using var provider = services.BuildServiceProvider();
        var order = 92_000_001L;
        var userId = Guid.NewGuid();
        var invoiceId = Guid.NewGuid();
        var paymentId = Guid.NewGuid();
        await using (var seedScope = provider.CreateAsyncScope())
        {
            var db = seedScope.ServiceProvider.GetRequiredService<HireMateContext>();
            await db.Database.EnsureCreatedAsync();
            var plan = new SubscriptionPlan { Id = Guid.NewGuid(), Code = "premium", Name = "Premium",
                PriceVnd = ExpectedAmount };
            db.SubscriptionPlans.Add(plan);
            db.Users.Add(new UserAccount { Id = userId, UserName = "race@example.test",
                Email = "race@example.test", FullName = "Race Test", CurrentPlanCode = "free",
                SecurityStamp = Guid.NewGuid().ToString(), ConcurrencyStamp = Guid.NewGuid().ToString() });
            db.Invoices.Add(new Invoice { Id = invoiceId, UserId = userId, PlanId = plan.Id,
                InvoiceNumber = "RACE-1", AmountVnd = ExpectedAmount, Status = InvoiceStatuses.Pending,
                PaymentMethod = "PayOS" });
            db.Payments.Add(new Payment { Id = paymentId, InvoiceId = invoiceId, Provider = "PayOS",
                AmountVnd = ExpectedAmount, Status = PaymentStatuses.Pending, TransactionRef = order.ToString() });
            await db.SaveChangesAsync();
        }

        var options = Options.Create(new PayOsOptions { Enabled = true, ChecksumKey = TestChecksum,
            ClientId = "test-client", ApiKey = "test-api-key" });
        var detail = JsonSerializer.Serialize(new { code = "00", data = new
        {
            orderCode = order, status = "PAID", amount = ExpectedAmount
        } });
        var responses = new Dictionary<long, string> { [order] = detail };
        var dataJson = JsonSerializer.Serialize(new { orderCode = order, code = "00", amount = ExpectedAmount });
        using var data = JsonDocument.Parse(dataJson);
        var signature = PayOsHelper.SignDataObject(data.RootElement, TestChecksum);
        var body = JsonSerializer.Serialize(new { data = data.RootElement, signature });
        var start = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var ready = 0;

        async Task<IServiceResult?> RequestAsync(bool webhook)
        {
            await using var scope = provider.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<HireMateContext>();
            using var uow = new UnitOfWork(db);
            using var http = new HttpClient(new MerchantHandler(responses))
                { BaseAddress = new Uri("https://payos.test/") };
            var billing = new BillingService(uow, db, scope.ServiceProvider.GetRequiredService<UserManager<UserAccount>>(),
                null!, new ConfigurationBuilder().Build(), options, new PayOsClient(http, options));
            if (Interlocked.Increment(ref ready) == 2) start.SetResult();
            await start.Task;
            try
            {
                return webhook ? await billing.HandlePayOsWebhookAsync(body)
                    : await billing.ConfirmPayOsAsync(userId, new ConfirmPayOsDto { OrderCode = order.ToString() });
            }
            catch (SqliteException) { return null; } // SQLite's single-writer lock is not SQL Server concurrency.
        }

        var webhookTask = Task.Run(() => RequestAsync(true));
        var confirmTask = Task.Run(() => RequestAsync(false));
        var results = await Task.WhenAll(webhookTask, confirmTask);
        await using var verifyScope = provider.CreateAsyncScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<HireMateContext>();
        var payment = await verifyDb.Payments.AsNoTracking().SingleAsync(p => p.Id == paymentId);
        var invoice = await verifyDb.Invoices.AsNoTracking().SingleAsync(i => i.Id == invoiceId);
        var user = await verifyDb.Users.AsNoTracking().SingleAsync(u => u.Id == userId);
        var newlySettled = results.Count(result =>
        {
            if (result?.Status != Const.SUCCESS_UPDATE_CODE || result.Data == null) return false;
            using var json = JsonDocument.Parse(JsonSerializer.Serialize(result.Data));
            return json.RootElement.TryGetProperty("idempotent", out var duplicate)
                   && duplicate.ValueKind == JsonValueKind.False;
        });
        check(payment.Status == PaymentStatuses.Success && invoice.Status == InvoiceStatuses.Paid
              && user.IsPremium && user.CurrentPlanCode == "premium" && newlySettled == 1,
            "Concurrent webhook and confirm have one new settlement across separate DbContexts");
    }

    private sealed class MerchantHandler(Dictionary<long, string> responses) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var part = request.RequestUri!.Segments[^1];
            var order = long.Parse(part);
            var json = responses.TryGetValue(order, out var response) ? response : "{}";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            });
        }
    }
}

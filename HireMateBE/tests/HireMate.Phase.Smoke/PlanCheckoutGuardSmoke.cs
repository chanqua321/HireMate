using System.Net;
using System.Text;
using Common;
using Common.DTOs.PublicDto;
using HireMate.BuildingBlocks;
using HireMate.Modules.Ai;
using HireMate.Modules.Billing.Payments;
using HireMate.Modules.Billing.Services;
using HireMate.Modules.Platform.Abstractions;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

internal static class PlanCheckoutGuardSmoke
{
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
        var payOsCalls = new CountingHandler();
        var payOsOptions = Options.Create(new PayOsOptions
        {
            Enabled = true,
            ClientId = "test-client",
            ApiKey = "test-api-key",
            ChecksumKey = "local-deterministic-test-key",
            ReturnUrl = "https://hiremate.test/billing-result",
            CancelUrl = "https://hiremate.test/pricing"
        });
        using var client = new HttpClient(payOsCalls) { BaseAddress = new Uri("https://payos.test/") };
        var quota = new AiQuotaService(uow, db, new StubAi(), new StubConfig(), users);
        var billing = new BillingService(uow, db, users, quota, new ConfigurationBuilder().Build(),
            payOsOptions, new PayOsClient(client, payOsOptions));

        var free = Plan("free", "Miễn phí", 0);
        var standard = Plan("premium", "Tiêu chuẩn", 79_000);
        var premium = Plan("combo", "Cao cấp", 149_000);
        db.SubscriptionPlans.AddRange(free, standard, premium);
        await db.SaveChangesAsync();

        var freeUser = await AddUserAsync(db, "free", selected: true);
        var standardUser = await AddPaidUserAsync(db, "premium", standard, active: true);
        var premiumUser = await AddPaidUserAsync(db, "combo", premium, active: true);
        var expiredUser = await AddPaidUserAsync(db, "combo", premium, active: false);
        var newUser = await AddUserAsync(db, "free", selected: false);

        await AssertRejected(billing, db, premiumUser, "premium", payOsCalls, check, "ACTIVE PREMIUM → STANDARD blocked");
        await AssertRejected(billing, db, premiumUser, "free", payOsCalls, check, "ACTIVE PREMIUM → FREE blocked");
        await AssertRejected(billing, db, premiumUser, "combo", payOsCalls, check, "ACTIVE PREMIUM → PREMIUM blocked");
        await AssertRejected(billing, db, standardUser, "premium", payOsCalls, check, "ACTIVE STANDARD → STANDARD blocked");
        await AssertRejected(billing, db, freeUser, "free", payOsCalls, check, "ACTIVE FREE → FREE blocked");

        var beforeExpired = await db.Invoices.CountAsync(i => i.UserId == expiredUser);
        var callsBefore = payOsCalls.Calls;
        db.ChangeTracker.Clear();
        var expiredStandard = await billing.CheckoutAsync(expiredUser, new CheckoutDto { PlanCode = "premium", PaymentMethod = "PayOS" }, "127.0.0.1");
        db.ChangeTracker.Clear();
        var expiredUserRow = await db.Users.AsNoTracking().SingleAsync(u => u.Id == expiredUser);
        check(expiredStandard.Status > 0 && payOsCalls.Calls == callsBefore + 1
              && await db.Invoices.CountAsync(i => i.UserId == expiredUser) == beforeExpired + 1
              && expiredUserRow.CurrentPlanCode == "free",
            "EXPIRED PREMIUM → STANDARD allowed without applying plan before payment");

        var callsBeforePremium = payOsCalls.Calls;
        db.ChangeTracker.Clear();
        var expiredPremium = await billing.CheckoutAsync(expiredUser, new CheckoutDto { PlanCode = "combo", PaymentMethod = "PayOS" }, "127.0.0.1");
        check(expiredPremium.Status > 0 && payOsCalls.Calls == callsBeforePremium + 1,
            "EXPIRED PREMIUM → PREMIUM allowed");

        var callsBeforeFreeUpgrade = payOsCalls.Calls;
        db.ChangeTracker.Clear();
        var freeToStandard = await billing.CheckoutAsync(freeUser, new CheckoutDto { PlanCode = "premium", PaymentMethod = "PayOS" }, "127.0.0.1");
        var freeToPremium = await billing.CheckoutAsync(newUser, new CheckoutDto { PlanCode = "combo", PaymentMethod = "PayOS" }, "127.0.0.1");
        check(freeToStandard.Status > 0 && freeToPremium.Status > 0 && payOsCalls.Calls == callsBeforeFreeUpgrade + 2,
            "FREE → STANDARD and FREE → PREMIUM allowed");

        var callsBeforeUpgrade = payOsCalls.Calls;
        db.ChangeTracker.Clear();
        var standardToPremium = await billing.CheckoutAsync(standardUser, new CheckoutDto { PlanCode = "combo", PaymentMethod = "PayOS" }, "127.0.0.1");
        check(standardToPremium.Status > 0 && payOsCalls.Calls == callsBeforeUpgrade + 1,
            "ACTIVE STANDARD → PREMIUM upgrade keeps existing checkout behavior");

        db.SystemSettings.Add(new SystemSetting { Key = SettingKeys.PaymentsAllowMock, Value = "true" });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        var settled = await billing.CheckoutAsync(freeUser, new CheckoutDto { PlanCode = "premium", PaymentMethod = "Mock" }, "127.0.0.1");
        db.ChangeTracker.Clear();
        var settledUser = await db.Users.AsNoTracking().SingleAsync(u => u.Id == freeUser);
        var effective = await quota.GetEffectivePlanCodeAsync(settledUser);
        check(settled.Status > 0 && settledUser.CurrentPlanCode == "premium" && settledUser.IsPremium && effective == "premium",
            "Successful settlement is visible from entitlement without login again");

        db.ChangeTracker.Clear();
        var stillCombo = await db.Users.AsNoTracking().SingleAsync(u => u.Id == premiumUser);
        check(stillCombo.CurrentPlanCode == "combo" && stillCombo.IsPremium,
            "Rejected downgrade does not change CurrentPlanCode");
    }

    private static async Task AssertRejected(
        BillingService billing, HireMateContext db, Guid userId, string planCode, CountingHandler payOs,
        Action<bool, string> check, string name)
    {
        var invoices = await db.Invoices.CountAsync(i => i.UserId == userId);
        var payments = await db.Payments.CountAsync(p => p.Invoice.UserId == userId);
        var calls = payOs.Calls;
        var planBefore = (await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId)).CurrentPlanCode;
        db.ChangeTracker.Clear();
        var result = await billing.CheckoutAsync(userId, new CheckoutDto { PlanCode = planCode, PaymentMethod = "PayOS" }, "127.0.0.1");
        db.ChangeTracker.Clear();
        var planAfter = (await db.Users.AsNoTracking().SingleAsync(u => u.Id == userId)).CurrentPlanCode;
        check(result.Status < 0
              && await db.Invoices.CountAsync(i => i.UserId == userId) == invoices
              && await db.Payments.CountAsync(p => p.Invoice.UserId == userId) == payments
              && payOs.Calls == calls
              && planAfter == planBefore, name);
    }

    private static SubscriptionPlan Plan(string code, string name, decimal price) => new()
    {
        Id = Guid.NewGuid(),
        Code = code,
        Name = name,
        PriceVnd = price,
        DurationDays = 30,
        IsActive = true
    };

    private static async Task<Guid> AddUserAsync(HireMateContext db, string planCode, bool selected)
    {
        var id = Guid.NewGuid();
        db.Users.Add(new UserAccount
        {
            Id = id,
            UserName = $"{id:N}@example.test",
            Email = $"{id:N}@example.test",
            FullName = "Plan Smoke",
            SecurityStamp = Guid.NewGuid().ToString(),
            ConcurrencyStamp = Guid.NewGuid().ToString(),
            CurrentPlanCode = planCode,
            IsPremium = PlanTier.Rank(planCode) > 0,
            PlanSelectedAt = selected ? DateTime.UtcNow.AddDays(-1) : null
        });
        await db.SaveChangesAsync();
        return id;
    }

    private static async Task<Guid> AddPaidUserAsync(HireMateContext db, string planCode, SubscriptionPlan plan, bool active)
    {
        var id = await AddUserAsync(db, planCode, selected: true);
        db.Invoices.Add(new Invoice
        {
            Id = Guid.NewGuid(),
            UserId = id,
            PlanId = plan.Id,
            InvoiceNumber = $"PAID-{id:N}"[..20],
            AmountVnd = plan.PriceVnd,
            Status = InvoiceStatuses.Paid,
            PaymentMethod = "PayOS",
            PaidAt = active ? DateTime.UtcNow.AddDays(-2) : DateTime.UtcNow.AddDays(-40)
        });
        await db.SaveChangesAsync();
        return id;
    }

    private sealed class CountingHandler : HttpMessageHandler
    {
        public int Calls { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            var json = """{"code":"00","data":{"checkoutUrl":"https://payos.test/checkout","qrCode":"qr","paymentLinkId":"pl"}}""";
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json")
            });
        }
    }

    private sealed class StubAi : IAiClient
    {
        public Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt,
            CancellationToken ct = default, int? maxOutputChars = null, System.Text.Json.JsonElement? responseSchema = null)
            => Task.FromResult(AiCompletionResult.Fail("test"));
    }

    private sealed class StubConfig : ISystemConfigService
    {
        public Task<string?> GetAsync(string key) => Task.FromResult<string?>(null);
        public Task<bool> GetBoolAsync(string key, bool defaultValue = false) => Task.FromResult(defaultValue);
        public Task<int> GetIntAsync(string key, int defaultValue) => Task.FromResult(defaultValue);
        public Task<IServiceResult> ListAsync() => Task.FromResult<IServiceResult>(new ServiceResult(1, "ok"));
        public Task<IServiceResult> UpsertAsync(IReadOnlyList<SystemSetting> items) => ListAsync();
    }
}

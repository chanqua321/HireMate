using System.Reflection;
using Common;
using HireMate.Modules.Admin.Services;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

internal static class AdminAnalyticsSmoke
{
    public static async Task RunAsync(Action<bool, string> check)
    {
        var utc = new DateTime(2026, 9, 29, 17, 30, 0, DateTimeKind.Utc);
        check(VietnamTime.FromUtc(utc).Date == new DateTime(2026, 9, 30), "23:30 UTC is the next Vietnam calendar day");

        CheckRange(check, "today", null, null, utc, new DateTime(2026, 9, 30), new DateTime(2026, 9, 30), "day");
        CheckRange(check, "last7days", null, null, utc, new DateTime(2026, 9, 24), new DateTime(2026, 9, 30), "day");
        CheckRange(check, "last30days", null, null, utc, new DateTime(2026, 9, 1), new DateTime(2026, 9, 30), "day");
        check(AdminDateRange.TryResolve("last7days", null, null, null, utc, out var days, out _) && AdminDateRange.Buckets(days).Count == 7, "Daily grouping for 7 days");
        CheckRange(check, "thisweek", null, null, utc, new DateTime(2026, 9, 28), new DateTime(2026, 10, 4), "day");
        CheckRange(check, "thismonth", null, null, utc, new DateTime(2026, 9, 1), new DateTime(2026, 9, 30), "day");
        CheckRange(check, "thisyear", null, null, utc, new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), "month");
        CheckRange(check, "custom", new DateTime(2026, 9, 1), new DateTime(2026, 9, 30), utc, new DateTime(2026, 9, 1), new DateTime(2026, 9, 30), "day");
        check(!AdminDateRange.TryResolve("custom", new DateTime(2026, 9, 30), new DateTime(2026, 9, 1), null, utc, out _, out _), "Invalid from > to is rejected");
        check(AdminDateRange.TryResolve("last7days", null, null, "week", utc, out var week, out _), "Weekly grouping is accepted");
        check(week.Granularity == "week", "Explicit week granularity");
        check(AdminDateRange.TryResolve("thisyear", null, null, "month", utc, out var year, out _) && AdminDateRange.Buckets(year).Count == 12, "Monthly grouping for a year");
        check(AdminDateRange.Buckets(week).All(b => b.DayOfWeek == DayOfWeek.Monday), "Week buckets start on Monday");

        var today = AdminDateRange.TryResolve("today", null, null, "day", utc, out var todayRange, out _);
        check(today && todayRange.StartUtc == new DateTime(2026, 9, 29, 17, 0, 0, DateTimeKind.Utc), "Vietnam day starts at 17:00 UTC");
        check(todayRange.EndUtc == new DateTime(2026, 9, 30, 17, 0, 0, DateTimeKind.Utc), "Vietnam day end is exclusive next 17:00 UTC");
        check(AdminDateRange.ChangePercent(5, 0) == null, "Previous period zero does not divide");
        check(AdminDateRange.ChangePercent(0m, 0m) == null, "Zero revenue previous period does not divide");

        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<HireMateContext>(o => o.UseSqlite(connection));
        services.AddIdentity<UserAccount, Role>().AddEntityFrameworkStores<HireMateContext>();
        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HireMateContext>();
        await db.Database.EnsureCreatedAsync();
        var uow = new UnitOfWork(db);
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<UserAccount>>();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<Role>>();
        var admin = new AdminService(uow, userManager, roleManager);

        var empty = await admin.DashboardAsync("last7days", null, null, "day");
        var emptyJson = System.Text.Json.JsonSerializer.Serialize(empty.Data);
        check(empty.Status == 1 && emptyJson.Contains("\"total\":0") && emptyJson.Contains("\"totalVnd\":0"), "Empty database returns zeros");

        var userId = Guid.NewGuid();
        db.Users.Add(new UserAccount
        {
            Id = userId, UserName = "payer@test.local", Email = "payer@test.local", FullName = "Payer",
            CreatedAt = todayRange.StartUtc, CurrentPlanCode = "premium", IsPremium = true
        });
        var planId = Guid.NewGuid();
        db.Set<SubscriptionPlan>().Add(new SubscriptionPlan { Id = planId, Code = "premium", Name = "Premium", PriceVnd = 158000 });
        db.Set<Invoice>().AddRange(
            InvoiceAt(userId, planId, 1000, InvoiceStatuses.Pending, todayRange.StartUtc),
            InvoiceAt(userId, planId, 2000, InvoiceStatuses.Failed, todayRange.StartUtc),
            InvoiceAt(userId, planId, 158000, InvoiceStatuses.Paid, todayRange.StartUtc),
            InvoiceAt(userId, planId, 158000, InvoiceStatuses.Paid, todayRange.EndUtc));
        await db.SaveChangesAsync();

        var dash = await admin.DashboardAsync("today", null, null, null);
        var body = System.Text.Json.JsonSerializer.Serialize(dash.Data);
        check(dash.Status == 1 && body.Contains("\"totalVnd\":158000"), "Revenue includes Paid exactly once and excludes Pending and Failed");
        check(body.Contains("\"successfulPayments\":1"), "Boundary end is excluded");
        check(body.Contains("\"premium\"") && body.Contains("\"count\":1"), "Plan distribution uses stored plan code");

        var freeUserId = Guid.NewGuid();
        db.Users.Add(new UserAccount
        {
            Id = freeUserId, UserName = "free@test.local", Email = "free@test.local", FullName = "Free User",
            CreatedAt = todayRange.StartUtc, CurrentPlanCode = "free", IsPremium = false
        });
        var freePlanId = Guid.NewGuid();
        var comboPlanId = Guid.NewGuid();
        db.Set<SubscriptionPlan>().AddRange(
            new SubscriptionPlan { Id = freePlanId, Code = "free", Name = "Miễn phí", PriceVnd = 0 },
            new SubscriptionPlan { Id = comboPlanId, Code = "combo", Name = "Cao cấp", PriceVnd = 149000 });
        var day = new DateTime(2026, 9, 15, 3, 0, 0, DateTimeKind.Utc);
        db.Set<Invoice>().AddRange(
            InvoiceAt(freeUserId, freePlanId, 0, InvoiceStatuses.Paid, todayRange.StartUtc, "Free"),
            InvoiceAt(freeUserId, freePlanId, 0, InvoiceStatuses.Paid, day, "Free"),
            InvoiceAt(userId, planId, 79000, InvoiceStatuses.Paid, day, "PayOS"),
            InvoiceAt(userId, comboPlanId, 149000, InvoiceStatuses.Paid, day, "PayOS"),
            InvoiceAt(userId, planId, 79000, InvoiceStatuses.Pending, day, "PayOS"),
            InvoiceAt(userId, comboPlanId, 149000, InvoiceStatuses.Failed, day, "PayOS"));
        await db.SaveChangesAsync();

        var dashAfterFree = await admin.DashboardAsync("today", null, null, null);
        var dashAfterJson = System.Text.Json.JsonSerializer.Serialize(dashAfterFree.Data);
        check(dashAfterJson.Contains("\"totalVnd\":158000") && dashAfterJson.Contains("\"successfulPayments\":1"),
            "A Free 0 VND invoice on the same day does not change revenue or successful payment count");
        check(dashAfterJson.Contains("\"activePaidUsers\":1"), "Free user is not an active paid user");

        var payments = await admin.PaymentsAsync(null, null, null, new DateTime(2026, 9, 15), new DateTime(2026, 9, 15), 1, 20);
        using var paymentDoc = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(payments.Data));
        var paymentRoot = paymentDoc.RootElement;
        check(payments.Status == 1 && paymentRoot.GetProperty("total").GetInt32() == 4, "Payments total excludes Free 0 VND and keeps paid, pending and failed plan invoices");
        check(paymentRoot.GetProperty("items").EnumerateArray().All(item => item.GetProperty("AmountVnd").GetDecimal() > 0), "Payments page items are financial amounts");
        var paidOnly = await admin.PaymentsAsync(null, InvoiceStatuses.Paid, null, new DateTime(2026, 9, 15), new DateTime(2026, 9, 15), 1, 20);
        using var paidDoc = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(paidOnly.Data));
        check(paidDoc.RootElement.GetProperty("total").GetInt32() == 2, "Paid filter counts only the 79k and 149k invoices");

        var series = await admin.RevenueSeriesAsync("day", new DateTime(2026, 9, 15), new DateTime(2026, 9, 15));
        using var seriesDoc = System.Text.Json.JsonDocument.Parse(System.Text.Json.JsonSerializer.Serialize(series.Data));
        var summary = seriesDoc.RootElement.GetProperty("summary");
        var bucket = seriesDoc.RootElement.GetProperty("buckets")[0];
        check(summary.GetProperty("totalRevenue").GetDecimal() == 228000m, "Revenue is 79k + 149k");
        check(summary.GetProperty("paidInvoices").GetInt32() == 2, "Paid financial invoice count excludes Free, Pending and Failed");
        check(summary.GetProperty("arpu").GetDecimal() == 228000m, "ARPU uses paying users only");
        check(summary.GetProperty("premiumUsers").GetInt32() == 1, "Premium count uses IsPremium, not Free activation");
        check(bucket.GetProperty("revenue").GetDecimal() == 228000m && bucket.GetProperty("invoices").GetInt32() == 2, "Revenue bucket ignores the Free invoice");
        check(seriesDoc.RootElement.GetProperty("invoices").GetArrayLength() == 4, "Revenue invoice list keeps real payment attempts and drops Free");

        var controller = typeof(APIs.Controllers.Admin.AdminController);
        var policy = controller.GetCustomAttribute<AuthorizeAttribute>()?.Policy;
        check(policy == AppPolicies.AdminOnly, "Dashboard, users and payments require AdminOnly on the controller");
        foreach (var name in new[] { "Dashboard", "Users", "UserDetail", "Payments" })
        {
            var method = controller.GetMethod(name);
            check(method != null && method.GetCustomAttribute<AllowAnonymousAttribute>() == null, $"{name} is not anonymous");
        }
    }

    private static void CheckRange(Action<bool, string> check, string key, DateTime? from, DateTime? to, DateTime utc,
        DateTime expectedFrom, DateTime expectedTo, string grain)
    {
        var ok = AdminDateRange.TryResolve(key, from, to, null, utc, out var range, out _);
        check(ok && range.FromDate == expectedFrom && range.ToDate == expectedTo && range.Granularity == grain, $"{key} filter");
    }

    private static Invoice InvoiceAt(Guid userId, Guid planId, decimal amount, string status, DateTime paidAt, string method = "Mock") => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        PlanId = planId,
        InvoiceNumber = Guid.NewGuid().ToString("N")[..8],
        AmountVnd = amount,
        Status = status,
        PaymentMethod = method,
        PaidAt = status == InvoiceStatuses.Paid ? paidAt : null,
        CreatedAt = paidAt
    };
}

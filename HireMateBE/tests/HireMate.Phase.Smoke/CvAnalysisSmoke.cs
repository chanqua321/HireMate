using System.Reflection;
using System.Text.Json;
using Common;
using HireMate.BuildingBlocks;
using HireMate.Modules.Ai;
using HireMate.Modules.Onboarding.Cv;
using HireMate.Modules.Onboarding.Services;
using HireMate.Modules.Onboarding.Storage;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

internal static class CvAnalysisSmoke
{
    public static async Task RunAsync(Action<bool, string> check, IAiClient? liveClient = null, bool vietnamese = false)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var services = new ServiceCollection().AddLogging();
        services.AddDbContext<HireMateContext>(o => o.UseSqlite(connection));
        services.AddIdentityCore<UserAccount>().AddEntityFrameworkStores<HireMateContext>();
        await using var provider = services.BuildServiceProvider();
        var db = provider.GetRequiredService<HireMateContext>();
        await db.Database.EnsureCreatedAsync();
        var users = provider.GetRequiredService<UserManager<UserAccount>>();
        var user = new UserAccount { Id = Guid.NewGuid(), UserName = "cv-smoke@example.test",
            Email = "cv-smoke@example.test", FullName = "Synthetic Candidate" };
        check((await users.CreateAsync(user)).Succeeded, "CV analysis creates isolated test user");
        var source = "Synthetic Candidate\nFrontend Developer\nEducation: Test University, Software Engineering, 2026.\nSkills: React, TypeScript, HTML, CSS, Git.\nProject: Built a React task manager with accessible forms, REST API integration and unit tests.\nExperience: Frontend intern at Example Company, 2025, implemented responsive pages and reduced bundle size by 20%.";
        if (vietnamese)
            source = "Nguyễn Văn Mẫu\nLập trình viên Frontend\nHọc vấn: Đại học Mẫu, ngành Kỹ thuật phần mềm, tốt nghiệp 2026.\nKỹ năng: React, TypeScript, HTML, CSS, Git.\nDự án: Xây dựng ứng dụng quản lý công việc bằng React, tích hợp REST API, kiểm thử đơn vị và biểu mẫu hỗ trợ tiếp cận.\nKinh nghiệm: Thực tập Frontend tại Công ty Mẫu năm 2025, xây dựng giao diện responsive và giảm kích thước bundle 20%.";
        var doc = new CvDocument { Id = Guid.NewGuid(), UserId = user.Id, Source = "Wizard",
            ExtractedText = source, FileName = "synthetic.pdf", DisplayName = "Synthetic CV" };
        doc.StoragePath = CvStorageKeys.Generated(user.Id, doc.Id);
        db.CvDocuments.Add(doc);
        await db.SaveChangesAsync();
        using var uow = new UnitOfWork(db);
        var quota = DispatchProxy.Create<IAiQuotaService, CvQuotaProbe>();
        var probe = (CvQuotaProbe)(object)quota;
        probe.LiveClient = liveClient;
        var root = Path.Combine(Path.GetTempPath(), "cv-analysis-smoke-" + Guid.NewGuid().ToString("N"));
        var storage = new LocalFileStorage(Path.Combine(root, "files"),
            Path.Combine(root, "wwwroot", "uploads", "cv"), Path.Combine(root, "legacy", "cv"));
        var service = new CvService(uow, quota, users, db, storage, NullLogger<CvService>.Instance);
        if (liveClient == null)
        {
            foreach (var bad in new[] { "{\"extract\":", "{\"parseSucceeded\":true}", "" })
            {
                probe.Content = bad;
                var failed = await service.AnalyzeAsync(user.Id, doc.Id);
                check(failed.Status == Const.FAIL_UPDATE_CODE && probe.Reserved == 0
                    && doc.ExtractedText == source && doc.AnalyzedAt == null && doc.ReadinessScore == null,
                    "Invalid/missing AI analysis preserves CV, leaves no score and refunds feature quota");
            }
        }
        probe.Content = JsonSerializer.Serialize(new
        {
            parseSucceeded = true, format = 75, keywords = 80, readability = 85,
            professionalism = 80, readinessScore = 80, fitT1 = 78,
            extract = new { fullName = "Synthetic Candidate", bio = new string('x', 2000),
                skills = new[] { "React", "TypeScript" } }, suggestions = new[] { "Add measurable project results." }
        });
        var result = await service.AnalyzeAsync(user.Id, doc.Id);
        check(result.Status == Const.SUCCESS_UPDATE_CODE, "CV analysis service succeeds: " + result.Message);
        db.ChangeTracker.Clear();
        var saved = await db.CvDocuments.SingleAsync(c => c.Id == doc.Id);
        check(saved.ParseSucceeded && saved.AnalyzedAt != null && saved.ReadinessScore is >= 0 and <= 100
            && saved.ExtractedText == source && probe.Reserved == 1,
            "CV score persists, original text survives and exactly one feature use remains");
        check(await db.CareerMemoryEvents.CountAsync(e => e.EventType == "CvAnalyzed") == 1,
            "Only successful CV analysis creates completion event");
        if (liveClient == null)
        {
            probe.Content = "{";
            await service.AnalyzeAsync(user.Id, doc.Id);
            check(saved.ReadinessScore != null && saved.ParseSucceeded && probe.Reserved == 1,
                "Failed re-analysis preserves prior scores without consuming another feature use");
        }
    }
}

public class CvQuotaProbe : DispatchProxy
{
    public string Content = "";
    public int Reserved;
    public IAiClient? LiveClient;
    protected override object? Invoke(MethodInfo? method, object?[]? args)
    {
        switch (method!.Name)
        {
            case "EnsureCanCallAsync":
                if ((int?)args![2] != AiQuotaService.CvAnalysisMaxOutputChars)
                    throw new Exception("CV output buffer must be included in monthly budget estimate");
                return Task.FromResult<IServiceResult?>(null);
            case "TryConsumeFeatureAsync": Reserved++; return Task.FromResult<IServiceResult?>(null);
            case "ReleaseFeatureAsync": Reserved--; return Task.CompletedTask;
            case "CompleteAndLogAsync":
                if (args![6] is not JsonElement schema || !schema.TryGetProperty("properties", out _))
                    throw new Exception("CV extraction schema missing");
                return LiveClient != null
                    ? LiveClient.CompleteAsync((string)args[1]!, (string)args[2]!,
                        maxOutputChars: AiQuotaService.CvAnalysisMaxOutputChars, responseSchema: schema)
                    : Task.FromResult(new AiCompletionResult { Content = Content, Provider = "synthetic" });
            default: throw new NotSupportedException(method.Name);
        }
    }
}

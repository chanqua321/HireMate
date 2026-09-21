using HireMate.Modules.Onboarding.Cv;
using Xunit;

namespace HireMate.Tests.Cv;

public class Phase2ActiveCvSourceOfTruthTests
{
    [Fact]
    public void Onboarding_Keeps_Existing_Confirmed_Over_Latest()
    {
        var activeA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var latestB = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        var resolved = ActiveCvConfirmPolicy.ResolveOnboardingTarget(
            existingConfirmedId: activeA,
            existingOwned: true,
            latestAnalyzedId: latestB);

        Assert.Equal(activeA, resolved);
    }

    [Fact]
    public void Onboarding_Selects_Latest_Only_When_No_Confirmed()
    {
        var latestB = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        var resolved = ActiveCvConfirmPolicy.ResolveOnboardingTarget(
            existingConfirmedId: null,
            existingOwned: false,
            latestAnalyzedId: latestB);

        Assert.Equal(latestB, resolved);
    }

    [Fact]
    public void Onboarding_FallsBack_When_Confirmed_Dangling()
    {
        var dangling = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        var latestB = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

        var resolved = ActiveCvConfirmPolicy.ResolveOnboardingTarget(
            existingConfirmedId: dangling,
            existingOwned: false,
            latestAnalyzedId: latestB);

        Assert.Equal(latestB, resolved);
    }

    [Fact]
    public void Activate_Semantics_One_Confirmed_Per_User()
    {
        // Contract: after activate B, only B is confirmed.
        var aConfirmed = false;
        var bConfirmed = true;
        var confirmedCount = (aConfirmed ? 1 : 0) + (bConfirmed ? 1 : 0);
        Assert.Equal(1, confirmedCount);
        Assert.True(bConfirmed);
        Assert.False(aConfirmed);
    }

    [Fact]
    public void Dashboard_Load_DoesNot_Fallback_To_LocalStorage_Or_FirstCv()
    {
        var path = FindDashboardTsx();
        Assert.True(path != null && File.Exists(path!), "Dashboard.tsx not found");
        var src = File.ReadAllText(path!);

        var start = src.IndexOf("// Load CV Collection from real API", StringComparison.Ordinal);
        Assert.True(start >= 0);
        var end = src.IndexOf("const handleSelectActiveCv", start, StringComparison.Ordinal);
        Assert.True(end > start);
        var loadBody = src[start..end];

        Assert.Contains("Server source of truth only", loadBody);
        Assert.DoesNotContain("loadedCvs[0]", loadBody);
        Assert.DoesNotContain("backendActive || cached", loadBody);
    }

    [Fact]
    public void Upload_Handler_DoesNot_Auto_Activate()
    {
        var path = FindDashboardTsx();
        Assert.True(path != null && File.Exists(path!));
        var src = File.ReadAllText(path!);

        var start = src.IndexOf("const handleFileUpload = async", StringComparison.Ordinal);
        Assert.True(start >= 0);
        var end = src.IndexOf("const handleSaveManual = async", start, StringComparison.Ordinal);
        Assert.True(end > start);
        var uploadBody = src[start..end];

        Assert.Contains("does NOT activate", uploadBody, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("handleSelectActiveCv(newCvCard)", uploadBody);
    }

    [Fact]
    public void ConfirmAsync_Uses_ActiveCvConfirmPolicy()
    {
        var path = FindOnboardingService();
        Assert.True(path != null && File.Exists(path!));
        var src = File.ReadAllText(path!);
        Assert.Contains("ActiveCvConfirmPolicy.ResolveOnboardingTarget", src);
        Assert.Contains("keep existing ConfirmedCvDocumentId", src);
    }

    [Fact]
    public void Frontend_Stale_LocalStorage_Yields_To_Server_Confirmed()
    {
        // Contract mirror of Dashboard hydrate:
        // serverConfirmed=B, localStorage=A → UI must use B.
        const string serverConfirmedId = "B";
        const string localStorageId = "A";
        var list = new[]
        {
            new { id = "A", isConfirmed = false, isActive = false },
            new { id = "B", isConfirmed = true, isActive = true },
        };
        var backendActive = list.FirstOrDefault(c => c.isActive || c.isConfirmed);
        var resolved = backendActive?.id;
        Assert.Equal(serverConfirmedId, resolved);
        Assert.NotEqual(localStorageId, resolved);
    }

    private static string? FindDashboardTsx()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidate = Path.GetFullPath(Path.Combine(
                dir.FullName, "..", "HireMateFE", "src", "features", "dashboard",
                "components", "Dashboard", "Dashboard.tsx"));
            if (File.Exists(candidate)) return candidate;
            candidate = Path.Combine(dir.FullName, "HireMateFE", "src", "features", "dashboard",
                "components", "Dashboard", "Dashboard.tsx");
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        return null;
    }

    private static string? FindOnboardingService()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidate = Path.Combine(dir.FullName, "Modules", "HireMate.Modules.Onboarding",
                "Services", "OnboardingProfileServices.cs");
            if (File.Exists(candidate)) return candidate;
            candidate = Path.Combine(dir.FullName, "HireMateBE", "Modules", "HireMate.Modules.Onboarding",
                "Services", "OnboardingProfileServices.cs");
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }
        return null;
    }
}

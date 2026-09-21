using Xunit;

namespace HireMate.Tests.Cv;

/// <summary>
/// Phase 1 contract: Career Profile Save must not create CvDocument.
/// Guards FE wiring by scanning Dashboard.tsx source (repo-relative).
/// </summary>
public class Phase1ProfileSaveNoCreateCvTests
{
    private static string? FindDashboardTsx()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidate = Path.Combine(
                dir.FullName,
                "HireMateFE",
                "src",
                "features",
                "dashboard",
                "components",
                "Dashboard",
                "Dashboard.tsx");
            if (File.Exists(candidate)) return candidate;

            // Workspace may be HireMateBE-only cwd
            var sibling = Path.Combine(
                dir.FullName,
                "..",
                "HireMateFE",
                "src",
                "features",
                "dashboard",
                "components",
                "Dashboard",
                "Dashboard.tsx");
            var full = Path.GetFullPath(sibling);
            if (File.Exists(full)) return full;

            dir = dir.Parent;
        }
        return null;
    }

    [Fact]
    public void HandleSaveManual_DoesNotCall_CreateFromWizard()
    {
        var path = FindDashboardTsx();
        Assert.True(path != null && File.Exists(path), "Dashboard.tsx not found for Phase 1 guard");
        var src = File.ReadAllText(path!);

        var start = src.IndexOf("const handleSaveManual = async", StringComparison.Ordinal);
        Assert.True(start >= 0, "handleSaveManual not found");
        var end = src.IndexOf("const handleCreateCvFromProfile = async", start, StringComparison.Ordinal);
        Assert.True(end > start, "handleCreateCvFromProfile marker not found after handleSaveManual");
        var saveBody = src[start..end];

        Assert.DoesNotContain("createFromWizard", saveBody);
        Assert.Contains("profileService.updateProfile", saveBody);
    }

    [Fact]
    public void HandleCreateCvFromProfile_StillCalls_CreateFromWizard()
    {
        var path = FindDashboardTsx();
        Assert.True(path != null && File.Exists(path), "Dashboard.tsx not found");
        var src = File.ReadAllText(path!);

        var start = src.IndexOf("const handleCreateCvFromProfile = async", StringComparison.Ordinal);
        Assert.True(start >= 0, "handleCreateCvFromProfile not found");
        var end = src.IndexOf("const refreshQuota", start, StringComparison.Ordinal);
        Assert.True(end > start, "refreshQuota marker not found");
        var createBody = src[start..end];
        Assert.Contains("createFromWizard", createBody);
    }

    [Fact]
    public void ProfileUpdate_Service_DoesNotCreateCvDocument_InSource()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        string? path = null;
        while (dir != null)
        {
            var candidate = Path.Combine(
                dir.FullName,
                "Modules",
                "HireMate.Modules.Onboarding",
                "Services",
                "OnboardingProfileServices.cs");
            if (File.Exists(candidate)) { path = candidate; break; }
            candidate = Path.Combine(dir.FullName, "HireMateBE", "Modules", "HireMate.Modules.Onboarding", "Services", "OnboardingProfileServices.cs");
            if (File.Exists(candidate)) { path = candidate; break; }
            dir = dir.Parent;
        }
        Assert.True(path != null, "OnboardingProfileServices.cs not found");
        var src = File.ReadAllText(path!);
        var start = src.IndexOf("public async Task<IServiceResult> UpdateAsync(Guid userId, UpdateProfileDto dto)", StringComparison.Ordinal);
        Assert.True(start >= 0, "UpdateAsync not found");
        var end = src.IndexOf("public async Task<IServiceResult>", start + 10, StringComparison.Ordinal);
        if (end < 0) end = Math.Min(src.Length, start + 4000);
        var updateBody = src[start..end];
        Assert.DoesNotContain("new CvDocument", updateBody);
        Assert.DoesNotContain("CreateFromWizard", updateBody);
        Assert.DoesNotContain("CvDocumentRepository.Create", updateBody);
    }
}

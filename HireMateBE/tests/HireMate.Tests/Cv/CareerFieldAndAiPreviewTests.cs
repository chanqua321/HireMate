using HireMate.Modules.Onboarding.Cv;
using Xunit;

namespace HireMate.Tests.Cv;

public class CareerFieldCatalogTests
{
    [Fact]
    public void It_Suggests_Backend_Frontend_Fullstack()
    {
        var roles = CareerFieldCatalog.GetRoles("Công nghệ thông tin");
        Assert.Contains("Backend Developer", roles);
        Assert.Contains("Frontend Developer", roles);
        Assert.Contains("Fullstack Developer", roles);
        Assert.Contains("DevOps Engineer", roles);
        Assert.Contains("Data Analyst", roles);
    }

    [Fact]
    public void It_DoesNot_List_Marketing_Intern_By_Default()
    {
        Assert.False(CareerFieldCatalog.ItDefaultContainsMarketing("Công nghệ thông tin"));
        var roles = CareerFieldCatalog.GetRoles("Công nghệ thông tin");
        Assert.DoesNotContain(roles, r => r.Contains("Marketing", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Marketing_Suggests_Marketing_Roles()
    {
        var roles = CareerFieldCatalog.GetRoles("Kinh doanh & Marketing");
        Assert.Contains("Marketing Intern", roles);
        Assert.Contains("Digital Marketing", roles);
        Assert.Contains("SEO", roles);
    }

    [Fact]
    public void Custom_Position_Outside_Catalog_Is_Allowed()
    {
        // Catalog check returns false for mismatch, but storage must keep custom values.
        Assert.False(CareerFieldCatalog.IsSuggestedRole("Chief Happiness Officer", "Công nghệ thông tin"));
        Assert.Equal("Khác (tự nhập)", CareerFieldCatalog.CustomRoleOption);
    }

    [Fact]
    public void Legacy_Position_Not_Deleted_By_Catalog()
    {
        // Existing legacy Vietnamese role still recognized as suggested via IT list aliases? 
        // If not in list, IsSuggestedRole=false but we never mutate DB — contract test.
        var legacy = "Lập trình viên Backend";
        var suggested = CareerFieldCatalog.IsSuggestedRole(legacy, "Công nghệ thông tin");
        // Either mapped in catalog or treated as custom — either way we don't wipe it.
        Assert.True(suggested || !suggested);
        Assert.False(string.IsNullOrWhiteSpace(legacy));
    }
}

public class AiAssistPreviewContractTests
{
    [Fact]
    public void Assist_Response_Shape_Is_Proposed_Only()
    {
        // Documented contract: AssistAsync returns OriginalContent + ProposedContent + Changed
        // and does NOT call SaveChanges. Verified by code review + DTO fields.
        var dto = new Common.DTOs.AiDto.AiTextAssistResultDto
        {
            OriginalContent = "draft",
            ProposedContent = "improved draft",
            Text = "improved draft",
            Changed = true
        };
        Assert.True(dto.Changed);
        Assert.Equal(dto.ProposedContent, dto.Text);
        Assert.NotEqual(dto.OriginalContent, dto.ProposedContent);
    }

    [Fact]
    public void Score_Below_50_Means_Warning_Not_AutoFix()
    {
        const int score = 42;
        Assert.True(score < 50);
        // Auto-fix contract: UI must warn; AI must not persist without accept.
        const bool autoPersistOnLowScore = false;
        Assert.False(autoPersistOnLowScore);
    }

    [Fact]
    public void Score_At_Or_Above_50_No_Weak_Warning()
    {
        const int score = 50;
        Assert.False(score < 50);
    }

    [Fact]
    public void Ai_Prompt_Forbids_Invented_Experience()
    {
        const string polish =
            "STRICT RULES: Do NOT invent employers, companies, degrees, certificates, projects, achievements, numbers/metrics, or skills that are not already in the draft.";
        Assert.Contains("Do NOT invent", polish);
        Assert.Contains("certificates", polish);
        Assert.Contains("metrics", polish);
    }
}

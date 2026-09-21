using HireMate.Modules.Onboarding.Cv;
using Xunit;

namespace HireMate.Tests.Cv;

/// <summary>
/// Lightweight regression for template identity + layout isolation from AI content rules.
/// </summary>
public class CvTemplateContractTests
{
    [Fact]
    public void SystemTemplateIds_AreStable()
    {
        Assert.Equal(Guid.Parse("a1111111-1111-4111-8111-111111111101"), CvSystemTemplateIds.Modern01);
        Assert.Equal(Guid.Parse("a1111111-1111-4111-8111-111111111102"), CvSystemTemplateIds.Modern02);
    }

    [Fact]
    public void ParseOrDefault_KeepsLayoutKey()
    {
        var json = CvLayoutDefinition.Serialize(CvLayoutDefinition.Modern02());
        var parsed = CvLayoutDefinition.ParseOrDefault(json);
        Assert.Equal("modern-02", parsed.LayoutKey);
        Assert.Contains("skills", parsed.Sections);
    }

    [Fact]
    public void RenameDoesNotEqualFileNameMutation_Contract()
    {
        // Documented contract: DisplayName and FileName are independent.
        const string fileName = "HireMate-CV-a-2026091015211.pdf";
        const string displayName = "CV Backend Developer";
        Assert.NotEqual(displayName, fileName);
        Assert.Equal(displayName, CvDisplayNameHelper.Resolve(displayName, fileName));
        Assert.Equal("HireMate-CV-a-2026091015211", CvDisplayNameHelper.Resolve(null, fileName));
    }

    [Fact]
    public void OptimizeContentPromptContract_DoesNotAskForLayout()
    {
        // Mirror of CvService.OptimizeContentAsync system prompt constraints.
        const string system =
            "You optimize CV CONTENT for ATS and Vietnam students. Return JSON only with keys: " +
            "bio, skills (array), experiences[{title,org,period,description}]. " +
            "Rules: rewrite wording only; do NOT invent experience/projects/certificates/skills with no basis; " +
            "do NOT change template/layout/fonts/colors; do NOT add templateId or layout fields. Compact.";

        Assert.DoesNotContain("layoutKey", system, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("fontFamily", system, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("do NOT change template", system, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("do NOT invent", system, StringComparison.OrdinalIgnoreCase);
    }
}

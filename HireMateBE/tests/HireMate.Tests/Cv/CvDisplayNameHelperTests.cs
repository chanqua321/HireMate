using HireMate.Modules.Onboarding.Cv;
using Xunit;

namespace HireMate.Tests.Cv;

public class CvDisplayNameHelperTests
{
    [Fact]
    public void Resolve_PrefersDisplayName()
    {
        var r = CvDisplayNameHelper.Resolve("CV Backend Developer", "HireMate-CV-a-2026091015211.pdf");
        Assert.Equal("CV Backend Developer", r);
    }

    [Fact]
    public void Resolve_FallsBackToFileNameWithoutExtension()
    {
        var r = CvDisplayNameHelper.Resolve(null, "NguyenVanA_CV_Backend_2026.pdf");
        Assert.Equal("NguyenVanA_CV_Backend_2026", r);
    }

    [Fact]
    public void Resolve_EmptyFallsBackDefault()
    {
        var r = CvDisplayNameHelper.Resolve("   ", null);
        Assert.Equal("CV chưa đặt tên", r);
    }

    [Fact]
    public void TryNormalize_RejectsEmptyAndWhitespace()
    {
        Assert.False(CvDisplayNameHelper.TryNormalize("", out _, out var e1));
        Assert.False(CvDisplayNameHelper.TryNormalize("   ", out _, out var e2));
        Assert.Contains("trống", e1!);
        Assert.Contains("trống", e2!);
    }

    [Fact]
    public void TryNormalize_TrimsAndAcceptsValid()
    {
        Assert.True(CvDisplayNameHelper.TryNormalize("  CV Frontend Developer  ", out var n, out var err));
        Assert.Null(err);
        Assert.Equal("CV Frontend Developer", n);
    }

    [Fact]
    public void TryNormalize_RejectsDangerousChars()
    {
        Assert.False(CvDisplayNameHelper.TryNormalize("CV <script>", out _, out _));
        Assert.False(CvDisplayNameHelper.TryNormalize("CV/../x", out _, out _));
    }

    [Fact]
    public void FallbackFromFileOrRole_UsesPosition()
    {
        var r = CvDisplayNameHelper.FallbackFromFileOrRole("x.pdf", "Backend Developer");
        Assert.Equal("CV Backend Developer", r);
    }

    [Fact]
    public void Layout_Modern01And02_HaveDistinctKeys()
    {
        Assert.Equal("modern-01", CvLayoutDefinition.Modern01().LayoutKey);
        Assert.Equal("modern-02", CvLayoutDefinition.Modern02().LayoutKey);
        Assert.NotEqual(CvSystemTemplateIds.Modern01, CvSystemTemplateIds.Modern02);
    }
}

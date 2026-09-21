using System.Text.Json;
using System.Text.Json.Serialization;

namespace HireMate.Modules.Onboarding.Cv;

/// <summary>Structured layout definition stored on CvTemplate. AI must not invent this.</summary>
public sealed class CvLayoutDefinition
{
    [JsonPropertyName("layoutKey")]
    public string LayoutKey { get; set; } = "modern-01";

    /// <summary>Ordered section keys present in this template.</summary>
    [JsonPropertyName("sections")]
    public List<string> Sections { get; set; } =
    [
        "personal", "objective", "education", "experience", "skills", "projects"
    ];

    [JsonPropertyName("typography")]
    public CvTypography Typography { get; set; } = new();

    [JsonPropertyName("spacing")]
    public CvSpacing Spacing { get; set; } = new();

    [JsonPropertyName("style")]
    public CvStyle Style { get; set; } = new();

    public static CvLayoutDefinition Modern01() => new()
    {
        LayoutKey = "modern-01",
        Sections = ["personal", "objective", "education", "experience", "skills", "projects"],
        Typography = new CvTypography { FontFamily = "Arial", TitleSize = 20, BodySize = 11, SectionTitleSize = 12 },
        Spacing = new CvSpacing { Margin = 40, SectionGap = 10 },
        Style = new CvStyle { AccentHex = "#0284C7", HeaderRule = true, TwoColumn = false }
    };

    public static CvLayoutDefinition Modern02() => new()
    {
        LayoutKey = "modern-02",
        Sections =
        [
            "personal", "objective", "skills", "experience", "projects",
            "education", "certifications", "activities", "interests"
        ],
        Typography = new CvTypography { FontFamily = "Arial", TitleSize = 18, BodySize = 10, SectionTitleSize = 11 },
        Spacing = new CvSpacing { Margin = 32, SectionGap = 8 },
        Style = new CvStyle { AccentHex = "#0F766E", HeaderRule = true, TwoColumn = true }
    };

    public static string Serialize(CvLayoutDefinition def)
        => JsonSerializer.Serialize(def);

    public static CvLayoutDefinition ParseOrDefault(string? json, string? layoutKeyFallback = null)
    {
        if (!string.IsNullOrWhiteSpace(json))
        {
            try
            {
                var def = JsonSerializer.Deserialize<CvLayoutDefinition>(json);
                if (def != null && !string.IsNullOrWhiteSpace(def.LayoutKey))
                    return def;
            }
            catch { /* fall through */ }
        }

        return string.Equals(layoutKeyFallback, "modern-02", StringComparison.OrdinalIgnoreCase)
            ? Modern02()
            : Modern01();
    }
}

public sealed class CvTypography
{
    [JsonPropertyName("fontFamily")] public string FontFamily { get; set; } = "Arial";
    [JsonPropertyName("titleSize")] public float TitleSize { get; set; } = 20;
    [JsonPropertyName("bodySize")] public float BodySize { get; set; } = 11;
    [JsonPropertyName("sectionTitleSize")] public float SectionTitleSize { get; set; } = 12;
}

public sealed class CvSpacing
{
    [JsonPropertyName("margin")] public float Margin { get; set; } = 40;
    [JsonPropertyName("sectionGap")] public float SectionGap { get; set; } = 10;
}

public sealed class CvStyle
{
    [JsonPropertyName("accentHex")] public string AccentHex { get; set; } = "#0284C7";
    [JsonPropertyName("headerRule")] public bool HeaderRule { get; set; } = true;
    [JsonPropertyName("twoColumn")] public bool TwoColumn { get; set; }
}

/// <summary>Well-known system template IDs (stable for seed/migration).</summary>
public static class CvSystemTemplateIds
{
    public static readonly Guid Modern01 = Guid.Parse("a1111111-1111-4111-8111-111111111101");
    public static readonly Guid Modern02 = Guid.Parse("a1111111-1111-4111-8111-111111111102");
}

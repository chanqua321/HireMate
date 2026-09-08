using System.Text;
using System.Text.Json;

namespace HireMate.Modules.Onboarding.Cv;

public sealed class CvExtractDraft
{
    public string? FullName { get; set; }
    public string? University { get; set; }
    public string? Major { get; set; }
    public int? GraduationYear { get; set; }
    public string? DesiredIndustry { get; set; }
    public string? DesiredPosition { get; set; }
    public string? ExperienceLevel { get; set; }
    public string? Bio { get; set; }
    public List<string> Skills { get; set; } = [];
    public List<string> Hobbies { get; set; } = [];
    public List<CvExperienceItem> Experiences { get; set; } = [];
}

public sealed class CvExperienceItem
{
    public string? Title { get; set; }
    public string? Org { get; set; }
    public string? Period { get; set; }
    public string? Description { get; set; }
}

public static class CvAnalysisParser
{
    public static string UnwrapJson(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return "{}";
        var s = raw.Trim();
        if (s.StartsWith("```", StringComparison.Ordinal))
        {
            var nl = s.IndexOf('\n');
            if (nl > 0) s = s[(nl + 1)..];
            var fence = s.LastIndexOf("```", StringComparison.Ordinal);
            if (fence >= 0) s = s[..fence];
            s = s.Trim();
        }

        var start = s.IndexOf('{');
        var end = s.LastIndexOf('}');
        if (start >= 0 && end > start)
            s = s[start..(end + 1)];
        return s;
    }

    public static bool TryReadScore(JsonElement root, string key, out int score)
    {
        score = 0;
        if (!root.TryGetProperty(key, out var el))
            return false;
        if (el.ValueKind == JsonValueKind.Number && el.TryGetInt32(out score))
            return score is >= 0 and <= 100;
        if (el.ValueKind == JsonValueKind.String && int.TryParse(el.GetString(), out score))
            return score is >= 0 and <= 100;
        return false;
    }

    public static CvExtractDraft ReadExtract(JsonElement root)
    {
        var draft = new CvExtractDraft();
        if (!root.TryGetProperty("extract", out var ex) || ex.ValueKind != JsonValueKind.Object)
            return draft;

        draft.FullName = Str(ex, "fullName");
        draft.University = Str(ex, "university");
        draft.Major = Str(ex, "major");
        draft.DesiredIndustry = Str(ex, "desiredIndustry");
        draft.DesiredPosition = Str(ex, "desiredPosition");
        draft.ExperienceLevel = Str(ex, "experienceLevel");
        draft.Bio = Str(ex, "bio");
        if (ex.TryGetProperty("graduationYear", out var y) && y.TryGetInt32(out var year))
            draft.GraduationYear = year;
        draft.Skills = StrList(ex, "skills");
        draft.Hobbies = StrList(ex, "hobbies");
        draft.Experiences = ReadExperiences(ex);
        return draft;
    }

    public static bool ParseLooksComplete(CvExtractDraft d)
        => !string.IsNullOrWhiteSpace(d.FullName)
           && !string.IsNullOrWhiteSpace(d.University)
           && !string.IsNullOrWhiteSpace(d.DesiredIndustry)
           && !string.IsNullOrWhiteSpace(d.DesiredPosition);

    private static string? Str(JsonElement el, string key)
        => el.TryGetProperty(key, out var p) && p.ValueKind == JsonValueKind.String
            ? p.GetString()?.Trim()
            : null;

    private static List<string> StrList(JsonElement el, string key)
    {
        if (!el.TryGetProperty(key, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return [];
        return arr.EnumerateArray()
            .Select(x => x.GetString()?.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Cast<string>()
            .Take(30)
            .ToList();
    }

    private static List<CvExperienceItem> ReadExperiences(JsonElement el)
    {
        if (!el.TryGetProperty("experiences", out var arr) || arr.ValueKind != JsonValueKind.Array)
            return [];
        var list = new List<CvExperienceItem>();
        foreach (var x in arr.EnumerateArray())
        {
            if (x.ValueKind != JsonValueKind.Object) continue;
            list.Add(new CvExperienceItem
            {
                Title = Str(x, "title"),
                Org = Str(x, "org") ?? Str(x, "organization"),
                Period = Str(x, "period"),
                Description = Str(x, "description")
            });
        }
        return list;
    }

    public static string CompactPromptSuffix(int maxChars) =>
        $" Trả JSON thu gọn, không markdown, tối đa {maxChars} ký tự. Chỉ các key: parseSucceeded, format, keywords, readability, professionalism, readinessScore, fitT1, extract, suggestions.";
}



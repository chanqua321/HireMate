using System.Text.RegularExpressions;

namespace Common;

/// <summary>Conservative signal from CV text. Unknown stays unknown; never translates the source.</summary>
public static class CvLanguage
{
    private static readonly string[] VietnameseHeadings =
    ["mục tiêu nghề nghiệp", "kinh nghiệm làm việc", "học vấn", "kỹ năng", "dự án", "chứng chỉ", "giới thiệu bản thân"];
    private static readonly string[] EnglishHeadings =
    ["career objective", "work experience", "education", "academic background", "technical skills", "personal projects", "certifications", "employment history", "professional summary"];

    public static (string Language, string? Dominant) Detect(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return ("unknown", null);
        var lower = text.ToLowerInvariant();
        var vi = VietnameseHeadings.Count(h => Regex.IsMatch(lower, $@"(?m)^\s*{Regex.Escape(h)}\s*[:\r\n]"));
        var en = EnglishHeadings.Count(h => Regex.IsMatch(lower, $@"(?m)^\s*{Regex.Escape(h)}\s*[:\r\n]"));
        vi += Regex.Matches(lower, @"\b(?:và|của|trong|đã|tại|với|cho|các|làm|được)\b").Count;
        en += Regex.Matches(lower, @"\b(?:and|with|for|the|developed|built|worked|using|experience|university)\b").Count;
        if (vi == 0 && en == 0) return ("unknown", null);
        if (vi > 0 && en > 0 && Math.Min(vi, en) * 2 >= Math.Max(vi, en))
            return ("mixed", vi >= en ? "vi" : "en");
        return vi > en ? ("vi", "vi") : ("en", "en");
    }

    public static string? Resolve(string? selected, string? cvText, string? jdText = null)
    {
        if (selected is "vi" or "en") return selected;
        var cv = Detect(cvText);
        if (cv.Dominant != null) return cv.Dominant;
        return Detect(jdText).Dominant;
    }
}

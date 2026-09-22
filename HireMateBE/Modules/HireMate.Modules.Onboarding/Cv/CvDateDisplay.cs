using System.Globalization;
using System.Text.RegularExpressions;

namespace HireMate.Modules.Onboarding.Cv;

/// <summary>Presentation-only date formatting for CV preview/PDF.</summary>
public static partial class CvDateDisplay
{
    public static string FormatDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var text = value.Trim();

        if (DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var fullDate))
            return fullDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

        if (DateOnly.TryParseExact(text, "dd/MM/yyyy", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out fullDate))
            return fullDate.ToString("dd/MM/yyyy", CultureInfo.InvariantCulture);

        var month = IsoMonth().Match(text);
        if (month.Success && int.TryParse(month.Groups[2].Value, out var monthNumber)
            && monthNumber is >= 1 and <= 12)
            return $"{month.Groups[2].Value}/{month.Groups[1].Value}";

        return text;
    }

    public static string FormatPeriod(string? start, string? end, bool current, int? fallbackYear = null)
    {
        var values = new[]
        {
            FormatPeriodText(start),
            current ? "Hiện tại" : FormatPeriodText(end)
        }.Where(x => !string.IsNullOrWhiteSpace(x));
        var period = string.Join(" – ", values);
        return period.Length > 0 ? period : fallbackYear?.ToString(CultureInfo.InvariantCulture) ?? string.Empty;
    }

    public static string FormatPeriodText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var text = value.Trim();
        text = IsoFullDateInText().Replace(text, m => $"{m.Groups[3].Value}/{m.Groups[2].Value}/{m.Groups[1].Value}");
        text = IsoMonthInText().Replace(text, m => $"{m.Groups[2].Value}/{m.Groups[1].Value}");
        return Regex.Replace(text, @"\s+(?:-|–|—)\s+", " – ");
    }

    [GeneratedRegex(@"^(\d{4})-(\d{2})$")]
    private static partial Regex IsoMonth();

    [GeneratedRegex(@"(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)")]
    private static partial Regex IsoFullDateInText();

    [GeneratedRegex(@"(?<!\d)(\d{4})-(\d{2})(?!-?\d)")]
    private static partial Regex IsoMonthInText();
}

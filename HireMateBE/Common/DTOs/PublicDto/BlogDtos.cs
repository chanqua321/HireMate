using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Common.DTOs.PublicDto;

// Only editable fields. Identity, cover keys and timestamps are server-owned.
public sealed class BlogWriteDto
{
    public string Title { get; set; } = "";
    public string Slug { get; set; } = "";
    public string Tag { get; set; } = "";
    public string Summary { get; set; } = "";
    public string Body { get; set; } = "";
    public bool IsPublished { get; set; }
}

public sealed record BlogReadDto(Guid Id, string Title, string Slug, string? Tag,
    string Summary, string Body, bool IsPublished, DateTime? PublishedAt,
    DateTime? CreatedAt, DateTime? UpdatedAt, string? Author, string? CoverUrl);

public static class BlogContract
{
    public static readonly string[] Categories =
        ["Interview Tips", "CV Tips", "Career Path", "AI Interview", "Industry News"];

    public static string NormalizeSlug(string? input)
    {
        var text = (input ?? "").Trim().ToLowerInvariant().Replace('đ', 'd').Normalize(NormalizationForm.FormD);
        var ascii = new string(text.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
        return Regex.Replace(ascii, "[^a-z0-9]+", "-").Trim('-');
    }
}

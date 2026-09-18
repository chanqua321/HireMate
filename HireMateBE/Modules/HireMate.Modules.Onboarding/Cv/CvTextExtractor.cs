using DocumentFormat.OpenXml.Packaging;
using System.Text;
using UglyToad.PdfPig;

namespace HireMate.Modules.Onboarding.Cv;

public static class CvTextExtractor
{
    public const int MinSelectableChars = 80;

    public static string ExtractFromFile(string path, string fileName)
    {
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        try
        {
            if (ext == ".pdf")
                return ExtractPdf(path);
            if (ext is ".docx" or ".doc")
                return ExtractDocx(path);
            if (ext is ".txt" or ".html" or ".htm")
                return File.ReadAllText(path);
        }
        catch
        {
            return string.Empty;
        }

        return string.Empty;
    }

    public static bool HasSelectableText(string? text)
        => !string.IsNullOrWhiteSpace(text)
           && text.Replace(" ", "").Length >= MinSelectableChars
           && !text.StartsWith("[Binary CV:", StringComparison.Ordinal);

    private static string ExtractPdf(string path)
    {
        var sb = new StringBuilder();
        using var pdf = PdfDocument.Open(path);
        foreach (var page in pdf.GetPages())
        {
            if (!string.IsNullOrWhiteSpace(page.Text))
                sb.AppendLine(page.Text);
        }
        return sb.ToString().Trim();
    }

    private static string ExtractDocx(string path)
    {
        using var doc = WordprocessingDocument.Open(path, false);
        var body = doc.MainDocumentPart?.Document?.Body;
        return body?.InnerText?.Trim() ?? string.Empty;
    }
}


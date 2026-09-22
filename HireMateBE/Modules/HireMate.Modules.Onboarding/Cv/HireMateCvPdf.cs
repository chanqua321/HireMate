using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace HireMate.Modules.Onboarding.Cv;

public static class HireMateCvPdf
{
    static HireMateCvPdf()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public static byte[] Generate(CvWizardAnswers a, CvLayoutDefinition? layout = null)
    {
        layout ??= CvLayoutDefinition.Modern01();
        return string.Equals(layout.LayoutKey, "modern-02", StringComparison.OrdinalIgnoreCase)
            ? GenerateModern02(a, layout)
            : GenerateModern01(a, layout);
    }

    private static byte[] GenerateModern01(CvWizardAnswers a, CvLayoutDefinition layout)
    {
        var skills = a.Skills.Count == 0 ? "—" : string.Join(", ", a.Skills);
        var accent = ParseColor(layout.Style.AccentHex, Colors.Blue.Medium);
        var sections = layout.Sections;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(layout.Spacing.Margin);
                page.DefaultTextStyle(x => x.FontSize(layout.Typography.BodySize).FontFamily(layout.Typography.FontFamily));

                page.Content().Column(col =>
                {
                    col.Spacing(layout.Spacing.SectionGap);

                    if (HasSection(sections, "personal"))
                    {
                        col.Item().Text(a.FullName).FontSize(layout.Typography.TitleSize).Bold().FontColor(accent);
                        col.Item().Text($"{a.DesiredPosition} · {a.DesiredIndustry}").FontSize(12).FontColor(Colors.Grey.Darken2);
                        col.Item().Text($"{a.University} · {a.Major} · {a.GraduationYear}").FontSize(10).FontColor(Colors.Grey.Darken1);
                        col.Item().Text($"Kinh nghiệm: {a.ExperienceLevel}").FontSize(10);
                    }

                    foreach (var section in sections)
                    {
                        switch (section.ToLowerInvariant())
                        {
                            case "objective":
                            case "summary":
                                SectionHeader(col, "TÓM TẮT / MỤC TIÊU", layout, accent);
                                col.Item().Text(string.IsNullOrWhiteSpace(a.Bio) ? "—" : a.Bio);
                                break;
                            case "skills":
                                SectionHeader(col, "KỸ NĂNG", layout, accent);
                                col.Item().Text(skills);
                                break;
                            case "experience":
                            case "projects":
                                if (section.Equals("projects", StringComparison.OrdinalIgnoreCase)
                                    && sections.Any(s => s.Equals("experience", StringComparison.OrdinalIgnoreCase)))
                                    break; // combined under experience when both present in modern-01
                                SectionHeader(col, "KINH NGHIỆM / DỰ ÁN", layout, accent);
                                RenderExperiences(col, a);
                                break;
                            case "education":
                                SectionHeader(col, "HỌC VẤN", layout, accent);
                                col.Item().Text($"{a.University} — {a.Major} ({a.GraduationYear})");
                                break;
                        }
                    }

                    col.Item().PaddingTop(16).AlignRight()
                        .Text("Tạo bởi HireMate").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        }).GeneratePdf();
    }

    private static byte[] GenerateModern02(CvWizardAnswers a, CvLayoutDefinition layout)
    {
        var skills = a.Skills.Count == 0 ? "—" : string.Join(" · ", a.Skills);
        var accent = ParseColor(layout.Style.AccentHex, Colors.Teal.Medium);

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(layout.Spacing.Margin);
                page.DefaultTextStyle(x => x.FontSize(layout.Typography.BodySize).FontFamily(layout.Typography.FontFamily));

                page.Content().Column(col =>
                {
                    col.Spacing(layout.Spacing.SectionGap);

                    col.Item().Background(accent).Padding(12).Column(header =>
                    {
                        header.Item().Text(a.FullName).FontSize(layout.Typography.TitleSize).Bold().FontColor(Colors.White);
                        header.Item().Text($"{a.DesiredPosition} | {a.DesiredIndustry}").FontSize(11).FontColor(Colors.White);
                        header.Item().Text($"{a.University} · {a.Major} · {a.GraduationYear}").FontSize(9).FontColor(Colors.White);
                    });

                    SectionHeader(col, "MỤC TIÊU NGHỀ NGHIỆP", layout, accent);
                    col.Item().Text(string.IsNullOrWhiteSpace(a.Bio) ? "—" : a.Bio);

                    SectionHeader(col, "KỸ NĂNG", layout, accent);
                    col.Item().Text(skills);

                    SectionHeader(col, "KINH NGHIỆM / HOẠT ĐỘNG", layout, accent);
                    RenderExperiences(col, a);

                    SectionHeader(col, "HỌC VẤN", layout, accent);
                    col.Item().Text($"{a.University} — {a.Major} ({a.GraduationYear}) · {a.ExperienceLevel}");

                    col.Item().PaddingTop(14).AlignRight()
                        .Text("HireMate · Modern 02").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        }).GeneratePdf();
    }

    private static void SectionHeader(ColumnDescriptor col, string title, CvLayoutDefinition layout, string accent)
    {
        col.Item().PaddingTop(8).Text(title).Bold().FontSize(layout.Typography.SectionTitleSize).FontColor(accent);
        if (layout.Style.HeaderRule)
            col.Item().LineHorizontal(1).LineColor(Colors.Grey.Medium);
    }

    private static void RenderExperiences(ColumnDescriptor col, CvWizardAnswers a)
    {
        if (a.Experiences.Count == 0)
        {
            col.Item().Text("—");
            return;
        }

        foreach (var e in a.Experiences)
        {
            col.Item().PaddingTop(4).Text($"{e.Title} — {e.Org}").Bold();
            if (!string.IsNullOrWhiteSpace(e.Period))
                col.Item().Text(e.Period!).FontSize(9).FontColor(Colors.Grey.Darken1);
            if (!string.IsNullOrWhiteSpace(e.Description))
                col.Item().Text(e.Description!);
        }
    }

    private static bool HasSection(IEnumerable<string> sections, string key)
        => sections.Any(s => s.Equals(key, StringComparison.OrdinalIgnoreCase));

    private static string ParseColor(string? hex, string fallback)
    {
        if (string.IsNullOrWhiteSpace(hex)) return fallback;
        try { return hex.StartsWith('#') ? hex : $"#{hex}"; }
        catch { return fallback; }
    }
}

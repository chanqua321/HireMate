using Common.DTOs.OnboardingDto;
using System.Net;
using System.Text;

namespace HireMate.Modules.Onboarding.Cv;

public static class HireMateCvHtml
{
    public static string Render(CvWizardAnswers source, CvLayoutDefinition? definition = null)
    {
        var document = CvTemplateDocumentMapper.Map(source, definition);
        var a = document.Data;
        var layout = document.Layout;
        var accent = string.IsNullOrWhiteSpace(layout.Style.AccentHex) ? "#2F5173" : layout.Style.AccentHex;
        var sections = new StringBuilder();

        var available = new Dictionary<string, (string Title, string Body)>(StringComparer.OrdinalIgnoreCase)
        {
            ["objective"] = ("Mục tiêu nghề nghiệp", string.Join("", new[] { a.CareerObjective, a.Summary }.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => $"<p>{E(x)}</p>"))),
            ["education"] = ("Học vấn", RenderEducations(a.Educations)),
            ["experience"] = ("Kinh nghiệm làm việc", RenderDatedEntries(a.Experiences)),
            ["activities"] = ("Hoạt động", RenderDatedEntries(a.Activities)),
            ["certifications"] = ("Chứng chỉ", RenderCertifications(a.Certifications)),
            ["skills"] = ("Kỹ năng", a.Skills.Count == 0 ? "" : $"<div class=\"plain-list\">{string.Join("", a.Skills.Select(s => $"<div>{E(s)}</div>"))}</div>"),
            ["hobbies"] = ("Sở thích", string.Join(", ", a.Hobbies.Select(E))),
            ["interests"] = ("Sở thích", string.Join(", ", a.Hobbies.Select(E))),
            ["references"] = ("Người giới thiệu", RenderReferences(a.References)),
            ["projects"] = ("Dự án", RenderProjects(a.Projects))
        };
        foreach (var key in layout.Sections.Where(x => !x.Equals("personal", StringComparison.OrdinalIgnoreCase)))
            if (available.TryGetValue(key, out var section)) AddSection(sections, section.Title, section.Body);

        var contacts = new[]
        {
            Pair("Ngày sinh", CvDateDisplay.FormatDate(a.DateOfBirth)), Pair("Giới tính", a.Gender), Pair("Số điện thoại", a.Phone),
            Pair("Email", a.Email), Pair("Địa chỉ", a.Address), Pair("LinkedIn", a.LinkedIn), Pair("GitHub", a.GitHub)
        }.Where(x => x.Length > 0);
        var avatar = string.IsNullOrWhiteSpace(a.AvatarUrl)
            ? ""
            : $"<img class=\"avatar\" src=\"{E(a.AvatarUrl)}\" alt=\"Ảnh đại diện\">";
        var target = string.IsNullOrWhiteSpace(a.DesiredPosition) ? "" : $"<div class=\"target\">{E(a.DesiredPosition)}</div>";
        var contactHtml = string.Join("", contacts.Select(c => $"<div class=\"contact\">{c}</div>"));

        return $$"""
            <!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>CV {{E(a.FullName)}}</title><style>
            :root{--accent:{{E(accent)}}}*{box-sizing:border-box}html{background:#e2e8f0}body{margin:0;color:var(--accent);font-family:{{E(layout.Typography.FontFamily)}},Arial,sans-serif;font-size:{{layout.Typography.BodySize}}pt;line-height:1.45}
            .viewport{padding:20px;overflow:auto}.page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:{{layout.Page.MarginTop}}pt {{layout.Page.MarginRight}}pt {{layout.Page.MarginBottom}}pt {{layout.Page.MarginLeft}}pt;box-shadow:0 8px 28px #0f172a26}
            .header{display:flex;gap:{{layout.Header.Gap}}pt;margin-bottom:24pt}.avatar{width:{{layout.Header.AvatarWidth}}pt;height:{{layout.Header.AvatarHeight}}pt;object-fit:cover;border:2pt solid #e5e7eb}.identity{flex:1}h1{font-size:{{layout.Typography.TitleSize}}pt;line-height:1.15;margin:0 0 5pt;text-transform:uppercase}.target{font-size:12.01pt;margin-bottom:4pt}.contact{margin:3pt 0}.contact b{display:inline-block;min-width:68pt}
            section{margin:0 0 {{layout.Spacing.SectionGap}}pt;break-inside:auto;page-break-inside:auto}h2{break-after:avoid;page-break-after:avoid;font-size:{{layout.Typography.SectionTitleSize}}pt;text-transform:uppercase;margin:0 0 9pt;padding:0 0 4pt;border-bottom:{{layout.Page.SeparatorWidth}}pt solid #111}.entry{display:grid;grid-template-columns:{{layout.Entry.DateColumnWidth}}pt 1fr;margin:0 -3pt;padding:6pt 3pt;border-bottom:.5pt solid #e5e7eb;break-inside:avoid;page-break-inside:avoid}.entry-date{white-space:pre-line}.entry-main strong{display:block}.entry-main p{margin:2pt 0;white-space:pre-line}.plain-list>div{padding:5pt 0;border-bottom:.5pt solid #e5e7eb;break-inside:avoid;page-break-inside:avoid}
            @media(max-width:850px){.viewport{padding:8px}.page{min-width:210mm}.mobile-scroll{overflow:auto} } @media print{html{background:#fff}.viewport{padding:0}.page{box-shadow:none;margin:0;width:auto;min-height:auto}@page{size:A4;margin:0} }
            </style></head><body><div class="mobile-scroll"><main class="viewport"><article class="page">
            <header class="header">{{avatar}}<div class="identity"><h1>{{E(a.FullName)}}</h1>
            {{target}}{{contactHtml}}</div></header>
            {{sections}}</article></main></div></body></html>
            """;
    }

    private static void AddSection(StringBuilder output, string title, string? body)
    {
        if (string.IsNullOrWhiteSpace(body)) return;
        output.Append("<section><h2>").Append(E(title)).Append("</h2>").Append(body).Append("</section>");
    }

    private static string RenderDatedEntries(IEnumerable<CvExperienceItem> items) => string.Join("", items.Select(e =>
        $"<div class=\"entry\"><div class=\"entry-date\">{E(string.IsNullOrWhiteSpace(e.Period) ? Period(e.StartDate, e.EndDate, e.IsCurrent) : CvDateDisplay.FormatPeriodText(e.Period))}</div><div class=\"entry-main\"><strong>{E(e.Title)}</strong>" +
        $"{(!string.IsNullOrWhiteSpace(e.Role) ? $"<b>{E(e.Role)}</b>" : "")}{(!string.IsNullOrWhiteSpace(e.Org) ? $"<b>{E(e.Org)}</b>" : "")}{(!string.IsNullOrWhiteSpace(e.Description) ? $"<p>{E(e.Description)}</p>" : "")}{RenderBullets(e.BulletPoints)}</div></div>"));

    private static string RenderProjects(IEnumerable<CvProjectDto> items) => string.Join("", items.Select(p =>
        $"<div class=\"entry\"><div class=\"entry-date\">{E(CvDateDisplay.FormatPeriodText(p.Period))}</div><div class=\"entry-main\"><strong>{E(p.Name)}</strong>" +
        $"{(!string.IsNullOrWhiteSpace(p.Role) ? $"<b>{E(p.Role)}</b>" : "")}{(!string.IsNullOrWhiteSpace(p.Description) ? $"<p>{E(p.Description)}</p>" : "")}" +
        $"{(p.Technologies?.Count > 0 ? $"<p>{string.Join(", ", p.Technologies.Select(E))}</p>" : "")}{(!string.IsNullOrWhiteSpace(p.Url) ? $"<p>{E(p.Url)}</p>" : "")}{RenderBullets(p.BulletPoints)}</div></div>"));

    private static string RenderEducations(IEnumerable<CvEducationDto> items) => string.Join("", items.Select(e =>
        $"<div class=\"entry\"><div class=\"entry-date\">{E(Period(e.StartDate, e.EndDate, e.IsCurrent, e.GraduationYear))}</div><div class=\"entry-main\"><strong>{E(e.Institution)}</strong>" +
        $"{(!string.IsNullOrWhiteSpace(e.Major) ? $"<b>{E(e.Major)}</b>" : "")}{(!string.IsNullOrWhiteSpace(e.Gpa) ? $"<p>GPA / Xếp loại: {E(e.Gpa)}</p>" : "")}{(!string.IsNullOrWhiteSpace(e.Description) ? $"<p>{E(e.Description)}</p>" : "")}</div></div>"));

    private static string RenderCertifications(IEnumerable<CvCertificationDto> items) => string.Join("", items.Select(c =>
        $"<div class=\"entry\"><div class=\"entry-date\">{E(Period(c.IssueDate, c.ExpiryDate, false))}</div><div class=\"entry-main\"><strong>{E(c.Name)}</strong>{(!string.IsNullOrWhiteSpace(c.Issuer) ? $"<p>{E(c.Issuer)}</p>" : "")}{(!string.IsNullOrWhiteSpace(c.Description) ? $"<p>{E(c.Description)}</p>" : "")}{(!string.IsNullOrWhiteSpace(c.CredentialId) ? $"<p>{E(c.CredentialId)}</p>" : "")}{(!string.IsNullOrWhiteSpace(c.CredentialUrl) ? $"<p>{E(c.CredentialUrl)}</p>" : "")}</div></div>"));

    private static string RenderReferences(IEnumerable<CvReferenceDto> items) => string.Join("", items.Select(r =>
        $"<div class=\"entry\"><div></div><div class=\"entry-main\"><strong>{E(r.Name)}</strong><p>{E(string.Join(" · ", new[] { r.Title, r.Organization, r.Email, r.Phone, r.Contact }.Where(x => !string.IsNullOrWhiteSpace(x))))}</p>{(!string.IsNullOrWhiteSpace(r.Description) ? $"<p>{E(r.Description)}</p>" : "")}</div></div>"));

    private static string RenderBullets(IEnumerable<string>? bullets) => bullets == null ? "" : string.Join("", bullets.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => $"<p>• {E(x)}</p>"));
    private static string Period(string? start, string? end, bool current, int? year = null) =>
        CvDateDisplay.FormatPeriod(start, end, current, year);

    private static string Pair(string label, string? value) => string.IsNullOrWhiteSpace(value) ? "" : $"<b>{E(label)}:</b> {E(value)}";
    private static string E(string? value) => WebUtility.HtmlEncode(value ?? string.Empty);

    public static string ToPlainText(CvWizardAnswers source)
    {
        var a = CvTemplateDocumentMapper.Map(source).Data;
        var sb = new StringBuilder();
        foreach (var value in new[] { a.FullName, a.DesiredPosition, a.DesiredIndustry, a.Phone, a.Email, a.Address, a.LinkedIn, a.GitHub, a.CareerObjective, a.Summary })
            if (!string.IsNullOrWhiteSpace(value)) sb.AppendLine(value);
        foreach (var e in a.Educations) sb.AppendLine($"{e.Institution} | {e.Major} | {Period(e.StartDate, e.EndDate, e.IsCurrent, e.GraduationYear)} | {e.Gpa} | {e.Description}");
        if (a.Skills.Count > 0) sb.AppendLine("Skills: " + string.Join(", ", a.Skills));
        foreach (var e in a.Experiences.Concat(a.Activities)) sb.AppendLine($"{e.Title} @ {e.Org} ({(string.IsNullOrWhiteSpace(e.Period) ? Period(e.StartDate, e.EndDate, e.IsCurrent) : e.Period)}): {e.Description} {string.Join("; ", e.BulletPoints)}");
        foreach (var p in a.Projects) sb.AppendLine($"{p.Name} ({p.Period}): {p.Description} {string.Join("; ", p.BulletPoints)}");
        foreach (var c in a.Certifications) sb.AppendLine($"{c.Name} - {c.Issuer} - {c.CredentialId}");
        foreach (var h in a.Hobbies) sb.AppendLine(h);
        foreach (var r in a.References) sb.AppendLine($"{r.Name} - {r.Title} - {r.Organization} - {r.Email} - {r.Phone}");
        return sb.ToString();
    }
}

public sealed class CvWizardAnswers
{
    public string FullName { get; set; } = string.Empty;
    public string University { get; set; } = string.Empty;
    public string Major { get; set; } = string.Empty;
    public int GraduationYear { get; set; }
    public string DesiredIndustry { get; set; } = string.Empty;
    public string DesiredPosition { get; set; } = string.Empty;
    public string ExperienceLevel { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string CareerObjective { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public string? AvatarUrl { get; set; }
    public string? LinkedIn { get; set; }
    public string? GitHub { get; set; }
    public string? ClientRequestId { get; set; }
    public List<string> Skills { get; set; } = [];
    public List<CvExperienceItem> Experiences { get; set; } = [];
    public List<CvProjectDto> Projects { get; set; } = [];
    public List<CvCertificationDto> Certifications { get; set; } = [];
    public List<CvExperienceItem> Activities { get; set; } = [];
    public List<string> Hobbies { get; set; } = [];
    public List<CvReferenceDto> References { get; set; } = [];
    public List<CvEducationDto> Educations { get; set; } = [];
}

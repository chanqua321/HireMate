using System.Net;
using System.Text;

namespace HireMate.Modules.Onboarding.Cv;

public static class HireMateCvHtml
{
    public static string Render(CvWizardAnswers a, CvLayoutDefinition? layout = null)
    {
        layout ??= CvLayoutDefinition.Modern01();
        var accent = string.IsNullOrWhiteSpace(layout.Style.AccentHex) ? "#0284C7" : layout.Style.AccentHex;
        var skills = a.Skills.Count == 0 ? "" : string.Join(", ", a.Skills.Select(WebUtility.HtmlEncode));
        var exp = new StringBuilder();
        foreach (var e in a.Experiences)
        {
            exp.Append("<div class=\"exp\"><strong>")
                .Append(WebUtility.HtmlEncode(e.Title ?? ""))
                .Append("</strong> — ")
                .Append(WebUtility.HtmlEncode(e.Org ?? ""))
                .Append(" <span>")
                .Append(WebUtility.HtmlEncode(e.Period ?? ""))
                .Append("</span><p>")
                .Append(WebUtility.HtmlEncode(e.Description ?? ""))
                .Append("</p></div>");
        }

        var isModern02 = string.Equals(layout.LayoutKey, "modern-02", StringComparison.OrdinalIgnoreCase);
        var headerStyle = isModern02
            ? $"background:{accent};color:#fff;padding:16px;border-radius:6px;margin-bottom:12px"
            : "";

        return $$"""
            <!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>CV {{WebUtility.HtmlEncode(a.FullName)}}</title>
            <style>
            body{font-family:{{WebUtility.HtmlEncode(layout.Typography.FontFamily)}},Helvetica,sans-serif;max-width:720px;margin:24px auto;color:#111;line-height:1.4;font-size:{{layout.Typography.BodySize}}px}
            h1{margin:0 0 4px;font-size:{{layout.Typography.TitleSize}}px;color:{{(isModern02 ? "#fff" : accent)}}}
            h2{font-size:{{layout.Typography.SectionTitleSize}}px;text-transform:uppercase;border-bottom:1px solid #333;margin:16px 0 8px;color:{{accent}}}
            .meta{color:#444;font-size:13px} .exp{margin-bottom:10px}
            .header{ {{headerStyle}} }
            </style></head><body>
            <div class="header">
            <h1>{{WebUtility.HtmlEncode(a.FullName)}}</h1>
            <div class="meta">{{WebUtility.HtmlEncode(a.DesiredPosition)}} · {{WebUtility.HtmlEncode(a.DesiredIndustry)}}</div>
            <div class="meta">{{WebUtility.HtmlEncode(a.University)}} · {{WebUtility.HtmlEncode(a.Major)}} · {{a.GraduationYear}}</div>
            </div>
            <h2>Tóm tắt / Mục tiêu</h2><p>{{WebUtility.HtmlEncode(a.Bio)}}</p>
            <h2>Kỹ năng</h2><p>{{skills}}</p>
            <h2>Kinh nghiệm / Dự án</h2>{{exp}}
            <h2>Học vấn</h2><p>{{WebUtility.HtmlEncode(a.University)}} — {{WebUtility.HtmlEncode(a.Major)}} ({{a.GraduationYear}})</p>
            </body></html>
            """;
    }

    public static string ToPlainText(CvWizardAnswers a)
    {
        var sb = new StringBuilder();
        sb.AppendLine(a.FullName);
        sb.AppendLine($"{a.DesiredPosition} | {a.DesiredIndustry}");
        sb.AppendLine($"{a.University} | {a.Major} | {a.GraduationYear}");
        sb.AppendLine(a.ExperienceLevel);
        sb.AppendLine(a.Bio);
        sb.AppendLine("Skills: " + string.Join(", ", a.Skills));
        foreach (var e in a.Experiences)
            sb.AppendLine($"{e.Title} @ {e.Org} ({e.Period}): {e.Description}");
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
    public List<string> Skills { get; set; } = [];
    public List<CvExperienceItem> Experiences { get; set; } = [];
}

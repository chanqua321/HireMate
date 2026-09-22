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
        var document = CvTemplateDocumentMapper.Map(a, layout);
        a = document.Data;
        layout = document.Layout;
        return string.Equals(layout.LayoutKey, "modern-02", StringComparison.OrdinalIgnoreCase)
            ? GenerateModern02(a, layout)
            : GenerateModern01(a, layout);
    }

    private static byte[] GenerateModern01(CvWizardAnswers a, CvLayoutDefinition layout)
    {
        var accent = ParseColor(layout.Style.AccentHex, Colors.Blue.Medium);
        var sections = layout.Sections;

        return Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginTop(layout.Page.MarginTop);
                page.MarginRight(layout.Page.MarginRight);
                page.MarginBottom(layout.Page.MarginBottom);
                page.MarginLeft(layout.Page.MarginLeft);
                page.DefaultTextStyle(x => x.FontSize(layout.Typography.BodySize).FontFamily(layout.Typography.FontFamily).FontColor(accent));

                page.Content().Column(col =>
                {
                    col.Spacing(layout.Spacing.SectionGap);

                    if (HasSection(sections, "personal"))
                    {
                        var avatar = TryDecodeAvatar(a.AvatarUrl);
                        var headerContainer = col.Item();
                        if (avatar != null) headerContainer = headerContainer.MinHeight(layout.Header.AvatarHeight);
                        headerContainer.Row(row =>
                        {
                            if (avatar != null)
                            {
                                row.ConstantItem(layout.Header.AvatarWidth).Height(layout.Header.AvatarHeight).Image(avatar).FitArea();
                                row.ConstantItem(layout.Header.Gap);
                            }
                            row.RelativeItem().Column(header =>
                            {
                                if (!string.IsNullOrWhiteSpace(a.FullName)) header.Item().Text(a.FullName.ToUpperInvariant()).FontSize(layout.Typography.TitleSize).Bold();
                                if (!string.IsNullOrWhiteSpace(a.DesiredPosition)) header.Item().Text(a.DesiredPosition).FontSize(layout.Typography.SectionTitleSize);
                                ContactLine(header, "Ngày sinh", CvDateDisplay.FormatDate(a.DateOfBirth));
                                ContactLine(header, "Giới tính", a.Gender);
                                ContactLine(header, "Số điện thoại", a.Phone);
                                ContactLine(header, "Email", a.Email);
                                ContactLine(header, "Địa chỉ", a.Address);
                                ContactLine(header, "LinkedIn", a.LinkedIn);
                                ContactLine(header, "GitHub", a.GitHub);
                            });
                        });
                    }

                    foreach (var section in sections)
                    {
                        switch (section.ToLowerInvariant())
                        {
                            case "objective":
                                if (string.IsNullOrWhiteSpace(a.CareerObjective) && string.IsNullOrWhiteSpace(a.Summary)) break;
                                col.Item().ShowEntire().Column(group =>
                                {
                                    SectionHeader(group, "MỤC TIÊU NGHỀ NGHIỆP", layout, accent);
                                    if (!string.IsNullOrWhiteSpace(a.CareerObjective)) group.Item().Text(a.CareerObjective);
                                    if (!string.IsNullOrWhiteSpace(a.Summary)) group.Item().Text(a.Summary);
                                });
                                break;
                            case "skills":
                                if (a.Skills.Count == 0) break;
                                RenderSimpleSection(col, "KỸ NĂNG", a.Skills, layout, accent);
                                break;
                            case "experience":
                                if (a.Experiences.Count == 0) break;
                                RenderDatedSection(col, "KINH NGHIỆM LÀM VIỆC", a.Experiences, layout, accent);
                                break;
                            case "projects":
                                if (a.Projects.Count == 0) break;
                                RenderProjectSection(col, a.Projects, layout, accent);
                                break;
                            case "education":
                                if (!CvTemplateDocumentMapper.HasEducation(a)) break;
                                RenderEducationSection(col, a.Educations, layout, accent);
                                break;
                            case "certifications":
                                if (a.Certifications.Count == 0) break;
                                RenderCertificationSection(col, a.Certifications, layout, accent);
                                break;
                            case "activities":
                                if (a.Activities.Count == 0) break;
                                RenderDatedSection(col, "HOẠT ĐỘNG", a.Activities, layout, accent);
                                break;
                            case "hobbies":
                                if (a.Hobbies.Count == 0) break;
                                col.Item().ShowEntire().Column(group =>
                                {
                                    SectionHeader(group, "SỞ THÍCH", layout, accent);
                                    group.Item().Text(string.Join(", ", a.Hobbies));
                                });
                                break;
                            case "references":
                                if (a.References.Count == 0) break;
                                col.Item().ShowEntire().Column(group =>
                                {
                                    SectionHeader(group, "NGƯỜI GIỚI THIỆU", layout, accent);
                                    RenderReference(group, a.References[0]);
                                });
                                foreach (var reference in a.References.Skip(1)) RenderReference(col, reference);
                                break;
                        }
                    }

                });
            });
        }).GeneratePdf();
    }

    private static byte[] GenerateModern02(CvWizardAnswers a, CvLayoutDefinition layout)
    {
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
                        var target = string.Join(" | ", new[] { a.DesiredPosition, a.DesiredIndustry }.Where(x => !string.IsNullOrWhiteSpace(x)));
                        if (!string.IsNullOrWhiteSpace(target)) header.Item().Text(target).FontSize(11).FontColor(Colors.White);
                        var contact = string.Join(" · ", new[]
                        {
                            LabeledValue("Ngày sinh", CvDateDisplay.FormatDate(a.DateOfBirth)), LabeledValue("Giới tính", a.Gender),
                            LabeledValue("Số điện thoại", a.Phone), LabeledValue("Email", a.Email),
                            LabeledValue("Địa chỉ", a.Address), LabeledValue("LinkedIn", a.LinkedIn),
                            LabeledValue("GitHub", a.GitHub)
                        }.Where(x => !string.IsNullOrWhiteSpace(x)));
                        if (!string.IsNullOrWhiteSpace(contact)) header.Item().Text(contact).FontSize(9).FontColor(Colors.White);
                    });

                    foreach (var section in layout.Sections)
                    {
                        switch (section.ToLowerInvariant())
                        {
                            case "objective" when !string.IsNullOrWhiteSpace(a.CareerObjective) || !string.IsNullOrWhiteSpace(a.Summary):
                                col.Item().ShowEntire().Column(group =>
                                {
                                    SectionHeader(group, "MỤC TIÊU NGHỀ NGHIỆP", layout, accent);
                                    if (!string.IsNullOrWhiteSpace(a.CareerObjective)) group.Item().Text(a.CareerObjective);
                                    if (!string.IsNullOrWhiteSpace(a.Summary)) group.Item().Text(a.Summary);
                                });
                                break;
                            case "skills" when a.Skills.Count > 0: RenderSimpleSection(col, "KỸ NĂNG", [string.Join(" · ", a.Skills)], layout, accent); break;
                            case "experience" when a.Experiences.Count > 0: RenderDatedSection(col, "KINH NGHIỆM LÀM VIỆC", a.Experiences, layout, accent); break;
                            case "projects" when a.Projects.Count > 0: RenderProjectSection(col, a.Projects, layout, accent); break;
                            case "education" when a.Educations.Count > 0: RenderEducationSection(col, a.Educations, layout, accent); break;
                            case "certifications" when a.Certifications.Count > 0: RenderCertificationSection(col, a.Certifications, layout, accent); break;
                            case "activities" when a.Activities.Count > 0: RenderDatedSection(col, "HOẠT ĐỘNG", a.Activities, layout, accent); break;
                            case "hobbies" or "interests" when a.Hobbies.Count > 0: RenderSimpleSection(col, "SỞ THÍCH", [string.Join(", ", a.Hobbies)], layout, accent); break;
                            case "references" when a.References.Count > 0:
                                col.Item().ShowEntire().Column(group =>
                                {
                                    SectionHeader(group, "NGƯỜI GIỚI THIỆU", layout, accent);
                                    RenderReference(group, a.References[0]);
                                });
                                foreach (var reference in a.References.Skip(1)) RenderReference(col, reference);
                                break;
                        }
                    }

                    col.Item().PaddingTop(14).AlignRight()
                        .Text("HireMate · Modern 02").FontSize(8).FontColor(Colors.Grey.Medium);
                });
            });
        }).GeneratePdf();
    }

    private static void SectionHeader(ColumnDescriptor col, string title, CvLayoutDefinition layout, string accent)
    {
        col.Item().EnsureSpace(105).Column(header =>
        {
            header.Item().PaddingTop(8).Text(title).Bold().FontSize(layout.Typography.SectionTitleSize).FontColor(accent);
            if (layout.Style.HeaderRule)
                header.Item().LineHorizontal(layout.Page.SeparatorWidth).LineColor(Colors.Black);
        });
    }

    private static void ContactLine(ColumnDescriptor header, string label, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        header.Item().PaddingTop(2).Text(text =>
        {
            text.Span($"{label}:  ").Bold();
            text.Span(value);
        });
    }

    private static string? LabeledValue(string label, string? value)
        => string.IsNullOrWhiteSpace(value) ? null : $"{label}: {value}";

    private static void RenderReference(ColumnDescriptor col, Common.DTOs.OnboardingDto.CvReferenceDto reference)
    {
        col.Item().PaddingVertical(3).Column(item =>
        {
            if (!string.IsNullOrWhiteSpace(reference.Name)) item.Item().Text(reference.Name).Bold();
            var line = string.Join(" · ", new[] { reference.Title, reference.Organization, reference.Email, reference.Phone, reference.Contact }.Where(x => !string.IsNullOrWhiteSpace(x)));
            if (!string.IsNullOrWhiteSpace(line)) item.Item().Text(line);
            if (!string.IsNullOrWhiteSpace(reference.Description)) item.Item().Text(reference.Description);
        });
    }

    private static void RenderSimpleSection(ColumnDescriptor col, string title, IReadOnlyList<string> items, CvLayoutDefinition layout, string accent)
    {
        RenderEntrySection(col, title, items, layout, accent, (target, text) => target.Item().PaddingVertical(2).Text(text));
    }

    private static void RenderDatedSection(ColumnDescriptor col, string title, IReadOnlyList<CvExperienceItem> items, CvLayoutDefinition layout, string accent)
    {
        RenderEntrySection(col, title, items, layout, accent, (target, item) => RenderDatedItem(target, item, layout));
    }

    private static void RenderDatedItem(ColumnDescriptor col, CvExperienceItem e, CvLayoutDefinition layout)
    {
        col.Item().ShowEntire().PaddingVertical(4).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Row(row =>
        {
            row.ConstantItem(layout.Entry.DateColumnWidth).Text(ResolvePeriod(e));
            row.RelativeItem().Column(content =>
            {
                if (!string.IsNullOrWhiteSpace(e.Title)) content.Item().Text(e.Title).Bold();
                if (!string.IsNullOrWhiteSpace(e.Org)) content.Item().Text(e.Org).Bold();
                if (!string.IsNullOrWhiteSpace(e.Role)) content.Item().Text(e.Role);
                if (!string.IsNullOrWhiteSpace(e.Description)) content.Item().Text(e.Description);
                foreach (var bullet in e.BulletPoints.Where(x => !string.IsNullOrWhiteSpace(x)))
                    content.Item().Text($"{layout.Entry.Bullet} {bullet}");
            });
        });
    }

    private static void RenderEducationSection(ColumnDescriptor col, IReadOnlyList<Common.DTOs.OnboardingDto.CvEducationDto> items, CvLayoutDefinition layout, string accent)
    {
        RenderEntrySection(col, "HỌC VẤN", items, layout, accent, (target, item) => RenderEducation(target, item, layout));
    }

    private static void RenderEducation(ColumnDescriptor col, Common.DTOs.OnboardingDto.CvEducationDto education, CvLayoutDefinition layout)
    {
        col.Item().ShowEntire().PaddingVertical(4).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Row(row =>
        {
            var period = CvDateDisplay.FormatPeriod(education.StartDate, education.EndDate, education.IsCurrent, education.GraduationYear);
            row.ConstantItem(layout.Entry.DateColumnWidth).Text(period);
            row.RelativeItem().Column(content =>
            {
                if (!string.IsNullOrWhiteSpace(education.Institution)) content.Item().Text(education.Institution).Bold();
                if (!string.IsNullOrWhiteSpace(education.Major)) content.Item().Text(education.Major);
                if (!string.IsNullOrWhiteSpace(education.Gpa)) content.Item().Text($"GPA / Xếp loại: {education.Gpa}");
                if (!string.IsNullOrWhiteSpace(education.Description)) content.Item().Text(education.Description);
            });
        });
    }

    private static string ResolvePeriod(CvExperienceItem item)
    {
        if (!string.IsNullOrWhiteSpace(item.Period)) return CvDateDisplay.FormatPeriodText(item.Period);
        return CvDateDisplay.FormatPeriod(item.StartDate, item.EndDate, item.IsCurrent);
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

    private static void RenderProjectSection(ColumnDescriptor col, IReadOnlyList<Common.DTOs.OnboardingDto.CvProjectDto> items, CvLayoutDefinition layout, string accent)
    {
        RenderEntrySection(col, "DỰ ÁN", items, layout, accent, (target, item) => RenderProject(target, item, layout));
    }

    private static void RenderProject(ColumnDescriptor col, Common.DTOs.OnboardingDto.CvProjectDto p, CvLayoutDefinition layout)
    {
        col.Item().ShowEntire().PaddingVertical(4).BorderBottom(0.5f).BorderColor(Colors.Grey.Lighten2).Row(row =>
        {
            row.ConstantItem(layout.Entry.DateColumnWidth).Text(CvDateDisplay.FormatPeriodText(p.Period));
            row.RelativeItem().Column(content =>
            {
                content.Item().Text($"{p.Name}{(string.IsNullOrWhiteSpace(p.Role) ? "" : $" — {p.Role}")}").Bold();
                if (!string.IsNullOrWhiteSpace(p.Description)) content.Item().Text(p.Description!);
                if (p.Technologies?.Count > 0) content.Item().Text(string.Join(", ", p.Technologies)).FontSize(9);
                if (!string.IsNullOrWhiteSpace(p.Url)) content.Item().Text(p.Url);
                foreach (var bullet in p.BulletPoints.Where(x => !string.IsNullOrWhiteSpace(x)))
                    content.Item().Text($"{layout.Entry.Bullet} {bullet}");
            });
        });
    }

    private static void RenderCertificationSection(ColumnDescriptor col, IReadOnlyList<Common.DTOs.OnboardingDto.CvCertificationDto> items, CvLayoutDefinition layout, string accent)
    {
        RenderEntrySection(col, "CHỨNG CHỈ", items, layout, accent, (target, item) => RenderCertification(target, item, layout));
    }

    private static void RenderCertification(ColumnDescriptor col, Common.DTOs.OnboardingDto.CvCertificationDto c, CvLayoutDefinition layout)
    {
        col.Item().ShowEntire().PaddingVertical(3).Row(row =>
        {
            row.ConstantItem(layout.Entry.DateColumnWidth).Text(CvDateDisplay.FormatPeriod(c.IssueDate, c.ExpiryDate, false));
            row.RelativeItem().Column(content =>
            {
                if (!string.IsNullOrWhiteSpace(c.Name)) content.Item().Text(c.Name).Bold();
                if (!string.IsNullOrWhiteSpace(c.Issuer)) content.Item().Text(c.Issuer);
                if (!string.IsNullOrWhiteSpace(c.Description)) content.Item().Text(c.Description);
                if (!string.IsNullOrWhiteSpace(c.CredentialId)) content.Item().Text(c.CredentialId);
                if (!string.IsNullOrWhiteSpace(c.CredentialUrl)) content.Item().Text(c.CredentialUrl);
            });
        });
    }

    private static void RenderEntrySection<T>(ColumnDescriptor col, string title, IReadOnlyList<T> items, CvLayoutDefinition layout, string accent, Action<ColumnDescriptor, T> renderEntry)
    {
        if (items.Count == 0) return;
        col.Item().ShowEntire().Column(group =>
        {
            SectionHeader(group, title, layout, accent);
            renderEntry(group, items[0]);
        });
        foreach (var item in items.Skip(1)) renderEntry(col, item);
    }

    private static byte[]? TryDecodeAvatar(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || !value.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase)) return null;
        var comma = value.IndexOf(',');
        if (comma < 0) return null;
        try { return Convert.FromBase64String(value[(comma + 1)..]); }
        catch { return null; }
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

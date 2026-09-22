using Common.DTOs.OnboardingDto;

namespace HireMate.Modules.Onboarding.Cv;

/// <summary>
/// Single normalized input shared by web preview and PDF output.
/// It contains user data only; the reference PDF contributes layout metrics, never content.
/// </summary>
public sealed record CvTemplateDocument(CvWizardAnswers Data, CvLayoutDefinition Layout);

public static class CvTemplateDocumentMapper
{
    public static CvTemplateDocument Map(CvWizardAnswers source, CvLayoutDefinition? layout = null)
    {
        var data = new CvWizardAnswers
        {
            FullName = Clean(source.FullName),
            DesiredPosition = Clean(source.DesiredPosition),
            DesiredIndustry = Clean(source.DesiredIndustry),
            DateOfBirth = CleanNullable(source.DateOfBirth),
            Gender = CleanNullable(source.Gender),
            Phone = CleanNullable(source.Phone),
            Email = CleanNullable(source.Email),
            Address = CleanNullable(source.Address),
            AvatarUrl = CleanNullable(source.AvatarUrl),
            LinkedIn = CleanNullable(source.LinkedIn),
            GitHub = CleanNullable(source.GitHub),
            ClientRequestId = CleanNullable(source.ClientRequestId),
            University = Clean(source.University),
            Major = Clean(source.Major),
            GraduationYear = source.GraduationYear,
            ExperienceLevel = Clean(source.ExperienceLevel),
            Bio = Clean(source.Bio),
            CareerObjective = Clean(string.IsNullOrWhiteSpace(source.CareerObjective) ? source.Bio : source.CareerObjective),
            Summary = Clean(source.Summary),
            Skills = source.Skills.Where(HasText).Select(Clean).Distinct(StringComparer.OrdinalIgnoreCase).Take(30).ToList(),
            Experiences = source.Experiences.Where(HasExperience).Take(20).ToList(),
            Activities = source.Activities.Where(HasExperience).Take(20).ToList(),
            Projects = source.Projects.Where(HasProject).Take(20).ToList(),
            Certifications = source.Certifications.Where(c => HasText(c.Name) || HasText(c.Issuer) || HasText(c.Description)).Take(20).ToList(),
            Hobbies = source.Hobbies.Where(HasText).Select(Clean).Distinct(StringComparer.OrdinalIgnoreCase).Take(20).ToList(),
            References = source.References.Where(r => HasText(r.Name) || HasText(r.Contact) || HasText(r.Organization) || HasText(r.Email) || HasText(r.Phone) || HasText(r.Description)).Take(10).ToList(),
            Educations = source.Educations.Where(HasEducation).Take(20).ToList()
        };
        if (data.Educations.Count == 0 && (HasText(data.University) || HasText(data.Major) || data.GraduationYear > 0))
        {
            data.Educations.Add(new CvEducationDto
            {
                Institution = data.University,
                Major = data.Major,
                GraduationYear = data.GraduationYear > 0 ? data.GraduationYear : null
            });
        }
        return new CvTemplateDocument(data, layout ?? CvLayoutDefinition.Modern01());
    }

    public static bool HasHeaderContact(CvWizardAnswers a) =>
        new[] { a.DateOfBirth, a.Gender, a.Phone, a.Email, a.Address, a.LinkedIn, a.GitHub }.Any(HasText);

    public static bool HasEducation(CvWizardAnswers a) =>
        a.Educations.Count > 0 || HasText(a.University) || HasText(a.Major) || a.GraduationYear > 0;

    private static bool HasEducation(CvEducationDto e) =>
        HasText(e.Institution) || HasText(e.Major) || HasText(e.Description) || e.GraduationYear.HasValue;

    private static bool HasExperience(CvExperienceItem e) =>
        HasText(e.Title) || HasText(e.Org) || HasText(e.Period) || HasText(e.Description);

    private static bool HasProject(CvProjectDto p) =>
        HasText(p.Name) || HasText(p.Role) || HasText(p.Description) || (p.Technologies?.Any(HasText) ?? false);

    private static bool HasText(string? value) => !string.IsNullOrWhiteSpace(value);
    private static string Clean(string? value) => value?.Trim() ?? string.Empty;
    private static string? CleanNullable(string? value) => HasText(value) ? value!.Trim() : null;
}

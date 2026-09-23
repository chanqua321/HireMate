using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.OnboardingDto;

public class OnboardingStatusDto
{
    public bool HasSelectedPlan { get; set; }
    public string CurrentPlanCode { get; set; } = "free";
    public bool IsPremium { get; set; }
    public bool OnboardingCompleted { get; set; }
    public bool HasCv { get; set; }
    public Guid? LatestCvId { get; set; }
    public bool LatestParseSucceeded { get; set; }
    public int? ReadinessScore { get; set; }
    public int? FitT1Score { get; set; }
    public int RemainingFreeAnalyzes { get; set; }
    public int MonthlyAiCharBudget { get; set; }
    public int UsedAiChars { get; set; }
    public int RemainingAiChars { get; set; }
    public DateTime? PlanExpiresAt { get; set; }
    public bool PlanExpired { get; set; }
    public string NextStep { get; set; } = "upload_cv";
    public int MonthlyInterviewLimit { get; set; }
    public int UsedInterviewSessions { get; set; }
    public int RemainingInterviewSessions { get; set; }
    public int QuestionsPerSession { get; set; }

    public int MonthlyJdMatchLimit { get; set; }
    public int UsedJdMatches { get; set; }
    public int RemainingJdMatches { get; set; }

    public int MonthlyCvEmailGenerationLimit { get; set; }
    public int UsedCvEmailGenerations { get; set; }
    public int RemainingCvEmailGenerations { get; set; }
}

public class CvWizardDto : IValidatableObject
{
    [Required, MaxLength(255)] public string FullName { get; set; } = string.Empty;
    [MaxLength(200)] public string University { get; set; } = string.Empty;
    [MaxLength(150)] public string Major { get; set; } = string.Empty;
    [Range(0, 2100)] public int GraduationYear { get; set; }
    [Required, MaxLength(150)] public string DesiredIndustry { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string DesiredPosition { get; set; } = string.Empty;
    [MaxLength(50)] public string ExperienceLevel { get; set; } = string.Empty;
    [MaxLength(1000)] public string Bio { get; set; } = string.Empty;
    [MaxLength(1000)] public string CareerObjective { get; set; } = string.Empty;
    [MaxLength(1000)] public string Summary { get; set; } = string.Empty;
    [Required(ErrorMessage = "Vui lòng nhập Email"), EmailAddress(ErrorMessage = "Email chưa hợp lệ"), MaxLength(255)] public string? Email { get; set; }
    [Required(ErrorMessage = "Vui lòng nhập Số điện thoại"), RegularExpression(@"^\+?[0-9][0-9\s().-]{6,24}$", ErrorMessage = "Số điện thoại chưa hợp lệ"), MaxLength(50)] public string? Phone { get; set; }
    [MaxLength(40)] public string? DateOfBirth { get; set; }
    [MaxLength(30)] public string? Gender { get; set; }
    [MaxLength(300)] public string? Address { get; set; }
    [MaxLength(2_000_000)] public string? AvatarUrl { get; set; }
    [MaxLength(500)] public string? LinkedIn { get; set; }
    [MaxLength(500)] public string? GitHub { get; set; }
    public List<string> Skills { get; set; } = [];
    public List<CvExperienceDto> Experiences { get; set; } = [];
    public List<CvProjectDto> Projects { get; set; } = [];
    public List<CvCertificationDto> Certifications { get; set; } = [];
    public List<CvExperienceDto> Activities { get; set; } = [];
    public List<string> Hobbies { get; set; } = [];
    public List<CvReferenceDto> References { get; set; } = [];
    public List<CvEducationDto> Educations { get; set; } = [];

    /// <summary>Client-generated idempotency key; persisted inside WizardAnswersJson.</summary>
    [MaxLength(100)] public string? ClientRequestId { get; set; }

    /// <summary>User-facing CV name. Optional — server falls back from DesiredPosition / file name.</summary>
    [MaxLength(120)] public string? DisplayName { get; set; }

    /// <summary>Layout template to render with. Optional — defaults to system Modern 01.</summary>
    public Guid? TemplateId { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrWhiteSpace(DateOfBirth))
        {
            if (!DateOnly.TryParse(DateOfBirth, out var birthDate))
                yield return new ValidationResult("Ngày sinh chưa hợp lệ", [nameof(DateOfBirth)]);
            else if (birthDate > DateOnly.FromDateTime(DateTime.Today))
                yield return new ValidationResult("Ngày sinh không được ở tương lai", [nameof(DateOfBirth)]);
        }

        foreach (var (value, member, label) in new[]
        {
            (LinkedIn, nameof(LinkedIn), "LinkedIn"),
            (GitHub, nameof(GitHub), "GitHub")
        })
        {
            if (string.IsNullOrWhiteSpace(value)) continue;
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))
                yield return new ValidationResult($"{label} phải là URL http/https hợp lệ", [member]);
        }
    }
}

public class RenameCvDto
{
    [Required, MaxLength(120)]
    public string DisplayName { get; set; } = string.Empty;
}

public class ChangeCvTemplateDto
{
    [Required]
    public Guid TemplateId { get; set; }
}

public class CreateCustomTemplateDto
{
    [MaxLength(100)] public string? Name { get; set; }
    [MaxLength(500)] public string? Description { get; set; }
}

public class UpdateCvTemplateDto
{
    [MaxLength(100)] public string? Name { get; set; }
    [MaxLength(500)] public string? Description { get; set; }
    public bool? IsActive { get; set; }
}

public class OptimizeCvContentDto
{
    /// <summary>Optional JD text used to tailor wording. Content-only — never changes template.</summary>
    [MaxLength(12000)] public string? JobDescription { get; set; }

    /// <summary>When set, optimize this CV's wizard/extracted content. Ownership required.</summary>
    public Guid? SourceCvDocumentId { get; set; }

    /// <summary>Optional draft content when not using SourceCvDocumentId.</summary>
    public CvWizardDto? Draft { get; set; }

    /// <summary>Template to keep fixed. AI must not change this.</summary>
    public Guid? TemplateId { get; set; }
}

public class CvExperienceDto
{
    [MaxLength(150)] public string? Title { get; set; }
    [MaxLength(150)] public string? Org { get; set; }
    [MaxLength(80)] public string? Period { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
    [MaxLength(80)] public string? StartDate { get; set; }
    [MaxLength(80)] public string? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    [MaxLength(150)] public string? Role { get; set; }
    public List<string> BulletPoints { get; set; } = [];
}

public class CvProjectDto
{
    [MaxLength(150)] public string? Name { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
    [MaxLength(150)] public string? Role { get; set; }
    public List<string>? Technologies { get; set; }
    [MaxLength(500)] public string? Url { get; set; }
    [MaxLength(80)] public string? Period { get; set; }
    public List<string> BulletPoints { get; set; } = [];
}

public class CvCertificationDto
{
    [MaxLength(200)] public string? Name { get; set; }
    [MaxLength(150)] public string? Issuer { get; set; }
    [MaxLength(40)] public string? IssueDate { get; set; }
    [MaxLength(40)] public string? ExpiryDate { get; set; }
    [MaxLength(120)] public string? CredentialId { get; set; }
    [MaxLength(500)] public string? CredentialUrl { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
}

public class CvReferenceDto
{
    [MaxLength(150)] public string? Name { get; set; }
    [MaxLength(150)] public string? Title { get; set; }
    [MaxLength(200)] public string? Organization { get; set; }
    [MaxLength(300)] public string? Contact { get; set; }
    [MaxLength(255)] public string? Email { get; set; }
    [MaxLength(50)] public string? Phone { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
}

public class CvEducationDto
{
    [MaxLength(200)] public string? Institution { get; set; }
    [MaxLength(150)] public string? Major { get; set; }
    [MaxLength(80)] public string? StartDate { get; set; }
    [MaxLength(80)] public string? EndDate { get; set; }
    public bool IsCurrent { get; set; }
    public int? GraduationYear { get; set; }
    [MaxLength(80)] public string? Gpa { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
}


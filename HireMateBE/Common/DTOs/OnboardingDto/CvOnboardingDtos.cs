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

public class CvWizardDto
{
    [Required, MaxLength(255)] public string FullName { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string University { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string Major { get; set; } = string.Empty;
    [Range(1980, 2100)] public int GraduationYear { get; set; }
    [Required, MaxLength(150)] public string DesiredIndustry { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string DesiredPosition { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string ExperienceLevel { get; set; } = string.Empty;
    [MaxLength(1000)] public string Bio { get; set; } = string.Empty;
    public List<string> Skills { get; set; } = [];
    public List<CvExperienceDto> Experiences { get; set; } = [];

    /// <summary>User-facing CV name. Optional — server falls back from DesiredPosition / file name.</summary>
    [MaxLength(120)] public string? DisplayName { get; set; }

    /// <summary>Layout template to render with. Optional — defaults to system Modern 01.</summary>
    public Guid? TemplateId { get; set; }
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
}

public class CvProjectDto
{
    [MaxLength(150)] public string? Name { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
    [MaxLength(150)] public string? Role { get; set; }
    public List<string>? Technologies { get; set; }
    [MaxLength(500)] public string? Url { get; set; }
    [MaxLength(80)] public string? Period { get; set; }
}

public class CvCertificationDto
{
    [MaxLength(200)] public string? Name { get; set; }
    [MaxLength(150)] public string? Issuer { get; set; }
    [MaxLength(40)] public string? IssueDate { get; set; }
    [MaxLength(40)] public string? ExpiryDate { get; set; }
    [MaxLength(120)] public string? CredentialId { get; set; }
    [MaxLength(500)] public string? CredentialUrl { get; set; }
}


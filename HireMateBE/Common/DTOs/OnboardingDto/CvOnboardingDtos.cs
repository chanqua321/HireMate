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
    public string NextStep { get; set; } = "select_plan";
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
}

public class CvExperienceDto
{
    [MaxLength(150)] public string? Title { get; set; }
    [MaxLength(150)] public string? Org { get; set; }
    [MaxLength(80)] public string? Period { get; set; }
    [MaxLength(1000)] public string? Description { get; set; }
}


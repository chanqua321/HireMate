namespace Common.DTOs.AuthDto;

public class MeDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public IList<string> Roles { get; set; } = [];
    public bool OnboardingCompleted { get; set; }
    public bool IsPremium { get; set; }
    public string CurrentPlanCode { get; set; } = "free";
    public DateTime? PlanSelectedAt { get; set; }
    public bool HasSelectedPlan { get; set; }
    public bool HasCv { get; set; }
    public int MonthlyAiCharBudget { get; set; }
    public int UsedAiChars { get; set; }
    /// <summary>-1 = không giới hạn (budget gói = 0).</summary>
    public int RemainingAiChars { get; set; }
    public DateTime? PlanExpiresAt { get; set; }
    public bool PlanExpired { get; set; }
}


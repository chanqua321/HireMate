namespace Common.DTOs.AuthDto;

public class MeDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public IList<string> Roles { get; set; } = [];
    public bool OnboardingCompleted { get; set; }
    public bool IsPremium { get; set; }
    /// <summary>free | premium | combo — gói đang kích hoạt.</summary>
    public string CurrentPlanCode { get; set; } = "free";
}

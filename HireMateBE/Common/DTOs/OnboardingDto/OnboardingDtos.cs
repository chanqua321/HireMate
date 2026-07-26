using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.OnboardingDto;

public class OnboardingGoalDto
{
    [Required, MaxLength(150)]
    public string DesiredIndustry { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string DesiredPosition { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string ExperienceLevel { get; set; } = string.Empty;
}

public class OnboardingPersonalDto
{
    [Required, MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string University { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string Major { get; set; } = string.Empty;

    [Required, Range(1980, 2100)]
    public int GraduationYear { get; set; }
}

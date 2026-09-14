using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.OnboardingDto;

public class OnboardingGoalDto
{
    [Required, MaxLength(150)]
    public string DesiredIndustry { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string DesiredPosition { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? ExperienceLevel { get; set; }
}

public class OnboardingPersonalDto
{
    [Required, MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? University { get; set; }

    [MaxLength(150)]
    public string? Major { get; set; }

    [Range(1980, 2100)]
    public int? GraduationYear { get; set; }

    [MaxLength(1000)]
    public string? Bio { get; set; }

    public List<string>? Hobbies { get; set; }
}

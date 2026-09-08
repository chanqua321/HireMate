using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.OnboardingDto;

public class ConfirmOnboardingDto
{
    [MaxLength(255)] public string? FullName { get; set; }
    [MaxLength(150)] public string? DesiredIndustry { get; set; }
    [MaxLength(150)] public string? DesiredPosition { get; set; }
    [MaxLength(50)] public string? ExperienceLevel { get; set; }
    [MaxLength(200)] public string? University { get; set; }
    [MaxLength(150)] public string? Major { get; set; }
    public int? GraduationYear { get; set; }
    [MaxLength(1000)] public string? Bio { get; set; }
    public List<string>? Hobbies { get; set; }
    public List<string>? Skills { get; set; }
    public List<CvExperienceDto>? Experiences { get; set; }
}


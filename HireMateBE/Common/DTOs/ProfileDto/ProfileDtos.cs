using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.ProfileDto;

public class ProfileDto
{
    public Guid UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public bool OnboardingCompleted { get; set; }
    public bool IsPremium { get; set; }
    public string? DesiredIndustry { get; set; }
    public string? DesiredPosition { get; set; }
    public string? ExperienceLevel { get; set; }
    public string? University { get; set; }
    public string? Major { get; set; }
    public int? GraduationYear { get; set; }
}

public class UpdateProfileDto
{
    [Required, MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? DesiredIndustry { get; set; }

    [MaxLength(150)]
    public string? DesiredPosition { get; set; }

    [MaxLength(50)]
    public string? ExperienceLevel { get; set; }

    [MaxLength(200)]
    public string? University { get; set; }

    [MaxLength(150)]
    public string? Major { get; set; }

    [Range(1980, 2100)]
    public int? GraduationYear { get; set; }
}

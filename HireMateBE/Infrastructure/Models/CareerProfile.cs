using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class CareerProfile
{
    [Key]
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public UserAccount? User { get; set; }

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

    public int? GraduationYear { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

/// <summary>Monthly feature usage counter (UserId + Feature + Period unique).</summary>
public class UserFeatureUsage
{
    [Key]
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public UserAccount? User { get; set; }

    /// <summary>Interview | CvAnalysis | JdMatch | CvEmailGeneration</summary>
    [Required, MaxLength(40)]
    public string Feature { get; set; } = string.Empty;

    /// <summary>UTC calendar month key, e.g. 2026-09</summary>
    [Required, MaxLength(7)]
    public string Period { get; set; } = string.Empty;

    public int Used { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

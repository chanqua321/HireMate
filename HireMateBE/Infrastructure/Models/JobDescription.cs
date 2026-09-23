using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

/// <summary>User-owned saved Job Description for match + interview context.</summary>
public class JobDescription
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
    [MaxLength(200)] public string? CompanyName { get; set; }
    [MaxLength(150)] public string? Position { get; set; }
    [Required] public string Content { get; set; } = string.Empty;
    [MaxLength(500)] public string? SourceUrl { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<JdMatchResult> Matches { get; set; } = [];
}

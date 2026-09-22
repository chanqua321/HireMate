using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class CareerMemoryEvent
{
    [Key]
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public UserAccount? User { get; set; }

    /// <summary>Audit types (InterviewCompleted, …) or learning types (Weakness, SkillGap, EvidenceGap, Strength).</summary>
    [MaxLength(80)]
    public string EventType { get; set; } = string.Empty;

    /// <summary>For learning signals: last source interview session. For audit: related entity id.</summary>
    public Guid? RefId { get; set; }

    /// <summary>Normalized dedup key: "{EventType}|{topic}" e.g. Weakness|star_result. Null for audit-only events.</summary>
    [MaxLength(160)]
    public string? MemoryKey { get; set; }

    [MaxLength(200)]
    public string? Title { get; set; }

    public int? Confidence { get; set; }

    public int OccurrenceCount { get; set; } = 1;

    public DateTime? LastSeenAt { get; set; }

    /// <summary>Primary answer reference when the signal maps to one answer; more ids live in PayloadJson.</summary>
    public Guid? SourceAnswerId { get; set; }

    public string? PayloadJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

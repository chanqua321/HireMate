using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class JdMatchResult
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    public Guid? CvDocumentId { get; set; }
    [ForeignKey(nameof(CvDocumentId))] public CvDocument? CvDocument { get; set; }
    public Guid? JobDescriptionId { get; set; }
    [ForeignKey(nameof(JobDescriptionId))] public JobDescription? JobDescription { get; set; }
    /// <summary>Snapshot of JD text at match time (survives JD archive/edit).</summary>
    public string JdText { get; set; } = string.Empty;
    public int OverallScore { get; set; }
    public string? ResultJson { get; set; }
    public string? AiProvider { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

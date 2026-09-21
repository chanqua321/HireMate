using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class InterviewAnswer
{
    [Key]
    public Guid Id { get; set; }

    public Guid SessionId { get; set; }

    [ForeignKey(nameof(SessionId))]
    public InterviewSession? Session { get; set; }

    public Guid? QuestionId { get; set; }

    [ForeignKey(nameof(QuestionId))]
    public Question? Question { get; set; }

    public int OrderIndex { get; set; }

    [MaxLength(1000)]
    public string QuestionText { get; set; } = string.Empty;

    [MaxLength(4000)]
    public string? AnswerText { get; set; }

    public bool Skipped { get; set; }

    public int DurationSec { get; set; }

    /// <summary>True if this row is an adaptive follow-up question (max 1 per main Q).</summary>
    public bool IsFollowUp { get; set; }

    [MaxLength(80)]
    public string? QuestionCategory { get; set; }

    public bool AnalysisAvailable { get; set; }

    public int? RelevanceScore { get; set; }
    public int? CompletenessScore { get; set; }
    public int? TechnicalKnowledgeScore { get; set; }
    public int? ProblemSolvingScore { get; set; }
    public int? CommunicationScore { get; set; }
    public int? StarScore { get; set; }
    public int? CvConsistencyScore { get; set; }

    public bool? StarHasSituation { get; set; }
    public bool? StarHasTask { get; set; }
    public bool? StarHasAction { get; set; }
    public bool? StarHasResult { get; set; }

    /// <summary>Verified | StrongEvidence | WeakEvidence | MissingEvidence | NeedsValidation | CvInconsistency</summary>
    [MaxLength(40)]
    public string? EvidenceStatus { get; set; }

    public string? EvidenceJson { get; set; }
    public string? AnalysisJson { get; set; }

    [MaxLength(500)]
    public string? FollowUpReason { get; set; }
}

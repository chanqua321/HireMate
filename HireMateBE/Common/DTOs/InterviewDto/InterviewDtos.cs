using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.InterviewDto;

public class BuildInterviewContextDto
{
    [Required, MaxLength(150)]
    public string Position { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? Industry { get; set; }

    [MaxLength(8000)]
    public string? JobDescription { get; set; }

    /// <summary>Saved JD id — server loads Content if owned by user.</summary>
    public Guid? JobDescriptionId { get; set; }

    public Guid? CvDocumentId { get; set; }

    /// <summary>Optional explicit interview language: vi or en. Otherwise detect from CV/JD.</summary>
    [RegularExpression("^(vi|en)$")]
    public string? Language { get; set; }
}

public class CreateInterviewSessionDto
{
    [MaxLength(150)]
    public string Industry { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string Position { get; set; } = string.Empty;

    /// <summary>Legacy — bỏ qua. Session luôn Personalized.</summary>
    [MaxLength(50)]
    public string? Difficulty { get; set; }

    [MaxLength(20)]
    public string Mode { get; set; } = "Text";

    /// <summary>Optional. If omitted, server uses plan default question count.</summary>
    [Range(3, 15)]
    public int? QuestionCount { get; set; }

    [MaxLength(8000)]
    public string? JobDescription { get; set; }

    public Guid? JobDescriptionId { get; set; }

    public Guid? CvDocumentId { get; set; }

    [RegularExpression("^(vi|en)$")]
    public string? Language { get; set; }

    /// <summary>Context từ build-context (optional). Server sẽ dựng lại nếu thiếu.</summary>
    public string? ContextJson { get; set; }
}

public class SubmitAnswerDto
{
    [Required]
    public int OrderIndex { get; set; }

    public Guid? QuestionId { get; set; }

    [MaxLength(2000)]
    public string? QuestionText { get; set; }

    [MaxLength(4000)]
    public string? AnswerText { get; set; }

    public bool Skipped { get; set; }

    public int DurationSec { get; set; }
}

public class InterviewQuestionDto
{
    public Guid QuestionId { get; set; }
    public int OrderIndex { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Hint { get; set; }
    public string Category { get; set; } = string.Empty;
}

public class InterviewSessionSummaryDto
{
    public Guid Id { get; set; }
    public string Industry { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string Mode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? OverallScore { get; set; }
    public int QuestionCount { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? VoiceStartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class InterviewSessionDetailDto : InterviewSessionSummaryDto
{
    public int? ScoreS { get; set; }
    public int? ScoreT { get; set; }
    public int? ScoreA { get; set; }
    public int? ScoreR { get; set; }
    public int? ClarityScore { get; set; }
    public string? FeedbackSummary { get; set; }
    public StructuredFeedbackDto? StructuredFeedback { get; set; }
    public List<InterviewAnswerViewDto> Answers { get; set; } = [];
}

public class InterviewAnswerViewDto
{
    public Guid Id { get; set; }
    public int OrderIndex { get; set; }
    public Guid? QuestionId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public string? AnswerText { get; set; }
    public bool Skipped { get; set; }
    public int DurationSec { get; set; }
    public bool IsFollowUp { get; set; }
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
    public string? EvidenceStatus { get; set; }
    public string? EvidenceJson { get; set; }
    public string? AnalysisJson { get; set; }
    public string? FollowUpReason { get; set; }
    /// <summary>Backward-compatible: true when MissingEvidence / WeakEvidence / NeedsValidation.</summary>
    public bool EvidenceGap { get; set; }
}

public class AnswerAnalysisDto
{
    public bool AnalysisAvailable { get; set; }
    public string? FeedbackStatus { get; set; }
    public string? FeedbackComment { get; set; }
    public string? StarTip { get; set; }
    public int? NextQuestionNumber { get; set; }
    public string? NextQuestionContent { get; set; }
    public string? NextQuestionHint { get; set; }
    public int? Relevance { get; set; }
    public int? Completeness { get; set; }
    public int? TechnicalKnowledge { get; set; }
    public int? ProblemSolving { get; set; }
    public int? Communication { get; set; }
    public int? StarScore { get; set; }
    public bool? StarSituation { get; set; }
    public bool? StarTask { get; set; }
    public bool? StarAction { get; set; }
    public bool? StarResult { get; set; }
    public int? CvConsistency { get; set; }
    public string? EvidenceStatus { get; set; }
    public string? EvidenceJson { get; set; }
    public string? FollowUpReason { get; set; }
    public bool EvidenceGap { get; set; }
    public bool NeedsFollowUp { get; set; }
    /// <summary>Validated per-dimension rubric evidence; stored in existing AnalysisJson.</summary>
    public Dictionary<string, EvaluationDimensionDto> Dimensions { get; set; } = [];
    public int? WeightedScore { get; set; }
}

public class EvaluationDimensionDto
{
    public int Score { get; set; }
    public double Confidence { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<string> Evidence { get; set; } = [];
    public string Reason { get; set; } = string.Empty;
}

public class StructuredFeedbackDto
{
    public CoachReportDto? CoachReport { get; set; }
    public Guid SessionId { get; set; }
    public int? OverallScore { get; set; }
    public string? Summary { get; set; }
    public bool AiSummaryAvailable { get; set; }
    public CategoryScoresDto CategoryScores { get; set; } = new();
    public string? CvConsistencySummary { get; set; }
    public List<FeedbackItemDto> Strengths { get; set; } = [];
    public List<FeedbackItemDto> Weaknesses { get; set; } = [];
    public List<SkillGapDto> SkillGaps { get; set; } = [];
    public List<EvidenceGapItemDto> EvidenceGaps { get; set; } = [];
    public AnswerHighlightsDto AnswerHighlights { get; set; } = new();
    public List<string> Improvements { get; set; } = [];
}

public class CoachReportDto
{
    public CoachReportSummaryDto Summary { get; set; } = new();
    public CoachReportScoresDto Scores { get; set; } = new();
    public CoachStarAnalysisDto? StarAnalysis { get; set; }
}

public class CoachReportSummaryDto
{
    public int? OverallScore { get; set; }
    public string Headline { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
}

public class CoachReportScoresDto
{
    public int? Situation { get; set; }
    public int? Task { get; set; }
    public int? Action { get; set; }
    public int? Result { get; set; }
    public int? Clarity { get; set; }
}

public class CoachStarAnalysisDto
{
    public CoachStarItemDto Situation { get; set; } = new();
    public CoachStarItemDto Task { get; set; } = new();
    public CoachStarItemDto Action { get; set; } = new();
    public CoachStarItemDto Result { get; set; } = new();
}

public class CoachStarItemDto
{
    public int? Score { get; set; }
    public string Issue { get; set; } = string.Empty;
    public string Advice { get; set; } = string.Empty;
}

public class CategoryScoresDto
{
    public int? Communication { get; set; }
    public int? Star { get; set; }
    public int? Technical { get; set; }
    public int? ProblemSolving { get; set; }
    public int? Relevance { get; set; }
    public int? Completeness { get; set; }
    public int? CvConsistency { get; set; }
}

public class FeedbackItemDto
{
    public string Area { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Evidence { get; set; }
    public List<Guid>? RelatedAnswerIds { get; set; }
}

public class SkillGapDto
{
    public string Area { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int? Score { get; set; }
}

public class EvidenceGapItemDto
{
    public Guid AnswerId { get; set; }
    public int OrderIndex { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Gap { get; set; } = string.Empty;
    public string? Suggestion { get; set; }
}

public class AnswerHighlightsDto
{
    public List<AnswerHighlightItemDto> Strong { get; set; } = [];
    public List<AnswerHighlightItemDto> Weak { get; set; } = [];
    public List<AnswerHighlightItemDto> NeedsImprovement { get; set; } = [];
}

public class AnswerHighlightItemDto
{
    public Guid AnswerId { get; set; }
    public int OrderIndex { get; set; }
    public string Question { get; set; } = string.Empty;
    public int? CompositeScore { get; set; }
    public string? Note { get; set; }
}


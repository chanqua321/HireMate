using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.InterviewDto;

public class CreateInterviewSessionDto
{
    [Required, MaxLength(150)]
    public string Industry { get; set; } = string.Empty;

    [Required, MaxLength(150)]
    public string Position { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Difficulty { get; set; } = "Medium";

    [MaxLength(20)]
    public string Mode { get; set; } = "Text";

    [Range(3, 10)]
    public int QuestionCount { get; set; } = 5;
}

public class SubmitAnswerDto
{
    [Required]
    public int OrderIndex { get; set; }

    public Guid? QuestionId { get; set; }

    [MaxLength(1000)]
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
    public DateTime StartedAt { get; set; }
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
    public List<InterviewAnswerViewDto> Answers { get; set; } = [];
}

public class InterviewAnswerViewDto
{
    public int OrderIndex { get; set; }
    public Guid? QuestionId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public string? AnswerText { get; set; }
    public bool Skipped { get; set; }
    public int DurationSec { get; set; }
}


using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class InterviewSession
{
    [Key]
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public UserAccount? User { get; set; }

    [MaxLength(150)]
    public string Industry { get; set; } = string.Empty;

    [MaxLength(150)]
    public string Position { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Difficulty { get; set; } = "Medium";

    [MaxLength(20)]
    public string Mode { get; set; } = "Text";

    [MaxLength(30)]
    public string Status { get; set; } = "Setup";

    public int QuestionCount { get; set; } = 5;

    public int? OverallScore { get; set; }
    public int? ScoreS { get; set; }
    public int? ScoreT { get; set; }
    public int? ScoreA { get; set; }
    public int? ScoreR { get; set; }
    public int? ClarityScore { get; set; }

    [MaxLength(2000)]
    public string? FeedbackSummary { get; set; }

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public ICollection<InterviewAnswer> Answers { get; set; } = [];
}


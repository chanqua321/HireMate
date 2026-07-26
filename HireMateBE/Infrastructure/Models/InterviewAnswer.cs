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
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class CvDocument
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    /// <summary>Upload | Wizard</summary>
    [MaxLength(20)] public string Source { get; set; } = "Upload";
    /// <summary>Physical / original upload file name. Not the user-facing CV label.</summary>
    [MaxLength(255)] public string FileName { get; set; } = string.Empty;
    /// <summary>User-facing CV label (e.g. "CV Backend Developer"). Independent of FileName.</summary>
    [MaxLength(120)] public string DisplayName { get; set; } = string.Empty;
    /// <summary>Layout template used when rendering / generating this CV.</summary>
    public Guid? TemplateId { get; set; }
    [ForeignKey(nameof(TemplateId))] public CvTemplate? Template { get; set; }
    [MaxLength(500)] public string StoragePath { get; set; } = string.Empty;
    [MaxLength(100)] public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string? ExtractedText { get; set; }
    public bool ParseSucceeded { get; set; }
    public int? FormatScore { get; set; }
    public int? KeywordsScore { get; set; }
    public int? ReadabilityScore { get; set; }
    public int? ProfessionalismScore { get; set; }
    public int? ReadinessScore { get; set; }
    public int? FitT1Score { get; set; }
    public string? AnalysisJson { get; set; }
    public string? AiProvider { get; set; }
    public string? WizardAnswersJson { get; set; }
    public bool IsConfirmed { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AnalyzedAt { get; set; }
}

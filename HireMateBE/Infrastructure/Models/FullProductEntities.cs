using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class WaitlistEntry
{
    [Key] public Guid Id { get; set; }
    [MaxLength(256)] public string Email { get; set; } = string.Empty;
    [MaxLength(255)] public string? FullName { get; set; }
    [MaxLength(200)] public string? University { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ContactMessage
{
    [Key] public Guid Id { get; set; }
    [MaxLength(255)] public string FullName { get; set; } = string.Empty;
    [MaxLength(256)] public string Email { get; set; } = string.Empty;
    [MaxLength(200)] public string Subject { get; set; } = string.Empty;
    [MaxLength(4000)] public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsHandled { get; set; }
}

public class ContentPage
{
    [Key] public Guid Id { get; set; }
    [MaxLength(120)] public string Slug { get; set; } = string.Empty;
    [MaxLength(200)] public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsPublished { get; set; } = true;
}

public class BlogPost
{
    [Key] public Guid Id { get; set; }
    [MaxLength(120)] public string Slug { get; set; } = string.Empty;
    [MaxLength(200)] public string Title { get; set; } = string.Empty;
    [MaxLength(500)] public string Summary { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    [MaxLength(100)] public string? Tag { get; set; }
    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
    public bool IsPublished { get; set; } = true;
}

public class FaqItem
{
    [Key] public Guid Id { get; set; }
    [MaxLength(80)] public string Category { get; set; } = "General";
    [MaxLength(500)] public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
}

public class CvDocument
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }

    /// <summary>Upload | Wizard</summary>
    [MaxLength(20)]
    public string Source { get; set; } = "Upload";

    [MaxLength(255)] public string FileName { get; set; } = string.Empty;
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

public class JdMatchResult
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    public Guid? CvDocumentId { get; set; }
    public string JdText { get; set; } = string.Empty;
    public int OverallScore { get; set; }
    public string? ResultJson { get; set; }
    public string? AiProvider { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ResourceItem
{
    [Key] public Guid Id { get; set; }
    [MaxLength(80)] public string Category { get; set; } = string.Empty;
    [MaxLength(200)] public string Title { get; set; } = string.Empty;
    [MaxLength(500)] public string Summary { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    [MaxLength(100)] public string? Industry { get; set; }
    public bool IsPublished { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SubscriptionPlan
{
    [Key] public Guid Id { get; set; }
    [MaxLength(80)] public string Code { get; set; } = string.Empty;
    [MaxLength(120)] public string Name { get; set; } = string.Empty;
    [MaxLength(200)] public string? Tagline { get; set; }
    public decimal PriceVnd { get; set; }
    public int DurationDays { get; set; } = 30;
    [MaxLength(500)] public string? Description { get; set; }
    public int SortOrder { get; set; }
    public bool IsPopular { get; set; }
    public bool IsActive { get; set; } = true;
    /// <summary>Giới hạn độ dài câu trả lời AI (ký tự), đủ JSON/gợi ý, cắt chi phí.</summary>
    public int MaxAiOutputChars { get; set; } = 1400;
    /// <summary>Ngân sách ký tự AI (input+output) mỗi chu kỳ DurationDays. 0 = không giới hạn.</summary>
    public int MonthlyAiCharBudget { get; set; }
}

public class SystemSetting
{
    [Key, MaxLength(80)] public string Key { get; set; } = string.Empty;
    [MaxLength(2000)] public string Value { get; set; } = string.Empty;
    [MaxLength(300)] public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Invoice
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    public Guid PlanId { get; set; }
    [ForeignKey(nameof(PlanId))] public SubscriptionPlan? Plan { get; set; }
    [MaxLength(40)] public string InvoiceNumber { get; set; } = string.Empty;
    public decimal AmountVnd { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Paid";
    [MaxLength(40)] public string PaymentMethod { get; set; } = "Mock";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}

public class Payment
{
    [Key] public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    [ForeignKey(nameof(InvoiceId))] public Invoice? Invoice { get; set; }
    public decimal AmountVnd { get; set; }
    [MaxLength(40)] public string Provider { get; set; } = "Mock";
    [MaxLength(30)] public string Status { get; set; } = "Success";
    [MaxLength(120)] public string? TransactionRef { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ReferralCode
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    [MaxLength(20)] public string Code { get; set; } = string.Empty;
    public int InviteCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ReferralInvite
{
    [Key] public Guid Id { get; set; }
    public Guid ReferrerUserId { get; set; }
    public Guid? InviteeUserId { get; set; }
    [MaxLength(20)] public string Code { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Badge
{
    [Key] public Guid Id { get; set; }
    [MaxLength(80)] public string Code { get; set; } = string.Empty;
    [MaxLength(120)] public string Name { get; set; } = string.Empty;
    [MaxLength(300)] public string Description { get; set; } = string.Empty;
}

public class UserBadge
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid BadgeId { get; set; }
    [ForeignKey(nameof(BadgeId))] public Badge? Badge { get; set; }
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;
}

public class PromoCode
{
    [Key] public Guid Id { get; set; }
    [MaxLength(40)] public string Code { get; set; } = string.Empty;
    public decimal DiscountPercent { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
}

public class SupportTicket
{
    [Key] public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    [MaxLength(256)] public string Email { get; set; } = string.Empty;
    [MaxLength(200)] public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    [MaxLength(30)] public string Status { get; set; } = "Open";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class Organization
{
    [Key] public Guid Id { get; set; }
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(40)] public string Type { get; set; } = "University";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class OrganizationMember
{
    [Key] public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    [ForeignKey(nameof(OrganizationId))] public Organization? Organization { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    [MaxLength(40)] public string Role { get; set; } = "Member";
}


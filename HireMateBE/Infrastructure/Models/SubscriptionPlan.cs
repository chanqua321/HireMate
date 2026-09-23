using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

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

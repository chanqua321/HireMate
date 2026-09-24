using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.PublicDto;

public sealed class AdminQuestionWriteDto
{
    [Required, MaxLength(1000)] public string Content { get; set; } = string.Empty;
    [Required, RegularExpression("^(vi|en)$")] public string Language { get; set; } = "vi";
    [MaxLength(150)] public string? Industry { get; set; }
    [MaxLength(150)] public string? RoleHint { get; set; }
    [Required, MaxLength(100)] public string Category { get; set; } = "General";
    [Required, RegularExpression("^(Easy|Medium|Hard)$")] public string Difficulty { get; set; } = "Medium";
    [RegularExpression("^(Student|Fresher|Junior|Mid|Senior)$")] public string? Seniority { get; set; }
    [MaxLength(500)] public string? Hint { get; set; }
    public bool IsActive { get; set; } = true;
}

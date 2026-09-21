using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.JdDto;

public class CreateJobDescriptionDto
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? CompanyName { get; set; }

    [MaxLength(150)]
    public string? Position { get; set; }

    [Required, MinLength(30), MaxLength(20000)]
    public string Content { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? SourceUrl { get; set; }
}

public class UpdateJobDescriptionDto
{
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? CompanyName { get; set; }

    [MaxLength(150)]
    public string? Position { get; set; }

    [Required, MinLength(30), MaxLength(20000)]
    public string Content { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? SourceUrl { get; set; }
}

public class JobDescriptionSummaryDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? CompanyName { get; set; }
    public string? Position { get; set; }
    public bool IsArchived { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int ContentLength { get; set; }
    public int? LatestMatchScore { get; set; }
}

public class JobDescriptionDetailDto : JobDescriptionSummaryDto
{
    public string Content { get; set; } = string.Empty;
    public string? SourceUrl { get; set; }
}

public class JdMatchResultDto
{
    public Guid Id { get; set; }
    public Guid? JobDescriptionId { get; set; }
    public string? JdTitle { get; set; }
    public Guid? CvDocumentId { get; set; }
    public string? CvFileName { get; set; }
    public int OverallScore { get; set; }
    public List<string> MatchedSkills { get; set; } = [];
    public List<string> MissingSkills { get; set; } = [];
    public List<string> ExperienceGaps { get; set; } = [];
    public List<string> KeywordGaps { get; set; } = [];
    public List<string> Strengths { get; set; } = [];
    public List<string> Recommendations { get; set; } = [];
    public string? AiProvider { get; set; }
    public DateTime CreatedAt { get; set; }
    /// <summary>Raw AI JSON kept for debugging/compat; FE should prefer structured fields.</summary>
    public string? ResultJson { get; set; }
}

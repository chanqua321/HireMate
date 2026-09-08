using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class Question
{
    [Key]
    public Guid Id { get; set; }

    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(150)]
    public string? Industry { get; set; }

    [MaxLength(150)]
    public string? RoleHint { get; set; }

    [MaxLength(1000)]
    public string Content { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Hint { get; set; }

    [MaxLength(50)]
    public string Difficulty { get; set; } = "Medium";

    public bool IsActive { get; set; } = true;
}


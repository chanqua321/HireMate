using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class FaqItem
{
    [Key] public Guid Id { get; set; }
    [MaxLength(80)] public string Category { get; set; } = "General";
    [MaxLength(500)] public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsPublished { get; set; } = true;
}

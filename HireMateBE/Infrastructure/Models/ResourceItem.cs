using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

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

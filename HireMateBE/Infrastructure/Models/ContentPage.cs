using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class ContentPage
{
    [Key] public Guid Id { get; set; }
    [MaxLength(120)] public string Slug { get; set; } = string.Empty;
    [MaxLength(200)] public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsPublished { get; set; } = true;
}

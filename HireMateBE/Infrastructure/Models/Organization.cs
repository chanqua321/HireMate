using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class Organization
{
    [Key] public Guid Id { get; set; }
    [MaxLength(200)] public string Name { get; set; } = string.Empty;
    [MaxLength(40)] public string Type { get; set; } = "University";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

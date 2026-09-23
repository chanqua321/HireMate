using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class SystemSetting
{
    [Key, MaxLength(80)] public string Key { get; set; } = string.Empty;
    [MaxLength(2000)] public string Value { get; set; } = string.Empty;
    [MaxLength(300)] public string? Description { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

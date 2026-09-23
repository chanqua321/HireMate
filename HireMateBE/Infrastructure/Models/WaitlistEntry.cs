using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class WaitlistEntry
{
    [Key] public Guid Id { get; set; }
    [MaxLength(256)] public string Email { get; set; } = string.Empty;
    [MaxLength(255)] public string? FullName { get; set; }
    [MaxLength(200)] public string? University { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class ContactMessage
{
    [Key] public Guid Id { get; set; }
    [MaxLength(255)] public string FullName { get; set; } = string.Empty;
    [MaxLength(256)] public string Email { get; set; } = string.Empty;
    [MaxLength(200)] public string Subject { get; set; } = string.Empty;
    [MaxLength(4000)] public string Body { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsHandled { get; set; }
}

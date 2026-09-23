using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class SupportTicket
{
    [Key] public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    [MaxLength(256)] public string Email { get; set; } = string.Empty;
    [MaxLength(200)] public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    [MaxLength(30)] public string Status { get; set; } = "Open";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

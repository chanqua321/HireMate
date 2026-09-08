using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class CareerMemoryEvent
{
    [Key]
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public UserAccount? User { get; set; }

    [MaxLength(80)]
    public string EventType { get; set; } = string.Empty;

    public Guid? RefId { get; set; }

    public string? PayloadJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}


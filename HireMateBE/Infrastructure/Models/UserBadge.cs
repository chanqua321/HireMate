using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class UserBadge
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid BadgeId { get; set; }
    [ForeignKey(nameof(BadgeId))] public Badge? Badge { get; set; }
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;
}

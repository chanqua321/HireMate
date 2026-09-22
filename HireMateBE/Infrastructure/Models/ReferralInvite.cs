using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class ReferralInvite
{
    [Key] public Guid Id { get; set; }
    public Guid ReferrerUserId { get; set; }
    public Guid? InviteeUserId { get; set; }
    [MaxLength(20)] public string Code { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

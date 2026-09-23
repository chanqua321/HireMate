using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class ReferralCode
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    [MaxLength(20)] public string Code { get; set; } = string.Empty;
    public int InviteCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

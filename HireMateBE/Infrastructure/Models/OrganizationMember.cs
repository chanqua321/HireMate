using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class OrganizationMember
{
    [Key] public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    [ForeignKey(nameof(OrganizationId))] public Organization? Organization { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    [MaxLength(40)] public string Role { get; set; } = "Member";
}

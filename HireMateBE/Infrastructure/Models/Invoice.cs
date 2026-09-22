using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class Invoice
{
    [Key] public Guid Id { get; set; }
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    public Guid PlanId { get; set; }
    [ForeignKey(nameof(PlanId))] public SubscriptionPlan? Plan { get; set; }
    [MaxLength(40)] public string InvoiceNumber { get; set; } = string.Empty;
    public decimal AmountVnd { get; set; }
    [MaxLength(30)] public string Status { get; set; } = "Paid";
    [MaxLength(40)] public string PaymentMethod { get; set; } = "Mock";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PaidAt { get; set; }
}

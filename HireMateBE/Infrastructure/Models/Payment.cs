using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

public class Payment
{
    [Key] public Guid Id { get; set; }
    public Guid InvoiceId { get; set; }
    [ForeignKey(nameof(InvoiceId))] public Invoice? Invoice { get; set; }
    public decimal AmountVnd { get; set; }
    [MaxLength(40)] public string Provider { get; set; } = "Mock";
    [MaxLength(30)] public string Status { get; set; } = "Success";
    [MaxLength(120)] public string? TransactionRef { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

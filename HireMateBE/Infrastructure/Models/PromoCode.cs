using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class PromoCode
{
    [Key] public Guid Id { get; set; }
    [MaxLength(40)] public string Code { get; set; } = string.Empty;
    public decimal DiscountPercent { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
}

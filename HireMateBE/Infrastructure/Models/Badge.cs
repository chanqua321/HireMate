using System.ComponentModel.DataAnnotations;

namespace Infrastructure.Models;

public class Badge
{
    [Key] public Guid Id { get; set; }
    [MaxLength(80)] public string Code { get; set; } = string.Empty;
    [MaxLength(120)] public string Name { get; set; } = string.Empty;
    [MaxLength(300)] public string Description { get; set; } = string.Empty;
}

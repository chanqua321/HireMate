using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Infrastructure.Models;

/// <summary>
/// CV layout/design template. System templates (UserId=null) are shared;
/// custom templates belong to one user. AI must not invent layouts — renderer uses this.
/// </summary>
public class CvTemplate
{
    [Key] public Guid Id { get; set; }
    [MaxLength(100)] public string Name { get; set; } = string.Empty;
    [MaxLength(500)] public string Description { get; set; } = string.Empty;
    [MaxLength(500)] public string? PreviewUrl { get; set; }
    /// <summary>Category label, e.g. Modern / Classic.</summary>
    [MaxLength(40)] public string TemplateType { get; set; } = "Modern";
    /// <summary>Stable renderer key, e.g. modern-01 / modern-02.</summary>
    [MaxLength(40)] public string LayoutKey { get; set; } = "modern-01";
    /// <summary>JSON: sections order, typography, spacing, style. Not PDF binary.</summary>
    public string LayoutDefinitionJson { get; set; } = "{}";
    public bool IsSystemTemplate { get; set; }
    /// <summary>Null for system templates; owner for custom templates.</summary>
    public Guid? UserId { get; set; }
    [ForeignKey(nameof(UserId))] public UserAccount? User { get; set; }
    /// <summary>Optional source CV when created via "Lưu làm mẫu". Does not clone PDF layout.</summary>
    public Guid? SourceCvDocumentId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<CvDocument> Documents { get; set; } = new List<CvDocument>();
}

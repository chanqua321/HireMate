using System.ComponentModel.DataAnnotations;

namespace Common.DTOs.AiDto;

public class FeatureQuotaDto
{
    public int Used { get; set; }
    public int Limit { get; set; }
    public int Remaining { get; set; }
    public bool Allowed { get; set; }
}

public class QuotaUsageDto
{
    public string PlanCode { get; set; } = "free";
    public string Period { get; set; } = string.Empty;
    public FeatureQuotaDto Interview { get; set; } = new();
    public FeatureQuotaDto CvAnalysis { get; set; } = new();
    public FeatureQuotaDto JdMatch { get; set; } = new();
    public FeatureQuotaDto CvEmailGeneration { get; set; } = new();
}

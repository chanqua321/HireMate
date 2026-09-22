namespace Common;

/// <summary>Evidence taxonomy for interview answer analysis. MissingEvidence ≠ fake CV.</summary>
public static class EvidenceStatus
{
    public const string Verified = "Verified";
    public const string StrongEvidence = "StrongEvidence";
    public const string WeakEvidence = "WeakEvidence";
    public const string MissingEvidence = "MissingEvidence";
    public const string NeedsValidation = "NeedsValidation";
    public const string CvInconsistency = "CvInconsistency";

    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        Verified, StrongEvidence, WeakEvidence, MissingEvidence, NeedsValidation, CvInconsistency
    };

    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = value.Trim();
        return All.FirstOrDefault(x => x.Equals(v, StringComparison.OrdinalIgnoreCase));
    }
}

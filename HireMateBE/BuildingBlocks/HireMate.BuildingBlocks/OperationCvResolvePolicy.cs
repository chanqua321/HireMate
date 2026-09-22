namespace HireMate.BuildingBlocks;

/// <summary>
/// Shared CV selection for Interview / JD Match operations.
/// Explicit selection ≠ Active CV; never fall back to latest/first CV.
/// </summary>
public enum OperationCvResolveOutcome
{
    /// <summary>Load optionalCvDocumentId; ownership miss → 404 (do not fall back to Active).</summary>
    ResolveExplicit,

    /// <summary>Load CareerProfile.ConfirmedCvDocumentId.</summary>
    ResolveActive,

    /// <summary>No explicit id and no ConfirmedCvDocumentId.</summary>
    ActiveCvRequired
}

public static class OperationCvResolvePolicy
{
    public const string ActiveCvRequiredCode = "ACTIVE_CV_REQUIRED";

    public static OperationCvResolveOutcome Decide(Guid? optionalCvDocumentId, Guid? confirmedCvDocumentId)
    {
        if (optionalCvDocumentId.HasValue)
            return OperationCvResolveOutcome.ResolveExplicit;

        if (confirmedCvDocumentId.HasValue)
            return OperationCvResolveOutcome.ResolveActive;

        return OperationCvResolveOutcome.ActiveCvRequired;
    }

    /// <summary>
    /// Explicit request with no owned document must be NotFound — never substitute Active/latest.
    /// </summary>
    public static bool IsExplicitNotFound(Guid? optionalCvDocumentId, bool ownedDocumentFound)
        => optionalCvDocumentId.HasValue && !ownedDocumentFound;
}

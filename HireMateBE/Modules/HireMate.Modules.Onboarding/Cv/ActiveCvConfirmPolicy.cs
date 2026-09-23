namespace HireMate.Modules.Onboarding.Cv;

/// <summary>
/// Active CV source of truth: CareerProfile.ConfirmedCvDocumentId + CvDocument.IsConfirmed.
/// Onboarding must not replace an existing confirmed CV with the latest analyzed document.
/// </summary>
public static class ActiveCvConfirmPolicy
{
    /// <summary>
    /// Returns the CV id onboarding confirm should keep.
    /// Existing owned confirmed id always wins.
    /// Never selects a latest/first CV implicitly. Activation is an explicit user action.
    /// </summary>
    public static Guid? ResolveOnboardingTarget(
        Guid? existingConfirmedId,
        bool existingOwned,
        Guid? latestAnalyzedId)
    {
        if (existingConfirmedId.HasValue && existingOwned)
            return existingConfirmedId;

        return null;
    }
}

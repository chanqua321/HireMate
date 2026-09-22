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
    /// Latest analyzed is used only when there is no confirmed id yet (one-time).
    /// </summary>
    public static Guid? ResolveOnboardingTarget(
        Guid? existingConfirmedId,
        bool existingOwned,
        Guid? latestAnalyzedId)
    {
        if (existingConfirmedId.HasValue && existingOwned)
            return existingConfirmedId;

        if (!existingConfirmedId.HasValue)
            return latestAnalyzedId;

        // Dangling ConfirmedCvDocumentId (CV deleted / not owned): one-time fallback only.
        return latestAnalyzedId;
    }
}

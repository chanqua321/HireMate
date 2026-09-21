namespace Common;

/// <summary>Deterministic thresholds for Career Memory extraction / ranking. Not admin-configurable in Prompt 6.</summary>
public static class CareerMemoryThresholds
{
    /// <summary>Scores at or below this support weakness / skill-gap signals.</summary>
    public const int WeakScoreThreshold = 55;

    /// <summary>Scores at or above this support strength signals.</summary>
    public const int StrongScoreThreshold = 70;

    /// <summary>Minimum related answers (or equivalent signals) to persist a weakness, unless score is very low.</summary>
    public const int MinWeaknessSupportingSignals = 2;

    /// <summary>Single-answer skill gap only if score is strictly below this.</summary>
    public const int VeryWeakSingleAnswerThreshold = 45;

    /// <summary>OccurrenceCount at or above this is treated as recurring for ranking.</summary>
    public const int RecurrenceThreshold = 2;

    /// <summary>Max learning rows loaded before slicing into context buckets.</summary>
    public const int LoadTake = 40;

    public const int ContextWeaknessLimit = 5;
    public const int ContextSkillGapLimit = 4;
    public const int ContextEvidenceGapLimit = 4;
    public const int ContextStrengthLimit = 3;
}

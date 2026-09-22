namespace Common;

/// <summary>Learning-oriented CareerMemoryEvent.EventType values. Audit types (InterviewCompleted, etc.) remain unchanged.</summary>
public static class CareerMemoryTypes
{
    public const string Weakness = "Weakness";
    public const string SkillGap = "SkillGap";
    public const string EvidenceGap = "EvidenceGap";
    public const string Strength = "Strength";

    /// <summary>Session-level audit (not upserted learning signal).</summary>
    public const string InterviewCompleted = "InterviewCompleted";
    public const string InterviewContext = "InterviewContext";

    public static readonly HashSet<string> LearningTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        Weakness, SkillGap, EvidenceGap, Strength
    };

    public static bool IsLearning(string? eventType) =>
        !string.IsNullOrWhiteSpace(eventType) && LearningTypes.Contains(eventType);
}

using Common;
using Common.DTOs.InterviewDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace HireMate.Modules.Interview.Services;

/// <summary>
/// Upserts learning Career Memory from structured interview feedback.
/// Dedupes by UserId + MemoryKey. Does not invent scores.
/// </summary>
public static class CareerMemoryLearningService
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public static async Task UpsertFromFeedbackAsync(
        IUnitOfWork uow,
        Guid userId,
        InterviewSession session,
        StructuredFeedbackDto feedback,
        IReadOnlyList<InterviewAnswer> answers)
    {
        var signals = ExtractSignals(session, feedback, answers);
        if (signals.Count == 0) return;

        var keys = signals.Select(s => s.MemoryKey).Distinct().ToList();
        var existing = await uow.CareerMemoryEventRepository.GetQueryable()
            .Where(e => e.UserId == userId && e.MemoryKey != null && keys.Contains(e.MemoryKey))
            .ToListAsync();

        var byKey = existing.ToDictionary(e => e.MemoryKey!, StringComparer.OrdinalIgnoreCase);
        var now = DateTime.UtcNow;

        foreach (var signal in signals)
        {
            if (byKey.TryGetValue(signal.MemoryKey, out var row))
            {
                row.OccurrenceCount = Math.Max(1, row.OccurrenceCount) + 1;
                row.LastSeenAt = now;
                row.RefId = session.Id;
                row.Title = signal.Title;
                row.Confidence = Math.Min(95, (row.Confidence ?? 45) + 12);
                if (signal.SourceAnswerId.HasValue)
                    row.SourceAnswerId = signal.SourceAnswerId;
                row.PayloadJson = MergePayload(row.PayloadJson, signal, session.Id);
                await uow.CareerMemoryEventRepository.UpdateAsync(row);
            }
            else
            {
                var created = new CareerMemoryEvent
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    EventType = signal.EventType,
                    MemoryKey = signal.MemoryKey,
                    Title = signal.Title,
                    Confidence = signal.Confidence,
                    OccurrenceCount = 1,
                    LastSeenAt = now,
                    RefId = session.Id,
                    SourceAnswerId = signal.SourceAnswerId,
                    PayloadJson = JsonSerializer.Serialize(BuildPayload(signal, session.Id), JsonOpts),
                    CreatedAt = now
                };
                await uow.CareerMemoryEventRepository.CreateAsync(created);
                byKey[signal.MemoryKey] = created;
            }
        }
    }

    public static async Task<LearningMemoryBundle> LoadLearningBundleAsync(IUnitOfWork uow, Guid userId, int take = 40)
    {
        var learningTypes = new[]
        {
            CareerMemoryTypes.Weakness,
            CareerMemoryTypes.SkillGap,
            CareerMemoryTypes.EvidenceGap,
            CareerMemoryTypes.Strength
        };
        var rows = await uow.CareerMemoryEventRepository.GetQueryable().AsNoTracking()
            .Where(e => e.UserId == userId && e.MemoryKey != null && learningTypes.Contains(e.EventType))
            .OrderByDescending(e => e.OccurrenceCount >= CareerMemoryThresholds.RecurrenceThreshold)
            .ThenByDescending(e => e.OccurrenceCount)
            .ThenByDescending(e => e.Confidence ?? 0)
            .ThenByDescending(e => e.LastSeenAt ?? e.CreatedAt)
            .Take(take > 0 ? take : CareerMemoryThresholds.LoadTake)
            .ToListAsync();

        return new LearningMemoryBundle
        {
            Weaknesses = rows.Where(r => r.EventType == CareerMemoryTypes.Weakness)
                .Take(CareerMemoryThresholds.ContextWeaknessLimit + 3).Select(MapSignal).ToList(),
            SkillGaps = rows.Where(r => r.EventType == CareerMemoryTypes.SkillGap)
                .Take(CareerMemoryThresholds.ContextSkillGapLimit + 2).Select(MapSignal).ToList(),
            EvidenceGaps = rows.Where(r => r.EventType == CareerMemoryTypes.EvidenceGap)
                .Take(CareerMemoryThresholds.ContextEvidenceGapLimit + 2).Select(MapSignal).ToList(),
            Strengths = rows.Where(r => r.EventType == CareerMemoryTypes.Strength)
                .Take(CareerMemoryThresholds.ContextStrengthLimit + 3).Select(MapSignal).ToList()
        };
    }

    private static LearningSignalDto MapSignal(CareerMemoryEvent e) => new()
    {
        Id = e.Id,
        EventType = e.EventType,
        MemoryKey = e.MemoryKey,
        Title = e.Title,
        Confidence = e.Confidence,
        OccurrenceCount = e.OccurrenceCount,
        LastSeenAt = e.LastSeenAt,
        SourceInterviewSessionId = e.RefId,
        SourceAnswerId = e.SourceAnswerId,
        Description = ReadDescription(e.PayloadJson)
    };

    private static string? ReadDescription(string? payloadJson)
    {
        if (string.IsNullOrWhiteSpace(payloadJson)) return null;
        try
        {
            using var doc = JsonDocument.Parse(payloadJson);
            if (doc.RootElement.TryGetProperty("description", out var d))
                return d.GetString();
        }
        catch { /* ignore */ }
        return null;
    }

    private static List<LearningSignal> ExtractSignals(
        InterviewSession session,
        StructuredFeedbackDto feedback,
        IReadOnlyList<InterviewAnswer> answers)
    {
        var list = new List<LearningSignal>();
        var analyzedCount = answers.Count(a => a.AnalysisAvailable && !a.Skipped);

        foreach (var w in feedback.Weaknesses)
        {
            if (string.IsNullOrWhiteSpace(w.Area)) continue;
            if (w.Area.Equals("General", StringComparison.OrdinalIgnoreCase)) continue;
            var related = w.RelatedAnswerIds?.Count ?? 0;
            // Min evidence: ≥2 supporting answers, OR enough analyzed answers with explicit area signal.
            if (related < CareerMemoryThresholds.MinWeaknessSupportingSignals
                && analyzedCount < CareerMemoryThresholds.MinWeaknessSupportingSignals
                && !IsStrongExplicitWeakness(w))
                continue;

            var topic = NormalizeTopic(w.Area, w.Description);
            var conf = BaseConfidence(related, analyzedCount);
            list.Add(new LearningSignal
            {
                EventType = CareerMemoryTypes.Weakness,
                MemoryKey = Key(CareerMemoryTypes.Weakness, topic),
                Title = $"Weakness: {CanonicalTitle(topic, w.Area)}",
                Description = w.Description,
                Evidence = w.Evidence,
                Confidence = conf,
                SourceAnswerId = w.RelatedAnswerIds?.FirstOrDefault(),
                RelatedAnswerIds = w.RelatedAnswerIds ?? []
            });
        }

        // Skill gaps only when category data supports them (already filtered in StructuredFeedbackBuilder).
        // Require at least one analyzed answer in that area — skip thin single-null noise.
        foreach (var g in feedback.SkillGaps)
        {
            if (string.IsNullOrWhiteSpace(g.Area) || g.Score == null) continue;
            if (!HasEnoughSkillGapEvidence(g.Area, answers)) continue;
            var topic = NormalizeTopic(g.Area, g.Description);
            list.Add(new LearningSignal
            {
                EventType = CareerMemoryTypes.SkillGap,
                MemoryKey = Key(CareerMemoryTypes.SkillGap, topic),
                Title = $"Skill gap: {CanonicalTitle(topic, g.Area)}",
                Description = g.Description,
                Evidence = g.Score.HasValue ? $"score≈{g.Score}" : null,
                Confidence = Math.Min(80, 45 + (analyzedCount >= 3 ? 15 : 5)
                    + (g.Score < CareerMemoryThresholds.VeryWeakSingleAnswerThreshold ? 8 : 0)),
                RelatedAnswerIds = []
            });
        }

        // Aggregate evidence gaps by status (not one memory per answer).
        foreach (var group in feedback.EvidenceGaps.GroupBy(e => NormalizeEvidenceTopic(e.Status)))
        {
            if (string.IsNullOrEmpty(group.Key)) continue;
            // Need ≥2 answers OR NeedsValidation/CvInconsistency is explicit enough alone.
            var count = group.Count();
            if (count < CareerMemoryThresholds.MinWeaknessSupportingSignals
                && group.Key is not ("cv_inconsistency" or "evidence_validation"))
                continue;

            // MissingEvidence / WeakEvidence → EvidenceGap (not SkillGap, not fake CV).
            if (group.Key is "cv_inconsistency")
            {
                list.Add(new LearningSignal
                {
                    EventType = CareerMemoryTypes.Weakness,
                    MemoryKey = Key(CareerMemoryTypes.Weakness, "cv_consistency"),
                    Title = "Weakness: CV Consistency",
                    Description = "Có mâu thuẫn rõ với hồ sơ — cần làm rõ (chỉ khi EvidenceStatus=CvInconsistency).",
                    Confidence = 70,
                    SourceAnswerId = group.First().AnswerId,
                    RelatedAnswerIds = group.Select(x => x.AnswerId).Distinct().ToList()
                });
                continue;
            }

            var sample = group.First();
            list.Add(new LearningSignal
            {
                EventType = CareerMemoryTypes.EvidenceGap,
                MemoryKey = Key(CareerMemoryTypes.EvidenceGap, group.Key),
                Title = $"Evidence gap: {CanonicalTitle(group.Key, sample.Status)}",
                Description = sample.Gap,
                Evidence = $"{count} câu · {sample.Suggestion}",
                Confidence = Math.Min(85, 40 + count * 10),
                SourceAnswerId = sample.AnswerId,
                RelatedAnswerIds = group.Select(x => x.AnswerId).Distinct().ToList()
            });
        }

        foreach (var s in feedback.Strengths)
        {
            if (string.IsNullOrWhiteSpace(s.Area)) continue;
            if (s.Area.Equals("General", StringComparison.OrdinalIgnoreCase)) continue;
            if (s.Description.Contains("Không đủ dữ liệu", StringComparison.OrdinalIgnoreCase)) continue;
            var related = s.RelatedAnswerIds?.Count ?? 0;
            if (related < 1 && analyzedCount < CareerMemoryThresholds.MinWeaknessSupportingSignals)
                continue;
            var topic = NormalizeTopic(s.Area, s.Description);
            list.Add(new LearningSignal
            {
                EventType = CareerMemoryTypes.Strength,
                MemoryKey = Key(CareerMemoryTypes.Strength, topic),
                Title = $"Strength: {CanonicalTitle(topic, s.Area)}",
                Description = s.Description,
                Evidence = s.Evidence,
                Confidence = BaseConfidence(Math.Max(1, related), analyzedCount) + 5,
                SourceAnswerId = s.RelatedAnswerIds?.FirstOrDefault(),
                RelatedAnswerIds = s.RelatedAnswerIds ?? []
            });
        }

        // Dedup within this extract (same key from weakness + skill gap edge cases)
        return list
            .GroupBy(x => x.MemoryKey, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.OrderByDescending(x => x.Confidence).First())
            .ToList();
    }

    private static bool IsStrongExplicitWeakness(FeedbackItemDto w)
    {
        var related = w.RelatedAnswerIds?.Count ?? 0;
        if (related >= CareerMemoryThresholds.MinWeaknessSupportingSignals) return true;
        var area = (w.Area ?? "").ToLowerInvariant();
        var desc = (w.Description ?? "").ToLowerInvariant();
        // Explicit STAR Result missing or CV inconsistency is strong enough with ≥1 answer id.
        if (related >= 1 && (area.Contains("star") && desc.Contains("result")
            || area.Contains("cv") || desc.Contains("cvinconsistency") || desc.Contains("mâu thuẫn")))
            return true;
        return false;
    }

    private static bool HasEnoughSkillGapEvidence(string area, IReadOnlyList<InterviewAnswer> answers)
    {
        var a = area.ToLowerInvariant();
        var analyzed = answers.Where(x => x.AnalysisAvailable && !x.Skipped).ToList();
        if (analyzed.Count == 0) return false;

        if (a.Contains("technical"))
        {
            var tech = analyzed.Where(x => x.TechnicalKnowledgeScore.HasValue).ToList();
            return tech.Count >= CareerMemoryThresholds.MinWeaknessSupportingSignals
                || (tech.Count == 1 && tech[0].TechnicalKnowledgeScore < CareerMemoryThresholds.VeryWeakSingleAnswerThreshold);
        }
        if (a.Contains("problem"))
        {
            var ps = analyzed.Where(x => x.ProblemSolvingScore.HasValue).ToList();
            return ps.Count >= CareerMemoryThresholds.MinWeaknessSupportingSignals
                || (ps.Count == 1 && ps[0].ProblemSolvingScore < CareerMemoryThresholds.VeryWeakSingleAnswerThreshold);
        }
        if (a.Contains("communication"))
            return analyzed.Count(x => x.CommunicationScore.HasValue) >= CareerMemoryThresholds.MinWeaknessSupportingSignals;
        if (a.Contains("star"))
            return analyzed.Count(x => x.StarScore.HasValue || x.StarHasResult.HasValue)
                >= CareerMemoryThresholds.MinWeaknessSupportingSignals;
        if (a.Contains("complete"))
            return analyzed.Count(x => x.CompletenessScore.HasValue)
                >= CareerMemoryThresholds.MinWeaknessSupportingSignals;
        return analyzed.Count >= CareerMemoryThresholds.MinWeaknessSupportingSignals;
    }

    private static int BaseConfidence(int relatedAnswers, int analyzedCount)
    {
        var c = 45;
        if (relatedAnswers >= 2) c += 12;
        else if (relatedAnswers == 1) c += 5;
        if (analyzedCount >= 4) c += 8;
        return Math.Min(80, c);
    }

    public static string NormalizeTopic(string area, string? description = null)
    {
        var a = (area ?? "").Trim().ToLowerInvariant();
        var d = (description ?? "").ToLowerInvariant();

        if (a.Contains("star") || d.Contains("star"))
        {
            if (d.Contains("result") || a.Contains("result")) return "star_result";
            if (d.Contains("action") || a.Contains("action")) return "star_action";
            if (d.Contains("situation") || a.Contains("situation")) return "star_situation";
            if (d.Contains("task") || a.Contains("task")) return "star_task";
            return "star_structure";
        }
        if (a.Contains("communication") || a.Contains("giao tiếp")) return "communication";
        if (a.Contains("technical") || a.Contains("kỹ thuật")) return "technical_knowledge";
        if (a.Contains("problem")) return "problem_solving";
        if (a.Contains("relevance") || a.Contains("relevance")) return "relevance";
        if (a.Contains("complete")) return "completeness";
        if (a.Contains("evidence") || a.Contains("bằng chứng"))
        {
            if (d.Contains("missing") || d.Contains("thiếu")) return "evidence_missing";
            if (d.Contains("weak") || d.Contains("yếu")) return "evidence_weak";
            if (d.Contains("validation") || d.Contains("thẩm định")) return "evidence_validation";
            return "evidence_general";
        }
        if (a.Contains("cv") || a.Contains("consistency")) return "cv_consistency";
        if (a.Contains("domain")) return "domain_knowledge";

        var slug = Regex.Replace(a, @"[^a-z0-9]+", "_").Trim('_');
        return string.IsNullOrEmpty(slug) ? "general" : slug;
    }

    private static string NormalizeEvidenceTopic(string? status) => status switch
    {
        EvidenceStatus.MissingEvidence => "evidence_missing",
        EvidenceStatus.WeakEvidence => "evidence_weak",
        EvidenceStatus.NeedsValidation => "evidence_validation",
        EvidenceStatus.CvInconsistency => "cv_inconsistency",
        _ => ""
    };

    private static string Key(string type, string topic) => $"{type}|{topic}";

    private static string CanonicalTitle(string topic, string fallback) => topic switch
    {
        "star_result" => "STAR Result",
        "star_action" => "STAR Action",
        "star_situation" => "STAR Situation",
        "star_task" => "STAR Task",
        "star_structure" => "STAR Structure",
        "communication" => "Communication",
        "technical_knowledge" => "Technical Knowledge",
        "problem_solving" => "Problem Solving",
        "evidence_missing" => "Missing Evidence",
        "evidence_weak" => "Weak Evidence",
        "evidence_validation" => "Needs Validation",
        "cv_consistency" => "CV Consistency",
        "relevance" => "Relevance",
        "completeness" => "Completeness",
        "domain_knowledge" => "Domain Knowledge",
        _ => fallback
    };

    private static object BuildPayload(LearningSignal signal, Guid sessionId) => new
    {
        description = signal.Description,
        evidence = signal.Evidence,
        topic = signal.MemoryKey.Contains('|') ? signal.MemoryKey.Split('|')[1] : signal.MemoryKey,
        sourceInterviewSessionId = sessionId,
        sourceAnswerIds = signal.RelatedAnswerIds,
        memoryType = signal.EventType
    };

    private static string MergePayload(string? existingJson, LearningSignal signal, Guid sessionId)
    {
        var answerIds = new HashSet<Guid>(signal.RelatedAnswerIds);
        List<Guid>? priorSessions = null;
        try
        {
            if (!string.IsNullOrWhiteSpace(existingJson))
            {
                using var doc = JsonDocument.Parse(existingJson);
                if (doc.RootElement.TryGetProperty("sourceAnswerIds", out var arr) && arr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var x in arr.EnumerateArray())
                        if (x.TryGetGuid(out var id)) answerIds.Add(id);
                }
                if (doc.RootElement.TryGetProperty("priorSessionIds", out var ps) && ps.ValueKind == JsonValueKind.Array)
                {
                    priorSessions = ps.EnumerateArray()
                        .Select(x => x.TryGetGuid(out var g) ? g : Guid.Empty)
                        .Where(g => g != Guid.Empty)
                        .ToList();
                }
            }
        }
        catch { /* ignore */ }

        priorSessions ??= [];
        if (!priorSessions.Contains(sessionId))
            priorSessions.Add(sessionId);
        if (priorSessions.Count > 10)
            priorSessions = priorSessions.TakeLast(10).ToList();

        return JsonSerializer.Serialize(new
        {
            description = signal.Description,
            evidence = signal.Evidence,
            topic = signal.MemoryKey.Contains('|') ? signal.MemoryKey.Split('|')[1] : signal.MemoryKey,
            sourceInterviewSessionId = sessionId,
            sourceAnswerIds = answerIds.Take(20).ToList(),
            priorSessionIds = priorSessions,
            memoryType = signal.EventType,
            recurring = priorSessions.Count >= 2
        }, JsonOpts);
    }

    private sealed class LearningSignal
    {
        public string EventType { get; set; } = "";
        public string MemoryKey { get; set; } = "";
        public string Title { get; set; } = "";
        public string Description { get; set; } = "";
        public string? Evidence { get; set; }
        public int Confidence { get; set; }
        public Guid? SourceAnswerId { get; set; }
        public List<Guid> RelatedAnswerIds { get; set; } = [];
    }
}

public class LearningMemoryBundle
{
    public List<LearningSignalDto> Weaknesses { get; set; } = [];
    public List<LearningSignalDto> SkillGaps { get; set; } = [];
    public List<LearningSignalDto> EvidenceGaps { get; set; } = [];
    public List<LearningSignalDto> Strengths { get; set; } = [];
}

public class LearningSignalDto
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = "";
    public string? MemoryKey { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? Confidence { get; set; }
    public int OccurrenceCount { get; set; }
    public DateTime? LastSeenAt { get; set; }
    public Guid? SourceInterviewSessionId { get; set; }
    public Guid? SourceAnswerId { get; set; }
}

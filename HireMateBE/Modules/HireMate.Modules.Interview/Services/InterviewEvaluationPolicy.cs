using Common;
using Common.DTOs.InterviewDto;
using Infrastructure.Models;
using System.Text;
using System.Text.Json;

namespace HireMate.Modules.Interview.Services;

/// <summary>
/// Deterministic applicability, strict AI-output validation, and weighted scoring.
/// AI supplies semantic judgments and quoted answer evidence; it never supplies overall.
/// </summary>
public static class InterviewEvaluationPolicy
{
    private static readonly IReadOnlyDictionary<string, int> Technical = new Dictionary<string, int>
    {
        ["relevance"] = 25, ["completeness"] = 20, ["technicalKnowledge"] = 35,
        ["problemSolving"] = 10, ["communication"] = 10
    };
    private static readonly IReadOnlyDictionary<string, int> Behavioral = new Dictionary<string, int>
    {
        ["relevance"] = 20, ["completeness"] = 20, ["star"] = 25,
        ["evidence"] = 20, ["communication"] = 15
    };
    private static readonly IReadOnlyDictionary<string, int> CvBased = new Dictionary<string, int>
    {
        ["relevance"] = 20, ["completeness"] = 20, ["evidence"] = 25,
        ["cvConsistency"] = 20, ["communication"] = 15
    };
    private static readonly IReadOnlyDictionary<string, int> JdBased = new Dictionary<string, int>
    {
        ["relevance"] = 25, ["completeness"] = 20, ["evidence"] = 20,
        ["problemSolving"] = 20, ["communication"] = 15
    };
    private static readonly IReadOnlyDictionary<string, int> Situational = new Dictionary<string, int>
    {
        ["relevance"] = 25, ["completeness"] = 20, ["problemSolving"] = 35,
        ["communication"] = 20
    };
    private static readonly IReadOnlyDictionary<string, int> General = new Dictionary<string, int>
    {
        ["relevance"] = 35, ["completeness"] = 35, ["communication"] = 30
    };

    public static IReadOnlyDictionary<string, int> Weights(string? category)
    {
        var value = category ?? string.Empty;
        if (Contains(value, "CVBased", "CV-based", "CV Based")) return CvBased;
        if (Contains(value, "JDBased", "JD-based", "JD Based")) return JdBased;
        if (Contains(value, "Behavioral", "Hành vi", "Experience", "Project"))
            return Behavioral;
        if (Contains(value, "Situational", "ProblemSolving", "Problem Solving", "Tình huống"))
            return Situational;
        if (Contains(value, "General", "Giới thiệu")
            || value.Trim().Equals("Follow-up", StringComparison.OrdinalIgnoreCase)
            || value.Trim().Equals("FollowUp", StringComparison.OrdinalIgnoreCase)) return General;
        return Technical; // RoleSpecific and legacy role categories are professional-knowledge questions.
    }

    public static IReadOnlyDictionary<string, int> Weights(string? category, string? question)
    {
        var baseWeights = Weights(category);
        if (!ReferenceEquals(baseWeights, Technical)) return baseWeights;
        var text = question?.Trim() ?? string.Empty;
        var definition = Starts(text, "what is ", "what are ", "define ", "what does ",
            "là gì", "định nghĩa ", "khái niệm ")
            || text.Contains(" là gì", StringComparison.OrdinalIgnoreCase);
        if (!definition) return baseWeights;
        // Definition questions cannot demonstrate a solution path. Normalize the remaining weights.
        return Technical.Where(pair => pair.Key != "problemSolving")
            .ToDictionary(pair => pair.Key, pair => pair.Value);
    }

    private static bool Starts(string value, params string[] prefixes) =>
        prefixes.Any(prefix => value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase));

    private static bool Contains(string value, params string[] terms) =>
        terms.Any(term => value.Contains(term, StringComparison.OrdinalIgnoreCase));

    /// <summary>Provider-level shape constraint; TryParse remains the authority for evidence and ranges.</summary>
    public static JsonElement ResponseSchema(string? category, string? question = null)
    {
        static Dictionary<string, object> Field(string type) => new() { ["type"] = type };
        static Dictionary<string, object> Shape(Dictionary<string, object> properties) => new()
        {
            ["type"] = "object", ["properties"] = properties,
            ["required"] = properties.Keys.ToArray(), ["additionalProperties"] = false
        };
        var statuses = EvidenceStatus.All.OrderBy(x => x, StringComparer.Ordinal).ToArray();
        var dimension = Shape(new Dictionary<string, object>
        {
            ["score"] = Field("integer"),
            ["confidence"] = Field("number"),
            ["status"] = new { type = "string", @enum = statuses },
            ["evidence"] = new { type = "array", items = Field("string") },
            ["reason"] = Field("string")
        });
        var dimensions = Shape(Weights(category, question).Keys.ToDictionary(key => key,
            _ => (object)dimension));
        var star = Weights(category, question).ContainsKey("star")
            ? Shape(new Dictionary<string, object>
            {
                ["situation"] = Field("boolean"), ["task"] = Field("boolean"),
                ["action"] = Field("boolean"), ["result"] = Field("boolean")
            }) : Field("null");
        var followUp = Shape(new Dictionary<string, object>
        {
            ["trigger"] = new { type = "string", @enum = new[] { "EvidenceGap", "TechnicalGap",
                "WeakSTAR", "MissingResult", "UnclearRole", "CvInconsistency", "LowConfidence" } },
            ["reason"] = Field("string")
        });
        followUp["type"] = new[] { "object", "null" };
        return JsonSerializer.SerializeToElement(Shape(new Dictionary<string, object>
        {
            ["dimensions"] = dimensions,
            ["evidenceStatus"] = new { type = "string", @enum = statuses },
            ["cvQuote"] = new { type = new[] { "string", "null" } },
            ["star"] = star,
            ["feedback"] = Shape(new Dictionary<string, object>
            {
                ["status"] = new { type = "string", @enum = new[] { "good", "needs_improvement", "invalid" } },
                ["comment"] = Field("string"),
                ["starTip"] = new { type = new[] { "string", "null" } }
            }),
            ["followUp"] = followUp
        }));
    }

    public static int? WeightedScore(IReadOnlyDictionary<string, EvaluationDimensionDto> dimensions,
        string? category, string? question = null)
    {
        var weights = Weights(category, question);
        if (dimensions.Count != weights.Count || weights.Keys.Any(key => !dimensions.ContainsKey(key)))
            return null;
        if (dimensions.Values.Any(d => d == null || d.Score is < 0 or > 100 || !double.IsFinite(d.Confidence)
            || d.Confidence is < 0 or > 1 || !EvidenceStatus.All.Contains(d.Status)
            || d.Evidence == null || d.Evidence.Count == 0 || string.IsNullOrWhiteSpace(d.Reason)))
            return null;
        return (int)Math.Round(weights.Sum(pair => dimensions[pair.Key].Score * pair.Value)
            / (double)weights.Values.Sum());
    }

    public static int? WeightedScore(InterviewAnswer answer)
    {
        if (!answer.AnalysisAvailable || string.IsNullOrWhiteSpace(answer.AnalysisJson))
            return null;
        try
        {
            var dto = JsonSerializer.Deserialize<AnswerAnalysisDto>(answer.AnalysisJson);
            return dto?.Dimensions == null ? null : WeightedScore(dto.Dimensions, answer.QuestionCategory,
                answer.QuestionText);
        }
        catch (Exception ex) when (ex is JsonException or NullReferenceException or KeyNotFoundException)
        { return null; }
    }

    public static string? EvidenceQuote(InterviewAnswer answer, string dimension)
    {
        if (string.IsNullOrWhiteSpace(answer.AnalysisJson)) return null;
        try
        {
            var dto = JsonSerializer.Deserialize<AnswerAnalysisDto>(answer.AnalysisJson);
            return dto?.Dimensions?.TryGetValue(dimension, out var evidence) == true
                ? evidence.Evidence.FirstOrDefault() : null;
        }
        catch (Exception ex) when (ex is JsonException or NullReferenceException)
        { return null; }
    }

    public static AnswerAnalysisDto? TryParse(string content, string category, string question,
        string answer, string? cvContext)
    {
        try
        {
            using var document = JsonDocument.Parse(content);
            var root = document.RootElement;
            if (!ExactKeys(root, "dimensions", "evidenceStatus", "cvQuote", "star", "feedback", "followUp"))
                return null;
            var weights = Weights(category, question);
            var rawDimensions = root.GetProperty("dimensions");
            if (rawDimensions.ValueKind != JsonValueKind.Object
                || rawDimensions.EnumerateObject().Count() != weights.Count
                || rawDimensions.EnumerateObject().Any(property => !weights.ContainsKey(property.Name)))
                return null;
            var dimensions = new Dictionary<string, EvaluationDimensionDto>();
            foreach (var name in weights.Keys)
            {
                if (!rawDimensions.TryGetProperty(name, out var item)
                    || !ExactKeys(item, "score", "confidence", "status", "evidence", "reason"))
                    return null;
                var score = item.GetProperty("score");
                var confidence = item.GetProperty("confidence");
                var evidence = item.GetProperty("evidence");
                var reason = item.GetProperty("reason");
                var dimensionStatus = ReadString(item, "status");
                if (score.ValueKind != JsonValueKind.Number || !score.TryGetInt32(out var number)
                    || number is < 0 or > 100 || confidence.ValueKind != JsonValueKind.Number
                    || !confidence.TryGetDouble(out var certainty) || !double.IsFinite(certainty)
                    || certainty is < 0 or > 1 || dimensionStatus == null
                    || !EvidenceStatus.All.Contains(dimensionStatus)
                    || evidence.ValueKind != JsonValueKind.Array
                    || evidence.GetArrayLength() is < 1 or > 3 || reason.ValueKind != JsonValueKind.String)
                    return null;
                var reasonText = reason.GetString()?.Trim();
                if (string.IsNullOrWhiteSpace(reasonText) || reasonText.Length > 400)
                    return null;
                var quotes = new List<string>();
                foreach (var quote in evidence.EnumerateArray())
                {
                    if (quote.ValueKind != JsonValueKind.String) return null;
                    var text = quote.GetString()?.Trim();
                    if (string.IsNullOrWhiteSpace(text) || text.Length is < 3 or > 240
                        || !Normalized(answer).Contains(Normalized(text), StringComparison.Ordinal))
                        return null;
                    quotes.Add(text);
                }
                dimensions[name] = new EvaluationDimensionDto
                {
                    Score = number, Confidence = certainty, Status = dimensionStatus,
                    Evidence = quotes, Reason = reasonText
                };
            }

            var status = ReadString(root, "evidenceStatus");
            if (status == null || !EvidenceStatus.All.Contains(status)) return null;
            var cvQuote = ReadNullableString(root, "cvQuote");
            // A model may quote matching CV context even without a contradiction.
            // Keep the validated analysis, but never persist that quote as inconsistency evidence.
            if (status != EvidenceStatus.CvInconsistency) cvQuote = null;
            if (status == EvidenceStatus.CvInconsistency
                && (string.IsNullOrWhiteSpace(cvQuote) || string.IsNullOrWhiteSpace(cvContext)
                    || !Normalized(cvContext).Contains(Normalized(cvQuote), StringComparison.Ordinal)))
                return null;
            if (status == EvidenceStatus.CvInconsistency && !weights.ContainsKey("cvConsistency"))
                return null;
            if (status == EvidenceStatus.CvInconsistency
                && (dimensions["cvConsistency"].Confidence < 0.7
                    || dimensions["cvConsistency"].Score > 59))
                return null;

            bool? s = null, t = null, a = null, r = null;
            var star = root.GetProperty("star");
            if (weights.ContainsKey("star"))
            {
                if (!ExactKeys(star, "situation", "task", "action", "result")) return null;
                s = ReadBool(star, "situation"); t = ReadBool(star, "task");
                a = ReadBool(star, "action"); r = ReadBool(star, "result");
                if (!s.HasValue || !t.HasValue || !a.HasValue || !r.HasValue) return null;
            }
            else if (star.ValueKind != JsonValueKind.Null) return null;

            var feedback = root.GetProperty("feedback");
            if (!ExactKeys(feedback, "status", "comment", "starTip")) return null;
            var feedbackStatus = ReadString(feedback, "status");
            var comment = ReadString(feedback, "comment");
            var tip = ReadNullableString(feedback, "starTip");
            if (feedbackStatus is not ("good" or "needs_improvement" or "invalid")
                || string.IsNullOrWhiteSpace(comment) || comment.Length > 500
                || (tip?.Length ?? 0) > 160) return null;

            string? trigger = null, followReason = null;
            var follow = root.GetProperty("followUp");
            if (follow.ValueKind != JsonValueKind.Null)
            {
                if (!ExactKeys(follow, "trigger", "reason")) return null;
                trigger = ReadString(follow, "trigger");
                followReason = ReadString(follow, "reason");
                if (trigger is not ("EvidenceGap" or "TechnicalGap" or "WeakSTAR"
                    or "MissingResult" or "UnclearRole" or "CvInconsistency" or "LowConfidence")
                    || string.IsNullOrWhiteSpace(followReason) || followReason.Length > 250)
                    return null;
                // An optional, unsupported follow-up must not discard otherwise valid scores.
                var supported = trigger switch
                {
                    "CvInconsistency" => status == EvidenceStatus.CvInconsistency,
                    "LowConfidence" => dimensions.Values.Any(d => d.Confidence < 0.5),
                    "WeakSTAR" => weights.ContainsKey("star") && dimensions["star"].Score < 60,
                    "MissingResult" => weights.ContainsKey("star") && r == false,
                    "TechnicalGap" => dimensions.TryGetValue("technicalKnowledge", out var technical)
                        && (technical.Score < 60 || dimensions["completeness"].Score < 60),
                    "EvidenceGap" => status is EvidenceStatus.MissingEvidence
                        or EvidenceStatus.WeakEvidence or EvidenceStatus.NeedsValidation,
                    "UnclearRole" => dimensions["completeness"].Score < 60,
                    _ => false
                };
                if (!supported) { trigger = null; followReason = null; }
            }
            var weighted = WeightedScore(dimensions, category, question);
            if (!weighted.HasValue) return null;
            if (feedbackStatus == "invalid" && weighted > 39) return null;
            return new AnswerAnalysisDto
            {
                AnalysisAvailable = true,
                Dimensions = dimensions,
                WeightedScore = weighted,
                Relevance = Score(dimensions, "relevance"),
                Completeness = Score(dimensions, "completeness"),
                TechnicalKnowledge = Score(dimensions, "technicalKnowledge"),
                ProblemSolving = Score(dimensions, "problemSolving"),
                Communication = Score(dimensions, "communication"),
                StarScore = Score(dimensions, "star"),
                CvConsistency = Score(dimensions, "cvConsistency"),
                StarSituation = s, StarTask = t, StarAction = a, StarResult = r,
                EvidenceStatus = status,
                EvidenceJson = JsonSerializer.Serialize(new { status, cvQuote,
                    quotes = dimensions.Values.SelectMany(d => d.Evidence).Distinct().ToArray() }),
                EvidenceGap = status is EvidenceStatus.MissingEvidence or EvidenceStatus.WeakEvidence
                    or EvidenceStatus.NeedsValidation,
                FeedbackStatus = feedbackStatus, FeedbackComment = comment, StarTip = tip,
                NeedsFollowUp = trigger != null,
                FollowUpReason = trigger == null ? null : trigger + ": " + followReason
            };
        }
        catch (Exception ex) when (ex is JsonException or InvalidOperationException or KeyNotFoundException)
        {
            return null;
        }
    }

    public static string RubricInstruction =>
        "Score each applicable dimension by demonstrated substance, not length or keywords. " +
        "Bands: 90-100 correct and complete with no material gap; 75-89 mostly correct with minor gaps; " +
        "60-74 basic understanding with important omissions; 40-59 partial or significant gaps; " +
        "20-39 major misunderstanding; 0-19 no meaningful relevant answer. " +
        "Relevance: direct response to the question. Completeness: essential points covered. " +
        "TechnicalKnowledge: concepts, correctness, misconceptions. ProblemSolving: approach and trade-offs. " +
        "Communication: clarity and structure, never accent. STAR: concrete situation, task, action, result. " +
        "Evidence: specific support for claims, not assumed experience. " +
        "CvConsistency: only explicit contradiction is inconsistent; absence from CV means NeedsValidation.";

    private static int? Score(Dictionary<string, EvaluationDimensionDto> dimensions, string name) =>
        dimensions.TryGetValue(name, out var value) ? value.Score : null;

    private static bool ExactKeys(JsonElement element, params string[] names) =>
        element.ValueKind == JsonValueKind.Object
        && element.EnumerateObject().Count() == names.Length
        && element.EnumerateObject().All(property => names.Contains(property.Name, StringComparer.Ordinal));

    private static string? ReadString(JsonElement element, string name) =>
        element.TryGetProperty(name, out var property) && property.ValueKind == JsonValueKind.String
            ? property.GetString()?.Trim() : null;

    private static string? ReadNullableString(JsonElement element, string name) =>
        element.TryGetProperty(name, out var property) && property.ValueKind == JsonValueKind.Null
            ? null : ReadString(element, name);

    private static bool? ReadBool(JsonElement element, string name) =>
        element.TryGetProperty(name, out var property) ? property.ValueKind switch
        {
            JsonValueKind.True => true, JsonValueKind.False => false, _ => null
        } : null;

    private static string Normalized(string? value) =>
        string.Join(' ', (value ?? "").Normalize(NormalizationForm.FormC).ToLowerInvariant()
            .Split((char[]?)null,
            StringSplitOptions.RemoveEmptyEntries));
}

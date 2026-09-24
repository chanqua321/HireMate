using Common;
using Common.DTOs.InterviewDto;
using Infrastructure.Models;
using System.Text.Json;

namespace HireMate.Modules.Interview.Services;

/// <summary>Deterministic structured feedback from persisted InterviewAnswer analysis. Does not invent scores.</summary>
public static class StructuredFeedbackBuilder
{
    private const int StrengthThreshold = 70;
    private const int WeakThreshold = 55;

    public static StructuredFeedbackDto Build(InterviewSession session, IReadOnlyList<InterviewAnswer> answers,
        string language = "vi")
    {
        var en = language == "en";
        var analyzed = answers
            .Where(a => !a.Skipped && InterviewEvaluationPolicy.WeightedScore(a).HasValue)
            .OrderBy(a => a.OrderIndex)
            .ToList();

        var cat = new CategoryScoresDto
        {
            Communication = Avg(analyzed.Select(a => a.CommunicationScore)),
            Star = Avg(analyzed.Select(a => a.StarScore)),
            Technical = Avg(analyzed.Select(a => a.TechnicalKnowledgeScore)),
            ProblemSolving = Avg(analyzed.Select(a => a.ProblemSolvingScore)),
            Relevance = Avg(analyzed.Select(a => a.RelevanceScore)),
            Completeness = Avg(analyzed.Select(a => a.CompletenessScore)),
            CvConsistency = Avg(analyzed.Select(a => a.CvConsistencyScore))
        };

        var perAnswer = analyzed
            .Select(a => (Answer: a, Composite: AnswerComposite(a)))
            .Where(x => x.Composite.HasValue)
            .ToList();

        var overall = perAnswer.Count > 0
            ? (int?)Math.Round(perAnswer.Average(x => x.Composite!.Value))
            : null;

        var strengths = BuildStrengths(cat, analyzed, en);
        var weaknesses = BuildWeaknesses(cat, analyzed, en);
        var skillGaps = BuildSkillGaps(cat, en);
        var evidenceGaps = BuildEvidenceGaps(analyzed, en);
        var highlights = BuildHighlights(perAnswer, en);
        var cvSummary = BuildCvConsistencySummary(analyzed, cat.CvConsistency, en);
        var improvements = BuildImprovements(weaknesses, evidenceGaps, cat, en);

        var summary = overall == null && analyzed.Count == 0
            ? T(en, "Chưa đủ dữ liệu phân tích từng câu trả lời để tạo feedback đầy đủ.",
                "Not enough analyzed answers to produce a full report.")
            : BuildDeterministicSummary(overall, strengths, weaknesses, evidenceGaps.Count, en);

        return new StructuredFeedbackDto
        {
            SessionId = session.Id,
            OverallScore = overall,
            Summary = summary,
            AiSummaryAvailable = false,
            CategoryScores = cat,
            CvConsistencySummary = cvSummary,
            Strengths = strengths,
            Weaknesses = weaknesses,
            SkillGaps = skillGaps,
            EvidenceGaps = evidenceGaps,
            AnswerHighlights = highlights,
            Improvements = improvements
        };
    }

    public static (int? S, int? T, int? A, int? R, int? Clarity) DeriveStarAndClarity(IReadOnlyList<InterviewAnswer> answers)
    {
        // Presence flags are not numeric quality scores. Keep legacy STAR columns null
        // until evidence-backed per-component numeric scores exist.
        var clarity = Avg(answers.Where(a => InterviewEvaluationPolicy.WeightedScore(a).HasValue)
            .Select(a => a.CommunicationScore));
        return (null, null, null, null, clarity);
    }

    private static int? AnswerComposite(InterviewAnswer a)
    {
        return InterviewEvaluationPolicy.WeightedScore(a);
    }

    private static int? Avg(IEnumerable<int?> values)
    {
        var list = values.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        return list.Count == 0 ? null : (int)Math.Round(list.Average());
    }

    private static string? QuoteFor(IEnumerable<InterviewAnswer> answers, string dimension) =>
        answers.Select(answer => InterviewEvaluationPolicy.EvidenceQuote(answer, dimension))
            .FirstOrDefault(quote => !string.IsNullOrWhiteSpace(quote));

    private static string T(bool en, string vi, string english) => en ? english : vi;

    private static List<FeedbackItemDto> BuildStrengths(CategoryScoresDto cat,
        List<InterviewAnswer> analyzed, bool en)
    {
        var list = new List<FeedbackItemDto>();
        if (cat.Communication is >= StrengthThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Communication",
                Description = T(en, "Điểm giao tiếp trung bình cao — câu trả lời tương đối rõ ràng, mạch lạc.",
                    "Your answers are generally clear and well structured."),
                Evidence = QuoteFor(analyzed, "communication"),
                RelatedAnswerIds = analyzed.Where(a => a.CommunicationScore is >= StrengthThreshold).Select(a => a.Id).ToList()
            });
        }
        if (cat.Star is >= StrengthThreshold)
        {
            var strongResult = analyzed.Count(a => a.StarHasResult == true);
            list.Add(new FeedbackItemDto
            {
                Area = "STAR",
                Description = strongResult > 0
                    ? T(en, "Cấu trúc STAR khá vững, có câu trả lời nêu được Result cụ thể.",
                        "Your STAR answers include a concrete result.")
                    : T(en, "Điểm STAR tổng thể tốt trên các câu hành vi/kinh nghiệm.",
                        "Your behavioral answers use a sound STAR structure."),
                Evidence = QuoteFor(analyzed, "star"),
                RelatedAnswerIds = analyzed.Where(a => a.StarScore is >= StrengthThreshold).Select(a => a.Id).ToList()
            });
        }
        if (cat.Technical is >= StrengthThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Technical Knowledge",
                Description = T(en, "Các câu technical được trả lời với mức kiến thức ổn định.",
                    "Your technical answers show consistent knowledge."),
                Evidence = QuoteFor(analyzed, "technicalKnowledge"),
                RelatedAnswerIds = analyzed.Where(a => a.TechnicalKnowledgeScore.HasValue).Select(a => a.Id).ToList()
            });
        }
        if (cat.Relevance is >= StrengthThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Relevance",
                Description = T(en, "Câu trả lời nhìn chung bám sát câu hỏi.",
                    "Your answers generally address the questions directly."),
                Evidence = QuoteFor(analyzed, "relevance"),
                RelatedAnswerIds = analyzed.Where(a => a.RelevanceScore is >= StrengthThreshold)
                    .Select(a => a.Id).ToList()
            });
        }
        if (list.Count == 0 && analyzed.Count > 0)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "General",
                Description = T(en, "Không đủ dữ liệu vượt ngưỡng để xác định điểm mạnh nổi bật. Hãy luyện thêm với câu trả lời cụ thể hơn.",
                    "There is not enough evidence for a clear strength yet. Practice with more specific answers."),
                Evidence = null
            });
        }
        return list;
    }

    private static List<FeedbackItemDto> BuildWeaknesses(CategoryScoresDto cat,
        List<InterviewAnswer> analyzed, bool en)
    {
        var list = new List<FeedbackItemDto>();
        var missingResult = analyzed.Where(a => a.StarHasResult == false).ToList();
        if (missingResult.Count > 0)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "STAR",
                Description = T(en, "Thiếu Result đo lường được ở một số câu hành vi/kinh nghiệm.",
                    "Some behavioral answers do not state a measurable result."),
                Evidence = QuoteFor(missingResult, "star"),
                RelatedAnswerIds = missingResult.Select(a => a.Id).ToList()
            });
        }
        if (cat.Technical is < WeakThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Technical Knowledge",
                Description = T(en, "Điểm technical trung bình thấp trên các câu technical đã phân tích.",
                    "Your analyzed technical answers need stronger conceptual accuracy."),
                Evidence = QuoteFor(analyzed.Where(a => a.TechnicalKnowledgeScore is < WeakThreshold)
                    .ToList(), "technicalKnowledge"),
                RelatedAnswerIds = analyzed.Where(a => a.TechnicalKnowledgeScore.HasValue).Select(a => a.Id).ToList()
            });
        }
        if (cat.Communication is < WeakThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Communication",
                Description = T(en, "Giao tiếp còn hạn chế — cần cấu trúc rõ và ngắn gọn hơn.",
                    "Structure your answers more clearly and concisely."),
                Evidence = QuoteFor(analyzed.Where(a => a.CommunicationScore is < WeakThreshold)
                    .ToList(), "communication"),
                RelatedAnswerIds = analyzed.Where(a => a.CommunicationScore is < WeakThreshold).Select(a => a.Id).ToList()
            });
        }
        var gapAnswers = analyzed.Where(a =>
            a.EvidenceStatus is EvidenceStatus.MissingEvidence or EvidenceStatus.WeakEvidence).ToList();
        if (gapAnswers.Count > 0)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Evidence",
                Description = T(en, "Một số câu trả lời thiếu bằng chứng cụ thể (action/result/metric) — không đồng nghĩa CV giả.",
                    "Some answers lack concrete actions, results or metrics; this does not imply a false CV."),
                Evidence = en ? $"{gapAnswers.Count} answers with weak/missing evidence"
                    : $"{gapAnswers.Count} câu Weak/Missing Evidence",
                RelatedAnswerIds = gapAnswers.Select(a => a.Id).ToList()
            });
        }
        var inconsistent = analyzed.Where(a => a.EvidenceStatus == EvidenceStatus.CvInconsistency).ToList();
        if (inconsistent.Count > 0)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "CV Consistency",
                Description = T(en, "Có mâu thuẫn rõ với thông tin hồ sơ đã lưu — cần làm rõ trong lần luyện tiếp theo.",
                    "A clear discrepancy with the saved CV needs clarification."),
                Evidence = en ? $"{inconsistent.Count} answers with CV discrepancies"
                    : $"{inconsistent.Count} câu CvInconsistency",
                RelatedAnswerIds = inconsistent.Select(a => a.Id).ToList()
            });
        }
        return list;
    }

    private static List<SkillGapDto> BuildSkillGaps(CategoryScoresDto cat, bool en)
    {
        var gaps = new List<SkillGapDto>();
        void Add(string area, int? score, string desc)
        {
            if (score is < WeakThreshold)
                gaps.Add(new SkillGapDto { Area = area, Score = score, Description = desc });
        }
        Add("Communication", cat.Communication, T(en, "Cần cải thiện độ rõ ràng và cấu trúc câu trả lời.",
            "Improve the clarity and structure of your answers."));
        Add("STAR", cat.Star, T(en, "Cần luyện Situation → Task → Action → Result đầy đủ hơn.",
            "Practice all four STAR elements in behavioral answers."));
        Add("Technical Knowledge", cat.Technical, T(en, "Cần củng cố kiến thức kỹ thuật liên quan vị trí.",
            "Strengthen the technical concepts relevant to this role."));
        Add("Problem Solving", cat.ProblemSolving, T(en, "Cần trình bày rõ hơn cách phân tích và trade-off.",
            "Explain your analysis and trade-offs more clearly."));
        Add("Completeness", cat.Completeness, T(en, "Câu trả lời còn thiếu thông tin cần thiết.",
            "Your answers omit essential information."));
        return gaps;
    }

    private static List<EvidenceGapItemDto> BuildEvidenceGaps(List<InterviewAnswer> analyzed, bool en)
    {
        return analyzed
            .Where(a => a.EvidenceStatus is EvidenceStatus.MissingEvidence or EvidenceStatus.WeakEvidence
                or EvidenceStatus.NeedsValidation or EvidenceStatus.CvInconsistency)
            .Select(a =>
            {
                var gap = a.EvidenceStatus switch
                {
                    EvidenceStatus.MissingEvidence => T(en, "Thiếu bằng chứng cụ thể để chứng minh claim.",
                        "The claim needs concrete supporting evidence."),
                    EvidenceStatus.WeakEvidence => T(en, "Có đề cập trải nghiệm nhưng thiếu action/result/metric.",
                        "The experience lacks a concrete action, result or metric."),
                    EvidenceStatus.NeedsValidation => T(en, "Thông tin cần thẩm định thêm so với hồ sơ.",
                        "The claim needs further validation against the CV."),
                    EvidenceStatus.CvInconsistency => T(en, "Mâu thuẫn với dữ liệu Career Profile/CV đã biết.",
                        "The answer conflicts with the saved CV or profile."),
                    _ => T(en, "Cần bổ sung evidence.", "More evidence is needed.")
                };
                string? suggestion = null;
                if (!string.IsNullOrWhiteSpace(a.EvidenceJson))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(a.EvidenceJson);
                        if (doc.RootElement.TryGetProperty("missing", out var m) && m.ValueKind == JsonValueKind.Array)
                        {
                            var parts = m.EnumerateArray().Select(x => x.GetString()).Where(x => !string.IsNullOrWhiteSpace(x));
                            suggestion = T(en, "Bổ sung: ", "Add: ") + string.Join(", ", parts);
                        }
                        else if (doc.RootElement.TryGetProperty("validationNote", out var vn))
                            suggestion = vn.GetString();
                    }
                    catch { /* ignore */ }
                }
                suggestion ??= a.FollowUpReason;
                return new EvidenceGapItemDto
                {
                    AnswerId = a.Id,
                    OrderIndex = a.OrderIndex,
                    Question = a.QuestionText,
                    Status = a.EvidenceStatus ?? "",
                    Gap = gap,
                    Suggestion = suggestion
                };
            }).ToList();
    }

    private static AnswerHighlightsDto BuildHighlights(
        List<(InterviewAnswer Answer, int? Composite)> perAnswer, bool en)
    {
        var ordered = perAnswer.OrderByDescending(x => x.Composite).ToList();
        AnswerHighlightItemDto Map((InterviewAnswer Answer, int? Composite) x, string note) => new()
        {
            AnswerId = x.Answer.Id,
            OrderIndex = x.Answer.OrderIndex,
            Question = x.Answer.QuestionText,
            CompositeScore = x.Composite,
            Note = note
        };

        return new AnswerHighlightsDto
        {
            Strong = ordered.Where(x => x.Composite is >= StrengthThreshold).Take(3)
                .Select(x => Map(x, T(en, "Câu trả lời mạnh", "Strong answer"))).ToList(),
            Weak = ordered.Where(x => x.Composite is < WeakThreshold).Take(3)
                .Select(x => Map(x, T(en, "Câu trả lời yếu — cần cải thiện",
                    "Weak answer — needs improvement"))).ToList(),
            NeedsImprovement = ordered
                .Where(x => x.Composite is >= WeakThreshold and < StrengthThreshold)
                .Take(3)
                .Select(x => Map(x, T(en, "Có thể cải thiện thêm", "Can be improved"))).ToList()
        };
    }

    private static string BuildCvConsistencySummary(List<InterviewAnswer> analyzed, int? avg, bool en)
    {
        if (analyzed.Any(a => a.EvidenceStatus == EvidenceStatus.CvInconsistency))
            return T(en, "Potential inconsistency — có mâu thuẫn rõ với hồ sơ; cần làm rõ (không suy diễn fake CV từ MissingEvidence).",
                "Potential inconsistency — clarify the explicit CV discrepancy; missing evidence alone does not imply dishonesty.");
        if (analyzed.Any(a => a.EvidenceStatus == EvidenceStatus.NeedsValidation))
            return T(en, "Needs Validation — một số claim cần thẩm định thêm với CV/profile.",
                "Needs validation — some claims require further comparison with the CV or profile.");
        if (avg is >= 70)
            return T(en, "Consistent — câu trả lời nhìn chung nhất quán với hồ sơ.",
                "Consistent — the analyzed answers generally align with the CV.");
        if (avg == null && analyzed.Count == 0)
            return T(en, "Không đủ dữ liệu để đánh giá CV consistency.",
                "Not enough data to assess CV consistency.");
        return T(en, "Không đủ bằng chứng rõ ràng — ưu tiên bổ sung evidence thay vì kết luận không trung thực.",
            "Evidence is inconclusive; add support rather than assuming dishonesty.");
    }

    private static List<string> BuildImprovements(
        List<FeedbackItemDto> weaknesses,
        List<EvidenceGapItemDto> gaps,
        CategoryScoresDto cat, bool en)
    {
        var list = new List<string>();
        if (gaps.Any(g => g.Status is EvidenceStatus.MissingEvidence or EvidenceStatus.WeakEvidence))
            list.Add(T(en, "Thêm action cụ thể + kết quả đo được (%, thời gian, phạm vi) vào mỗi câu trả lời.",
                "Add a concrete action and measurable result to each relevant answer."));
        if (weaknesses.Any(w => w.Area == "STAR"))
            list.Add(T(en, "Luyện STAR đầy đủ: Situation → Task → Action → Result cho câu hành vi.",
                "Practice a complete Situation → Task → Action → Result for behavioral questions."));
        if (cat.Technical is < WeakThreshold)
            list.Add(T(en, "Ôn kiến thức kỹ thuật liên quan JD/vị trí và giải thích trade-off rõ hơn.",
                "Review the technical concepts for this role and explain trade-offs clearly."));
        if (cat.Communication is < WeakThreshold)
            list.Add(T(en, "Rút gọn câu trả lời, dùng cấu trúc 3–4 câu rõ ràng trước khi đào sâu.",
                "Start with a clear three- or four-sentence structure before adding detail."));
        if (list.Count == 0)
            list.Add(T(en, "Tiếp tục luyện với Active CV và JD cụ thể để giữ phong độ.",
                "Keep practicing with your selected CV and a relevant job description."));
        return list;
    }

    private static string BuildDeterministicSummary(
        int? overall,
        List<FeedbackItemDto> strengths,
        List<FeedbackItemDto> weaknesses,
        int evidenceGapCount, bool en)
    {
        var scorePart = overall.HasValue ? T(en,
            $"Điểm tổng hợp từ phân tích câu trả lời: {overall}/100. ",
            $"Overall score from analyzed answers: {overall}/100. ") : "";
        var sPart = strengths.Count > 0 ? T(en,
            $"Điểm mạnh nổi bật: {string.Join(", ", strengths.Select(x => x.Area))}. ",
            $"Strengths: {string.Join(", ", strengths.Select(x => x.Area))}. ") : "";
        var wPart = weaknesses.Count > 0 ? T(en,
            $"Cần cải thiện: {string.Join(", ", weaknesses.Select(x => x.Area))}. ",
            $"Areas to improve: {string.Join(", ", weaknesses.Select(x => x.Area))}. ") : "";
        var ePart = evidenceGapCount > 0
            ? T(en, $"Có {evidenceGapCount} điểm evidence cần bổ sung (không kết luận CV giả).",
                $"{evidenceGapCount} evidence gaps need clarification; this does not imply a false CV.")
            : overall is < WeakThreshold
                ? T(en, "Điểm nội dung còn thấp; trích dẫn có mặt không chứng minh câu trả lời đúng.",
                    "Content scores are low; a verified quote does not establish correctness.")
            : T(en, "Evidence nhìn chung ổn.", "The analyzed answers show adequate evidence overall.");
        return scorePart + sPart + wPart + ePart;
    }
}

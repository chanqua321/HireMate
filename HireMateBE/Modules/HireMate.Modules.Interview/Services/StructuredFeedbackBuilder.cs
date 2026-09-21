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

    public static StructuredFeedbackDto Build(InterviewSession session, IReadOnlyList<InterviewAnswer> answers)
    {
        var analyzed = answers
            .Where(a => !a.Skipped && a.AnalysisAvailable)
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

        var strengths = BuildStrengths(cat, analyzed);
        var weaknesses = BuildWeaknesses(cat, analyzed);
        var skillGaps = BuildSkillGaps(cat);
        var evidenceGaps = BuildEvidenceGaps(analyzed);
        var highlights = BuildHighlights(perAnswer);
        var cvSummary = BuildCvConsistencySummary(analyzed, cat.CvConsistency);
        var improvements = BuildImprovements(weaknesses, evidenceGaps, cat);

        var summary = overall == null && analyzed.Count == 0
            ? "Chưa đủ dữ liệu phân tích từng câu trả lời để tạo feedback đầy đủ."
            : BuildDeterministicSummary(overall, strengths, weaknesses, evidenceGaps.Count);

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
        var withStar = answers.Where(a => a.AnalysisAvailable && (
            a.StarHasSituation.HasValue || a.StarHasTask.HasValue || a.StarHasAction.HasValue
            || a.StarHasResult.HasValue || a.StarScore.HasValue)).ToList();

        int? Dim(Func<InterviewAnswer, bool?> getter)
        {
            var vals = withStar.Select(getter).Where(x => x.HasValue).Select(x => x!.Value ? 88 : 42).ToList();
            if (vals.Count == 0)
                return Avg(answers.Where(a => a.AnalysisAvailable).Select(a => a.StarScore));
            return (int)Math.Round(vals.Average());
        }

        var clarity = Avg(answers.Where(a => a.AnalysisAvailable).Select(a => a.CommunicationScore));
        return (Dim(a => a.StarHasSituation), Dim(a => a.StarHasTask), Dim(a => a.StarHasAction), Dim(a => a.StarHasResult), clarity);
    }

    private static int? AnswerComposite(InterviewAnswer a)
    {
        var parts = new List<int>();
        if (a.RelevanceScore.HasValue) parts.Add(a.RelevanceScore.Value);
        if (a.CompletenessScore.HasValue) parts.Add(a.CompletenessScore.Value);
        if (a.CommunicationScore.HasValue) parts.Add(a.CommunicationScore.Value);
        if (a.TechnicalKnowledgeScore.HasValue) parts.Add(a.TechnicalKnowledgeScore.Value);
        if (a.ProblemSolvingScore.HasValue) parts.Add(a.ProblemSolvingScore.Value);
        if (a.StarScore.HasValue) parts.Add(a.StarScore.Value);
        if (parts.Count == 0) return null;
        return (int)Math.Round(parts.Average());
    }

    private static int? Avg(IEnumerable<int?> values)
    {
        var list = values.Where(v => v.HasValue).Select(v => v!.Value).ToList();
        return list.Count == 0 ? null : (int)Math.Round(list.Average());
    }

    private static List<FeedbackItemDto> BuildStrengths(CategoryScoresDto cat, List<InterviewAnswer> analyzed)
    {
        var list = new List<FeedbackItemDto>();
        if (cat.Communication is >= StrengthThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Communication",
                Description = "Điểm giao tiếp trung bình cao — câu trả lời tương đối rõ ràng, mạch lạc.",
                Evidence = $"Communication ≈ {cat.Communication}",
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
                    ? "Cấu trúc STAR khá vững, có câu trả lời nêu được Result cụ thể."
                    : "Điểm STAR tổng thể tốt trên các câu hành vi/kinh nghiệm.",
                Evidence = $"Star ≈ {cat.Star}",
                RelatedAnswerIds = analyzed.Where(a => a.StarScore is >= StrengthThreshold).Select(a => a.Id).ToList()
            });
        }
        if (cat.Technical is >= StrengthThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Technical Knowledge",
                Description = "Các câu technical được trả lời với mức kiến thức ổn định.",
                Evidence = $"Technical ≈ {cat.Technical}",
                RelatedAnswerIds = analyzed.Where(a => a.TechnicalKnowledgeScore.HasValue).Select(a => a.Id).ToList()
            });
        }
        if (cat.Relevance is >= StrengthThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Relevance",
                Description = "Câu trả lời nhìn chung bám sát câu hỏi.",
                Evidence = $"Relevance ≈ {cat.Relevance}"
            });
        }
        if (list.Count == 0 && analyzed.Count > 0)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "General",
                Description = "Không đủ dữ liệu vượt ngưỡng để xác định điểm mạnh nổi bật. Hãy luyện thêm với câu trả lời cụ thể hơn.",
                Evidence = null
            });
        }
        return list;
    }

    private static List<FeedbackItemDto> BuildWeaknesses(CategoryScoresDto cat, List<InterviewAnswer> analyzed)
    {
        var list = new List<FeedbackItemDto>();
        var missingResult = analyzed.Where(a => a.StarHasResult == false).ToList();
        if (missingResult.Count > 0)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "STAR",
                Description = "Thiếu Result đo lường được ở một số câu hành vi/kinh nghiệm.",
                Evidence = $"{missingResult.Count} câu thiếu Result",
                RelatedAnswerIds = missingResult.Select(a => a.Id).ToList()
            });
        }
        if (cat.Technical is < WeakThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Technical Knowledge",
                Description = "Điểm technical trung bình thấp trên các câu technical đã phân tích.",
                Evidence = $"Technical ≈ {cat.Technical}",
                RelatedAnswerIds = analyzed.Where(a => a.TechnicalKnowledgeScore.HasValue).Select(a => a.Id).ToList()
            });
        }
        if (cat.Communication is < WeakThreshold)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "Communication",
                Description = "Giao tiếp còn hạn chế — cần cấu trúc rõ và ngắn gọn hơn.",
                Evidence = $"Communication ≈ {cat.Communication}",
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
                Description = "Một số câu trả lời thiếu bằng chứng cụ thể (action/result/metric) — không đồng nghĩa CV giả.",
                Evidence = $"{gapAnswers.Count} câu Weak/Missing Evidence",
                RelatedAnswerIds = gapAnswers.Select(a => a.Id).ToList()
            });
        }
        var inconsistent = analyzed.Where(a => a.EvidenceStatus == EvidenceStatus.CvInconsistency).ToList();
        if (inconsistent.Count > 0)
        {
            list.Add(new FeedbackItemDto
            {
                Area = "CV Consistency",
                Description = "Có mâu thuẫn rõ với thông tin hồ sơ đã lưu — cần làm rõ trong lần luyện tiếp theo.",
                Evidence = $"{inconsistent.Count} câu CvInconsistency",
                RelatedAnswerIds = inconsistent.Select(a => a.Id).ToList()
            });
        }
        return list;
    }

    private static List<SkillGapDto> BuildSkillGaps(CategoryScoresDto cat)
    {
        var gaps = new List<SkillGapDto>();
        void Add(string area, int? score, string desc)
        {
            if (score is < WeakThreshold)
                gaps.Add(new SkillGapDto { Area = area, Score = score, Description = desc });
        }
        Add("Communication", cat.Communication, "Cần cải thiện độ rõ ràng và cấu trúc câu trả lời.");
        Add("STAR", cat.Star, "Cần luyện Situation → Task → Action → Result đầy đủ hơn.");
        Add("Technical Knowledge", cat.Technical, "Cần củng cố kiến thức kỹ thuật liên quan vị trí.");
        Add("Problem Solving", cat.ProblemSolving, "Cần trình bày rõ hơn cách phân tích và trade-off.");
        Add("Completeness", cat.Completeness, "Câu trả lời còn thiếu thông tin cần thiết.");
        return gaps;
    }

    private static List<EvidenceGapItemDto> BuildEvidenceGaps(List<InterviewAnswer> analyzed)
    {
        return analyzed
            .Where(a => a.EvidenceStatus is EvidenceStatus.MissingEvidence or EvidenceStatus.WeakEvidence
                or EvidenceStatus.NeedsValidation or EvidenceStatus.CvInconsistency)
            .Select(a =>
            {
                var gap = a.EvidenceStatus switch
                {
                    EvidenceStatus.MissingEvidence => "Thiếu bằng chứng cụ thể để chứng minh claim.",
                    EvidenceStatus.WeakEvidence => "Có đề cập trải nghiệm nhưng thiếu action/result/metric.",
                    EvidenceStatus.NeedsValidation => "Thông tin cần thẩm định thêm so với hồ sơ.",
                    EvidenceStatus.CvInconsistency => "Mâu thuẫn với dữ liệu Career Profile/CV đã biết.",
                    _ => "Cần bổ sung evidence."
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
                            suggestion = "Bổ sung: " + string.Join(", ", parts);
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

    private static AnswerHighlightsDto BuildHighlights(List<(InterviewAnswer Answer, int? Composite)> perAnswer)
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
                .Select(x => Map(x, "Câu trả lời mạnh")).ToList(),
            Weak = ordered.Where(x => x.Composite is < WeakThreshold).Take(3)
                .Select(x => Map(x, "Câu trả lời yếu — cần cải thiện")).ToList(),
            NeedsImprovement = ordered
                .Where(x => x.Composite is >= WeakThreshold and < StrengthThreshold)
                .Take(3)
                .Select(x => Map(x, "Có thể cải thiện thêm")).ToList()
        };
    }

    private static string BuildCvConsistencySummary(List<InterviewAnswer> analyzed, int? avg)
    {
        if (analyzed.Any(a => a.EvidenceStatus == EvidenceStatus.CvInconsistency))
            return "Potential inconsistency — có mâu thuẫn rõ với hồ sơ; cần làm rõ (không suy diễn fake CV từ MissingEvidence).";
        if (analyzed.Any(a => a.EvidenceStatus == EvidenceStatus.NeedsValidation))
            return "Needs Validation — một số claim cần thẩm định thêm với CV/profile.";
        if (avg is >= 70)
            return "Consistent — câu trả lời nhìn chung nhất quán với hồ sơ.";
        if (avg == null && analyzed.Count == 0)
            return "Không đủ dữ liệu để đánh giá CV consistency.";
        return "Không đủ bằng chứng rõ ràng — ưu tiên bổ sung evidence thay vì kết luận không trung thực.";
    }

    private static List<string> BuildImprovements(
        List<FeedbackItemDto> weaknesses,
        List<EvidenceGapItemDto> gaps,
        CategoryScoresDto cat)
    {
        var list = new List<string>();
        if (gaps.Any(g => g.Status is EvidenceStatus.MissingEvidence or EvidenceStatus.WeakEvidence))
            list.Add("Thêm action cụ thể + kết quả đo được (%, thời gian, phạm vi) vào mỗi câu trả lời.");
        if (weaknesses.Any(w => w.Area == "STAR"))
            list.Add("Luyện STAR đầy đủ: Situation → Task → Action → Result cho câu hành vi.");
        if (cat.Technical is < WeakThreshold)
            list.Add("Ôn kiến thức kỹ thuật liên quan JD/vị trí và giải thích trade-off rõ hơn.");
        if (cat.Communication is < WeakThreshold)
            list.Add("Rút gọn câu trả lời, dùng cấu trúc 3–4 câu rõ ràng trước khi đào sâu.");
        if (list.Count == 0)
            list.Add("Tiếp tục luyện với Active CV và JD cụ thể để giữ phong độ.");
        return list;
    }

    private static string BuildDeterministicSummary(
        int? overall,
        List<FeedbackItemDto> strengths,
        List<FeedbackItemDto> weaknesses,
        int evidenceGapCount)
    {
        var scorePart = overall.HasValue ? $"Điểm tổng hợp từ phân tích câu trả lời: {overall}/100. " : "";
        var sPart = strengths.Count > 0 ? $"Điểm mạnh nổi bật: {string.Join(", ", strengths.Select(x => x.Area))}. " : "";
        var wPart = weaknesses.Count > 0 ? $"Cần cải thiện: {string.Join(", ", weaknesses.Select(x => x.Area))}. " : "";
        var ePart = evidenceGapCount > 0
            ? $"Có {evidenceGapCount} điểm evidence cần bổ sung (không kết luận CV giả)."
            : "Evidence nhìn chung ổn.";
        return scorePart + sPart + wPart + ePart;
    }
}

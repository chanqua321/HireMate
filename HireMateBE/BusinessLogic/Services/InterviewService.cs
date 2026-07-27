using BusinessLogic.Ai;
using BusinessLogic.Base;
using BusinessLogic.IServices;
using Common;
using Common.DTOs.InterviewDto;
using Common.DTOs.PublicDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace BusinessLogic.Services;

public class InterviewService(
    UserManager<UserAccount> userManager,
    IUnitOfWork unitOfWork,
    IAiClient aiClient) : IInterviewService
{
    private const int FreeMonthlyLimit = 3;
    private readonly UserManager<UserAccount> _userManager = userManager;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly IAiClient _ai = aiClient;

    public async Task<IServiceResult> CreateSessionAsync(Guid userId, CreateInterviewSessionDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng hoàn thành onboarding trước khi bắt đầu phỏng vấn");

        if (dto.Mode.Equals("Voice", StringComparison.OrdinalIgnoreCase) && !user.IsPremium)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Chế độ giọng nói yêu cầu gói Premium");

        if (!user.IsPremium)
        {
            var used = await CountCompletedThisMonthAsync(userId);
            if (used >= FreeMonthlyLimit)
                return new ServiceResult(Const.FAIL_QUOTA_CODE, Const.FAIL_QUOTA_MSG);
        }

        var session = new InterviewSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Industry = dto.Industry,
            Position = dto.Position,
            Difficulty = string.IsNullOrWhiteSpace(dto.Difficulty) ? "Medium" : dto.Difficulty,
            Mode = string.IsNullOrWhiteSpace(dto.Mode) ? "Text" : dto.Mode,
            Status = "Setup",
            QuestionCount = dto.QuestionCount <= 0 ? 5 : dto.QuestionCount,
            StartedAt = DateTime.UtcNow
        };

        await _unitOfWork.InterviewSessionRepository.CreateAsync(session);
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_CREATE_CODE, Const.SUCCESS_CREATE_MSG, MapSummary(session));
    }

    public async Task<IServiceResult> GetQuestionsAsync(Guid userId, Guid sessionId)
    {
        var session = await GetOwnedSessionAsync(userId, sessionId);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        if (session.Status is "Completed" or "Abandoned")
            return new ServiceResult(Const.FAIL_READ_CODE, "Phiên phỏng vấn đã kết thúc");

        var existing = await _unitOfWork.InterviewAnswerRepository.GetQueryable()
            .AsNoTracking()
            .Where(a => a.SessionId == sessionId)
            .OrderBy(a => a.OrderIndex)
            .ToListAsync();

        if (existing.Count > 0)
        {
            var reuse = existing.Select(a => new InterviewQuestionDto
            {
                QuestionId = a.QuestionId ?? Guid.Empty,
                OrderIndex = a.OrderIndex,
                Content = a.QuestionText,
                Hint = null,
                Category = string.Empty
            }).ToList();
            return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, reuse);
        }

        var picked = await PickQuestionsAsync(session.Industry, session.Position, session.Difficulty, session.QuestionCount);
        if (picked.Count == 0)
            return new ServiceResult(Const.FAIL_READ_CODE, "Ngân hàng câu hỏi hiện không có dữ liệu");

        var result = new List<InterviewQuestionDto>();
        for (var i = 0; i < picked.Count; i++)
        {
            var q = picked[i];
            var answer = new InterviewAnswer
            {
                Id = Guid.NewGuid(),
                SessionId = session.Id,
                QuestionId = q.Id,
                OrderIndex = i,
                QuestionText = q.Content,
                Skipped = false,
                DurationSec = 0
            };
            await _unitOfWork.InterviewAnswerRepository.CreateAsync(answer);
            result.Add(new InterviewQuestionDto
            {
                QuestionId = q.Id,
                OrderIndex = i,
                Content = q.Content,
                Hint = q.Hint,
                Category = q.Category
            });
        }

        session.Status = "InProgress";
        session.QuestionCount = picked.Count;
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, result);
    }

    public async Task<IServiceResult> SubmitAnswerAsync(Guid userId, Guid sessionId, SubmitAnswerDto dto)
    {
        var session = await GetOwnedSessionAsync(userId, sessionId);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        if (session.Status is "Completed" or "Abandoned")
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Phiên phỏng vấn đã kết thúc");

        if (session.Status == "Setup")
            session.Status = "InProgress";

        var answer = await _unitOfWork.InterviewAnswerRepository.GetQueryable()
            .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.OrderIndex == dto.OrderIndex);

        if (answer == null)
        {
            answer = new InterviewAnswer
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                QuestionId = dto.QuestionId,
                OrderIndex = dto.OrderIndex,
                QuestionText = dto.QuestionText ?? string.Empty
            };
            await _unitOfWork.InterviewAnswerRepository.CreateAsync(answer);
        }

        answer.QuestionId ??= dto.QuestionId;
        if (!string.IsNullOrWhiteSpace(dto.QuestionText))
            answer.QuestionText = dto.QuestionText;
        answer.AnswerText = dto.AnswerText;
        answer.Skipped = dto.Skipped || string.IsNullOrWhiteSpace(dto.AnswerText);
        answer.DurationSec = Math.Max(0, dto.DurationSec);

        await _unitOfWork.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, new
        {
            answer.OrderIndex,
            answer.Skipped,
            answer.DurationSec
        });
    }

    public async Task<IServiceResult> CompleteAsync(Guid userId, Guid sessionId)
    {
        var session = await GetOwnedSessionAsync(userId, sessionId, includeAnswers: true);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        if (session.Status == "Completed")
            return new ServiceResult(Const.SUCCESS_READ_CODE, "Đã hoàn thành", MapDetail(session));

        var answers = session.Answers.OrderBy(a => a.OrderIndex).ToList();
        if (answers.Count == 0)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Chưa có câu trả lời để chấm điểm");

        var score = await ScoreWithAiOrHeuristicAsync(answers, session.Position, session.Industry);
        session.OverallScore = score.Overall;
        session.ScoreS = score.S;
        session.ScoreT = score.T;
        session.ScoreA = score.A;
        session.ScoreR = score.R;
        session.ClarityScore = score.Clarity;
        session.FeedbackSummary = score.FeedbackSummary;
        session.Status = "Completed";
        session.CompletedAt = DateTime.UtcNow;

        var memory = new CareerMemoryEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = "InterviewCompleted",
            RefId = session.Id,
            PayloadJson = JsonSerializer.Serialize(new
            {
                session.OverallScore,
                session.Position,
                session.Industry,
                session.ScoreS,
                session.ScoreT,
                session.ScoreA,
                session.ScoreR,
                session.ClarityScore
            }),
            CreatedAt = DateTime.UtcNow
        };
        await _unitOfWork.CareerMemoryEventRepository.CreateAsync(memory);
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Hoàn thành phỏng vấn", MapDetail(session));
    }

    public async Task<IServiceResult> GetHistoryAsync(Guid userId)
    {
        var list = await _unitOfWork.InterviewSessionRepository.GetQueryable()
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.StartedAt)
            .Take(50)
            .ToListAsync();

        var data = list.Select(MapSummary).ToList();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, data);
    }

    public async Task<IServiceResult> GetDetailAsync(Guid userId, Guid sessionId)
    {
        var session = await GetOwnedSessionAsync(userId, sessionId, includeAnswers: true, asNoTracking: true);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, MapDetail(session));
    }

    public async Task<IServiceResult> SuggestedAnswerAsync(Guid userId, SuggestedAnswerDto dto)
    {
        var ai = await _ai.CompleteAsync(
            "Write a strong STAR sample answer in Vietnamese.",
            $"Question: {dto.QuestionText}\nUser draft: {dto.UserAnswer}\nsuggested mẫu star");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            suggestedAnswer = ai.Content,
            provider = ai.Provider,
            usedFallback = ai.UsedFallback
        });
    }

    public async Task<IServiceResult> UploadVoiceAsync(Guid userId, Guid sessionId, Stream audio, string fileName)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || !user.IsPremium)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Tải lên giọng nói yêu cầu gói Premium");

        var session = await GetOwnedSessionAsync(userId, sessionId);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        // STT chưa sẵn sàng — không trả transcript giả
        return new ServiceResult(Const.FAIL_CREATE_CODE,
            "Chuyển giọng nói thành văn bản chưa được cấu hình. Vui lòng dùng chế độ văn bản.");
    }

    public async Task<IServiceResult> GetQuestionBankAsync()
    {
        var list = await _unitOfWork.QuestionRepository.GetQueryable()
            .AsNoTracking()
            .Where(q => q.IsActive)
            .OrderBy(q => q.Category)
            .ThenBy(q => q.Content)
            .Select(q => new
            {
                id = q.Id,
                cat = q.Category,
                q = q.Content,
                hint = q.Hint ?? string.Empty,
                industry = q.Industry,
                difficulty = q.Difficulty
            })
            .ToListAsync();

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    private async Task<(int Overall, int S, int T, int A, int R, int Clarity, string FeedbackSummary)> ScoreWithAiOrHeuristicAsync(
        List<InterviewAnswer> answers,
        string position,
        string industry)
    {
        try
        {
            var payload = string.Join("\n---\n", answers.Select(a =>
                $"Q{a.OrderIndex}: {a.QuestionText}\nA: {(a.Skipped ? "[skipped]" : a.AnswerText)}"));
            var ai = await _ai.CompleteAsync(
                "You are an interview coach. Score STAR answers. Return JSON only with keys: overall,s,t,a,r,clarity (ints 0-100), feedback (Vietnamese string).",
                $"Position: {position}\nIndustry: {industry}\nAnswers:\n{payload}");

            if (!ai.UsedFallback && !string.IsNullOrWhiteSpace(ai.Content))
            {
                var json = ExtractJsonObject(ai.Content);
                if (json != null)
                {
                    using var doc = JsonDocument.Parse(json);
                    var root = doc.RootElement;
                    int Get(string key, string alt)
                    {
                        if (root.TryGetProperty(key, out var v) && v.TryGetInt32(out var n)) return ClampInt(n);
                        if (root.TryGetProperty(alt, out var v2) && v2.TryGetInt32(out var n2)) return ClampInt(n2);
                        return -1;
                    }
                    var s = Get("s", "S");
                    var t = Get("t", "T");
                    var a = Get("a", "A");
                    var r = Get("r", "R");
                    var clarity = Get("clarity", "Clarity");
                    var overall = Get("overall", "Overall");
                    var feedback = root.TryGetProperty("feedback", out var fb) ? fb.GetString() : null;
                    if (s >= 0 && t >= 0 && a >= 0 && r >= 0 && clarity >= 0)
                    {
                        if (overall < 0)
                            overall = (int)Math.Round((s + t + a + r + clarity) / 5.0);
                        return (overall, s, t, a, r, clarity,
                            string.IsNullOrWhiteSpace(feedback)
                                ? StarHeuristicScorer.BuildFeedback(overall)
                                : feedback!);
                    }
                }
            }
        }
        catch
        {
            // fall through to deterministic heuristic
        }

        return StarHeuristicScorer.Score(answers);
    }

    private static string? ExtractJsonObject(string content)
    {
        var start = content.IndexOf('{');
        var end = content.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        return content[start..(end + 1)];
    }

    private static int ClampInt(int n) => Math.Max(0, Math.Min(100, n));

    private async Task<int> CountCompletedThisMonthAsync(Guid userId)
    {
        var start = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return await _unitOfWork.InterviewSessionRepository.GetQueryable()
            .AsNoTracking()
            .CountAsync(s => s.UserId == userId
                && s.Status == "Completed"
                && s.CompletedAt != null
                && s.CompletedAt >= start);
    }

    private async Task<InterviewSession?> GetOwnedSessionAsync(
        Guid userId,
        Guid sessionId,
        bool includeAnswers = false,
        bool asNoTracking = false)
    {
        IQueryable<InterviewSession> query = _unitOfWork.InterviewSessionRepository.GetQueryable();
        if (asNoTracking)
            query = query.AsNoTracking();
        if (includeAnswers)
            query = query.Include(s => s.Answers);

        return await query.FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);
    }

    private async Task<List<Question>> PickQuestionsAsync(
        string industry,
        string position,
        string difficulty,
        int count)
    {
        var all = await _unitOfWork.QuestionRepository.GetQueryable()
            .AsNoTracking()
            .Where(q => q.IsActive)
            .ToListAsync();

        var roleMatched = all.Where(q =>
                (!string.IsNullOrEmpty(q.RoleHint) && position.Contains(q.RoleHint, StringComparison.OrdinalIgnoreCase))
                || (!string.IsNullOrEmpty(q.RoleHint) && q.RoleHint.Contains(MapRoleHint(position), StringComparison.OrdinalIgnoreCase))
                || CategoryMatchesPosition(q.Category, position))
            .ToList();

        var industryMatched = all.Where(q =>
                string.Equals(q.Industry, industry, StringComparison.OrdinalIgnoreCase)
                || q.Category.Equals("Hành vi (HR)", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var pool = roleMatched.Count >= count ? roleMatched
            : industryMatched.Count >= count ? industryMatched
            : all;

        var difficultyFiltered = pool
            .Where(q => string.Equals(q.Difficulty, difficulty, StringComparison.OrdinalIgnoreCase)
                        || q.Difficulty == "Medium"
                        || q.Category == "Hành vi (HR)")
            .ToList();

        if (difficultyFiltered.Count >= count)
            pool = difficultyFiltered;

        return pool.OrderBy(_ => Guid.NewGuid()).Take(count).ToList();
    }

    private static string MapRoleHint(string position)
    {
        if (position.Contains("Frontend", StringComparison.OrdinalIgnoreCase)) return "Frontend";
        if (position.Contains("Backend", StringComparison.OrdinalIgnoreCase)) return "Backend";
        if (position.Contains("Fullstack", StringComparison.OrdinalIgnoreCase)) return "Fullstack";
        if (position.Contains("DevOps", StringComparison.OrdinalIgnoreCase)) return "DevOps";
        if (position.Contains("QA", StringComparison.OrdinalIgnoreCase) || position.Contains("Kiểm thử", StringComparison.OrdinalIgnoreCase)) return "QA";
        if (position.Contains("Dữ liệu", StringComparison.OrdinalIgnoreCase) || position.Contains("Data", StringComparison.OrdinalIgnoreCase)) return "Data";
        if (position.Contains("UI/UX", StringComparison.OrdinalIgnoreCase) || position.Contains("Thiết kế", StringComparison.OrdinalIgnoreCase)) return "UI/UX";
        if (position.Contains("Marketing", StringComparison.OrdinalIgnoreCase) || position.Contains("Tiếp thị", StringComparison.OrdinalIgnoreCase)) return "Marketing";
        if (position.Contains("Nhân sự", StringComparison.OrdinalIgnoreCase)) return "Nhân sự";
        if (position.Contains("Kế toán", StringComparison.OrdinalIgnoreCase)) return "Kế toán";
        if (position.Contains("Kinh doanh", StringComparison.OrdinalIgnoreCase)) return "Kinh doanh";
        if (position.Contains("sản phẩm", StringComparison.OrdinalIgnoreCase)) return "Quản lý sản phẩm";
        if (position.Contains("dự án", StringComparison.OrdinalIgnoreCase)) return "Quản lý dự án";
        if (position.Contains("khách hàng", StringComparison.OrdinalIgnoreCase)) return "Chăm sóc khách hàng";
        if (position.Contains("Phân tích Kinh doanh", StringComparison.OrdinalIgnoreCase) || position.Contains("Business", StringComparison.OrdinalIgnoreCase)) return "Phân tích Kinh doanh";
        return position;
    }

    private static bool CategoryMatchesPosition(string category, string position)
    {
        var hint = MapRoleHint(position);
        return category.Contains(hint, StringComparison.OrdinalIgnoreCase)
               || hint.Contains(category, StringComparison.OrdinalIgnoreCase);
    }

    private static InterviewSessionSummaryDto MapSummary(InterviewSession s) => new()
    {
        Id = s.Id,
        Industry = s.Industry,
        Position = s.Position,
        Difficulty = s.Difficulty,
        Mode = s.Mode,
        Status = s.Status,
        OverallScore = s.OverallScore,
        StartedAt = s.StartedAt,
        CompletedAt = s.CompletedAt
    };

    private static InterviewSessionDetailDto MapDetail(InterviewSession s)
    {
        var dto = new InterviewSessionDetailDto
        {
            Id = s.Id,
            Industry = s.Industry,
            Position = s.Position,
            Difficulty = s.Difficulty,
            Mode = s.Mode,
            Status = s.Status,
            OverallScore = s.OverallScore,
            StartedAt = s.StartedAt,
            CompletedAt = s.CompletedAt,
            ScoreS = s.ScoreS,
            ScoreT = s.ScoreT,
            ScoreA = s.ScoreA,
            ScoreR = s.ScoreR,
            ClarityScore = s.ClarityScore,
            FeedbackSummary = s.FeedbackSummary,
            Answers = s.Answers.OrderBy(a => a.OrderIndex).Select(a => new InterviewAnswerViewDto
            {
                OrderIndex = a.OrderIndex,
                QuestionId = a.QuestionId,
                QuestionText = a.QuestionText,
                AnswerText = a.AnswerText,
                Skipped = a.Skipped,
                DurationSec = a.DurationSec
            }).ToList()
        };
        return dto;
    }
}

public static class StarHeuristicScorer
{
    public static (int Overall, int S, int T, int A, int R, int Clarity, string FeedbackSummary) Score(
        IReadOnlyList<InterviewAnswer> answers)
    {
        var total = Math.Max(1, answers.Count);
        var answered = answers.Where(a => !a.Skipped && !string.IsNullOrWhiteSpace(a.AnswerText)).ToList();
        var texts = answered.Select(a => a.AnswerText!.ToLowerInvariant()).ToList();
        var joined = string.Join(" ", texts);
        var avgLen = texts.Count > 0 ? texts.Average(t => t.Length) : 0;
        var completion = answered.Count / (double)total;

        var s = ScoreDimension(joined, avgLen, completion, ["bối cảnh", "situation", "khi đó", "thời điểm", "trong dự án", "lúc đó"], 4);
        var t = ScoreDimension(joined, avgLen, completion, ["nhiệm vụ", "task", "trách nhiệm", "mục tiêu", "yêu cầu", "được giao"], 2);
        var a = ScoreDimension(joined, avgLen, completion, ["hành động", "action", "tôi đã", "thực hiện", "triển khai", "xử lý", "phối hợp"], -2);
        var r = ScoreDimension(joined, avgLen, completion, ["kết quả", "result", "đạt", "cải thiện", "%", "tăng", "giảm", "hoàn thành"], -4);
        var clarity = ScoreClarity(texts, avgLen, completion);
        var overall = (int)Math.Round((s + t + a + r + clarity) / 5.0);

        return (overall, s, t, a, r, clarity, BuildFeedback(overall));
    }

    public static string BuildFeedback(int overall) =>
        overall >= 80
            ? "Kết quả xuất sắc! Bạn đã thể hiện rất tốt theo cấu trúc STAR."
            : overall >= 65
                ? "Khá tốt. Hãy bổ sung thêm chi tiết Action và Result để tăng điểm."
                : "Cần cải thiện. Trả lời đầy đủ hơn theo Situation → Task → Action → Result.";

    private static int ScoreDimension(string joined, double avgLen, double completion, string[] keywords, double bias)
    {
        var hits = keywords.Count(k => joined.Contains(k, StringComparison.Ordinal));
        var baseScore = 32 + avgLen / 7.0 + completion * 26 + hits * 6 + bias;
        return (int)Math.Round(Clamp(baseScore, 12, 98));
    }

    private static int ScoreClarity(List<string> texts, double avgLen, double completion)
    {
        if (texts.Count == 0) return 20;
        var sentenceish = texts.Average(t => t.Count(c => c is '.' or '!' or '?' or '\n') + 1);
        var baseScore = 36 + avgLen / 8.0 + completion * 22 + Math.Min(12, sentenceish * 2);
        return (int)Math.Round(Clamp(baseScore, 12, 98));
    }

    private static double Clamp(double n, double lo, double hi) => Math.Max(lo, Math.Min(hi, n));
}

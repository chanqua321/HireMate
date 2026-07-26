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
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "User not found");

        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Complete onboarding before starting an interview");

        if (dto.Mode.Equals("Voice", StringComparison.OrdinalIgnoreCase) && !user.IsPremium)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Voice mode requires Premium");

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
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Session not found");

        if (session.Status is "Completed" or "Abandoned")
            return new ServiceResult(Const.FAIL_READ_CODE, "Session already finished");

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
            return new ServiceResult(Const.FAIL_READ_CODE, "No questions available in bank");

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
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Session not found");

        if (session.Status is "Completed" or "Abandoned")
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Session already finished");

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
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Session not found");

        if (session.Status == "Completed")
            return new ServiceResult(Const.SUCCESS_READ_CODE, "Already completed", MapDetail(session));

        var answers = session.Answers.OrderBy(a => a.OrderIndex).ToList();
        if (answers.Count == 0)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "No answers to score");

        var score = StarHeuristicScorer.Score(answers);
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

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Interview completed", MapDetail(session));
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
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Session not found");

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
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Voice upload requires Premium");

        var session = await GetOwnedSessionAsync(userId, sessionId);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Session not found");

        // Stub transcript until local STT is wired
        var transcript = $"[Voice stub transcript from {fileName}] Em đã phân tích tình huống, thực hiện hành động và đạt kết quả đo được.";
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Voice received (stub transcript)", new
        {
            sessionId,
            fileName,
            transcript,
            note = "Replace with local STT later"
        });
    }

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
        var answered = answers.Where(a => !string.IsNullOrWhiteSpace(a.AnswerText)).ToList();
        var avgLen = answered.Count > 0
            ? answered.Average(a => a.AnswerText!.Length)
            : 0;
        var completion = answers.Count(a => !a.Skipped && !string.IsNullOrWhiteSpace(a.AnswerText)) / (double)total;
        var baseScore = Clamp(38 + avgLen / 6.0 + completion * 28, 20, 96);

        var rnd = new Random(HashCode.Combine(answers.Count, (int)avgLen, answered.Count));
        int Jitter(double b, double spread) =>
            (int)Math.Round(Clamp(b + (rnd.NextDouble() * spread - spread / 2), 12, 98));

        var s = Jitter(baseScore + 6, 14);
        var t = Jitter(baseScore + 3, 14);
        var a = Jitter(baseScore - 6, 18);
        var r = Jitter(baseScore - 9, 18);
        var clarity = Jitter(baseScore, 12);
        var overall = (int)Math.Round((s + t + a + r + clarity) / 5.0);

        var feedback = overall >= 80
            ? "Kết quả xuất sắc! Bạn đã thể hiện rất tốt theo cấu trúc STAR."
            : overall >= 65
                ? "Khá tốt. Hãy bổ sung thêm chi tiết Action và Result để tăng điểm."
                : "Cần cải thiện. Trả lời đầy đủ hơn theo Situation → Task → Action → Result.";

        return (overall, s, t, a, r, clarity, feedback);
    }

    private static double Clamp(double n, double lo, double hi) => Math.Max(lo, Math.Min(hi, n));
}

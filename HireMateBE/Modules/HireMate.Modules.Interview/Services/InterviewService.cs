using HireMate.Modules.Ai;
using HireMate.Modules.Interview.Abstractions;
using HireMate.Modules.Onboarding.Cv;
using HireMate.BuildingBlocks;

using Common;
using Common.DTOs.InterviewDto;
using Common.DTOs.OnboardingDto;
using Common.DTOs.PublicDto;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace HireMate.Modules.Interview.Services;

public class InterviewService(
    UserManager<UserAccount> userManager,
    IUnitOfWork unitOfWork,
    HireMateContext db,
    IAiQuotaService aiQuota,
    ISpeechToTextService speechToText,
    ILogger<InterviewService> logger) : IInterviewService
{
    private const int FreeMonthlyLimit = 3; // legacy alias — dùng PlanTier.MonthlyInterviewSessions
    private const long MaxVoiceAudioBytes = 10 * 1024 * 1024; // 10 MB
    private readonly UserManager<UserAccount> _userManager = userManager;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;
    private readonly HireMateContext _db = db;
    private readonly IAiQuotaService _aiQuota = aiQuota;
    private readonly ISpeechToTextService _speechToText = speechToText;
    private readonly ILogger<InterviewService> _logger = logger;

    public async Task<IServiceResult> BuildContextAsync(Guid userId, BuildInterviewContextDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng hoàn thiện hồ sơ (Confirm CV) trước khi phỏng vấn");

        var profile = await _unitOfWork.CareerProfileRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);
        var (cvStatus, cv) = await ResolveOperationCvAsync(userId, dto.CvDocumentId, profile);
        if (cvStatus == OpCvStatus.NotFound)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");
        if (cvStatus == OpCvStatus.ActiveRequired)
            return ActiveCvRequiredResult("Hãy kích hoạt một CV trước khi phỏng vấn.");
        if (cv == null)
            return await CvInterviewGateFailAsync(userId, "Cần CV đã phân tích thành công làm ngữ cảnh phỏng vấn");

        var cvFacts = ReadCvInterviewFacts(cv);
        var position = FirstAvailable(dto.Position, cvFacts.Position, profile?.DesiredPosition);
        var industry = FirstAvailable(profile?.DesiredIndustry, cvFacts.Industry, dto.Industry);
        var roleError = ValidateRole(industry, position);
        if (roleError != null) return roleError;
        var jdText = await ResolveJdTextAsync(userId, dto.JobDescriptionId, dto.JobDescription);
        if (dto.JobDescriptionId.HasValue && jdText == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy JD");
        if (CvLanguage.Resolve(dto.Language, cv.ExtractedText, jdText) == null)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Không xác định được ngôn ngữ CV/JD. Vui lòng chọn tiếng Việt hoặc English.");
        var context = await BuildPersonalizedProfileAsync(user, profile, cv, position, industry, jdText, dto.JobDescriptionId, dto.Language);
        // Không trừ interview quota; không gọi AI (heuristic) — không trừ AI char
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, context);
    }

    public async Task<IServiceResult> CreateSessionAsync(Guid userId, CreateInterviewSessionDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng hoàn thiện hồ sơ (cần CV) trước khi bắt đầu phỏng vấn");
        if (user.PlanSelectedAt == null)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng chọn gói trước khi bắt đầu phỏng vấn");

        await _aiQuota.RefreshExpiryAsync(user);

        var mode = string.IsNullOrWhiteSpace(dto.Mode) ? "Text" : dto.Mode.Trim();
        var isVoice = mode.Equals("Voice", StringComparison.OrdinalIgnoreCase);
        if (isVoice)
            mode = "Voice";
        else
            mode = "Text";

        if (isVoice)
        {
            if (!await _aiQuota.IsVoiceAllowedAsync(user))
            {
                return new ServiceResult(Const.FAIL_QUOTA_CODE,
                    "VOICE_NOT_ENTITLED: Voice Interview chỉ dành cho gói Tiêu chuẩn và Cao cấp.",
                    new { errorCode = "VOICE_NOT_ENTITLED" });
            }
        }

        var planCode = await _aiQuota.GetEffectivePlanCodeAsync(user);

        // CV ownership / Active resolution BEFORE interview quota consumption.
        var profile = await _unitOfWork.CareerProfileRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);
        var (cvStatus, cv) = await ResolveOperationCvAsync(userId, dto.CvDocumentId, profile);
        if (cvStatus == OpCvStatus.NotFound)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");
        if (cvStatus == OpCvStatus.ActiveRequired)
            return ActiveCvRequiredResult("Hãy kích hoạt một CV trước khi luyện phỏng vấn.");
        if (cv == null)
            return await CvInterviewGateFailAsync(userId, "Cần CV đã phân tích thành công trước khi luyện phỏng vấn");

        var qCount = dto.QuestionCount is int qc and > 0
            ? Math.Clamp(qc, 3, PlanTier.QuestionsPerSession(planCode))
            : PlanTier.QuestionsPerSession(planCode);

        var cvFacts = ReadCvInterviewFacts(cv);
        var industry = FirstAvailable(profile?.DesiredIndustry, cvFacts.Industry, dto.Industry);
        var position = FirstAvailable(dto.Position, cvFacts.Position, profile?.DesiredPosition);
        var roleError = ValidateRole(industry, position);
        if (roleError != null) return roleError;

        var jdText = await ResolveJdTextAsync(userId, dto.JobDescriptionId, dto.JobDescription);
        if (dto.JobDescriptionId.HasValue && jdText == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy JD");

        // Validate owned CV/JD and normalized input before consuming a session.
        if (CvLanguage.Resolve(dto.Language, cv.ExtractedText, jdText) == null)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Không xác định được ngôn ngữ CV/JD. Vui lòng chọn tiếng Việt hoặc English.");
        // Rebuild from the resolved CV: a stale client context may describe another CV/role.
        var contextObj = await BuildPersonalizedProfileAsync(user, profile, cv, position, industry, jdText, dto.JobDescriptionId, dto.Language);
        if (!isVoice)
        {
            var consumeBlock = await _aiQuota.TryConsumeFeatureAsync(user, AiQuotaFeature.Interview);
            if (consumeBlock != null) return consumeBlock;
        }

        var session = new InterviewSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Industry = industry,
            Position = position,
            Difficulty = "Personalized",
            Mode = mode,
            Status = "Setup",
            QuestionCount = qCount,
            StartedAt = DateTime.UtcNow,
            // Voice: quota consumed only when VoiceStartedAt is set (StartVoice).
            VoiceStartedAt = null,
            FeedbackSummary = Truncate($"JD:{(jdText ?? "").Trim()}", 2000)
        };

        try
        {
            await _unitOfWork.InterviewSessionRepository.CreateAsync(session);
            await _unitOfWork.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                EventType = CareerMemoryTypes.InterviewContext,
                RefId = session.Id,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    position,
                    industry,
                    jobDescription = jdText,
                    jobDescriptionId = dto.JobDescriptionId,
                    cvDocumentId = cv.Id,
                    context = contextObj
                }),
                CreatedAt = DateTime.UtcNow
            });
            await _unitOfWork.SaveChangesAsync();
        }
        catch
        {
            if (!isVoice)
                await _aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.Interview);
            throw;
        }

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
            var pending = existing.FirstOrDefault(a => !a.Skipped && string.IsNullOrWhiteSpace(a.AnswerText));
            var pendingCategory = pending == null ? string.Empty : await ResolveQuestionCategoryAsync(pending);
            var reuse = pending == null ? new List<InterviewQuestionDto>() : new List<InterviewQuestionDto> { new()
            {
                QuestionId = pending.QuestionId ?? Guid.Empty,
                OrderIndex = pending.OrderIndex,
                Content = pending.QuestionText,
                Hint = null,
                Category = pendingCategory
            } };
            return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, reuse);
        }

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var contextJson = await LoadContextPayloadAsync(userId, sessionId);
        var language = ReadContextLanguage(contextJson);
        if (language == null)
            return new ServiceResult(Const.FAIL_READ_CODE, "Thiếu ngôn ngữ phỏng vấn; vui lòng chọn lại ngôn ngữ ở bước thiết lập.");
        var previouslyAsked = ReadPreviousQuestions(contextJson);
        // Bank is the first candidate source; AI fills only the remaining slots.
        var generated = new List<InterviewQuestionDto>();
        var seniority = ReadContextSeniority(contextJson);
        var initialBank = await PickQuestionsAsync(session.Industry, session.Position,
            session.QuestionCount, language, seniority, userId);
        generated.AddRange(initialBank.Where(q => previouslyAsked.All(previous => !SameQuestion(previous, q.Content)))
            .Select((q, i) => new InterviewQuestionDto
            {
                QuestionId = q.Id, OrderIndex = i, Content = q.Content,
                Hint = q.Hint, Category = q.Category
            }));
        if (generated.Count < session.QuestionCount)
            generated.AddRange((await GeneratePersonalizedQuestionsAsync(user, session, contextJson, generated))
                .Where(q => generated.All(g => !SameQuestion(g.Content, q.Content))
                    && previouslyAsked.All(previous => !SameQuestion(previous, q.Content)))
                .DistinctBy(q => string.Join(' ', q.Content.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries)))
                .Take(session.QuestionCount - generated.Count));
        if (generated.Count < session.QuestionCount)
        {
            var bank = await PickQuestionsAsync(session.Industry, session.Position, session.QuestionCount,
                language, seniority, userId);
            generated.AddRange(bank.Where(q => generated.All(g => !SameQuestion(g.Content, q.Content))
                    && previouslyAsked.All(previous => !SameQuestion(previous, q.Content)))
                .Take(session.QuestionCount - generated.Count)
                .Select(q => new InterviewQuestionDto
                {
                    QuestionId = q.Id, Content = q.Content, Hint = q.Hint, Category = q.Category
                }));
        }
        if (generated.Count < session.QuestionCount)
        {
            var additions = BuildCvAlignedFallbackQuestions(session, contextJson, language)
                .Where(q => generated.All(g => !SameQuestion(g.Content, q.Content))
                    && previouslyAsked.All(previous => !SameQuestion(previous, q.Content)))
                .Take(session.QuestionCount - generated.Count).ToList();
            generated.AddRange(additions);
        }

        if (generated.Count == 0)
            return new ServiceResult(Const.FAIL_READ_CODE, "Không tạo được câu hỏi phỏng vấn. Thử lại hoặc kiểm tra hạn mức AI.");

        var result = new List<InterviewQuestionDto>();
        for (var i = 0; i < generated.Count; i++)
        {
            var q = generated[i];
            var answer = new InterviewAnswer
            {
                Id = Guid.NewGuid(),
                SessionId = session.Id,
                QuestionId = q.QuestionId == Guid.Empty ? null : q.QuestionId,
                OrderIndex = i,
                QuestionText = q.Content,
                QuestionCategory = q.Category,
                Skipped = false,
                DurationSec = 0
            };
            await _unitOfWork.InterviewAnswerRepository.CreateAsync(answer);
            result.Add(new InterviewQuestionDto
            {
                QuestionId = answer.QuestionId ?? Guid.Empty,
                OrderIndex = i,
                Content = q.Content,
                Hint = q.Hint,
                Category = q.Category
            });
        }

        session.Status = "InProgress";
        session.QuestionCount = result.Count;
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, result.Take(1).ToList());
    }

    public async Task<IServiceResult> GetLanguageAsync(Guid userId, Guid sessionId)
    {
        var session = await GetOwnedSessionAsync(userId, sessionId);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");
        var language = ReadContextLanguage(await LoadContextPayloadAsync(userId, sessionId));
        if (language == null)
            return new ServiceResult(Const.FAIL_READ_CODE, "Phiên phỏng vấn thiếu ngôn ngữ đã chọn");
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG,
            new { language, locale = language == "en" ? "en-US" : "vi-VN" });
    }

    public async Task<IServiceResult> SubmitAnswerAsync(Guid userId, Guid sessionId, SubmitAnswerDto dto)
    {
        var session = await GetOwnedSessionAsync(userId, sessionId);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        if (session.Status is "Completed" or "Abandoned")
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Phiên phỏng vấn đã kết thúc");

        var voiceGate = EnsureVoiceSessionActive(session);
        if (voiceGate != null)
            return voiceGate;

        if (session.Status == "Setup")
            session.Status = "InProgress";

        var answer = await _unitOfWork.InterviewAnswerRepository.GetQueryable()
            .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.OrderIndex == dto.OrderIndex);

        // Idempotent: already answered → return existing analysis, do not overwrite / re-bill AI.
        if (answer != null
            && !string.IsNullOrWhiteSpace(answer.AnswerText)
            && !answer.Skipped
            && !dto.Skipped)
        {
            return await BuildAnswerSubmitResultAsync(answer, sessionId, dto.OrderIndex, idempotent: true);
        }

        if (answer == null)
        {
            answer = new InterviewAnswer
            {
                Id = Guid.NewGuid(),
                SessionId = sessionId,
                QuestionId = dto.QuestionId is { } createQid && createQid != Guid.Empty ? createQid : null,
                OrderIndex = dto.OrderIndex,
                QuestionText = dto.QuestionText ?? string.Empty,
                IsFollowUp = false
            };
            try
            {
                await _unitOfWork.InterviewAnswerRepository.CreateAsync(answer);
                await _unitOfWork.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // Concurrent create on unique (SessionId, OrderIndex) — reload and treat as idempotent if answered.
                _db.ChangeTracker.Clear();
                answer = await _unitOfWork.InterviewAnswerRepository.GetQueryable()
                    .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.OrderIndex == dto.OrderIndex);
                if (answer != null && !string.IsNullOrWhiteSpace(answer.AnswerText) && !answer.Skipped)
                    return await BuildAnswerSubmitResultAsync(answer, sessionId, dto.OrderIndex, idempotent: true);
                if (answer == null)
                    return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không thể lưu câu trả lời (xung đột). Thử lại.");
            }
        }

        // AI-generated questions use QuestionId=null; clients may send Guid.Empty — never persist Empty (FK).
        if (answer.QuestionId == null
            && dto.QuestionId is { } qid
            && qid != Guid.Empty)
        {
            answer.QuestionId = qid;
        }
        if (!string.IsNullOrWhiteSpace(dto.QuestionText))
            answer.QuestionText = dto.QuestionText;
        answer.AnswerText = dto.AnswerText;
        answer.Skipped = dto.Skipped || string.IsNullOrWhiteSpace(dto.AnswerText);
        answer.DurationSec = Math.Max(0, dto.DurationSec);

        // Persist raw answer BEFORE AI analysis (must survive AI failure)
        await _unitOfWork.SaveChangesAsync();

        AnswerAnalysisDto? analysisDto = null;
        object? followUp = null;
        InterviewQuestionDto? nextQuestion = null;
        var user = await _userManager.FindByIdAsync(userId.ToString());

        if (user != null && !answer.Skipped && !string.IsNullOrWhiteSpace(answer.AnswerText))
        {
            var category = await ResolveQuestionCategoryAsync(answer);
            answer.QuestionCategory = category;

            var profile = await _unitOfWork.CareerProfileRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(p => p.UserId == userId);
            var contextPayload = await LoadContextPayloadAsync(userId, sessionId);

            analysisDto = await AnalyzeAnswerWithAiAsync(user, session, answer, category, profile, contextPayload);
            ApplyAnalysisToAnswer(answer, analysisDto);
            await _unitOfWork.SaveChangesAsync();

            if (!answer.IsFollowUp && analysisDto.AnalysisAvailable
                && !string.IsNullOrWhiteSpace(analysisDto.NextQuestionContent))
            {
                var upcoming = await _unitOfWork.InterviewAnswerRepository.GetQueryable()
                    .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.OrderIndex == dto.OrderIndex + 1);
                if (upcoming != null && upcoming.QuestionId == null
                    && string.IsNullOrWhiteSpace(upcoming.AnswerText) && !upcoming.IsFollowUp)
                {
                    upcoming.QuestionId = null;
                    upcoming.QuestionText = Truncate(analysisDto.NextQuestionContent, 1000);
                    upcoming.QuestionCategory = "CV-based";
                    upcoming.FollowUpReason = Truncate(analysisDto.NextQuestionHint ?? string.Empty, 500);
                    await _unitOfWork.SaveChangesAsync();
                    nextQuestion = new InterviewQuestionDto
                    {
                        QuestionId = Guid.Empty,
                        OrderIndex = upcoming.OrderIndex,
                        Content = upcoming.QuestionText,
                        Category = upcoming.QuestionCategory,
                        Hint = upcoming.FollowUpReason
                    };
                }
            }

            // Max 1 follow-up per main question — never follow-up a follow-up
            if (!answer.IsFollowUp && analysisDto.NeedsFollowUp)
            {
                var nextIndex = dto.OrderIndex + 1;
                var hasNext = await _unitOfWork.InterviewAnswerRepository.GetQueryable().AsNoTracking()
                    .AnyAsync(a => a.SessionId == sessionId && a.OrderIndex == nextIndex);
                var totalPlanned = session.QuestionCount;

                if (!hasNext && nextIndex < totalPlanned + 2) // allow one adaptive slot beyond planned
                {
                    var fu = await TryGenerateFollowUpAsync(user, session, answer, analysisDto);
                    if (!string.IsNullOrWhiteSpace(fu))
                    {
                        var follow = new InterviewAnswer
                        {
                            Id = Guid.NewGuid(),
                            SessionId = sessionId,
                            OrderIndex = nextIndex,
                            QuestionText = fu,
                            // Preserve the parent rubric; IsFollowUp tracks the question's role.
                            QuestionCategory = category,
                            IsFollowUp = true,
                            Skipped = false,
                            DurationSec = 0
                        };
                        await _unitOfWork.InterviewAnswerRepository.CreateAsync(follow);
                        await _unitOfWork.SaveChangesAsync();
                        followUp = new InterviewQuestionDto
                        {
                            QuestionId = Guid.Empty,
                            OrderIndex = nextIndex,
                            Content = fu,
                            Category = "Follow-up",
                            Hint = analysisDto.FollowUpReason ?? "Cần đào sâu evidence / STAR gap"
                        };
                    }
                }
            }
        }

        var evidenceGap = analysisDto?.EvidenceGap
            ?? (!answer.Skipped && LooksLikeEvidenceGap(answer.AnswerText));

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, new
        {
            answerId = answer.Id,
            answer.OrderIndex,
            answerText = answer.AnswerText,
            answer.Skipped,
            answer.DurationSec,
            evidenceGap,
            analysisAvailable = answer.AnalysisAvailable,
            analysis = analysisDto,
            evidence = analysisDto == null ? null : new
            {
                status = analysisDto.EvidenceStatus,
                detail = analysisDto.EvidenceJson
            },
            followUp,
            nextQuestion
        });
    }

    public async Task<IServiceResult> CompleteAsync(Guid userId, Guid sessionId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var session = await GetOwnedSessionAsync(userId, sessionId, includeAnswers: true);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        if (session.Status == "Completed")
            return new ServiceResult(Const.SUCCESS_READ_CODE, "Đã hoàn thành", MapDetail(session));

        var answers = session.Answers.OrderBy(a => a.OrderIndex).ToList();
        if (answers.Count == 0)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Chưa có câu trả lời để chấm điểm");

        var feedbackLanguage = ReadContextLanguage(await LoadContextPayloadAsync(userId, sessionId));
        var structured = StructuredFeedbackBuilder.Build(session, answers, feedbackLanguage ?? "vi");
        var (s, t, a, r, clarity) = StructuredFeedbackBuilder.DeriveStarAndClarity(answers);

        // AI may write narrative only; the persisted score is always computed from
        // validated per-answer evidence and the centralized category weights.
        if (structured.OverallScore.HasValue)
        {
            await EnrichFeedbackNarrativeAsync(user, session.Id, structured, answers);
            if (structured.CoachReport is { } coachReport)
                structured.Summary = coachReport.Summary.Headline;
        }

        session.OverallScore = structured.OverallScore;
        session.ScoreS = s;
        session.ScoreT = t;
        session.ScoreA = a;
        session.ScoreR = r;
        session.ClarityScore = clarity;
        session.FeedbackSummary = Truncate(structured.Summary ?? "", 2000);
        session.StructuredFeedbackJson = JsonSerializer.Serialize(structured, FeedbackJsonOptions);
        session.Status = "Completed";
        session.CompletedAt = DateTime.UtcNow;

        // Learning signals from structured feedback (deterministic). AI narrative failure does not block this.
        await CareerMemoryLearningService.UpsertFromFeedbackAsync(_unitOfWork, userId, session, structured, answers);

        var memory = new CareerMemoryEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = CareerMemoryTypes.InterviewCompleted,
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
                session.ClarityScore,
                session.FeedbackSummary,
                strengths = structured.Strengths.Select(x => x.Area).ToList(),
                weaknesses = structured.Weaknesses.Select(x => x.Area).ToList(),
                skillGaps = structured.SkillGaps.Select(x => x.Area).ToList(),
                evidenceGaps = structured.EvidenceGaps.Count,
                readiness = session.OverallScore
            }),
            CreatedAt = DateTime.UtcNow
        };
        await _unitOfWork.CareerMemoryEventRepository.CreateAsync(memory);
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Hoàn thành phỏng vấn", MapDetail(session));
    }

    public async Task<IServiceResult> GetFeedbackAsync(Guid userId, Guid sessionId)
    {
        var session = await GetOwnedSessionAsync(userId, sessionId, includeAnswers: true, asNoTracking: true);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        if (session.Status != "Completed")
            return new ServiceResult(Const.FAIL_READ_CODE, "Feedback đầy đủ chỉ khả dụng khi phiên đã hoàn thành.");

        var feedback = TryDeserializeFeedback(session.StructuredFeedbackJson);
        if (feedback == null)
        {
            var answers = session.Answers.OrderBy(a => a.OrderIndex).ToList();
            var feedbackLanguage = ReadContextLanguage(await LoadContextPayloadAsync(userId, sessionId));
            feedback = StructuredFeedbackBuilder.Build(session, answers, feedbackLanguage ?? "vi");
            feedback.Summary ??= session.FeedbackSummary;
        }

        feedback.SessionId = session.Id;
        feedback.OverallScore ??= session.OverallScore;
        if (string.IsNullOrWhiteSpace(feedback.Summary))
            feedback.Summary = session.FeedbackSummary;

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, feedback);
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
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        if (!user.OnboardingCompleted)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng hoàn thiện hồ sơ (cần CV) trước.");
        // Free cũng được gợi ý STAR — trừ AI char budget
        var system = "Write a strong STAR sample answer in Vietnamese.";
        var userPrompt = $"Question: {dto.QuestionText}\nUser draft: {dto.UserAnswer}\nViết mẫu STAR ngắn gọn.";
        var quotaBlock = await _aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var ai = await _aiQuota.CompleteAndLogAsync(
            user, system, userPrompt, "interview_suggest", null, SettingKeys.AiInterviewMaxOutputChars);
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            suggestedAnswer = ai.Content,
            provider = ai.Provider,
            usedFallback = ai.UsedFallback
        });
    }

    public async Task<IServiceResult> StartVoiceAsync(Guid userId, Guid sessionId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var session = await GetOwnedSessionAsync(userId, sessionId);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        if (!session.Mode.Equals("Voice", StringComparison.OrdinalIgnoreCase))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Phiên này không phải Voice Interview");

        if (session.Status is "Completed" or "Abandoned")
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Phiên phỏng vấn đã kết thúc");

        var voiceLanguage = ReadContextLanguage(await LoadContextPayloadAsync(userId, sessionId));
        if (voiceLanguage == null)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Phiên Voice thiếu ngôn ngữ; hãy tạo lại phiên.");

        // Idempotent: already started → no second consume
        if (session.VoiceStartedAt != null)
        {
            var expiresAlready = session.VoiceStartedAt.Value.Add(PlanTier.VoiceMaxDuration);
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Voice session đã bắt đầu", new
            {
                errorCode = (string?)null,
                sessionId = session.Id,
                voiceStartedAt = session.VoiceStartedAt,
                voiceExpiresAt = expiresAlready,
                maxMinutes = PlanTier.VoiceMaxMinutes,
                language = voiceLanguage,
                locale = voiceLanguage == "en" ? "en-US" : "vi-VN",
                idempotent = true
            });
        }

        if (!await _aiQuota.IsVoiceAllowedAsync(user))
        {
            _logger.LogInformation("Voice entitlement denied for user {UserId}", userId);
            return new ServiceResult(Const.FAIL_QUOTA_CODE,
                "VOICE_NOT_ENTITLED: Voice Interview chỉ dành cho gói Tiêu chuẩn và Cao cấp.",
                new { errorCode = "VOICE_NOT_ENTITLED" });
        }

        var consumeBlock = await _aiQuota.TryConsumeFeatureAsync(user, AiQuotaFeature.Interview);
        if (consumeBlock != null)
            return consumeBlock;

        // Consume = set VoiceStartedAt (counted by quota queries). Save failure → not counted.
        session.VoiceStartedAt = DateTime.UtcNow;
        session.StartedAt = session.VoiceStartedAt.Value;
        if (session.Status == "Setup")
            session.Status = "InProgress";

        try
        {
            await _unitOfWork.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            await _aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.Interview);
            _logger.LogWarning(ex, "Voice start failed before commit for session {SessionId}", sessionId);
            session.VoiceStartedAt = null;
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "Không thể bắt đầu Voice session. Thử lại.",
                new { errorCode = "VOICE_SESSION_NOT_ACTIVE" });
        }

        _logger.LogInformation("Voice session started {SessionId} user {UserId}", sessionId, userId);
        var expires = session.VoiceStartedAt.Value.Add(PlanTier.VoiceMaxDuration);
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Voice session đã bắt đầu", new
        {
            sessionId = session.Id,
            voiceStartedAt = session.VoiceStartedAt,
            voiceExpiresAt = expires,
            maxMinutes = PlanTier.VoiceMaxMinutes,
            language = voiceLanguage,
            locale = voiceLanguage == "en" ? "en-US" : "vi-VN",
            idempotent = false
        });
    }

    public async Task<IServiceResult> UploadVoiceAsync(
        Guid userId,
        Guid sessionId,
        Stream audio,
        string fileName,
        string contentType,
        long contentLength,
        int orderIndex,
        Guid? questionId,
        string? questionText,
        int durationSec)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        if (!await _aiQuota.IsVoiceAllowedAsync(user))
            return new ServiceResult(Const.FAIL_QUOTA_CODE,
                "VOICE_NOT_ENTITLED: Voice Interview chỉ dành cho gói Tiêu chuẩn và Cao cấp.",
                new { errorCode = "VOICE_NOT_ENTITLED" });

        var session = await GetOwnedSessionAsync(userId, sessionId);
        if (session == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy phiên phỏng vấn");

        if (!session.Mode.Equals("Voice", StringComparison.OrdinalIgnoreCase))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Phiên này không phải Voice Interview");

        var voiceGate = EnsureVoiceSessionActive(session);
        if (voiceGate != null)
            return voiceGate;

        // Idempotent before STT — avoid duplicate transcription / answer rows.
        var existingAnswer = await _unitOfWork.InterviewAnswerRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.OrderIndex == orderIndex);
        if (existingAnswer != null
            && !string.IsNullOrWhiteSpace(existingAnswer.AnswerText)
            && !existingAnswer.Skipped)
        {
            return await BuildAnswerSubmitResultAsync(existingAnswer, sessionId, orderIndex, idempotent: true);
        }

        if (contentLength <= 0 || contentLength > MaxVoiceAudioBytes)
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "File audio không hợp lệ hoặc vượt quá 10MB.",
                new { errorCode = "VOICE_AUDIO_INVALID" });

        await using var buffer = new MemoryStream();
        await audio.CopyToAsync(buffer);
        if (buffer.Length <= 0 || buffer.Length > MaxVoiceAudioBytes)
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "File audio không hợp lệ hoặc vượt quá 10MB.",
                new { errorCode = "VOICE_AUDIO_INVALID" });

        if (!LooksLikeAudio(buffer, contentType, fileName))
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "Định dạng audio không được hỗ trợ. Dùng webm/ogg/wav/mp3.",
                new { errorCode = "VOICE_AUDIO_INVALID" });

        buffer.Position = 0;
        var voiceLanguage = ReadContextLanguage(await LoadContextPayloadAsync(userId, sessionId));
        if (voiceLanguage == null)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Thiếu ngôn ngữ phỏng vấn; hãy tạo lại phiên Voice.");
        var stt = await _speechToText.TranscribeAsync(buffer, fileName, contentType, voiceLanguage);
        // Audio is not persisted; buffer disposed by await using (do not SetLength —
        // Whisper StreamContent disposes the stream, which makes SetLength throw).

        if (!stt.Ok)
        {
            _logger.LogInformation("Voice transcription failed session {SessionId}", sessionId);
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "VOICE_TRANSCRIPTION_FAILED: Không chuyển được giọng nói thành văn bản. Thử ghi lại.",
                new { errorCode = "VOICE_TRANSCRIPTION_FAILED", provider = stt.Provider });
        }

        if (string.IsNullOrWhiteSpace(stt.Transcript))
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "VOICE_EMPTY_TRANSCRIPT: Không nhận được nội dung giọng nói. Hãy nói rõ hơn và thử lại.",
                new { errorCode = "VOICE_EMPTY_TRANSCRIPT" });

        _logger.LogInformation("Voice transcription succeeded session {SessionId}", sessionId);

        // Reuse existing answer analysis pipeline — no Voice-specific analysis.
        return await SubmitAnswerAsync(userId, sessionId, new SubmitAnswerDto
        {
            OrderIndex = orderIndex,
            QuestionId = questionId,
            QuestionText = questionText,
            AnswerText = Truncate(stt.Transcript, 4000),
            Skipped = false,
            DurationSec = Math.Max(0, durationSec)
        });
    }

    private async Task<IServiceResult> BuildAnswerSubmitResultAsync(
        InterviewAnswer answer,
        Guid sessionId,
        int orderIndex,
        bool idempotent)
    {
        AnswerAnalysisDto? analysisDto = null;
        if (!string.IsNullOrWhiteSpace(answer.AnalysisJson))
        {
            try
            {
                analysisDto = JsonSerializer.Deserialize<AnswerAnalysisDto>(answer.AnalysisJson, FeedbackJsonOptions);
            }
            catch { /* fall through */ }
        }

        analysisDto ??= new AnswerAnalysisDto
        {
            AnalysisAvailable = answer.AnalysisAvailable,
            Relevance = answer.RelevanceScore,
            Completeness = answer.CompletenessScore,
            TechnicalKnowledge = answer.TechnicalKnowledgeScore,
            ProblemSolving = answer.ProblemSolvingScore,
            Communication = answer.CommunicationScore,
            StarScore = answer.StarScore,
            StarSituation = answer.StarHasSituation,
            StarTask = answer.StarHasTask,
            StarAction = answer.StarHasAction,
            StarResult = answer.StarHasResult,
            CvConsistency = answer.CvConsistencyScore,
            EvidenceStatus = answer.EvidenceStatus,
            EvidenceJson = answer.EvidenceJson,
            FollowUpReason = answer.FollowUpReason,
            EvidenceGap = LooksLikeEvidenceGap(answer.AnswerText)
                || string.Equals(answer.EvidenceStatus, "MissingEvidence", StringComparison.OrdinalIgnoreCase)
                || string.Equals(answer.EvidenceStatus, "WeakEvidence", StringComparison.OrdinalIgnoreCase),
            NeedsFollowUp = false
        };

        object? followUp = null;
        var nextIndex = orderIndex + 1;
        var queuedNext = await _unitOfWork.InterviewAnswerRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.OrderIndex == nextIndex && !a.IsFollowUp);
        InterviewQuestionDto? nextQuestion = queuedNext == null || !string.IsNullOrWhiteSpace(queuedNext.AnswerText)
            ? null : new InterviewQuestionDto
            {
                QuestionId = queuedNext.QuestionId ?? Guid.Empty,
                OrderIndex = queuedNext.OrderIndex,
                Content = queuedNext.QuestionText,
                Category = queuedNext.QuestionCategory ?? "CV-based",
                Hint = queuedNext.FollowUpReason
            };
        var next = await _unitOfWork.InterviewAnswerRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(a => a.SessionId == sessionId && a.OrderIndex == nextIndex && a.IsFollowUp);
        if (next != null && string.IsNullOrWhiteSpace(next.AnswerText))
        {
            followUp = new InterviewQuestionDto
            {
                QuestionId = next.QuestionId ?? Guid.Empty,
                OrderIndex = next.OrderIndex,
                Content = next.QuestionText,
                Category = next.QuestionCategory ?? "Follow-up",
                Hint = next.FollowUpReason ?? analysisDto.FollowUpReason
            };
        }

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, new
        {
            answerId = answer.Id,
            answer.OrderIndex,
            answerText = answer.AnswerText,
            answer.Skipped,
            answer.DurationSec,
            evidenceGap = analysisDto.EvidenceGap,
            analysisAvailable = answer.AnalysisAvailable,
            analysis = analysisDto.AnalysisAvailable ? analysisDto : null,
            evidence = analysisDto.AnalysisAvailable
                ? new { status = analysisDto.EvidenceStatus, detail = analysisDto.EvidenceJson }
                : null,
            followUp,
            nextQuestion,
            idempotent
        });
    }

    /// <summary>
    /// Voice sessions only count after VoiceStartedAt (actual start).
    /// Text sessions count from create (StartedAt).
    /// </summary>
    private async Task<int> CountSessionsThisMonthAsync(Guid userId)
    {
        var start = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        return await _unitOfWork.InterviewSessionRepository.GetQueryable()
            .AsNoTracking()
            .CountAsync(s => s.UserId == userId && s.StartedAt >= start
                && (s.VoiceStartedAt != null || s.Mode != "Voice"));
    }

    private static IServiceResult? EnsureVoiceSessionActive(InterviewSession session)
    {
        if (!session.Mode.Equals("Voice", StringComparison.OrdinalIgnoreCase))
            return null;

        if (session.VoiceStartedAt == null)
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "VOICE_SESSION_NOT_ACTIVE: Voice session chưa bắt đầu.",
                new { errorCode = "VOICE_SESSION_NOT_ACTIVE" });

        var expires = session.VoiceStartedAt.Value.Add(PlanTier.VoiceMaxDuration);
        if (DateTime.UtcNow >= expires)
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "VOICE_SESSION_EXPIRED: Phiên Voice đã hết 15 phút.",
                new { errorCode = "VOICE_SESSION_EXPIRED", voiceExpiresAt = expires });

        return null;
    }

    private static bool LooksLikeAudio(MemoryStream buffer, string contentType, string fileName)
    {
        var mime = (contentType ?? "").Split(';')[0].Trim().ToLowerInvariant();
        if (mime is "audio/webm" or "audio/ogg" or "audio/wav" or "audio/wave" or "audio/x-wav"
            or "audio/mpeg" or "audio/mp3" or "audio/mp4" or "audio/m4a" or "video/webm")
            return true;

        var ext = Path.GetExtension(fileName ?? "").ToLowerInvariant();
        if (ext is ".webm" or ".ogg" or ".wav" or ".mp3" or ".m4a" or ".mp4")
        {
            // Soft allow by extension only if magic looks plausible or empty check already passed
            if (buffer.Length < 4) return false;
            var header = new byte[4];
            buffer.Position = 0;
            _ = buffer.Read(header, 0, 4);
            buffer.Position = 0;
            // OggS, RIFF, ID3, ftyp, or EBML (webm) 0x1A45DFA3
            if (header[0] == 0x4F && header[1] == 0x67 && header[2] == 0x67 && header[3] == 0x53) return true; // OggS
            if (header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46) return true; // RIFF
            if (header[0] == 0x49 && header[1] == 0x44 && header[2] == 0x33) return true; // ID3
            if (header[0] == 0x1A && header[1] == 0x45 && header[2] == 0xDF && header[3] == 0xA3) return true; // EBML/webm
            if (header[0] == 0xFF && (header[1] & 0xE0) == 0xE0) return true; // MPEG frame
            // webm from MediaRecorder often EBML; if unknown but size ok, allow webm/ogg extensions
            return ext is ".webm" or ".ogg";
        }

        if (buffer.Length < 4) return false;
        var h = new byte[4];
        buffer.Position = 0;
        _ = buffer.Read(h, 0, 4);
        buffer.Position = 0;
        if (h[0] == 0x1A && h[1] == 0x45 && h[2] == 0xDF && h[3] == 0xA3) return true;
        if (h[0] == 0x4F && h[1] == 0x67 && h[2] == 0x67 && h[3] == 0x53) return true;
        if (h[0] == 0x52 && h[1] == 0x49 && h[2] == 0x46 && h[3] == 0x46) return true;
        return false;
    }


    private static readonly JsonSerializerOptions FeedbackJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// Optional AI narrative for structured feedback. Scores remain deterministic from persisted analysis.
    /// Replaces the former interview_score AI call — still at most 1 AI request on complete (no double-charge).
    /// </summary>
    private async Task EnrichFeedbackNarrativeAsync(
        UserAccount user,
        Guid sessionId,
        StructuredFeedbackDto feedback,
        List<InterviewAnswer> answers)
    {
        try
        {
            if (!feedback.OverallScore.HasValue) return;
            var language = ReadContextLanguage(await LoadContextPayloadAsync(user.Id, sessionId));
            if (language is not ("vi" or "en")) return;
            var hasStar = answers.Any(a => InterviewEvaluationPolicy.WeightedScore(a).HasValue
                && a.StarScore.HasValue);
            var starScores = StructuredFeedbackBuilder.DeriveStarAndClarity(answers);
            var input = new
            {
                date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                preliminaryScores = feedback.CategoryScores,
                answers = answers.Where(a => !a.Skipped).Select(a => new
                {
                    orderIndex = a.OrderIndex,
                    question = Truncate(a.QuestionText, 200),
                    answer = Truncate(a.AnswerText ?? string.Empty, 1800),
                    scores = new
                    {
                        a.RelevanceScore,
                        a.CompletenessScore,
                        a.CommunicationScore,
                        a.CvConsistencyScore
                    }
                })
            };

            var system = $"""
You are HireMate AI Coach. Write narrative only; do not calculate or output any score.
Return ONLY JSON with exactly headline,date,star_analysis.
headline: one concise sentence grounded in supplied answers; date: copy input date.
star_analysis: null if STAR is not applicable. Otherwise an object with exactly
situation,task,action,result; each has exactly issue and advice (short strings).
Only describe answer evidence. Never invent projects, metrics, skills or claims.
Missing evidence is not proof of dishonesty. Do not penalize technical definitions for missing STAR.
Use {(language == "en" ? "English" : "Vietnamese")} and address the candidate directly.
""";
            var userPrompt = JsonSerializer.Serialize(input, FeedbackJsonOptions);

            var quotaBlock = await _aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
            if (quotaBlock != null)
                return;

            var ai = await _aiQuota.CompleteAndLogAsync(
                user, system, userPrompt, "interview_feedback", sessionId, SettingKeys.AiInterviewMaxOutputChars);

            if (ai.UsedFallback || string.IsNullOrWhiteSpace(ai.Content))
                return;

            var json = ExtractJsonObject(ai.Content);
            if (json == null) return;

            var report = TryParseCoachReport(json, input.date, feedback.OverallScore.Value,
                starScores, hasStar);
            if (report == null) return;
            feedback.CoachReport = report;
            feedback.AiSummaryAvailable = true;
        }
        catch
        {
            // Deterministic feedback already set — AI failure must not fail completion.
        }
    }

    private static CoachReportDto? TryParseCoachReport(string content, string expectedDate,
        int backendOverall, (int? S, int? T, int? A, int? R, int? Clarity) backendScores,
        bool hasStar)
    {
        try
        {
            using var document = JsonDocument.Parse(content);
            var root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object || root.EnumerateObject().Count() != 3
                || !root.TryGetProperty("headline", out var headlineElement)
                || !root.TryGetProperty("date", out var dateElement)
                || !root.TryGetProperty("star_analysis", out var analysis)) return null;

            static string? Text(JsonElement item, string name) =>
                item.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.String
                    ? value.GetString()?.Trim() : null;
            static CoachStarItemDto? Star(JsonElement parent, string name)
            {
                if (!parent.TryGetProperty(name, out var item) || item.ValueKind != JsonValueKind.Object
                    || item.EnumerateObject().Count() != 2) return null;
                var issue = Text(item, "issue");
                var advice = Text(item, "advice");
                if (string.IsNullOrWhiteSpace(issue) || advice == null) return null;
                if (issue.Contains("ứng viên", StringComparison.OrdinalIgnoreCase)
                    || advice.Contains("ứng viên", StringComparison.OrdinalIgnoreCase)) return null;
                return new CoachStarItemDto { Issue = Truncate(issue, 300), Advice = Truncate(advice, 400) };
            }
            var headline = headlineElement.ValueKind == JsonValueKind.String
                ? headlineElement.GetString()?.Trim() : null;
            var date = dateElement.ValueKind == JsonValueKind.String
                ? dateElement.GetString()?.Trim() : null;
            if (string.IsNullOrWhiteSpace(headline) || headline.Length > 300
                || date != expectedDate || !DateOnly.TryParseExact(date, "yyyy-MM-dd", out _)
                || headline.Contains("ứng viên", StringComparison.OrdinalIgnoreCase))
                return null;
            CoachStarAnalysisDto? starAnalysis = null;
            if (hasStar)
            {
                if (analysis.ValueKind != JsonValueKind.Object
                    || analysis.EnumerateObject().Count() != 4) return null;
                var s = Star(analysis, "situation");
                var t = Star(analysis, "task");
                var a = Star(analysis, "action");
                var r = Star(analysis, "result");
                if (s == null || t == null || a == null || r == null) return null;
                s.Score = backendScores.S; t.Score = backendScores.T;
                a.Score = backendScores.A; r.Score = backendScores.R;
                starAnalysis = new CoachStarAnalysisDto
                { Situation = s, Task = t, Action = a, Result = r };
            }
            else if (analysis.ValueKind != JsonValueKind.Null) return null;

            return new CoachReportDto
            {
                Summary = new CoachReportSummaryDto
                    { OverallScore = backendOverall, Headline = headline, Date = date! },
                Scores = new CoachReportScoresDto
                {
                    Situation = backendScores.S, Task = backendScores.T,
                    Action = backendScores.A, Result = backendScores.R,
                    Clarity = backendScores.Clarity
                },
                StarAnalysis = starAnalysis
            };
        }
        catch (JsonException) { return null; }
    }

    private static List<FeedbackItemDto> MapAiFeedbackItems(JsonElement arr, List<FeedbackItemDto> existing)
    {
        var result = new List<FeedbackItemDto>();
        foreach (var el in arr.EnumerateArray())
        {
            var area = el.TryGetProperty("area", out var a) ? a.GetString() : null;
            var desc = el.TryGetProperty("description", out var d) ? d.GetString() : null;
            if (string.IsNullOrWhiteSpace(area) || string.IsNullOrWhiteSpace(desc)) continue;

            var match = existing.FirstOrDefault(x =>
                x.Area.Equals(area, StringComparison.OrdinalIgnoreCase));
            result.Add(new FeedbackItemDto
            {
                Area = area!,
                Description = desc!,
                Evidence = match?.Evidence,
                RelatedAnswerIds = match?.RelatedAnswerIds
            });
        }
        return result;
    }

    private static StructuredFeedbackDto? TryDeserializeFeedback(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<StructuredFeedbackDto>(json, FeedbackJsonOptions);
        }
        catch
        {
            return null;
        }
    }

    private static string? ExtractJsonObject(string content)
    {
        var start = content.IndexOf('{');
        var end = content.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        return content[start..(end + 1)];
    }

    private async Task<int> CountCompletedThisMonthAsync(Guid userId)
        => await CountSessionsThisMonthAsync(userId);

    private enum OpCvStatus { Ok, NotFound, ActiveRequired, Invalid }

    /// <summary>
    /// Explicit CV → ownership → use it (no Active fallback).
    /// Null → Active/Confirmed only. Never latest/first CV.
    /// Does not change ConfirmedCvDocumentId / IsConfirmed.
    /// </summary>
    private async Task<(OpCvStatus Status, CvDocument? Cv)> ResolveOperationCvAsync(
        Guid userId, Guid? cvDocumentId, CareerProfile? profile)
    {
        static bool IsAnalyzedOk(CvDocument c) => c.ParseSucceeded && c.AnalyzedAt != null;

        var outcome = OperationCvResolvePolicy.Decide(cvDocumentId, profile?.ConfirmedCvDocumentId);

        if (outcome == OperationCvResolveOutcome.ResolveExplicit)
        {
            var byId = await _unitOfWork.CvDocumentRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == cvDocumentId && c.UserId == userId);
            if (OperationCvResolvePolicy.IsExplicitNotFound(cvDocumentId, byId != null))
                return (OpCvStatus.NotFound, null);
            if (!IsAnalyzedOk(byId!))
                return (OpCvStatus.Invalid, null);
            return (OpCvStatus.Ok, byId);
        }

        if (outcome == OperationCvResolveOutcome.ActiveCvRequired)
            return (OpCvStatus.ActiveRequired, null);

        // ResolveActive — ConfirmedCvDocumentId only (no latest fallback).
        var confirmed = await _unitOfWork.CvDocumentRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == profile!.ConfirmedCvDocumentId && c.UserId == userId);
        if (confirmed == null)
            return (OpCvStatus.ActiveRequired, null);
        if (!IsAnalyzedOk(confirmed))
            return (OpCvStatus.Invalid, null);
        return (OpCvStatus.Ok, confirmed);
    }

    private static IServiceResult ActiveCvRequiredResult(string detail)
        => new ServiceResult(Const.FAIL_CREATE_CODE,
            $"{OperationCvResolvePolicy.ActiveCvRequiredCode}: {detail}",
            new { errorCode = OperationCvResolvePolicy.ActiveCvRequiredCode });

    private async Task<IServiceResult> CvInterviewGateFailAsync(Guid userId, string fallback)
    {
        var hasAny = await _unitOfWork.CvDocumentRepository.GetQueryable().AsNoTracking()
            .AnyAsync(c => c.UserId == userId);
        if (!hasAny)
            return new ServiceResult(Const.FAIL_CREATE_CODE,
                "Bạn chưa có CV. Hãy tạo hoặc tải CV trên Dashboard trước khi luyện phỏng vấn.");
        return new ServiceResult(Const.FAIL_CREATE_CODE,
            "CV chưa được phân tích thành công. Mở Kho CV → xem gợi ý ATS → Phân tích lại trước khi luyện phỏng vấn.");
    }

    /// <summary>Heuristic: claim mơ hồ / thiếu chứng minh — ghi Evidence gap, không kết luận CV giả.</summary>
    private static bool LooksLikeEvidenceGap(string? answer)
    {
        if (string.IsNullOrWhiteSpace(answer)) return true;
        var t = answer.Trim().ToLowerInvariant();
        if (t.Length < 80) return true;
        var vague = new[]
        {
            "phụ trách backend", "làm backend", "tôi làm", "tôi tham gia", "có kinh nghiệm",
            "responsible for", "i worked on", "i handled"
        };
        if (vague.Any(v => t.Contains(v)) && t.Length < 220)
            return true;
        return false;
    }

    private sealed class CvInterviewFacts
    {
        public bool HasCvContent { get; init; }
        public string? FullName { get; init; }
        public string? Position { get; init; }
        public string? Industry { get; init; }
        public string? Major { get; init; }
        public string? University { get; init; }
        public string? ExperienceLevel { get; init; }
        public string? Bio { get; init; }
        public int? GraduationYear { get; init; }
        public List<string> Skills { get; init; } = [];
        public List<CvExperienceDto> Experiences { get; init; } = [];
        public List<CvProjectDto> Projects { get; init; } = [];
        public List<CvCertificationDto> Certifications { get; init; } = [];
    }

    private static string FirstAvailable(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim() ?? string.Empty;

    private static IServiceResult? ValidateRole(string industry, string position)
    {
        if (string.IsNullOrWhiteSpace(position))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng chọn vị trí phỏng vấn");
        if (string.IsNullOrWhiteSpace(industry) || CareerFieldCatalog.GetRoles(industry).Count == 0)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Ngành nghề không hợp lệ; vui lòng cập nhật hồ sơ CV");
        if (CareerFieldCatalog.IsSuggestedRole(position, industry)) return null;
        // A position explicitly catalogued in another field is a mismatch. Unknown text is a custom role.
        var knownElsewhere = CareerFieldCatalog.IndustryRoles
            .Where(pair => !pair.Key.Equals(industry, StringComparison.OrdinalIgnoreCase))
            .Any(pair => pair.Value.Any(role => role.Equals(position, StringComparison.OrdinalIgnoreCase)));
        return knownElsewhere
            ? new ServiceResult(Const.FAIL_CREATE_CODE, "Vị trí không thuộc ngành nghề đã chọn")
            : null;
    }

    private static CvInterviewFacts ReadCvInterviewFacts(CvDocument cv)
    {
        var wizard = !string.IsNullOrWhiteSpace(cv.WizardAnswersJson);
        var json = wizard ? cv.WizardAnswersJson : cv.AnalysisJson;
        if (string.IsNullOrWhiteSpace(json)) return new CvInterviewFacts();
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            if (!wizard)
            {
                if (!root.TryGetProperty("extract", out root) || root.ValueKind != JsonValueKind.Object)
                    return new CvInterviewFacts();
            }

            static string? Text(JsonElement element, string pascal, string camel)
            {
                if (!element.TryGetProperty(pascal, out var value) && !element.TryGetProperty(camel, out value))
                    return null;
                return value.ValueKind == JsonValueKind.String ? value.GetString() : null;
            }

            static List<T> Items<T>(JsonElement element, string pascal, string camel)
            {
                if (!element.TryGetProperty(pascal, out var value) && !element.TryGetProperty(camel, out value))
                    return [];
                if (value.ValueKind != JsonValueKind.Array) return [];
                return JsonSerializer.Deserialize<List<T>>(value.GetRawText(),
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
            }

            var educations = Items<CvEducationDto>(root, "Educations", "educations");
            var education = educations.FirstOrDefault(e => !string.IsNullOrWhiteSpace(e.Institution));
            var educationMajor = educations.FirstOrDefault(e => !string.IsNullOrWhiteSpace(e.Major))?.Major;
            var year = education?.GraduationYear;
            if (!year.HasValue && root.TryGetProperty(wizard ? "GraduationYear" : "graduationYear", out var yearValue)
                && yearValue.ValueKind == JsonValueKind.Number && yearValue.TryGetInt32(out var parsedYear))
                year = parsedYear;

            return new CvInterviewFacts
            {
                HasCvContent = true,
                FullName = Text(root, "FullName", "fullName"),
                Position = Text(root, "DesiredPosition", "desiredPosition"),
                Industry = Text(root, "DesiredIndustry", "desiredIndustry"),
                Major = FirstAvailable(educationMajor, Text(root, "Major", "major")),
                University = FirstAvailable(education?.Institution, Text(root, "University", "university")),
                ExperienceLevel = Text(root, "ExperienceLevel", "experienceLevel"),
                Bio = FirstAvailable(Text(root, "Summary", "summary"), Text(root, "CareerObjective", "careerObjective"), Text(root, "Bio", "bio")),
                GraduationYear = year,
                Skills = Items<string>(root, "Skills", "skills"),
                Experiences = Items<CvExperienceDto>(root, "Experiences", "experiences"),
                Projects = Items<CvProjectDto>(root, "Projects", "projects"),
                Certifications = Items<CvCertificationDto>(root, "Certifications", "certifications")
            };
        }
        catch (JsonException) { return new CvInterviewFacts(); }
    }

    private async Task<object> BuildPersonalizedProfileAsync(
        UserAccount user,
        CareerProfile? profile,
        CvDocument cv,
        string position,
        string? industry,
        string? jobDescription,
        Guid? jobDescriptionId = null,
        string? selectedLanguage = null)
    {
        var cvFacts = ReadCvInterviewFacts(cv);
        var skills = cvFacts.HasCvContent ? cvFacts.Skills : ParseJsonStringList(profile?.SkillsJson);
        var experiences = cvFacts.HasCvContent ? cvFacts.Experiences : ParseJsonExperiences(profile?.ExperiencesJson);
        var projects = cvFacts.HasCvContent ? cvFacts.Projects : ParseJsonProjects(profile?.ProjectsJson);
        var certifications = cvFacts.HasCvContent ? cvFacts.Certifications : ParseJsonCertifications(profile?.CertificationsJson);

        var prev = await _unitOfWork.CareerMemoryEventRepository.GetQueryable().AsNoTracking()
            .Where(e => e.UserId == user.Id && e.EventType == CareerMemoryTypes.InterviewCompleted)
            .OrderByDescending(e => e.CreatedAt)
            .Take(5)
            .Select(e => e.PayloadJson)
            .ToListAsync();

        var learning = await CareerMemoryLearningService.LoadLearningBundleAsync(
            _unitOfWork, user.Id, CareerMemoryThresholds.LoadTake);

        var recentAnswers = await _unitOfWork.InterviewAnswerRepository.GetQueryable().AsNoTracking()
            .Where(answer => answer.Session != null && answer.Session.UserId == user.Id)
            .OrderByDescending(answer => answer.Session!.StartedAt)
            .ThenByDescending(answer => answer.OrderIndex)
            .Take(12)
            .Select(answer => new { answer.QuestionText, answer.AnswerText })
            .ToListAsync();

        var careerLearning = new
        {
            weaknesses = learning.Weaknesses
                .Take(CareerMemoryThresholds.ContextWeaknessLimit)
                .Select(CompactLearningSignal),
            skillGaps = learning.SkillGaps
                .Take(CareerMemoryThresholds.ContextSkillGapLimit)
                .Select(CompactLearningSignal),
            evidenceGaps = learning.EvidenceGaps
                .Take(CareerMemoryThresholds.ContextEvidenceGapLimit)
                .Select(CompactLearningSignal),
            strengths = learning.Strengths
                .Take(CareerMemoryThresholds.ContextStrengthLimit)
                .Select(CompactLearningSignal)
        };

        var knownWeaknessTitles = learning.Weaknesses
            .Select(w => w.Title ?? w.MemoryKey)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t!)
            .Take(CareerMemoryThresholds.ContextWeaknessLimit)
            .ToList();

        // Transient JD match context (NOT written to Career Memory).
        object? jdMatchContext = null;
        if (jobDescriptionId.HasValue)
        {
            var latestMatch = await _unitOfWork.JdMatchRepository.GetQueryable().AsNoTracking()
                .Where(m => m.UserId == user.Id && m.JobDescriptionId == jobDescriptionId)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();
            if (latestMatch != null)
            {
                jdMatchContext = ParseJdMatchContext(latestMatch.OverallScore, latestMatch.ResultJson);
            }
        }

        var major = cvFacts.HasCvContent ? cvFacts.Major : profile?.Major;
        var university = cvFacts.HasCvContent ? cvFacts.University : profile?.University;
        var positionTokens = Tokenize(position + " " + major + " " + (jobDescription ?? ""));
        var matched = skills.Where(s => positionTokens.Any(t => s.Contains(t, StringComparison.OrdinalIgnoreCase)
            || t.Contains(s, StringComparison.OrdinalIgnoreCase))).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var gaps = positionTokens
            .Where(t => t.Length > 3 && !skills.Any(s => s.Contains(t, StringComparison.OrdinalIgnoreCase)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(8)
            .ToList();

        // Fallback: if no dedicated projects, surface experience titles as project-like evidence
        var relevantProjects = projects.Count > 0
            ? projects.Select(p => (object)new
            {
                name = p.Name,
                description = p.Description,
                role = p.Role,
                technologies = p.Technologies,
                url = p.Url,
                period = p.Period,
                needsValidation = true
            }).ToList()
            : experiences.Select(e => (object)new
            {
                name = e.Title,
                description = e.Description,
                role = (string?)null,
                technologies = (List<string>?)null,
                url = (string?)null,
                period = e.Period,
                org = e.Org,
                needsValidation = true
            }).ToList();

        var projectNames = projects
            .Select(p => p.Name)
            .Concat(experiences.Select(e => e.Title))
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Take(5);

        return new
        {
            interviewLanguage = CvLanguage.Resolve(selectedLanguage, cv.ExtractedText, jobDescription),
            detectedCvLanguage = CvLanguage.Detect(cv.ExtractedText).Language,
            seniority = NormalizeSeniority(cvFacts.HasCvContent ? cvFacts.ExperienceLevel : profile?.ExperienceLevel),
            yearsOfExperience = (int?)null,
            questionDifficulty = NormalizeSeniority(cvFacts.HasCvContent ? cvFacts.ExperienceLevel : profile?.ExperienceLevel),
            interviewMode = "Personalized",
            previousQuestions = recentAnswers.Select(answer => answer.QuestionText)
                .Where(value => !string.IsNullOrWhiteSpace(value)).ToArray(),
            previousAnswers = recentAnswers.Select(answer => answer.AnswerText)
                .Where(value => !string.IsNullOrWhiteSpace(value)).ToArray(),
            candidateExperienceLevel = cvFacts.HasCvContent ? cvFacts.ExperienceLevel : profile?.ExperienceLevel,
            bio = cvFacts.HasCvContent ? cvFacts.Bio : profile?.Bio,
            graduationYear = cvFacts.HasCvContent ? cvFacts.GraduationYear : profile?.GraduationYear,
            desiredPosition = position,
            desiredIndustry = industry,
            relevantSkills = skills,
            matchedSkills = matched,
            skillGaps = gaps,
            relevantProjects,
            certifications,
            evidenceAvailable = new
            {
                hasCvText = !string.IsNullOrWhiteSpace(cv.ExtractedText),
                readinessScore = cv.ReadinessScore,
                fitT1 = cv.FitT1Score,
                education = university,
                university,
                major,
                hasProjects = projects.Count > 0,
                hasCertifications = certifications.Count > 0,
                hasExperiences = experiences.Count > 0
            },
            evidenceNeedsValidation = projectNames,
            relevantExperience = experiences,
            cvEvidence = new
            {
                explicitSkills = skills,
                explicitExperience = experiences,
                projectEvidence = projects,
                educationEvidence = new { university, major },
                certificationEvidence = certifications
            },
            roleSpecificRequirements = positionTokens.Take(12),
            behavioralAreas = new[] { "STAR storytelling", "Teamwork", "Conflict handling" },
            technicalAreas = matched.Count > 0 ? matched.Take(6) : skills.Take(6),
            problemSolvingAreas = new[] { "Debugging", "Trade-offs", "Prioritization" },
            previousWeaknesses = knownWeaknessTitles.Count > 0
                ? knownWeaknessTitles
                : prev.Select(ExtractWeaknessHints).SelectMany(x => x).Distinct().Take(8).ToList(),
            careerLearning,
            jdMatchContext,
            jobDescriptionId,
            areasToExploreDeeper = gaps.Take(5)
                .Concat(matched.Take(3))
                .Concat(learning.EvidenceGaps.Select(e => e.Title ?? "evidence").Take(3))
                .Distinct()
                .Take(8),
            targetPosition = position,
            industry,
            cvEvidenceText = Truncate(cv.ExtractedText ?? string.Empty, 2500),
            jobDescription = jobDescription,
            cvDocumentId = cv.Id,
            fullName = FirstAvailable(cvFacts.FullName, user.FullName)
        };
    }

    private static object ParseJdMatchContext(int overallScore, string? resultJson)
    {
        List<string> Read(params string[] keys)
        {
            if (string.IsNullOrWhiteSpace(resultJson)) return [];
            try
            {
                using var doc = JsonDocument.Parse(resultJson);
                foreach (var key in keys)
                {
                    if (!doc.RootElement.TryGetProperty(key, out var el) || el.ValueKind != JsonValueKind.Array)
                        continue;
                    return el.EnumerateArray()
                        .Select(x => x.GetString())
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .Select(s => s!)
                        .Take(8)
                        .ToList();
                }
            }
            catch { /* ignore */ }
            return [];
        }

        return new
        {
            overallScore,
            matchedSkills = Read("matchedSkills", "skills", "matchingSkills"),
            missingSkillsNotEvidenced = Read("missingSkills", "gaps"),
            keywordGaps = Read("keywordGaps", "keywords"),
            experienceGaps = Read("experienceGaps"),
            note = "JD missing skills are not Career Memory — interview may probe if relevant to role."
        };
    }

    private async Task<string?> ResolveJdTextAsync(Guid userId, Guid? jobDescriptionId, string? pasted)
    {
        if (jobDescriptionId.HasValue)
        {
            var jd = await _unitOfWork.JobDescriptionRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(j => j.Id == jobDescriptionId && j.UserId == userId && !j.IsArchived);
            return jd?.Content;
        }
        return string.IsNullOrWhiteSpace(pasted) ? null : pasted.Trim();
    }

    private static object CompactLearningSignal(LearningSignalDto s) => new
    {
        title = s.Title,
        topic = s.MemoryKey != null && s.MemoryKey.Contains('|')
            ? s.MemoryKey.Split('|')[1]
            : s.MemoryKey,
        occurrenceCount = s.OccurrenceCount,
        confidence = s.Confidence,
        recurring = s.OccurrenceCount >= CareerMemoryThresholds.RecurrenceThreshold
    };

    private static List<string> Tokenize(string text)
    {
        return text.Split([' ', ',', '.', '/', '|', ';', '\n', '\r', '\t', '-', '(', ')'],
                StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(t => t.Length > 2)
            .Select(t => t.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static List<string> ExtractWeaknessHints(string? feedback)
    {
        if (string.IsNullOrWhiteSpace(feedback)) return [];
        var hints = new List<string>();
        if (feedback.Contains("Action", StringComparison.OrdinalIgnoreCase)) hints.Add("Action depth");
        if (feedback.Contains("Result", StringComparison.OrdinalIgnoreCase)) hints.Add("Quantified results");
        if (feedback.Contains("cải thiện", StringComparison.OrdinalIgnoreCase)) hints.Add("General improvement");
        if (feedback.Contains("STAR", StringComparison.OrdinalIgnoreCase)) hints.Add("STAR structure");
        return hints;
    }

    private async Task<string?> LoadContextPayloadAsync(Guid userId, Guid sessionId)
    {
        var ev = await _unitOfWork.CareerMemoryEventRepository.GetQueryable().AsNoTracking()
            .Where(e => e.UserId == userId && e.RefId == sessionId && e.EventType == CareerMemoryTypes.InterviewContext)
            .OrderByDescending(e => e.CreatedAt)
            .FirstOrDefaultAsync();
        return ev?.PayloadJson;
    }

    private static string? ReadContextLanguage(string? payload)
    {
        try
        {
            using var document = JsonDocument.Parse(payload ?? "{}");
            if (document.RootElement.TryGetProperty("context", out var context)
                && context.TryGetProperty("interviewLanguage", out var value))
            {
                var language = value.GetString();
                if (language is "vi" or "en") return language;
            }
        }
        catch (JsonException) { }
        return null;
    }

    private static List<string> ReadPreviousQuestions(string? payload)
    {
        try
        {
            using var document = JsonDocument.Parse(payload ?? "{}");
            if (document.RootElement.TryGetProperty("context", out var context)
                && context.TryGetProperty("previousQuestions", out var questions)
                && questions.ValueKind == JsonValueKind.Array)
                return questions.EnumerateArray()
                    .Where(value => value.ValueKind == JsonValueKind.String)
                    .Select(value => value.GetString()!)
                    .Take(12).ToList();
        }
        catch (JsonException) { }
        return [];
    }

    private static string? ReadContextSeniority(string? payload)
    {
        try
        {
            using var document = JsonDocument.Parse(payload ?? "{}");
            if (document.RootElement.TryGetProperty("context", out var context)
                && context.TryGetProperty("seniority", out var value)
                && value.ValueKind == JsonValueKind.String)
                return value.GetString();
        }
        catch (JsonException) { }
        return null;
    }

    private static bool SameQuestion(string first, string second)
    {
        static HashSet<string> Words(string value) => value.ToLowerInvariant()
            .Split([' ', ',', '.', '?', '!', ':', ';', '\n'], StringSplitOptions.RemoveEmptyEntries)
            .Where(word => word.Length > 2).ToHashSet();
        var a = Words(first);
        var b = Words(second);
        return a.Count > 0 && b.Count > 0
            && (a.SetEquals(b) || (double)a.Intersect(b).Count() / Math.Min(a.Count, b.Count) >= 0.85);
    }

    private async Task<List<InterviewQuestionDto>> GeneratePersonalizedQuestionsAsync(
        UserAccount user, InterviewSession session, string? contextJson,
        IReadOnlyList<InterviewQuestionDto> selectedQuestions)
    {
        var count = session.QuestionCount - selectedQuestions.Count;
        if (count <= 0) return [];
        var learning = await CareerMemoryLearningService.LoadLearningBundleAsync(
            _unitOfWork, user.Id, CareerMemoryThresholds.LoadTake);

        var memoryHints = new
        {
            weaknesses = learning.Weaknesses.Take(CareerMemoryThresholds.ContextWeaknessLimit)
                .Select(w => w.Title ?? w.MemoryKey).Where(x => !string.IsNullOrWhiteSpace(x)).ToList(),
            skillGaps = learning.SkillGaps.Take(CareerMemoryThresholds.ContextSkillGapLimit)
                .Select(w => w.Title ?? w.MemoryKey).Where(x => !string.IsNullOrWhiteSpace(x)).ToList(),
            evidenceGaps = learning.EvidenceGaps.Take(CareerMemoryThresholds.ContextEvidenceGapLimit)
                .Select(w => w.Title ?? w.MemoryKey).Where(x => !string.IsNullOrWhiteSpace(x)).ToList(),
            strengths = learning.Strengths.Take(CareerMemoryThresholds.ContextStrengthLimit)
                .Select(w => w.Title ?? w.MemoryKey).Where(x => !string.IsNullOrWhiteSpace(x)).ToList()
        };

        var hasMemory = memoryHints.weaknesses.Count + memoryHints.skillGaps.Count
            + memoryHints.evidenceGaps.Count + memoryHints.strengths.Count > 0;

        var language = ReadContextLanguage(contextJson);
        if (language == null) return [];
        // The normalized, owned session context is the sole input to dynamic generation.
        var system =
            $"You are a hiring interviewer. Generate personalized interview questions in {(language == "en" ? "English" : "Vietnamese")} based on the candidate CV context and target role. " +
            "Return JSON array of objects with keys: content, category, hint. " +
            "The resolved interview CV is the source of truth for target position, industry, education major, skills and experience. " +
            "Choose role fundamentals first, then CV-grounded, JD-specific, seniority-appropriate, behavioral and evidence-validation questions. " +
            "ExplicitSkill is not ExplicitExperience: ask whether and where the skill was used; never claim production experience from a skill alone. " +
            "Distinguish a JD requirement from proven CV experience. Do not treat Career Memory as a fact about the candidate. " +
            "Make most questions directly relevant to that position and major; use only skills, projects or experience evidenced in that CV or the supplied job description. " +
            "Do not invent qualifications or ask technical trivia for another role or major. Compact. " +
            "Career memory is a SOFT signal only — prefer targeting 1–2 known weaknesses/evidence gaps when relevant to position/JD/CV, " +
            "but do NOT force the same topic every session; vary wording; still cover role-fit and Active CV evidence. " +
            "If context includes jdMatchContext.missingSkillsNotEvidenced, you MAY ask about 0–2 of them when relevant to the role " +
            "(e.g. containerization if Docker listed) — do not treat as proven skill gaps; phrase as exploration.";

        var userPrompt =
            $"Target position: {session.Position}\nIndustry: {session.Industry}\nLanguage: {language}\nCount: {count}\n" +
            $"Already selected questions (do not repeat): {JsonSerializer.Serialize(selectedQuestions.Select(q => q.Content))}\n" +
            $"CareerMemory (titles only):\n{JsonSerializer.Serialize(memoryHints)}\n" +
            (hasMemory
                ? "Prefer probing measurable Result / evidence / known skill gaps when natural; keep most questions role-aligned.\n"
                : "No prior learning memory — generate a balanced role-aligned set.\n") +
            $"Context JSON:\n{(contextJson ?? "{}")}";

        var quotaBlock = await _aiQuota.EnsureCanCallAsync(user, system.Length + Math.Min(userPrompt.Length, 12000));
        if (quotaBlock != null)
            return [];

        var clipped = userPrompt.Length > 12000 ? userPrompt[..12000] : userPrompt;
        var ai = await _aiQuota.CompleteAndLogAsync(
            user, system, clipped, "interview_questions", session.Id, SettingKeys.AiInterviewMaxOutputChars);
        if (ai.UsedFallback || string.IsNullOrWhiteSpace(ai.Content))
            return [];

        try
        {
            var json = ai.Content.Trim();
            var arrStart = json.IndexOf('[');
            var arrEnd = json.LastIndexOf(']');
            if (arrStart < 0 || arrEnd <= arrStart) return [];
            using var doc = JsonDocument.Parse(json[arrStart..(arrEnd + 1)]);
            var list = new List<InterviewQuestionDto>();
            var i = 0;
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var content = el.TryGetProperty("content", out var c) ? c.GetString()
                    : el.TryGetProperty("q", out var q) ? q.GetString() : null;
                if (string.IsNullOrWhiteSpace(content)) continue;
                list.Add(new InterviewQuestionDto
                {
                    QuestionId = Guid.Empty,
                    OrderIndex = i++,
                    Content = content.Trim(),
                    Category = el.TryGetProperty("category", out var cat) ? cat.GetString() ?? "CV-based" : "CV-based",
                    Hint = el.TryGetProperty("hint", out var h) ? h.GetString() : null
                });
                if (list.Count >= count) break;
            }
            return list;
        }
        catch
        {
            return [];
        }
    }

    private async Task<string> ResolveQuestionCategoryAsync(InterviewAnswer answer)
    {
        if (!string.IsNullOrWhiteSpace(answer.QuestionCategory))
            return answer.QuestionCategory!;
        if (answer.IsFollowUp)
            return "Follow-up";
        if (answer.QuestionId.HasValue)
        {
            var q = await _unitOfWork.QuestionRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == answer.QuestionId.Value);
            if (!string.IsNullOrWhiteSpace(q?.Category))
                return q!.Category;
        }
        var text = (answer.QuestionText ?? "").ToLowerInvariant();
        if (text.Contains("star") || text.Contains("kể") || text.Contains("trải nghiệm") || text.Contains("conflict")
            || text.Contains("teamwork") || text.Contains("xung đột"))
            return "Behavioral";
        if (text.Contains("api") || text.Contains("database") || text.Contains("algorithm") || text.Contains("code")
            || text.Contains("kiến trúc") || text.Contains("technical") || text.Contains("sql"))
            return "Technical";
        if (text.Contains("project") || text.Contains("dự án"))
            return "Project";
        if (text.Contains("vấn đề") || text.Contains("debug") || text.Contains("giải quyết") || text.Contains("trade-off"))
            return "ProblemSolving";
        return "Experience";
    }

    private async Task<AnswerAnalysisDto> AnalyzeAnswerWithAiAsync(
        UserAccount user,
        InterviewSession session,
        InterviewAnswer answer,
        string category,
        CareerProfile? profile,
        string? contextJson)
    {
        var unavailable = new AnswerAnalysisDto { AnalysisAvailable = false };
        try
        {
            var language = ReadContextLanguage(contextJson);
            if (language is not ("vi" or "en")) return unavailable;
            var applicable = InterviewEvaluationPolicy.Weights(category, answer.QuestionText);
            var system = $"""
You are HireMate's interview evaluator. Return ONLY compact JSON with exactly these root keys:
dimensions,evidenceStatus,cvQuote,star,feedback,followUp.
dimensions has exactly these keys: {string.Join(",", applicable.Keys)}. Each value has exactly
score (integer 0-100), confidence (number 0-1), status (evidence status enum),
evidence (1-3 EXACT quotes of 8-120 characters from Answer, no ellipsis),
reason (short explanation).
No other dimension. Quotes must appear verbatim in Answer and support that dimension.
High scores require a reason explaining why the quoted evidence satisfies the rubric.
If evidence is thin, lower confidence or score; never invent support or reward keyword lists.
Different wording with the same substance should receive similar scores.
{InterviewEvaluationPolicy.RubricInstruction}
evidenceStatus must be Verified, StrongEvidence, WeakEvidence, MissingEvidence, NeedsValidation
or CvInconsistency. Missing CV mention is NeedsValidation, not contradiction or dishonesty.
Verified means a substantive claim is corroborated, not merely that a quote exists.
Incorrect or off-topic answers cannot be Verified or StrongEvidence.
cvQuote is null except explicit CvInconsistency, then quote the contradictory CV text verbatim.
star is null unless STAR is an applicable dimension; then exactly four booleans:
situation,task,action,result. Mark a component true only when Answer actually provides it.
feedback has exactly status (good|needs_improvement|invalid), comment and starTip (string or null).
followUp is null unless a concrete gap needs clarification; then exactly trigger and reason.
trigger: EvidenceGap|TechnicalGap|WeakSTAR|MissingResult|UnclearRole|CvInconsistency|LowConfidence.
Use TechnicalGap only for a material gap (technicalKnowledge or completeness below 60).
Do not trigger EvidenceGap when evidenceStatus is Verified or StrongEvidence.
Do not invent facts, scores, evidence, experience or answer keys. Do not score by answer length,
keyword count, CV/JD copying, accent, age, gender, name or background. Judge substance.
Use {language} for all prose: {(language == "en" ? "English" : "Vietnamese")}.
Keep JSON short enough to fit the response limit. No overall score.
""";
            var previous = await _unitOfWork.InterviewAnswerRepository.GetQueryable()
                .AsNoTracking().Where(a => a.SessionId == session.Id && a.OrderIndex < answer.OrderIndex
                    && !a.Skipped && a.AnswerText != null)
                .OrderByDescending(a => a.OrderIndex).Take(3)
                .Select(a => new { a.QuestionText, a.AnswerText }).ToListAsync();
            var userPrompt =
                $"Position: {session.Position}\nIndustry: {session.Industry}\nCategory: {category}\n" +
                $"Question: {answer.QuestionText}\nAnswer: {answer.AnswerText}\n" +
                $"Previous answers: {Truncate(JsonSerializer.Serialize(previous), 2000)}\n" +
                $"CV/JD/profile context: {Truncate(contextJson ?? "{}", 5000)}";

            var block = await _aiQuota.EnsureCanCallAsync(user,
                system.Length + Math.Min(userPrompt.Length, 10000),
                AiQuotaService.InterviewEvaluationMaxOutputChars);
            if (block != null)
                return unavailable;

            var clipped = userPrompt.Length > 10000 ? userPrompt[..10000] : userPrompt;
            var ai = await _aiQuota.CompleteAndLogAsync(
                user, system, clipped, "interview_answer_analysis", session.Id,
                SettingKeys.AiInterviewMaxOutputChars,
                InterviewEvaluationPolicy.ResponseSchema(category, answer.QuestionText));

            // Do not fabricate scores when AI is unavailable — AnalysisAvailable must stay false.
            if (ai.UsedFallback || string.IsNullOrWhiteSpace(ai.Content))
                return unavailable;

            var parsed = InterviewEvaluationPolicy.TryParse(
                ai.Content, category, answer.QuestionText, answer.AnswerText ?? "", contextJson);
            return parsed ?? unavailable;
        }
        catch
        {
            return unavailable;
        }
    }

    private static string? NormalizeSeniority(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var level = value.Trim().ToLowerInvariant();
        if (level.Contains("student") || level.Contains("sinh viên")) return "Student";
        if (level.Contains("fresher") || level.Contains("mới tốt nghiệp")) return "Fresher";
        if (level.Contains("junior")) return "Junior";
        if (level.Contains("senior")) return "Senior";
        if (level.Contains("mid") || level.Contains("middle")) return "Mid";
        return null;
    }

    private static void ApplyAnalysisToAnswer(InterviewAnswer answer, AnswerAnalysisDto dto)
    {
        answer.AnalysisAvailable = dto.AnalysisAvailable;
        if (!dto.AnalysisAvailable)
        {
            answer.RelevanceScore = null;
            answer.CompletenessScore = null;
            answer.TechnicalKnowledgeScore = null;
            answer.ProblemSolvingScore = null;
            answer.CommunicationScore = null;
            answer.StarScore = null;
            answer.CvConsistencyScore = null;
            answer.StarHasSituation = null;
            answer.StarHasTask = null;
            answer.StarHasAction = null;
            answer.StarHasResult = null;
            answer.EvidenceStatus = null;
            answer.EvidenceJson = null;
            answer.AnalysisJson = null;
            answer.FollowUpReason = null;
            return;
        }

        answer.RelevanceScore = dto.Relevance;
        answer.CompletenessScore = dto.Completeness;
        answer.TechnicalKnowledgeScore = dto.TechnicalKnowledge;
        answer.ProblemSolvingScore = dto.ProblemSolving;
        answer.CommunicationScore = dto.Communication;
        answer.StarScore = dto.StarScore;
        answer.CvConsistencyScore = dto.CvConsistency;
        answer.StarHasSituation = dto.StarSituation;
        answer.StarHasTask = dto.StarTask;
        answer.StarHasAction = dto.StarAction;
        answer.StarHasResult = dto.StarResult;
        answer.EvidenceStatus = dto.EvidenceStatus;
        answer.EvidenceJson = dto.EvidenceJson;
        answer.FollowUpReason = dto.FollowUpReason;
        answer.AnalysisJson = JsonSerializer.Serialize(dto);
    }

    private async Task<string?> TryGenerateFollowUpAsync(
        UserAccount user,
        InterviewSession session,
        InterviewAnswer answer,
        AnswerAnalysisDto analysis)
    {
        if (!analysis.NeedsFollowUp || string.IsNullOrWhiteSpace(analysis.FollowUpReason))
            return null;
        var language = ReadContextLanguage(await LoadContextPayloadAsync(user.Id, session.Id));
        if (language is not ("vi" or "en")) return null;
        var system = $"Generate exactly one short {(language == "en" ? "English" : "Vietnamese")} " +
            "follow-up question resolving the stated gap in the actual answer. " +
            "Do not assume experience, invent evidence, accuse dishonesty, or switch language. " +
            "Return one plain question only.";
        var userPrompt =
            $"Position: {session.Position}\nQ: {answer.QuestionText}\nA: {answer.AnswerText}\n" +
            $"EvidenceStatus: {analysis.EvidenceStatus}\nReason: {analysis.FollowUpReason}\n" +
            $"Ask one follow-up that helps the candidate add concrete evidence.";
        var block = await _aiQuota.EnsureCanCallAsync(user, system.Length + userPrompt.Length);
        if (block != null) return null;
        var ai = await _aiQuota.CompleteAndLogAsync(
            user, system, userPrompt, "interview_followup", session.Id, SettingKeys.AiInterviewMaxOutputChars);
        if (ai.UsedFallback || string.IsNullOrWhiteSpace(ai.Content)) return null;
        var question = ai.Content.Trim().Trim('"');
        return question.Length is >= 10 and <= 250 && question.EndsWith('?')
            ? question : null;
    }

    private static List<string> ParseJsonStringList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch { return []; }
    }

    private static List<CvExperienceDto> ParseJsonExperiences(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<CvExperienceDto>>(json) ?? [];
        }
        catch { return []; }
    }

    private static List<CvProjectDto> ParseJsonProjects(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<CvProjectDto>>(json) ?? [];
        }
        catch { return []; }
    }

    private static List<CvCertificationDto> ParseJsonCertifications(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<CvCertificationDto>>(json) ?? [];
        }
        catch { return []; }
    }

    private static string Truncate(string s, int max)
        => string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s[..max]);

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

    private static List<InterviewQuestionDto> BuildCvAlignedFallbackQuestions(
        InterviewSession session, string? contextJson, string language)
    {
        string? major = null;
        try
        {
            using var document = JsonDocument.Parse(contextJson ?? "{}");
            var root = document.RootElement;
            if (root.TryGetProperty("context", out var context)
                && context.TryGetProperty("evidenceAvailable", out var evidence)
                && evidence.TryGetProperty("major", out var value)
                && value.ValueKind == JsonValueKind.String)
                major = value.GetString();
        }
        catch (JsonException) { /* No major in saved context. */ }

        var role = session.Position;
        var field = session.Industry;
        var education = string.IsNullOrWhiteSpace(major) ? "chuyên ngành ghi trong CV" : $"chuyên ngành {major}";
        var prompts = language == "en" ? new[]
        {
            $"Which fundamentals are most important for the {role} role, and how would you apply them?",
            $"Why are you interested in the {role} position in {field}?",
            $"Which skill listed on your CV is relevant to {role}, and where have you practiced it?",
            $"If your CV includes a relevant project or job, which part best demonstrates your fit for {role}?",
            $"How would you approach a new problem in the {role} role?",
            $"What have you learned from your studies that you would apply as a {role}?",
            $"Which strengths and learning goals would you bring to this {role} role?",
            $"How would you collaborate with teammates on a task in {field}?",
            $"How would you verify your work before delivery as a {role}?",
            $"What specific outcome would you aim for in your first months as a {role}?"
        } : new[]
        {
            $"Kiến thức từ {education} giúp bạn chuẩn bị cho vị trí {role} như thế nào?",
            $"Vì sao bạn chọn ứng tuyển vị trí {role} trong lĩnh vực {field}?",
            $"Nếu CV có kỹ năng phù hợp vị trí {role}, bạn đã rèn luyện kỹ năng đó ở đâu?",
            $"Nếu có dự án hoặc kinh nghiệm liên quan trong CV, phần nào thể hiện rõ nhất năng lực phù hợp với vị trí {role}?",
            $"Khi gặp một vấn đề mới trong công việc {role}, bạn sẽ tìm hiểu và giải quyết theo những bước nào?",
            $"Kiến thức nào của {education} bạn muốn áp dụng thêm trong công việc {role}?",
            $"Bạn đánh giá điểm mạnh và phần còn cần học thêm của mình so với yêu cầu vị trí {role} ra sao?",
            $"Bạn sẽ phối hợp với đồng nghiệp thế nào khi thực hiện một nhiệm vụ thuộc lĩnh vực {field}?",
            $"Hãy mô tả cách bạn kiểm tra kết quả công việc trước khi bàn giao ở vị trí {role}.",
            $"Bạn mong đạt được kết quả cụ thể nào trong những tháng đầu ở vị trí {role}?"
        };
        return prompts.Select((content, index) => new InterviewQuestionDto
        {
            QuestionId = Guid.Empty,
            OrderIndex = index,
            Content = content,
            Category = "CV-based"
        }).ToList();
    }

    private async Task<List<Question>> PickQuestionsAsync(
        string industry,
        string position,
        int count,
        string language,
        string? seniority,
        Guid? userId = null)
    {
        var all = await _unitOfWork.QuestionRepository.GetQueryable()
            .AsNoTracking()
            .Where(q => q.IsActive && q.Language == language)
            .ToListAsync();

        all = all.Where(q => (string.IsNullOrWhiteSpace(q.Seniority) || q.Seniority == seniority)
            && (seniority is not ("Student" or "Fresher") || q.Difficulty != "Hard")).ToList();

        var roleMatched = all.Where(q =>
                (!string.IsNullOrEmpty(q.RoleHint) && position.Contains(q.RoleHint, StringComparison.OrdinalIgnoreCase))
                || (!string.IsNullOrEmpty(q.RoleHint) && q.RoleHint.Contains(MapRoleHint(position), StringComparison.OrdinalIgnoreCase))
                || CategoryMatchesPosition(q.Category, position))
            .ToList();

        var industryMatched = all.Where(q =>
                string.Equals(q.Industry, industry, StringComparison.OrdinalIgnoreCase)
                || q.Category.Equals("Hành vi (HR)", StringComparison.OrdinalIgnoreCase)
                || (string.IsNullOrWhiteSpace(q.Industry) && string.IsNullOrWhiteSpace(q.RoleHint)))
            .ToList();

        // Never fill a shortage with unrelated roles or industries.
        var pool = roleMatched.Where(q => string.IsNullOrWhiteSpace(q.Industry)
                || string.Equals(q.Industry, industry, StringComparison.OrdinalIgnoreCase))
            .Concat(industryMatched.Where(q => string.IsNullOrWhiteSpace(q.RoleHint)
                || position.Contains(q.RoleHint, StringComparison.OrdinalIgnoreCase)
                || q.RoleHint.Contains(MapRoleHint(position), StringComparison.OrdinalIgnoreCase)))
            .DistinctBy(q => q.Id).ToList();

        // Soft bias from Career Memory when bank fallback is used (not a hard rule).
        HashSet<string> preferTokens = [];
        if (userId.HasValue)
        {
            var learning = await CareerMemoryLearningService.LoadLearningBundleAsync(
                _unitOfWork, userId.Value, CareerMemoryThresholds.LoadTake);
            foreach (var w in learning.Weaknesses.Concat(learning.EvidenceGaps).Concat(learning.SkillGaps)
                         .Take(CareerMemoryThresholds.ContextWeaknessLimit))
            {
                var key = (w.MemoryKey ?? w.Title ?? "").ToLowerInvariant();
                if (key.Contains("star") || key.Contains("result") || key.Contains("evidence"))
                {
                    preferTokens.Add("kết quả");
                    preferTokens.Add("result");
                    preferTokens.Add("đo lường");
                    preferTokens.Add("hành vi");
                }
                if (key.Contains("problem") || key.Contains("technical"))
                {
                    preferTokens.Add("vấn đề");
                    preferTokens.Add("technical");
                    preferTokens.Add("giải quyết");
                }
                if (key.Contains("communication"))
                {
                    preferTokens.Add("trình bày");
                    preferTokens.Add("giao tiếp");
                }
            }
        }

        int Specificity(Question question) =>
            (string.Equals(question.RoleHint, position, StringComparison.OrdinalIgnoreCase) ? 4 : 0)
            + (string.Equals(question.Industry, industry, StringComparison.OrdinalIgnoreCase) ? 2 : 0)
            + (!string.IsNullOrWhiteSpace(question.Seniority) && question.Seniority == seniority ? 1 : 0);

        if (preferTokens.Count == 0)
            return pool.OrderByDescending(Specificity).ThenBy(_ => Guid.NewGuid()).Take(count).ToList();

        var preferred = pool.Where(q =>
        {
            var text = (q.Content + " " + q.Category).ToLowerInvariant();
            return preferTokens.Any(t => text.Contains(t));
        }).OrderByDescending(Specificity).ThenBy(_ => Guid.NewGuid()).ToList();

        var rest = pool.Except(preferred).OrderByDescending(Specificity).ThenBy(_ => Guid.NewGuid()).ToList();
        // At most ~40% of questions from memory-preferred pool — soft signal.
        var preferTake = Math.Min(preferred.Count, Math.Max(1, count / 3));
        return preferred.Take(preferTake).Concat(rest).Take(count).ToList();
    }

    private static string MapRoleHint(string position)
    {
        if (position.Contains("Frontend", StringComparison.OrdinalIgnoreCase)) return "Frontend";
        if (position.Contains("Backend", StringComparison.OrdinalIgnoreCase)) return "Backend";
        if (position.Contains("Fullstack", StringComparison.OrdinalIgnoreCase)) return "Fullstack";
        if (position.Contains("DevOps", StringComparison.OrdinalIgnoreCase)) return "DevOps";
        if (position.Contains("QA", StringComparison.OrdinalIgnoreCase) || position.Contains("Kiá»ƒm thá»­", StringComparison.OrdinalIgnoreCase)) return "QA";
        if (position.Contains("Dá»¯ liá»‡u", StringComparison.OrdinalIgnoreCase) || position.Contains("Data", StringComparison.OrdinalIgnoreCase)) return "Data";
        if (position.Contains("UI/UX", StringComparison.OrdinalIgnoreCase) || position.Contains("Thiết kế", StringComparison.OrdinalIgnoreCase)) return "UI/UX";
        if (position.Contains("Marketing", StringComparison.OrdinalIgnoreCase) || position.Contains("Tiếp thị", StringComparison.OrdinalIgnoreCase)) return "Marketing";
        if (position.Contains("Nhân sự", StringComparison.OrdinalIgnoreCase)) return "Nhân sự";
        if (position.Contains("Kế toán", StringComparison.OrdinalIgnoreCase)) return "Kế toán";
        if (position.Contains("Kinh doanh", StringComparison.OrdinalIgnoreCase)) return "Kinh doanh";
        if (position.Contains("sản phẩm", StringComparison.OrdinalIgnoreCase)) return "Quản lý sản phẩm";
        if (position.Contains("Quản lý dự án", StringComparison.OrdinalIgnoreCase)) return "Quản lý dự án";
        if (position.Contains("khách hàng", StringComparison.OrdinalIgnoreCase)) return "khách hàng";
        if (position.Contains("Phân tích Kinh doanh", StringComparison.OrdinalIgnoreCase) || position.Contains("Business", StringComparison.OrdinalIgnoreCase)) return "Phân tích Kinh doanh";
        return position;
    }

    private static bool CategoryMatchesPosition(string category, string position)
    {
        if (string.IsNullOrWhiteSpace(category) || string.IsNullOrWhiteSpace(position)) return false;
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
        QuestionCount = s.QuestionCount,
        StartedAt = s.StartedAt,
        VoiceStartedAt = s.VoiceStartedAt,
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
            QuestionCount = s.QuestionCount,
            StartedAt = s.StartedAt,
            VoiceStartedAt = s.VoiceStartedAt,
            CompletedAt = s.CompletedAt,
            ScoreS = s.ScoreS,
            ScoreT = s.ScoreT,
            ScoreA = s.ScoreA,
            ScoreR = s.ScoreR,
            ClarityScore = s.ClarityScore,
            FeedbackSummary = s.FeedbackSummary,
            StructuredFeedback = TryDeserializeFeedback(s.StructuredFeedbackJson),
            Answers = s.Answers.OrderBy(a => a.OrderIndex)
                .Where(a => s.Status == "Completed" || a.Skipped || !string.IsNullOrWhiteSpace(a.AnswerText)
                    || a.OrderIndex == s.Answers.Where(next => !next.Skipped && string.IsNullOrWhiteSpace(next.AnswerText))
                        .OrderBy(next => next.OrderIndex).Select(next => next.OrderIndex).FirstOrDefault())
                .Select(a => new InterviewAnswerViewDto
            {
                Id = a.Id,
                OrderIndex = a.OrderIndex,
                QuestionId = a.QuestionId,
                QuestionText = a.QuestionText,
                AnswerText = a.AnswerText,
                Skipped = a.Skipped,
                DurationSec = a.DurationSec,
                IsFollowUp = a.IsFollowUp,
                QuestionCategory = a.QuestionCategory,
                AnalysisAvailable = a.AnalysisAvailable,
                RelevanceScore = a.RelevanceScore,
                CompletenessScore = a.CompletenessScore,
                TechnicalKnowledgeScore = a.TechnicalKnowledgeScore,
                ProblemSolvingScore = a.ProblemSolvingScore,
                CommunicationScore = a.CommunicationScore,
                StarScore = a.StarScore,
                CvConsistencyScore = a.CvConsistencyScore,
                StarHasSituation = a.StarHasSituation,
                StarHasTask = a.StarHasTask,
                StarHasAction = a.StarHasAction,
                StarHasResult = a.StarHasResult,
                EvidenceStatus = a.EvidenceStatus,
                EvidenceJson = a.EvidenceJson,
                AnalysisJson = a.AnalysisJson,
                FollowUpReason = a.FollowUpReason,
                EvidenceGap = a.EvidenceStatus is EvidenceStatus.MissingEvidence
                    or EvidenceStatus.WeakEvidence or EvidenceStatus.NeedsValidation
            }).ToList()
        };
        return dto;
    }
}

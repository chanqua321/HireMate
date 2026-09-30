using HireMate.BuildingBlocks;
using Common.DTOs.InterviewDto;
using Common.DTOs.PublicDto;

namespace HireMate.Modules.Interview.Abstractions;

public sealed class InterviewSpeechFile
{
    public byte[]? Audio { get; init; }
    public string ContentType { get; init; } = "audio/mpeg";
    public IServiceResult? Error { get; init; }
}

public interface IInterviewService
{
    Task<IServiceResult> BuildContextAsync(Guid userId, BuildInterviewContextDto dto);
    Task<IServiceResult> CreateSessionAsync(Guid userId, CreateInterviewSessionDto dto);
    Task<IServiceResult> GetQuestionsAsync(Guid userId, Guid sessionId);
    Task<IServiceResult> GetLanguageAsync(Guid userId, Guid sessionId);
    Task<InterviewSpeechFile> SpeakQuestionAsync(Guid userId, Guid sessionId, int orderIndex, Guid? questionId);
    Task<IServiceResult> SubmitAnswerAsync(Guid userId, Guid sessionId, SubmitAnswerDto dto);
    Task<IServiceResult> CompleteAsync(Guid userId, Guid sessionId);
    Task<IServiceResult> GetFeedbackAsync(Guid userId, Guid sessionId);
    Task<IServiceResult> GetHistoryAsync(Guid userId);
    Task<IServiceResult> GetDetailAsync(Guid userId, Guid sessionId);
    Task<IServiceResult> SuggestedAnswerAsync(Guid userId, SuggestedAnswerDto dto);
    Task<IServiceResult> StartVoiceAsync(Guid userId, Guid sessionId);
    Task<IServiceResult> UploadVoiceAsync(
        Guid userId,
        Guid sessionId,
        Stream audio,
        string fileName,
        string contentType,
        long contentLength,
        int orderIndex,
        Guid? questionId,
        string? questionText,
        int durationSec);
}


using BusinessLogic.Base;
using Common.DTOs.InterviewDto;
using Common.DTOs.PublicDto;

namespace BusinessLogic.IServices;

public interface IInterviewService
{
    Task<IServiceResult> CreateSessionAsync(Guid userId, CreateInterviewSessionDto dto);
    Task<IServiceResult> GetQuestionsAsync(Guid userId, Guid sessionId);
    Task<IServiceResult> SubmitAnswerAsync(Guid userId, Guid sessionId, SubmitAnswerDto dto);
    Task<IServiceResult> CompleteAsync(Guid userId, Guid sessionId);
    Task<IServiceResult> GetHistoryAsync(Guid userId);
    Task<IServiceResult> GetDetailAsync(Guid userId, Guid sessionId);
    Task<IServiceResult> SuggestedAnswerAsync(Guid userId, SuggestedAnswerDto dto);
    Task<IServiceResult> UploadVoiceAsync(Guid userId, Guid sessionId, Stream audio, string fileName);
}

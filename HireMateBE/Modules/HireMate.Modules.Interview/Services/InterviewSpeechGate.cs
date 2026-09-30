using Infrastructure.Models;

namespace HireMate.Modules.Interview.Services;

public static class InterviewSpeechGate
{
    public static string? Reject(InterviewSession? session, Guid userId, string? language, string? question, bool questionMatches)
    {
        if (session == null || session.UserId != userId)
            return "NOT_OWNER";
        if (session.Status is "Completed" or "Abandoned")
            return "INACTIVE";
        if (language is not ("vi" or "en"))
            return "TTS_LANGUAGE";
        if (!questionMatches)
            return "QUESTION_MISMATCH";
        var text = question?.Trim() ?? string.Empty;
        if (text.Length == 0)
            return "TTS_EMPTY";
        if (text.Length > 1500)
            return "TTS_OVERSIZE";
        return null;
    }
}

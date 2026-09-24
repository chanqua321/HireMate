namespace HireMate.Modules.Ai;

public sealed class SpeechToTextResult
{
    public bool Ok { get; init; }
    public string Transcript { get; init; } = string.Empty;
    public string Provider { get; init; } = string.Empty;
    public string? Error { get; init; }

    public static SpeechToTextResult Success(string transcript, string provider) => new()
    {
        Ok = true,
        Transcript = transcript?.Trim() ?? string.Empty,
        Provider = provider
    };

    public static SpeechToTextResult Fail(string provider, string error) => new()
    {
        Ok = false,
        Provider = provider,
        Error = error
    };
}

/// <summary>Speech-to-text abstraction — do not call provider APIs from InterviewService directly.</summary>
public interface ISpeechToTextService
{
    Task<SpeechToTextResult> TranscribeAsync(
        Stream audio,
        string fileName,
        string contentType,
        string language,
        CancellationToken ct = default);
}

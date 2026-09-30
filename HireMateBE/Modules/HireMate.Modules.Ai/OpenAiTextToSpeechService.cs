using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HireMate.Modules.Ai;

public interface ITextToSpeechService
{
    Task<TextToSpeechResult> SynthesizeAsync(string text, string language, CancellationToken cancellationToken = default);
}

public sealed record TextToSpeechResult(bool Ok, byte[] Audio, string ContentType, string ErrorCode)
{
    public static TextToSpeechResult Success(byte[] audio) =>
        new(true, audio, OpenAiTextToSpeechService.AudioContentType, string.Empty);

    public static TextToSpeechResult Fail(string errorCode) =>
        new(false, [], OpenAiTextToSpeechService.AudioContentType, errorCode);
}

/// <summary>
/// Official OpenAI POST /v1/audio/speech. Uses the same API key as chat.
/// Does not change the interview chat model.
/// </summary>
public sealed class OpenAiTextToSpeechService(
    HttpClient http,
    IOptions<AiOptions> options,
    ILogger<OpenAiTextToSpeechService> logger) : ITextToSpeechService
{
    public const string OfficialModel = "tts-1";
    public const string OfficialVoice = "alloy";
    public const string AudioContentType = "audio/mpeg";
    public const int MaxChars = 1500;

    private readonly AiOptions _options = options.Value;

    public async Task<TextToSpeechResult> SynthesizeAsync(
        string text, string language, CancellationToken cancellationToken = default)
    {
        if (language is not ("vi" or "en"))
            return TextToSpeechResult.Fail("TTS_LANGUAGE");

        var spoken = (text ?? string.Empty).Trim();
        if (spoken.Length == 0 || spoken.Length > MaxChars)
            return TextToSpeechResult.Fail(spoken.Length == 0 ? "TTS_EMPTY" : "TTS_OVERSIZE");

        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.ApiKey))
            return TextToSpeechResult.Fail("TTS_PROVIDER_FAILED");

        var provider = (_options.Provider ?? string.Empty).Trim();
        if (!provider.Equals("OpenAI", StringComparison.OrdinalIgnoreCase)
            && !provider.Equals("OpenAICompatible", StringComparison.OrdinalIgnoreCase))
            return TextToSpeechResult.Fail("TTS_PROVIDER_FAILED");

        var model = string.IsNullOrWhiteSpace(_options.TtsModel) ? OfficialModel : _options.TtsModel.Trim();
        var voice = string.IsNullOrWhiteSpace(_options.TtsVoice) ? OfficialVoice : _options.TtsVoice.Trim();
        var payload = JsonSerializer.Serialize(new
        {
            model,
            voice,
            input = spoken,
            response_format = "mp3"
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, "audio/speech")
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

        try
        {
            using var response = await http.SendAsync(request, cancellationToken);
            if ((int)response.StatusCode == 429)
                return TextToSpeechResult.Fail("TTS_RATE_LIMIT");
            if (!response.IsSuccessStatusCode)
            {
                logger.LogInformation("Interview TTS provider returned {Status}", (int)response.StatusCode);
                return TextToSpeechResult.Fail("TTS_PROVIDER_FAILED");
            }

            var bytes = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (bytes.Length < 64)
                return TextToSpeechResult.Fail("TTS_AUDIO_INVALID");
            return TextToSpeechResult.Success(bytes);
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Interview TTS provider timed out");
            return TextToSpeechResult.Fail("TTS_TIMEOUT");
        }
        catch (HttpRequestException)
        {
            logger.LogInformation("Interview TTS provider request failed");
            return TextToSpeechResult.Fail("TTS_PROVIDER_FAILED");
        }
    }
}

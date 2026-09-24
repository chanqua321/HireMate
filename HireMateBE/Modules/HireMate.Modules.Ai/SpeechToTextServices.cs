using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace HireMate.Modules.Ai;

/// <summary>OpenAI-compatible Whisper transcriptions API.</summary>
public sealed class OpenAiWhisperSpeechToTextService(
    HttpClient httpClient,
    IOptions<AiOptions> options,
    ILogger<OpenAiWhisperSpeechToTextService> logger) : ISpeechToTextService
{
    private readonly HttpClient _http = httpClient;
    private readonly AiOptions _options = options.Value;
    private readonly ILogger<OpenAiWhisperSpeechToTextService> _logger = logger;

    public async Task<SpeechToTextResult> TranscribeAsync(
        Stream audio,
        string fileName,
        string contentType,
        string language,
        CancellationToken ct = default)
    {
        const string provider = "openai-whisper";
        if (language is not ("vi" or "en"))
            return SpeechToTextResult.Fail(provider, "VOICE_LANGUAGE_INVALID");
        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.ApiKey))
            return SpeechToTextResult.Fail(provider, "STT chưa được cấu hình");

        try
        {
            // Own a copy so MultipartFormDataContent/StreamContent dispose does not touch caller's stream.
            await using var owned = new MemoryStream();
            await audio.CopyToAsync(owned, ct);
            owned.Position = 0;

            using var content = new MultipartFormDataContent();
            var streamContent = new StreamContent(owned);
            var media = string.IsNullOrWhiteSpace(contentType) ? "audio/webm" : contentType;
            streamContent.Headers.ContentType = new MediaTypeHeaderValue(media);
            var safeName = string.IsNullOrWhiteSpace(fileName) ? "voice.webm" : Path.GetFileName(fileName);
            content.Add(streamContent, "file", safeName);
            content.Add(new StringContent("whisper-1"), "model");
            content.Add(new StringContent(language), "language");
            content.Add(new StringContent("json"), "response_format");

            using var req = new HttpRequestMessage(HttpMethod.Post, "audio/transcriptions")
            {
                Content = content
            };
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(Math.Max(30, _options.TimeoutSeconds)));

            var response = await _http.SendAsync(req, cts.Token);
            var raw = await response.Content.ReadAsStringAsync(cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Whisper STT failed {Status}: {Body}", response.StatusCode,
                    raw.Length > 300 ? raw[..300] : raw);
                return SpeechToTextResult.Fail(provider, "VOICE_TRANSCRIPTION_FAILED");
            }

            using var doc = JsonDocument.Parse(raw);
            var text = doc.RootElement.TryGetProperty("text", out var t) ? t.GetString() : null;
            if (string.IsNullOrWhiteSpace(text))
                return SpeechToTextResult.Success(string.Empty, provider);

            return SpeechToTextResult.Success(text, provider);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Whisper STT unavailable");
            return SpeechToTextResult.Fail(provider, "VOICE_TRANSCRIPTION_FAILED");
        }
    }
}

/// <summary>Gemini multimodal generateContent for audio transcription.</summary>
public sealed class GeminiSpeechToTextService(
    HttpClient httpClient,
    IOptions<AiOptions> options,
    ILogger<GeminiSpeechToTextService> logger) : ISpeechToTextService
{
    private readonly HttpClient _http = httpClient;
    private readonly AiOptions _options = options.Value;
    private readonly ILogger<GeminiSpeechToTextService> _logger = logger;

    public async Task<SpeechToTextResult> TranscribeAsync(
        Stream audio,
        string fileName,
        string contentType,
        string language,
        CancellationToken ct = default)
    {
        const string provider = "gemini-stt";
        if (language is not ("vi" or "en"))
            return SpeechToTextResult.Fail(provider, "VOICE_LANGUAGE_INVALID");
        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.ApiKey))
            return SpeechToTextResult.Fail(provider, "STT chưa được cấu hình");

        try
        {
            await using var ms = new MemoryStream();
            await audio.CopyToAsync(ms, ct);
            var bytes = ms.ToArray();
            if (bytes.Length == 0)
                return SpeechToTextResult.Fail(provider, "VOICE_EMPTY_TRANSCRIPT");

            var mime = NormalizeMime(contentType, fileName);
            var b64 = Convert.ToBase64String(bytes);
            var model = string.IsNullOrWhiteSpace(_options.Model) ? "gemini-2.0-flash" : _options.Model;
            var url = $"models/{model}:generateContent?key={_options.ApiKey}";

            var payload = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new
                            {
                                inline_data = new { mime_type = mime, data = b64 }
                            },
                            new
                            {
                                text = $"Transcribe this interview answer audio to plain {(language == "en" ? "English" : "Vietnamese")} text only. " +
                                       "Do not add commentary, labels, or quotation marks. If silent, return an empty string."
                            }
                        }
                    }
                },
                generationConfig = new { temperature = 0.1, maxOutputTokens = 2048 }
            };

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(Math.Max(30, _options.TimeoutSeconds)));

            var response = await _http.PostAsJsonAsync(url, payload, cts.Token);
            var raw = await response.Content.ReadAsStringAsync(cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini STT failed {Status}: {Body}", response.StatusCode,
                    raw.Length > 300 ? raw[..300] : raw);
                return SpeechToTextResult.Fail(provider, "VOICE_TRANSCRIPTION_FAILED");
            }

            using var doc = JsonDocument.Parse(raw);
            var text = ExtractGeminiText(doc.RootElement);
            return SpeechToTextResult.Success(text ?? string.Empty, provider);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini STT unavailable");
            return SpeechToTextResult.Fail(provider, "VOICE_TRANSCRIPTION_FAILED");
        }
    }

    private static string NormalizeMime(string contentType, string fileName)
    {
        if (!string.IsNullOrWhiteSpace(contentType) && contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
            return contentType.Split(';')[0].Trim();
        var ext = Path.GetExtension(fileName)?.ToLowerInvariant();
        return ext switch
        {
            ".wav" => "audio/wav",
            ".mp3" => "audio/mpeg",
            ".ogg" => "audio/ogg",
            ".m4a" => "audio/mp4",
            _ => "audio/webm"
        };
    }

    private static string? ExtractGeminiText(JsonElement root)
    {
        if (!root.TryGetProperty("candidates", out var cands) || cands.GetArrayLength() == 0)
            return null;
        var content = cands[0].TryGetProperty("content", out var c) ? c : default;
        if (content.ValueKind != JsonValueKind.Object || !content.TryGetProperty("parts", out var parts))
            return null;
        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var t))
                return t.GetString();
        }
        return null;
    }
}

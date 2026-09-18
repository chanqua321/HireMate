using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace HireMate.Modules.Ai;

/// <summary>OpenAI chat/completions (OpenAI, Groq, Azure-compatible). Không dùng Ollama.</summary>
public class OpenAiCompatibleAiClient(
    HttpClient httpClient,
    IOptions<AiOptions> options,
    ILogger<OpenAiCompatibleAiClient> logger) : IAiClient
{
    private readonly HttpClient _http = httpClient;
    private readonly AiOptions _options = options.Value;
    private readonly ILogger<OpenAiCompatibleAiClient> _logger = logger;

    public async Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct = default, int? maxOutputChars = null)
    {
        var providerLabel = string.IsNullOrWhiteSpace(_options.Provider) ? "openai" : _options.Provider.ToLowerInvariant();
        var inputChars = systemPrompt.Length + userPrompt.Length;

        if (!_options.Enabled)
            return AiCompletionResult.Fail(providerLabel, inputChars);

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogWarning("OpenAI ApiKey missing");
            return AiCompletionResult.Fail(providerLabel, inputChars);
        }

        try
        {
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

            var payload = new
            {
                model = string.IsNullOrWhiteSpace(_options.Model) ? "gpt-4o-mini" : _options.Model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                stream = false,
                temperature = 0.4,
                max_tokens = AiLength.ToMaxTokens(maxOutputChars)
            };

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var response = await _http.PostAsJsonAsync("chat/completions", payload, cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("{Provider} returned {Status}", providerLabel, response.StatusCode);
                return AiCompletionResult.Fail(providerLabel, inputChars);
            }

            var json = await response.Content.ReadFromJsonAsync<ChatResponse>(cancellationToken: cts.Token);
            var content = json?.Choices?.FirstOrDefault()?.Message?.Content?.Trim();
            if (string.IsNullOrWhiteSpace(content))
                return AiCompletionResult.Fail(providerLabel, inputChars);

            if (maxOutputChars is > 0 && content.Length > maxOutputChars.Value)
                content = content[..maxOutputChars.Value];

            return new AiCompletionResult
            {
                Content = content,
                Provider = providerLabel,
                UsedFallback = false,
                InputChars = inputChars,
                OutputChars = content.Length
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "{Provider} unavailable", providerLabel);
            return AiCompletionResult.Fail(providerLabel, inputChars);
        }
    }

    private sealed class ChatResponse
    {
        [JsonPropertyName("choices")]
        public List<Choice>? Choices { get; set; }
    }

    private sealed class Choice
    {
        [JsonPropertyName("message")]
        public Msg? Message { get; set; }
    }

    private sealed class Msg
    {
        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }
}

/// <summary>Google Gemini generateContent API (v1beta).</summary>
public class GeminiAiClient(
    HttpClient httpClient,
    IOptions<AiOptions> options,
    ILogger<GeminiAiClient> logger) : IAiClient
{
    private readonly HttpClient _http = httpClient;
    private readonly AiOptions _options = options.Value;
    private readonly ILogger<GeminiAiClient> _logger = logger;

    public async Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct = default, int? maxOutputChars = null)
    {
        var inputChars = systemPrompt.Length + userPrompt.Length;

        if (!_options.Enabled || string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            if (string.IsNullOrWhiteSpace(_options.ApiKey))
                _logger.LogWarning("Gemini ApiKey missing");
            return AiCompletionResult.Fail("gemini", inputChars);
        }

        try
        {
            var model = string.IsNullOrWhiteSpace(_options.Model) ? "gemini-2.0-flash" : _options.Model.Trim();
            var path = $"models/{model}:generateContent?key={Uri.EscapeDataString(_options.ApiKey)}";

            var payload = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemPrompt } }
                },
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = userPrompt } }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.4,
                    maxOutputTokens = AiLength.ToMaxTokens(maxOutputChars)
                }
            };

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(Math.Max(5, _options.TimeoutSeconds)));

            var response = await _http.PostAsJsonAsync(path, payload, cts.Token);
            var raw = await response.Content.ReadAsStringAsync(cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini returned {Status}: {Body}", response.StatusCode, raw.Length > 400 ? raw[..400] : raw);
                return AiCompletionResult.Fail("gemini", inputChars);
            }

            using var doc = JsonDocument.Parse(raw);
            var text = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString()
                ?.Trim();

            if (string.IsNullOrWhiteSpace(text))
                return AiCompletionResult.Fail("gemini", inputChars);

            if (maxOutputChars is > 0 && text.Length > maxOutputChars.Value)
                text = text[..maxOutputChars.Value];

            return new AiCompletionResult
            {
                Content = text,
                Provider = "gemini",
                UsedFallback = false,
                InputChars = inputChars,
                OutputChars = text.Length
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini unavailable");
            return AiCompletionResult.Fail("gemini", inputChars);
        }
    }
}

internal static class AiLength
{
    public static int ToMaxTokens(int? maxOutputChars)
    {
        var chars = Math.Clamp(maxOutputChars ?? 1400, 200, 4000);
        return Math.Max(64, chars * 2 / 3);
    }
}



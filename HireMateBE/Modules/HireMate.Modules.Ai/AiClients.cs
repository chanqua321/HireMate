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

    public async Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt,
        CancellationToken ct = default, int? maxOutputChars = null, JsonElement? responseSchema = null)
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

            var model = string.IsNullOrWhiteSpace(_options.Model) ? "gpt-5.6-luna" : _options.Model.Trim();
            var maxOut = AiLength.ToMaxTokens(maxOutputChars);
            var messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            };

            // GPT-5.x / reasoning-family Chat Completions reject max_tokens and non-default temperature.
            object payload;
            if (UsesGpt5StyleChatParams(model))
            {
                payload = new Dictionary<string, object?>
                {
                    ["model"] = model,
                    ["messages"] = messages,
                    ["stream"] = false,
                    ["max_completion_tokens"] = maxOut,
                    // JSON extraction workloads — avoid default medium reasoning burning the completion budget.
                    ["reasoning_effort"] = "none"
                };
                if (responseSchema.HasValue)
                    ((Dictionary<string, object?>)payload)["response_format"] = new
                    {
                        type = "json_schema",
                        json_schema = new { name = "hiremate_interview_evaluation", strict = true,
                            schema = responseSchema.Value }
                    };
                _logger.LogDebug(
                    "OpenAI chat/completions model={Model} max_completion_tokens={Max} reasoning_effort=none messages={Count}",
                    model, maxOut, messages.Length);
            }
            else
            {
                payload = new Dictionary<string, object?>
                {
                    ["model"] = model,
                    ["messages"] = messages,
                    ["stream"] = false,
                    ["temperature"] = 0.4,
                    ["max_tokens"] = maxOut
                };
                if (responseSchema.HasValue)
                    ((Dictionary<string, object?>)payload)["response_format"] = new
                    {
                        type = "json_schema",
                        json_schema = new { name = "hiremate_interview_evaluation", strict = true,
                            schema = responseSchema.Value }
                    };
                _logger.LogDebug(
                    "OpenAI chat/completions model={Model} max_tokens={Max} temperature=0.4 messages={Count}",
                    model, maxOut, messages.Length);
            }

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var response = await _http.PostAsJsonAsync("chat/completions", payload, cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                var errBody = await response.Content.ReadAsStringAsync(cts.Token);
                _logger.LogWarning("{Provider} returned {Status}: {Body}", providerLabel, response.StatusCode,
                    errBody.Length > 400 ? errBody[..400] : errBody);
                return AiCompletionResult.Fail(providerLabel, inputChars);
            }

            var json = await response.Content.ReadFromJsonAsync<ChatResponse>(cancellationToken: cts.Token);
            var choice = json?.Choices?.FirstOrDefault();
            if (responseSchema.HasValue
                && string.Equals(choice?.FinishReason, "length", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("{Provider} response stopped at max tokens", providerLabel);
                return AiCompletionResult.Fail(providerLabel, inputChars);
            }
            var content = choice?.Message?.Content?.Trim();
            if (string.IsNullOrWhiteSpace(content))
                return AiCompletionResult.Fail(providerLabel, inputChars);

            // A partial JSON object can accidentally parse as a valid but incomplete analysis.
            // Reject an over-budget response intact; never slice it into another payload.
            if (maxOutputChars is > 0 && content.Length > maxOutputChars.Value)
            {
                if (responseSchema.HasValue)
                {
                    _logger.LogWarning("{Provider} evaluation output exceeded character limit ({Length}>{Limit})",
                        providerLabel, content.Length, maxOutputChars.Value);
                    return AiCompletionResult.Fail(providerLabel, inputChars);
                }
                content = TruncatePreservingJson(content, maxOutputChars.Value);
            }

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

    /// <summary>GPT-5+ / o-series Chat Completions use max_completion_tokens and omit sampling params.</summary>
    private static bool UsesGpt5StyleChatParams(string model)
    {
        var m = model.Trim().ToLowerInvariant();
        return m.StartsWith("gpt-5", StringComparison.Ordinal)
               || m.StartsWith("gpt-6", StringComparison.Ordinal)
               || m.StartsWith("o1", StringComparison.Ordinal)
               || m.StartsWith("o3", StringComparison.Ordinal)
               || m.StartsWith("o4", StringComparison.Ordinal);
    }

    // Preserve the existing behavior for non-evaluation AI calls.
    private static string TruncatePreservingJson(string content, int max)
    {
        if (content.Length <= max) return content;
        var slice = content[..max];
        var start = slice.IndexOf('{');
        if (start < 0) return slice;
        for (var end = slice.LastIndexOf('}'); end > start; end = slice.LastIndexOf('}', end - 1))
        {
            var candidate = slice[start..(end + 1)];
            try
            {
                using var _ = JsonDocument.Parse(candidate);
                return candidate;
            }
            catch (JsonException) { }
        }
        return slice;
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

        [JsonPropertyName("finish_reason")]
        public string? FinishReason { get; set; }
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

    public async Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt,
        CancellationToken ct = default, int? maxOutputChars = null, JsonElement? responseSchema = null)
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
                generationConfig = responseSchema.HasValue
                    ? (object)new { temperature = 0.4,
                        maxOutputTokens = AiLength.ToMaxTokens(maxOutputChars),
                        responseMimeType = "application/json" }
                    : new { temperature = 0.4,
                        maxOutputTokens = AiLength.ToMaxTokens(maxOutputChars) }
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
            var candidate = doc.RootElement.GetProperty("candidates")[0];
            if (responseSchema.HasValue
                && candidate.TryGetProperty("finishReason", out var finishReason)
                && string.Equals(finishReason.GetString(), "MAX_TOKENS", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Gemini response stopped at max tokens");
                return AiCompletionResult.Fail("gemini", inputChars);
            }
            var text = candidate
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString()
                ?.Trim();

            if (string.IsNullOrWhiteSpace(text))
                return AiCompletionResult.Fail("gemini", inputChars);

            if (maxOutputChars is > 0 && text.Length > maxOutputChars.Value)
            {
                if (responseSchema.HasValue)
                {
                    _logger.LogWarning("Gemini evaluation output exceeded character limit ({Length}>{Limit})",
                        text.Length, maxOutputChars.Value);
                    return AiCompletionResult.Fail("gemini", inputChars);
                }
                text = text[..maxOutputChars.Value];
            }

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
        var chars = Math.Clamp(maxOutputChars ?? 1400, 200, 8000);
        return Math.Max(64, chars * 2 / 3);
    }
}



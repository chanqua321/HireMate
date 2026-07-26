using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BusinessLogic.Ai;

/// <summary>OpenAI-compatible chat/completions (Ollama, OpenAI, Groq, Gemini OpenAI bridge, etc.).</summary>
public class OpenAiCompatibleAiClient(
    HttpClient httpClient,
    IOptions<AiOptions> options,
    HeuristicAiClient fallback,
    ILogger<OpenAiCompatibleAiClient> logger) : IAiClient
{
    private readonly HttpClient _http = httpClient;
    private readonly AiOptions _options = options.Value;
    private readonly HeuristicAiClient _fallback = fallback;
    private readonly ILogger<OpenAiCompatibleAiClient> _logger = logger;

    public async Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct = default)
    {
        var providerLabel = string.IsNullOrWhiteSpace(_options.Provider) ? "openai" : _options.Provider.ToLowerInvariant();

        if (!_options.Enabled || providerLabel is "heuristic" or "none" or "off")
            return await _fallback.CompleteAsync(systemPrompt, userPrompt, ct);

        try
        {
            if (!string.IsNullOrWhiteSpace(_options.ApiKey))
                _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);

            var payload = new
            {
                model = _options.Model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                stream = false,
                temperature = 0.4
            };

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var response = await _http.PostAsJsonAsync("chat/completions", payload, cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("{Provider} returned {Status}, using fallback", providerLabel, response.StatusCode);
                var fb = await _fallback.CompleteAsync(systemPrompt, userPrompt, ct);
                fb.UsedFallback = true;
                return fb;
            }

            var json = await response.Content.ReadFromJsonAsync<ChatResponse>(cancellationToken: cts.Token);
            var content = json?.Choices?.FirstOrDefault()?.Message?.Content?.Trim();
            if (string.IsNullOrWhiteSpace(content))
            {
                var fb = await _fallback.CompleteAsync(systemPrompt, userPrompt, ct);
                fb.UsedFallback = true;
                return fb;
            }

            return new AiCompletionResult
            {
                Content = content,
                Provider = providerLabel,
                UsedFallback = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "{Provider} unavailable, using heuristic fallback", providerLabel);
            var fb = await _fallback.CompleteAsync(systemPrompt, userPrompt, ct);
            fb.UsedFallback = true;
            return fb;
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
    HeuristicAiClient fallback,
    ILogger<GeminiAiClient> logger) : IAiClient
{
    private readonly HttpClient _http = httpClient;
    private readonly AiOptions _options = options.Value;
    private readonly HeuristicAiClient _fallback = fallback;
    private readonly ILogger<GeminiAiClient> _logger = logger;

    public async Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct = default)
    {
        if (!_options.Enabled)
            return await _fallback.CompleteAsync(systemPrompt, userPrompt, ct);

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            _logger.LogWarning("Gemini ApiKey missing, using heuristic fallback");
            var missing = await _fallback.CompleteAsync(systemPrompt, userPrompt, ct);
            missing.UsedFallback = true;
            return missing;
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
                generationConfig = new { temperature = 0.4 }
            };

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(Math.Max(5, _options.TimeoutSeconds)));

            var response = await _http.PostAsJsonAsync(path, payload, cts.Token);
            var raw = await response.Content.ReadAsStringAsync(cts.Token);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini returned {Status}: {Body}", response.StatusCode, raw.Length > 400 ? raw[..400] : raw);
                var fb = await _fallback.CompleteAsync(systemPrompt, userPrompt, ct);
                fb.UsedFallback = true;
                return fb;
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
            {
                var fb = await _fallback.CompleteAsync(systemPrompt, userPrompt, ct);
                fb.UsedFallback = true;
                return fb;
            }

            return new AiCompletionResult
            {
                Content = text,
                Provider = "gemini",
                UsedFallback = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gemini unavailable, using heuristic fallback");
            var fb = await _fallback.CompleteAsync(systemPrompt, userPrompt, ct);
            fb.UsedFallback = true;
            return fb;
        }
    }
}

public class HeuristicAiClient : IAiClient
{
    public Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct = default)
    {
        var lower = (systemPrompt + " " + userPrompt).ToLowerInvariant();
        string content;

        if (lower.Contains("cv") || lower.Contains("resume"))
        {
            content = JsonSerializer.Serialize(new
            {
                format = 72,
                keywords = 68,
                readability = 75,
                professionalism = 70,
                suggestions = new[]
                {
                    "Thêm số liệu đo lường (%, số lượng) vào bullet points.",
                    "Bổ sung kỹ năng cứng khớp JD mục tiêu.",
                    "Rút gọn phần mô tả dài, ưu tiên thành tựu."
                },
                missingKeywords = new[] { "teamwork", "agile", "API" }
            });
        }
        else if (lower.Contains("jd") || lower.Contains("match"))
        {
            content = JsonSerializer.Serialize(new
            {
                overall = 74,
                skills = 78,
                experience = 70,
                education = 80,
                projects = 72,
                keywords = 68,
                gaps = new[] { "Thiếu kinh nghiệm cloud", "Chưa nêu leadership rõ" },
                suggestions = new[] { "Nhấn mạnh dự án liên quan JD", "Bổ sung chứng chỉ liên quan" }
            });
        }
        else if (lower.Contains("career path") || lower.Contains("lộ trình"))
        {
            content = JsonSerializer.Serialize(new
            {
                stages = new[]
                {
                    new { title = "Intern / Fresher", focus = "Nền tảng kỹ thuật + portfolio" },
                    new { title = "Junior", focus = "Làm việc nhóm, ownership feature nhỏ" },
                    new { title = "Mid", focus = "Thiết kế hệ thống, mentor junior" }
                },
                skillsToLearn = new[] { "Thiết kế hệ thống", "Kiểm thử", "Giao tiếp" }
            });
        }
        else if (lower.Contains("learning") || lower.Contains("học"))
        {
            content = JsonSerializer.Serialize(new
            {
                courses = new[]
                {
                    new { title = "Làm chủ phỏng vấn STAR", type = "Khóa học", hours = 4 },
                    new { title = "Workshop CV chuẩn ATS", type = "Workshop", hours = 2 },
                    new { title = "Dự án: Xây dựng app portfolio", type = "Dự án", hours = 20 }
                }
            });
        }
        else if (lower.Contains("email") || lower.Contains("thư"))
        {
            content = """
Kính gửi Anh/Chị Tuyển dụng,

Em là ứng viên quan tâm vị trí đang tuyển. Em đã chuẩn bị CV và portfolio phù hợp yêu cầu.

Em rất mong có cơ hội trao đổi thêm. Xin cảm ơn Anh/Chị.

Trân trọng,
Ứng viên HireMate
""";
        }
        else if (lower.Contains("suggested") || lower.Contains("mẫu") || lower.Contains("star"))
        {
            content = "Situation: Trong dự án X...\nTask: Em được giao...\nAction: Em đã...\nResult: Kết quả đạt Y% cải thiện.";
        }
        else
        {
            var sb = new StringBuilder();
            sb.AppendLine("Phản hồi heuristic (AI offline):");
            sb.AppendLine("- Tập trung STAR: Situation → Task → Action → Result.");
            sb.AppendLine("- Thêm số liệu cụ thể và bài học rút ra.");
            content = sb.ToString();
        }

        return Task.FromResult(new AiCompletionResult
        {
            Content = content,
            Provider = "heuristic",
            UsedFallback = true
        });
    }
}

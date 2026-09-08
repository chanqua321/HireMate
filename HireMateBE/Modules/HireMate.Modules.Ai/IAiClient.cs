namespace HireMate.Modules.Ai;

public class AiOptions
{
    public const string SectionName = "Ai";
    public bool Enabled { get; set; } = true;
    /// <summary>Gemini | OpenAI | OpenAICompatible. Không dùng Ollama/Heuristic.</summary>
    public string Provider { get; set; } = "Gemini";
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
    public string Model { get; set; } = "gemini-2.0-flash";
    public string? ApiKey { get; set; }
    public int TimeoutSeconds { get; set; } = 60;
}

public class AiCompletionResult
{
    public string Content { get; set; } = string.Empty;
    public string Provider { get; set; } = "gemini";
    public bool UsedFallback { get; set; }
    public int InputChars { get; set; }
    public int OutputChars { get; set; }

    public static AiCompletionResult Fail(string provider, int inputChars = 0) => new()
    {
        Content = string.Empty,
        Provider = provider,
        UsedFallback = false,
        InputChars = inputChars,
        OutputChars = 0
    };
}

public interface IAiClient
{
    Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct = default, int? maxOutputChars = null);
}



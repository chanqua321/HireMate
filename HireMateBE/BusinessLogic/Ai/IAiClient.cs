namespace BusinessLogic.Ai;

public class AiOptions
{
    public const string SectionName = "Ai";
    public bool Enabled { get; set; } = true;
    /// <summary>Ollama | OpenAI | OpenAICompatible | Gemini | Heuristic</summary>
    public string Provider { get; set; } = "Ollama";
    public string BaseUrl { get; set; } = "http://localhost:11434/v1";
    public string Model { get; set; } = "llama3.2";
    public string? ApiKey { get; set; }
    public int TimeoutSeconds { get; set; } = 60;
}

public class AiCompletionResult
{
    public string Content { get; set; } = string.Empty;
    public string Provider { get; set; } = "heuristic";
    public bool UsedFallback { get; set; }
}

public interface IAiClient
{
    Task<AiCompletionResult> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct = default);
}

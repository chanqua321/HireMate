using HireMate.Modules.Ai;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HireMate.Modules.Ai;

public static class DependencyInjection
{
    public static IServiceCollection AddAiModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AiOptions>(configuration.GetSection(AiOptions.SectionName));
        services.AddHttpClient<OpenAiCompatibleAiClient>((sp, client) =>
        {
            var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AiOptions>>().Value;
            var baseUrl = string.IsNullOrWhiteSpace(opts.BaseUrl) ? "https://api.openai.com/v1" : opts.BaseUrl;
            client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(Math.Max(5, opts.TimeoutSeconds));
        });
        services.AddHttpClient<GeminiAiClient>((sp, client) =>
        {
            var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AiOptions>>().Value;
            var baseUrl = string.IsNullOrWhiteSpace(opts.BaseUrl)
                ? "https://generativelanguage.googleapis.com/v1beta"
                : opts.BaseUrl;
            client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(Math.Max(5, opts.TimeoutSeconds));
        });
        services.AddHttpClient<OpenAiWhisperSpeechToTextService>((sp, client) =>
        {
            var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AiOptions>>().Value;
            // Whisper is always OpenAI-compatible endpoint; if Gemini provider, still try openai BaseUrl override or default.
            var baseUrl = opts.Provider.Equals("Gemini", StringComparison.OrdinalIgnoreCase)
                ? "https://api.openai.com/v1"
                : (string.IsNullOrWhiteSpace(opts.BaseUrl) ? "https://api.openai.com/v1" : opts.BaseUrl);
            // When provider is OpenAI, reuse same BaseUrl.
            if (opts.Provider.Equals("OpenAI", StringComparison.OrdinalIgnoreCase)
                || opts.Provider.Equals("OpenAICompatible", StringComparison.OrdinalIgnoreCase))
                baseUrl = string.IsNullOrWhiteSpace(opts.BaseUrl) ? "https://api.openai.com/v1" : opts.BaseUrl;
            client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(Math.Max(60, opts.TimeoutSeconds));
        });
        services.AddHttpClient<GeminiSpeechToTextService>((sp, client) =>
        {
            var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AiOptions>>().Value;
            var baseUrl = string.IsNullOrWhiteSpace(opts.BaseUrl)
                ? "https://generativelanguage.googleapis.com/v1beta"
                : opts.BaseUrl;
            // Gemini chat may use OpenAI BaseUrl when provider=OpenAI — force Gemini host for STT.
            if (!baseUrl.Contains("generativelanguage", StringComparison.OrdinalIgnoreCase))
                baseUrl = "https://generativelanguage.googleapis.com/v1beta";
            client.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
            client.Timeout = TimeSpan.FromSeconds(Math.Max(60, opts.TimeoutSeconds));
        });
        services.AddScoped<IAiClient>(sp =>
        {
            var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AiOptions>>().Value;
            var provider = (opts.Provider ?? "Gemini").Trim();
            if (provider.Equals("Ollama", StringComparison.OrdinalIgnoreCase)
                || provider.Equals("Heuristic", StringComparison.OrdinalIgnoreCase)
                || provider.Equals("Llama", StringComparison.OrdinalIgnoreCase))
                provider = "Gemini";
            if (provider.Equals("Gemini", StringComparison.OrdinalIgnoreCase))
                return sp.GetRequiredService<GeminiAiClient>();
            return sp.GetRequiredService<OpenAiCompatibleAiClient>();
        });
        services.AddScoped<ISpeechToTextService>(sp =>
        {
            var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<AiOptions>>().Value;
            var provider = (opts.Provider ?? "Gemini").Trim();
            if (provider.Equals("Gemini", StringComparison.OrdinalIgnoreCase))
                return sp.GetRequiredService<GeminiSpeechToTextService>();
            return sp.GetRequiredService<OpenAiWhisperSpeechToTextService>();
        });
        services.AddScoped<IAiQuotaService, AiQuotaService>();
        services.AddScoped<IAiTextAssistService, AiTextAssistService>();
        return services;
    }
}


using System.Net;
using System.Reflection;
using APIs.Controllers.Interview;
using HireMate.Modules.Ai;
using HireMate.Modules.Interview.Services;
using Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

internal static class InterviewTtsSmoke
{
    public static async Task RunAsync(Action<bool, string> check)
    {
        var controller = typeof(InterviewController);
        check(controller.GetCustomAttribute<AuthorizeAttribute>() != null, "4 unauthenticated speech is rejected by controller auth");
        var speech = controller.GetMethod("Speech");
        check(speech != null && speech.GetCustomAttribute<AllowAnonymousAttribute>() == null, "4 speech action is not anonymous");
        check(speech!.GetCustomAttribute<EnableRateLimitingAttribute>() != null, "speech action is rate limited");

        var owner = Guid.NewGuid();
        var session = new InterviewSession { Id = Guid.NewGuid(), UserId = owner, Status = "InProgress" };
        const string vi = "Sự khác nhau giữa SQL và NoSQL? Khi nào nên dùng loại nào?";
        const string en = "Can you explain the difference between SQL and NoSQL?";
        check(InterviewSpeechGate.Reject(session, Guid.NewGuid(), "vi", vi, true) == "NOT_OWNER", "5 wrong session owner rejected");
        check(InterviewSpeechGate.Reject(null, owner, "vi", vi, true) == "NOT_OWNER", "5 missing session rejected");
        check(InterviewSpeechGate.Reject(session, owner, "fr", vi, true) == "TTS_LANGUAGE", "3 unsupported language rejected");
        check(InterviewSpeechGate.Reject(session, owner, "vi", new string('a', 1501), true) == "TTS_OVERSIZE", "6 oversized text rejected");
        check(InterviewSpeechGate.Reject(session, owner, "vi", vi, false) == "QUESTION_MISMATCH", "question from another row rejected");
        check(InterviewSpeechGate.Reject(session, owner, "vi", vi, true) == null, "1 vi session can request Vietnamese TTS");
        check(InterviewSpeechGate.Reject(session, owner, "en", en, true) == null, "2 en session can request English TTS");

        var viAudio = await Speak("vi", vi, new TtsHandler());
        check(viAudio.Ok && viAudio.ContentType == "audio/mpeg" && viAudio.Audio.Length > 64, "11 successful audio response");
        check(viAudio.ContentType == "audio/mpeg", "12 correct Content-Type");

        var enHandler = new TtsHandler();
        var enAudio = await Speak("en", en, enHandler);
        check(enAudio.Ok && Field(enHandler.Body, "input") == en && Field(enHandler.Body, "model") == "tts-1", "2 en session requests English TTS");
        check(Field(enHandler.Body, "response_format") == "mp3" && !enHandler.Body.Contains("translate.google"), "12 mp3 request and no unofficial TTS URL");

        var viHandler = new TtsHandler();
        await Speak("vi", vi, viHandler);
        check(Field(viHandler.Body, "input") == vi && Field(viHandler.Body, "model") == "tts-1", "1 vi session requests Vietnamese TTS");

        check(!(await Speak("fr", vi, new TtsHandler())).Ok, "3 client rejects unsupported language");
        check((await Speak("vi", new string('b', 1501), new TtsHandler())).ErrorCode == "TTS_OVERSIZE", "6 client rejects oversized text");
        check((await Speak("vi", vi, new TtsHandler { Timeout = true })).ErrorCode == "TTS_TIMEOUT", "7 provider timeout");
        check((await Speak("vi", vi, new TtsHandler { Status = HttpStatusCode.TooManyRequests })).ErrorCode == "TTS_RATE_LIMIT", "8 provider 429");
        check((await Speak("vi", vi, new TtsHandler { Status = HttpStatusCode.InternalServerError })).ErrorCode == "TTS_PROVIDER_FAILED", "9 provider 5xx");
        check((await Speak("vi", vi, new TtsHandler { Payload = [1, 2, 3] })).ErrorCode == "TTS_AUDIO_INVALID", "10 invalid/empty audio");

        var cache = new InterviewSpeechAudioCache();
        var calls = 0;
        var key = InterviewSpeechAudioCache.Key(session.Id, 0, "vi", vi);
        var first = cache.GetOrCreateAsync(key, async () =>
        {
            Interlocked.Increment(ref calls);
            await Task.Delay(30);
            return new byte[80];
        });
        var second = cache.GetOrCreateAsync(key, () =>
        {
            Interlocked.Increment(ref calls);
            return Task.FromResult<byte[]?>(new byte[80]);
        });
        var both = await Task.WhenAll(first, second);
        check(both[0]!.Length == 80 && both[1]!.Length == 80, "13 replay uses cached audio");
        check(calls == 1, "14 double replay does not duplicate provider call");
        check(cache.TryGet(key, out _), "13 cache retains the generated audio");
        var allowed = 0;
        for (var i = 0; i < 40; i++)
            if (cache.AllowNewProviderCall(owner)) allowed++;
        check(allowed == InterviewSpeechAudioCache.MaxNewCallsPer10Minutes, "rate limit blocks calls after 30 new generations");
    }

    private static string? Field(string json, string name)
    {
        using var document = System.Text.Json.JsonDocument.Parse(json);
        return document.RootElement.GetProperty(name).GetString();
    }

    private static Task<TextToSpeechResult> Speak(string language, string text, TtsHandler handler)
    {
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://example.test/") };
        var client = new OpenAiTextToSpeechService(http,
            Options.Create(new AiOptions { Enabled = true, Provider = "OpenAI", ApiKey = "test-only" }),
            NullLogger<OpenAiTextToSpeechService>.Instance);
        return client.SynthesizeAsync(text, language);
    }

    private sealed class TtsHandler : HttpMessageHandler
    {
        public string Body { get; private set; } = string.Empty;
        public HttpStatusCode Status { get; init; } = HttpStatusCode.OK;
        public byte[] Payload { get; init; } = new byte[80];
        public bool Timeout { get; init; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (Timeout) throw new TaskCanceledException("Synthetic provider timeout");
            Body = request.Content == null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
            if (Status != HttpStatusCode.OK)
                return new HttpResponseMessage(Status);
            var content = new ByteArrayContent(Payload);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("audio/mpeg");
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = content };
        }
    }
}

internal static class InterviewTtsLive
{
    public static async Task RunAsync(string settingsPath)
    {
        using var settings = System.Text.Json.JsonDocument.Parse(File.ReadAllText(settingsPath),
            new System.Text.Json.JsonDocumentOptions { CommentHandling = System.Text.Json.JsonCommentHandling.Skip, AllowTrailingCommas = true });
        var ai = settings.RootElement.GetProperty("Ai");
        var options = new AiOptions
        {
            Enabled = true,
            Provider = ai.GetProperty("Provider").GetString() ?? "OpenAI",
            BaseUrl = ai.GetProperty("BaseUrl").GetString() ?? "https://api.openai.com/v1",
            ApiKey = ai.GetProperty("ApiKey").GetString(),
            TtsModel = ai.TryGetProperty("TtsModel", out var model) ? model.GetString() ?? "tts-1" : "tts-1",
            TtsVoice = ai.TryGetProperty("TtsVoice", out var voice) ? voice.GetString() ?? "alloy" : "alloy"
        };
        using var http = new HttpClient { BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/"), Timeout = TimeSpan.FromSeconds(20) };
        var client = new OpenAiTextToSpeechService(http, Options.Create(options), NullLogger<OpenAiTextToSpeechService>.Instance);
        var samples = new (string Language, string Text, string File)[]
        {
            ("vi", "Sự khác nhau giữa SQL và NoSQL? Khi nào nên dùng loại nào?", "hiremate-tts-vi.mp3"),
            ("en", "Can you explain the difference between SQL and NoSQL?", "hiremate-tts-en.mp3")
        };
        foreach (var sample in samples)
        {
            var result = await client.SynthesizeAsync(sample.Text, sample.Language);
            var path = Path.Combine(Path.GetTempPath(), sample.File);
            if (result.Ok) await File.WriteAllBytesAsync(path, result.Audio);
            var header = result.Audio.Length >= 3 ? Convert.ToHexString(result.Audio.AsSpan(0, 3)) : "";
            Console.WriteLine($"{sample.Language} ok={result.Ok} bytes={result.Audio.Length} type={result.ContentType} error={result.ErrorCode} header={header} file={(result.Ok ? path : "")}");
        }
    }
}

using System.Collections.Concurrent;

namespace HireMate.Modules.Interview.Services;

/// <summary>Process memory only. Generated speech is not stored in SQL Server.</summary>
public sealed class InterviewSpeechAudioCache
{
    private readonly ConcurrentDictionary<string, byte[]> _audio = new();
    private readonly ConcurrentDictionary<string, Task<byte[]?>> _inflight = new();
    private readonly ConcurrentDictionary<string, RateWindow> _rates = new();

    public const int MaxNewCallsPer10Minutes = 30;

    public static string Key(Guid sessionId, int orderIndex, string language, string question) =>
        $"{sessionId:N}:{orderIndex}:{language}:{question.Trim()}";

    public bool TryGet(string key, out byte[] audio) => _audio.TryGetValue(key, out audio!);

    public async Task<byte[]?> GetOrCreateAsync(string key, Func<Task<byte[]?>> factory)
    {
        if (_audio.TryGetValue(key, out var cached))
            return cached;

        var created = false;
        var task = _inflight.GetOrAdd(key, _ =>
        {
            created = true;
            return factory();
        });

        try
        {
            var audio = await task;
            if (audio is { Length: > 0 })
                _audio[key] = audio;
            return audio;
        }
        finally
        {
            if (created)
                _inflight.TryRemove(key, out _);
        }
    }

    public bool AllowNewProviderCall(Guid userId)
    {
        var now = DateTime.UtcNow;
        var window = _rates.AddOrUpdate(
            userId.ToString(),
            _ => new RateWindow(now, 1),
            (_, existing) => now - existing.Start > TimeSpan.FromMinutes(10)
                ? new RateWindow(now, 1)
                : existing with { Count = existing.Count + 1 });
        return window.Count <= MaxNewCallsPer10Minutes;
    }

    public void Reset()
    {
        _audio.Clear();
        _inflight.Clear();
        _rates.Clear();
    }

    private sealed record RateWindow(DateTime Start, int Count);
}

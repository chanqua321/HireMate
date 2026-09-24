namespace HireMate.Modules.Onboarding.Storage;

/// <summary>Private file storage. Keys are opaque to callers and never public URLs.</summary>
public interface IFileStorageService
{
    Task SaveAsync(string key, Stream content, CancellationToken cancellationToken = default);
    Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default);
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>Map an old, owner-scoped physical CV path to a read/delete key. Returns null for unsafe paths.</summary>
    string? ResolveExistingKey(string storedPath, Guid ownerId);
}

public static class CvStorageKeys
{
    public static string Original(Guid userId, Guid cvId, string extension)
    {
        if (extension is not (".pdf" or ".docx"))
            throw new ArgumentException("Unsupported CV extension.", nameof(extension));
        return $"users/{userId:N}/cv/{cvId:N}/original{extension}";
    }

    public static string Generated(Guid userId, Guid cvId) => $"users/{userId:N}/cv/{cvId:N}/generated.pdf";
}

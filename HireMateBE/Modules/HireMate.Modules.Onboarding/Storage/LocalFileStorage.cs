using System.Text;
using System.Text.RegularExpressions;

namespace HireMate.Modules.Onboarding.Storage;

/// <summary>Local development/test provider; never register this for production.</summary>
public sealed class LocalFileStorage : IFileStorageService
{
    private static readonly Regex NewKey = new(
        @"^users/[0-9a-f]{32}/cv/[0-9a-f]{32}/(?:original\.(?:pdf|docx)|generated\.pdf)$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private readonly string _root;
    private readonly string _legacyPublic;
    private readonly string _legacyPrivate;

    public LocalFileStorage(string rootPath, string legacyPublicRoot, string legacyPrivateRoot)
    {
        if (string.IsNullOrWhiteSpace(rootPath) || !Path.IsPathFullyQualified(rootPath))
            throw new ArgumentException("FileStorage:RootPath must be an absolute path.", nameof(rootPath));
        _root = Path.GetFullPath(rootPath);
        _legacyPublic = Path.GetFullPath(legacyPublicRoot);
        _legacyPrivate = Path.GetFullPath(legacyPrivateRoot);
        var webRoot = Directory.GetParent(Directory.GetParent(_legacyPublic)!.FullName)!.FullName;
        if (_root.Equals(webRoot, OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal)
            || IsWithin(_root, webRoot) || IsWithin(_root, _legacyPrivate))
            throw new ArgumentException("FileStorage:RootPath cannot be inside a public or legacy upload directory.");
    }

    public async Task SaveAsync(string key, Stream content, CancellationToken cancellationToken = default)
    {
        if (key.StartsWith("legacy:", StringComparison.Ordinal))
            throw new InvalidOperationException("Legacy files are read-only; new files need logical keys.");
        var path = Resolve(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        // A failed copy must not leave an apparently valid file.
        var temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        try
        {
            await using (var output = new FileStream(temp, FileMode.CreateNew, FileAccess.Write, FileShare.None))
                await content.CopyToAsync(output, cancellationToken);
            File.Move(temp, path, overwrite: true);
        }
        finally
        {
            if (File.Exists(temp)) File.Delete(temp);
        }
    }

    public Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        Stream stream = new FileStream(Resolve(key), FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult(stream);
    }

    public Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(File.Exists(Resolve(key)));
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        File.Delete(Resolve(key)); // Missing files are already deleted.
        return Task.CompletedTask;
    }

    public string? ResolveExistingKey(string storedPath, Guid ownerId)
    {
        if (NewKey.IsMatch(storedPath))
            return storedPath.StartsWith($"users/{ownerId:N}/cv/", StringComparison.Ordinal) ? storedPath : null;
        if (!Path.IsPathFullyQualified(storedPath)) return null;
        string full;
        try { full = Path.GetFullPath(storedPath); }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException) { return null; }
        foreach (var (prefix, root) in new[] { ("public", _legacyPublic), ("private", _legacyPrivate) })
        {
            var ownerDirectory = Path.Combine(root, ownerId.ToString());
            var fileName = Path.GetFileName(full);
            if (string.IsNullOrWhiteSpace(fileName) || !Path.GetDirectoryName(full)!.Equals(ownerDirectory,
                    OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal))
                continue;
            var encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(fileName)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
            return $"legacy:{prefix}:{ownerId:N}:{encoded}";
        }
        return null;
    }

    private string Resolve(string key)
    {
        if (NewKey.IsMatch(key))
        {
            var full = Path.GetFullPath(Path.Combine(_root, key.Replace('/', Path.DirectorySeparatorChar)));
            if (!IsWithin(full, _root)) throw new InvalidOperationException("Invalid storage key.");
            return full;
        }
        var parts = key.Split(':');
        if (parts.Length == 4 && parts[0] == "legacy" && parts[1] is "public" or "private"
            && Guid.TryParseExact(parts[2], "N", out var owner)
            && Regex.IsMatch(parts[3], "^[A-Za-z0-9_-]+$"))
        {
            var base64 = parts[3].Replace('-', '+').Replace('_', '/');
            base64 = base64.PadRight((base64.Length + 3) / 4 * 4, '=');
            string fileName;
            try { fileName = Encoding.UTF8.GetString(Convert.FromBase64String(base64)); }
            catch (FormatException) { throw new ArgumentException("Invalid legacy storage key.", nameof(key)); }
            if (fileName.Length == 0 || fileName is "." or ".." || fileName != Path.GetFileName(fileName)
                || fileName.Contains('/') || fileName.Contains('\\'))
                throw new ArgumentException("Invalid legacy storage key.", nameof(key));
            var root = parts[1] == "public" ? _legacyPublic : _legacyPrivate;
            var path = Path.GetFullPath(Path.Combine(root, owner.ToString(), fileName));
            if (!IsWithin(path, root)) throw new ArgumentException("Invalid legacy storage key.", nameof(key));
            return path;
        }
        throw new ArgumentException("Invalid storage key.", nameof(key));
    }

    private static bool IsWithin(string path, string parent)
        => path.StartsWith(parent.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar,
            OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
}

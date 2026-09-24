namespace HireMate.Modules.Onboarding.Storage;

/// <summary>Private storage for a single Linux server with an explicit persistent mount.</summary>
public static class PersistentVolumeStorage
{
    public static IFileStorageService Create(string? root, string contentRoot)
    {
        if (!OperatingSystem.IsLinux() || string.IsNullOrWhiteSpace(root) || !Path.IsPathFullyQualified(root))
            throw new InvalidOperationException("PersistentVolume requires Linux and an absolute FileStorage:RootPath.");

        var normalized = Path.GetFullPath(root).TrimEnd('/');
        // Fail closed if Compose's volume was omitted. A directory in the container is not durable.
        var mounted = File.ReadLines("/proc/self/mountinfo")
            .Select(line => line.Split(' '))
            .Any(parts => parts.Length > 4 && parts[4] == normalized && normalized != "/");
        if (!mounted)
            throw new InvalidOperationException("FileStorage:RootPath must be a dedicated persistent mount point.");

        return new LocalFileStorage(normalized,
            Path.Combine(contentRoot, "wwwroot", "uploads", "cv"),
            Path.Combine(contentRoot, "private-uploads", "cv"));
    }
}

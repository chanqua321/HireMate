using HireMate.Modules.Onboarding.Storage;

internal static class FileStorageSmoke
{
    public static async Task RunAsync(Action<bool, string> check)
    {
        var sandbox = Path.Combine(Path.GetTempPath(), $"hiremate-storage-smoke-{Guid.NewGuid():N}");
        var root = Path.Combine(sandbox, "private-files");
        var publicRoot = Path.Combine(sandbox, "wwwroot", "uploads", "cv");
        var privateLegacyRoot = Path.Combine(sandbox, "private-uploads", "cv");
        var storage = new LocalFileStorage(root, publicRoot, privateLegacyRoot);
        var userA = Guid.NewGuid();
        var userB = Guid.NewGuid();
        var cvA = Guid.NewGuid();
        var cvB = Guid.NewGuid();
        var pdfKey = CvStorageKeys.Original(userA, cvA, ".pdf");
        var sameNameKey = CvStorageKeys.Original(userA, cvB, ".pdf");
        var generated = CvStorageKeys.Generated(userA, cvA);
        try
        {
            await storage.SaveAsync(pdfKey, new MemoryStream("PDF A"u8.ToArray()));
            await storage.SaveAsync(sameNameKey, new MemoryStream("PDF B"u8.ToArray()));
            check(await storage.ExistsAsync(pdfKey) && await storage.ExistsAsync(sameNameKey)
                  && !pdfKey.Equals(sameNameKey), "CVs with the same filename have collision-free keys");
            await using (var input = await storage.OpenReadAsync(pdfKey))
            using (var reader = new StreamReader(input))
                check(await reader.ReadToEndAsync() == "PDF A", "Local storage saves and reads CV content");

            check(storage.ResolveExistingKey(pdfKey, userA) == pdfKey
                  && storage.ResolveExistingKey(pdfKey, userB) == null,
                "Storage keys are resolved only for the owning CV user");
            check(storage.ResolveExistingKey(Path.Combine(root, "..", "other.pdf"), userA) == null,
                "Untrusted legacy paths cannot escape configured roots");

            var blocked = false;
            try { await storage.SaveAsync("users/../../outside.pdf", new MemoryStream([1])); }
            catch (ArgumentException) { blocked = true; }
            check(blocked && !File.Exists(Path.Combine(sandbox, "outside.pdf")), "Traversal key rejected");

            await storage.SaveAsync(generated, new MemoryStream("%PDF-1.7 generated"u8.ToArray()));
            await using (var input = await storage.OpenReadAsync(generated))
                check(input.Length > 0, "Generated PDF uses the same storage contract");
            await storage.DeleteAsync(generated);
            check(!await storage.ExistsAsync(generated), "Generated PDF deleted");
            await storage.DeleteAsync(pdfKey);
            check(!await storage.ExistsAsync(pdfKey) && await storage.ExistsAsync(sameNameKey),
                "Deleting one CV leaves another CV intact");
            await storage.DeleteAsync(pdfKey);
            check(!await storage.ExistsAsync(pdfKey), "Missing-file delete is idempotent");
            blocked = false;
            try { await storage.OpenReadAsync("invalid-key"); }
            catch (ArgumentException) { blocked = true; }
            check(blocked, "Invalid storage key cannot be opened");

            var legacyDir = Path.Combine(publicRoot, userA.ToString());
            Directory.CreateDirectory(legacyDir);
            var legacyPath = Path.Combine(legacyDir, "legacy CV.pdf");
            await File.WriteAllBytesAsync(legacyPath, "old CV"u8.ToArray());
            var legacyKey = storage.ResolveExistingKey(legacyPath, userA);
            check(legacyKey != null && await storage.ExistsAsync(legacyKey)
                  && storage.ResolveExistingKey(legacyPath, userB) == null,
                "Old public CV path is readable only through owner-scoped compatibility key");
        }
        finally
        {
            if (Directory.Exists(sandbox)) Directory.Delete(sandbox, recursive: true);
        }
    }
}

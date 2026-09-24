using System.IO.Compression;
using System.Text.Json;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using HireMate.Modules.Onboarding.Cv;
using HireMate.Modules.Onboarding.Services;
using HireMate.Modules.Onboarding.Storage;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

internal static class CvUploadSmoke
{
    public static async Task RunAsync(Action<bool, string> check)
    {
        QuestPDF.Settings.License = LicenseType.Community;
        var pdf = QuestPDF.Fluent.Document.Create(root => root.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Content().Text("Valid CV PDF content");
        })).GeneratePdf();
        var docx = BuildDocx();

        var validPdf = await CvUploadValidator.ValidateAsync(File(pdf, "cv.pdf", "application/pdf"));
        check(validPdf.IsValid && validPdf.Bytes!.SequenceEqual(pdf), "Valid PDF upload bytes accepted");
        var validDocx = await CvUploadValidator.ValidateAsync(File(docx, "cv.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
        check(validDocx.IsValid && validDocx.Bytes!.SequenceEqual(docx), "Valid DOCX upload bytes accepted");

        var badPdf = File("not a PDF"u8.ToArray(), "cv.pdf", "application/pdf");
        var brokenPdf = File("%PDF-1.7\nnot a complete document"u8.ToArray(), "broken.pdf", "application/pdf");
        var badZip = File(BuildUnrelatedZip(), "cv.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        var oversized = File(new byte[CvUploadValidator.MaxFileBytes + 1], "cv.pdf", "application/pdf");
        var unsupported = File("<html>CV</html>"u8.ToArray(), "cv.html", "text/html");
        var legacyDoc = File(docx, "cv.doc", "application/msword");
        var wrongMime = File(pdf, "cv.pdf", "text/html");
        check(!(await CvUploadValidator.ValidateAsync(badPdf)).IsValid,
            "PDF extension without PDF signature is rejected");
        check(!(await CvUploadValidator.ValidateAsync(brokenPdf)).IsValid,
            "Corrupt PDF with a valid header is rejected");
        check(!(await CvUploadValidator.ValidateAsync(badZip)).IsValid,
            "Non-OOXML ZIP renamed DOCX is rejected");
        check(!(await CvUploadValidator.ValidateAsync(oversized)).IsValid,
            "CV over 10 MB is rejected");
        check(!(await CvUploadValidator.ValidateAsync(unsupported)).IsValid,
            "Unsupported CV extension is rejected");
        check(!(await CvUploadValidator.ValidateAsync(legacyDoc)).IsValid,
            "Legacy DOC is outside the PDF/DOCX upload contract");
        check(!(await CvUploadValidator.ValidateAsync(wrongMime)).IsValid,
            "Mismatched MIME is rejected despite valid PDF bytes");

        // Null dependencies make any repository or quota call fail the smoke check. The
        // rejected request must return before even creating an upload directory.
        var rejectionRoot = Path.Combine(Path.GetTempPath(), $"hiremate-reject-{Guid.NewGuid():N}");
        var rejectionStorage = new LocalFileStorage(
            Path.Combine(rejectionRoot, "private-files"),
            Path.Combine(rejectionRoot, "wwwroot", "uploads", "cv"),
            Path.Combine(rejectionRoot, "private-uploads", "cv"));
        var service = new CvService(null!, null!, null!, null!, rejectionStorage, NullLogger<CvService>.Instance);
        var uploadRoot = Path.Combine(Path.GetTempPath(), $"hiremate-cv-reject-{Guid.NewGuid():N}");
        foreach (var invalid in new[] { badPdf, brokenPdf, badZip, oversized, unsupported, legacyDoc, wrongMime })
        {
            var result = await service.UploadAsync(Guid.NewGuid(), invalid);
            check(result.Status <= 0 && !Directory.Exists(uploadRoot),
                $"Rejected {invalid.FileName} creates no file, CV record or quota usage");
        }

        var pdfPath = Path.Combine(Path.GetTempPath(), $"hiremate-valid-{Guid.NewGuid():N}.pdf");
        var docxPath = Path.ChangeExtension(pdfPath, ".docx");
        try
        {
            await System.IO.File.WriteAllBytesAsync(pdfPath, validPdf.Bytes!);
            await System.IO.File.WriteAllBytesAsync(docxPath, validDocx.Bytes!);
            check(CvTextExtractor.ExtractFromFile(pdfPath, "cv.pdf").Contains("Valid CV PDF content"),
                "Accepted PDF remains readable by the existing CV extractor");
            check(CvTextExtractor.ExtractFromFile(docxPath, "cv.docx").Contains("Valid CV DOCX content"),
                "Accepted DOCX remains readable by the existing CV extractor");
        }
        finally
        {
            System.IO.File.Delete(pdfPath);
            System.IO.File.Delete(docxPath);
        }

        await RunPersistenceSmokeAsync(pdf, docx, check);
    }

    private static async Task RunPersistenceSmokeAsync(byte[] pdf, byte[] docx, Action<bool, string> check)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<HireMateContext>().UseSqlite(connection).Options;
        await using var db = new HireMateContext(options);
        await db.Database.EnsureCreatedAsync();
        var userId = Guid.NewGuid();
        db.Users.Add(new UserAccount { Id = userId, UserName = "cv-smoke@example.test",
            Email = "cv-smoke@example.test", FullName = "CV Smoke" });
        db.CvTemplates.Add(new CvTemplate { Id = CvSystemTemplateIds.Modern01,
            Name = "Modern 01", IsSystemTemplate = true, IsActive = true });
        await db.SaveChangesAsync();

        using var uow = new UnitOfWork(db);
        var testRoot = Path.Combine(Path.GetTempPath(), $"hiremate-cv-persistence-{Guid.NewGuid():N}");
        var webRoot = Path.Combine(testRoot, "wwwroot");
        var storageRoot = Path.Combine(testRoot, "private-files");
        var storage = new LocalFileStorage(storageRoot,
            Path.Combine(webRoot, "uploads", "cv"), Path.Combine(testRoot, "private-uploads", "cv"));
        var service = new CvService(uow, null!, null!, db, storage, NullLogger<CvService>.Instance);
        try
        {
            var invalid = await service.UploadAsync(userId, File("not PDF"u8.ToArray(), "cv.pdf", "application/pdf"));
            check(invalid.Status <= 0 && !Directory.Exists(testRoot)
                  && await db.CvDocuments.CountAsync() == 0
                  && await db.UserFeatureUsages.CountAsync() == 0,
                "Rejected upload persists no file, CV record or quota row in an in-memory database");

            var uploadedPdf = await service.UploadAsync(userId, File(pdf, "cv.pdf", "application/pdf"),
                "CV PDF", CvSystemTemplateIds.Modern01);
            var uploadedDocx = await service.UploadAsync(userId, File(docx, "cv.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
                "CV DOCX", CvSystemTemplateIds.Modern01);
            var rows = await db.CvDocuments.OrderBy(c => c.DisplayName).ToListAsync();
            check(uploadedPdf.Status > 0 && uploadedDocx.Status > 0 && rows.Count == 2
                  && rows.All(c => c.TemplateId == CvSystemTemplateIds.Modern01
                      && c.StoragePath.StartsWith($"users/{userId:N}/cv/")
                      && System.IO.File.Exists(Path.Combine(storageRoot, c.StoragePath.Replace('/', Path.DirectorySeparatorChar))))
                  && rows.Select(c => c.DisplayName).OrderBy(x => x).SequenceEqual(new[] { "CV DOCX", "CV PDF" }),
                "Valid PDF/DOCX upload persists with DisplayName and TemplateId outside wwwroot");

            var pdfRow = rows.Single(c => c.DisplayName == "CV PDF");
            var foreignUser = Guid.NewGuid();
            var foreignDownload = await service.GetDownloadAsync(foreignUser, pdfRow.Id);
            check(foreignDownload.Data is not FileDownloadDto, "Another user cannot download a known CV id");
            var ownerDownload = await service.GetDownloadAsync(userId, pdfRow.Id);
            check(ownerDownload.Status > 0 && ownerDownload.Data is FileDownloadDto downloaded
                  && downloaded.Bytes.SequenceEqual(pdf), "Owner downloads exact uploaded PDF bytes");
            var foreignDelete = await service.DeleteAsync(foreignUser, pdfRow.Id);
            check(foreignDelete.Status == Common.Const.WARNING_NO_DATA_CODE && await storage.ExistsAsync(pdfRow.StoragePath),
                "Another user cannot delete a known CV id or its storage object");
            var ownerDelete = await service.DeleteAsync(userId, pdfRow.Id);
            check(ownerDelete.Status > 0 && !await storage.ExistsAsync(pdfRow.StoragePath)
                  && await db.CvDocuments.CountAsync() == 1,
                "Owner CV deletion removes only its row and storage object");

            var wizardId = Guid.NewGuid();
            var wizard = new CvDocument
            {
                Id = wizardId, UserId = userId, Source = "Wizard", FileName = "generated.pdf",
                DisplayName = "Generated CV", ContentType = "application/pdf",
                StoragePath = CvStorageKeys.Generated(userId, wizardId),
                WizardAnswersJson = JsonSerializer.Serialize(new CvWizardAnswers
                {
                    FullName = "Test User", DesiredIndustry = "Software", DesiredPosition = "Developer"
                })
            };
            db.CvDocuments.Add(wizard);
            await db.SaveChangesAsync();
            var generatedDownload = await service.GetDownloadAsync(userId, wizardId);
            check(generatedDownload.Data is FileDownloadDto generatedFile
                  && generatedFile.Bytes.AsSpan().StartsWith("%PDF-"u8)
                  && await storage.ExistsAsync(wizard.StoragePath),
                "Missing generated PDF is regenerated and saved through storage abstraction");
            var wizardDelete = await service.DeleteAsync(userId, wizardId);
            check(wizardDelete.Status > 0 && !await storage.ExistsAsync(wizard.StoragePath),
                "Deleting generated CV removes regenerated PDF storage object");
        }
        finally
        {
            var safeTemp = Path.GetFullPath(Path.GetTempPath()).TrimEnd(Path.DirectorySeparatorChar)
                + Path.DirectorySeparatorChar;
            if (Path.GetFullPath(testRoot).StartsWith(safeTemp, StringComparison.OrdinalIgnoreCase)
                && Directory.Exists(testRoot))
                Directory.Delete(testRoot, recursive: true);
        }
    }

    private static IFormFile File(byte[] bytes, string name, string mime)
        => new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", name)
        { Headers = new HeaderDictionary(), ContentType = mime };

    private static byte[] BuildDocx()
    {
        using var buffer = new MemoryStream();
        using (var doc = WordprocessingDocument.Create(buffer, WordprocessingDocumentType.Document, true))
        {
            var main = doc.AddMainDocumentPart();
            main.Document = new DocumentFormat.OpenXml.Wordprocessing.Document(
                new Body(new Paragraph(new Run(new Text("Valid CV DOCX content")))));
            main.Document.Save();
        }
        return buffer.ToArray();
    }

    private static byte[] BuildUnrelatedZip()
    {
        using var buffer = new MemoryStream();
        using (var zip = new ZipArchive(buffer, ZipArchiveMode.Create, true))
        {
            using var writer = new StreamWriter(zip.CreateEntry("unrelated.txt").Open());
            writer.Write("not a Word document");
        }
        return buffer.ToArray();
    }
}

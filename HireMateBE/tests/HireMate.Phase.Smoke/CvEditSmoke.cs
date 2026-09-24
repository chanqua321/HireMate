using System.Text.Json;
using Common;
using Common.DTOs.OnboardingDto;
using HireMate.Modules.Onboarding.Cv;
using HireMate.Modules.Onboarding.Services;
using HireMate.Modules.Onboarding.Storage;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

internal static class CvEditSmoke
{
    public static async Task RunAsync(Action<bool, string> check)
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<HireMateContext>().UseSqlite(connection).Options;
        await using var db = new HireMateContext(options);
        await db.Database.EnsureCreatedAsync();
        var owner = Guid.NewGuid();
        var other = Guid.NewGuid();
        var firstId = Guid.NewGuid();
        var secondId = Guid.NewGuid();
        db.Users.AddRange(
            new UserAccount { Id = owner, UserName = "cv-edit-owner@example.test", Email = "cv-edit-owner@example.test", FullName = "Owner" },
            new UserAccount { Id = other, UserName = "cv-edit-other@example.test", Email = "cv-edit-other@example.test", FullName = "Other" });
        db.CvTemplates.Add(new CvTemplate { Id = CvSystemTemplateIds.Modern01,
            Name = "Modern 01", IsSystemTemplate = true, IsActive = true });
        db.CareerProfiles.Add(new CareerProfile { Id = Guid.NewGuid(), UserId = owner,
            ConfirmedCvDocumentId = secondId, DesiredPosition = "Original profile role" });
        CvDocument Row(Guid id, string name, bool confirmed) => new()
        {
            Id = id, UserId = owner, Source = "Wizard", FileName = $"{name}.pdf", DisplayName = name,
            TemplateId = CvSystemTemplateIds.Modern01, IsConfirmed = confirmed,
            StoragePath = CvStorageKeys.Generated(owner, id), ContentType = "application/pdf",
            WizardAnswersJson = JsonSerializer.Serialize(new CvWizardAnswers
            {
                FullName = name, Email = "old@example.test", Phone = "0912345678",
                DesiredIndustry = "Software", DesiredPosition = "Developer",
                Educations = [new CvEducationDto { Institution = "Old School" }],
                ClientRequestId = $"create-{name}"
            })
        };
        db.CvDocuments.AddRange(Row(firstId, "CV A", false), Row(secondId, "CV B", true));
        await db.SaveChangesAsync();

        using var uow = new UnitOfWork(db);
        var root = Path.Combine(Path.GetTempPath(), $"hiremate-edit-smoke-{Guid.NewGuid():N}");
        var storage = new LocalFileStorage(Path.Combine(root, "files"),
            Path.Combine(root, "wwwroot", "uploads", "cv"), Path.Combine(root, "legacy", "cv"));
        var service = new CvService(uow, null!, null!, db, storage, NullLogger<CvService>.Instance);
        CvWizardDto Payload(string name) => new()
        {
            FullName = name, Email = "new@example.test", Phone = "0987654321",
            DesiredIndustry = "Software", DesiredPosition = "Senior Developer",
            University = "New School", Educations = [new CvEducationDto { Institution = "New School" }],
            Skills = ["C#"], ClientRequestId = "different-create-request", DisplayName = "Should not rename",
            TemplateId = Guid.NewGuid()
        };
        try
        {
            var a = await db.CvDocuments.FindAsync(firstId) ?? throw new Exception("Missing CV A");
            var b = await db.CvDocuments.FindAsync(secondId) ?? throw new Exception("Missing CV B");
            var oldB = b.WizardAnswersJson;
            var oldName = a.DisplayName;
            var oldTime = a.UploadedAt;
            var previewPayload = Payload("Preview Only");
            previewPayload.TemplateId = CvSystemTemplateIds.Modern01;
            var firstPreview = await service.PreviewDraftAsync(owner, previewPayload);
            check(firstPreview.Status == Const.SUCCESS_READ_CODE && firstPreview.Data != null
                  && await db.CvDocuments.CountAsync() == 2
                  && !await db.UserFeatureUsages.AnyAsync(),
                "Edit preview renders without CV insert or quota usage");
            var forbidden = await service.UpdateAsync(other, firstId, Payload("Intruder"));
            check(forbidden.Status == Const.WARNING_NO_DATA_CODE && a.WizardAnswersJson != null
                  && !a.WizardAnswersJson.Contains("Intruder") && !await storage.ExistsAsync(a.StoragePath),
                "Cross-user edit returns not found without changing content or PDF");
            check((await service.GetEditAsync(other, firstId)).Status == Const.WARNING_NO_DATA_CODE,
                "Cross-user edit read also returns not found");
            var invalidPayload = Payload("Invalid Email");
            invalidPayload.Email = "not-an-email";
            var invalidEdit = await service.UpdateAsync(owner, firstId, invalidPayload);
            check(invalidEdit.Status < 0 && a.WizardAnswersJson != null
                  && !a.WizardAnswersJson.Contains("Invalid Email"),
                "Edit reuses create validation before changing a CV");
            var first = await service.UpdateAsync(owner, firstId, Payload("Edited Owner"));
            check(first.Status > 0 && await db.CvDocuments.CountAsync() == 2 && a.Id == firstId
                  && a.WizardAnswersJson!.Contains("Edited Owner") && a.ExtractedText!.Contains("Edited Owner"),
                "Own CV edit updates the same row and extracted content");
            check(a.DisplayName == oldName && a.TemplateId == CvSystemTemplateIds.Modern01
                  && !a.IsConfirmed && a.UploadedAt == oldTime
                  && JsonSerializer.Deserialize<CvWizardAnswers>(a.WizardAnswersJson!)!.ClientRequestId == "create-CV A",
                "Edit preserves name, template, confirmation, created time and create request ID");
            check(b.WizardAnswersJson == oldB && b.IsConfirmed
                  && (await db.CareerProfiles.SingleAsync(p => p.UserId == owner)).ConfirmedCvDocumentId == secondId
                  && (await db.CareerProfiles.SingleAsync(p => p.UserId == owner)).DesiredPosition == "Original profile role",
                "Editing CV A leaves CV B, active selection and global profile unchanged");
            var download = await service.GetDownloadAsync(owner, firstId);
            check(download.Data is FileDownloadDto pdf && pdf.Bytes.AsSpan().StartsWith("%PDF-"u8)
                  && await storage.ExistsAsync(a.StoragePath), "Edited CV PDF is stored and downloadable");
            var editRead = await service.GetEditAsync(owner, firstId);
            var editJson = JsonSerializer.Serialize(editRead.Data);
            check(editRead.Status > 0 && editJson.Contains("Edited Owner") && !editJson.Contains("Should not rename"),
                "Edit read returns saved structured content and preserved metadata");
            var repeat = await service.UpdateAsync(owner, firstId, Payload("Edited Owner"));
            check(repeat.Status > 0 && await db.CvDocuments.CountAsync() == 2,
                "Repeated save never creates another CV");
            var confirmed = await service.UpdateAsync(owner, secondId, Payload("Updated Confirmed"));
            check(confirmed.Status > 0 && b.IsConfirmed
                  && (await db.CareerProfiles.SingleAsync(p => p.UserId == owner)).ConfirmedCvDocumentId == secondId,
                "Editing confirmed CV preserves confirmed selection");
            check(!await db.UserFeatureUsages.AnyAsync(), "Manual edits consume no CV analysis or other quota");

            var priorJson = a.WizardAnswersJson;
            var priorPdf = ((FileDownloadDto)(await service.GetDownloadAsync(owner, firstId)).Data!).Bytes;
            var failing = new CvService(uow, null!, null!, db, new FailingStorage(storage), NullLogger<CvService>.Instance);
            var rejected = await failing.UpdateAsync(owner, firstId, Payload("Should Fail"));
            var afterPdf = ((FileDownloadDto)(await service.GetDownloadAsync(owner, firstId)).Data!).Bytes;
            check(rejected.Status <= 0 && a.WizardAnswersJson == priorJson && priorPdf.SequenceEqual(afterPdf),
                "PDF storage failure reports error and preserves prior CV and PDF");
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
        }
    }

    private sealed class FailingStorage(IFileStorageService inner) : IFileStorageService
    {
        public Task SaveAsync(string key, Stream content, CancellationToken cancellationToken = default)
            => throw new IOException("Synthetic PDF storage failure");
        public Task<Stream> OpenReadAsync(string key, CancellationToken cancellationToken = default)
            => inner.OpenReadAsync(key, cancellationToken);
        public Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
            => inner.ExistsAsync(key, cancellationToken);
        public Task DeleteAsync(string key, CancellationToken cancellationToken = default)
            => inner.DeleteAsync(key, cancellationToken);
        public string? ResolveExistingKey(string storedPath, Guid ownerId)
            => inner.ResolveExistingKey(storedPath, ownerId);
    }
}

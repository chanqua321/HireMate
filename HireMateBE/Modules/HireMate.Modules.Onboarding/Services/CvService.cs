using HireMate.Modules.Ai;
using HireMate.Modules.Onboarding.Abstractions;
using HireMate.BuildingBlocks;
using HireMate.Modules.Onboarding.Cv;
using System.Text;

using Common;
using Common.DTOs.OnboardingDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace HireMate.Modules.Onboarding.Services;

public class CvService(
    IUnitOfWork uow,
    IAiQuotaService aiQuota,
    UserManager<UserAccount> users) : ICvService
{
    public async Task<IServiceResult> UploadAsync(Guid userId, IFormFile file, string webRoot)
    {
        var gate = await RequirePlanAsync(userId);
        if (gate != null) return gate;
        if (file.Length == 0)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "File trá»‘ng");

        var dir = Path.Combine(webRoot, "uploads", "cv", userId.ToString());
        Directory.CreateDirectory(dir);
        var stored = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
        var path = Path.Combine(dir, stored);
        await using (var stream = File.Create(path))
            await file.CopyToAsync(stream);

        var text = CvTextExtractor.ExtractFromFile(path, file.FileName);
        var doc = new CvDocument
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Source = "Upload",
            FileName = file.FileName,
            StoragePath = path,
            ContentType = file.ContentType,
            FileSize = file.Length,
            ExtractedText = text,
            ParseSucceeded = false
        };
        await uow.CvDocumentRepository.CreateAsync(doc);
        await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = "CvUploaded",
            RefId = doc.Id,
            PayloadJson = JsonSerializer.Serialize(new { doc.FileName, hasText = CvTextExtractor.HasSelectableText(text) })
        });
        await uow.SaveChangesAsync();

        var msg = CvTextExtractor.HasSelectableText(text)
            ? Const.SUCCESS_CREATE_MSG
            : "Đã lưu file nhưng không đọc được chữ (PDF scan/ảnh). Hãy dùng file PDF/DOCX có chữ hoặc wizard tạo CV.";
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, msg, Map(doc));
    }

    public async Task<IServiceResult> CreateFromWizardAsync(Guid userId, CvWizardDto dto, string webRoot)
    {
        var gate = await RequirePlanAsync(userId);
        if (gate != null) return gate;

        var answers = new CvWizardAnswers
        {
            FullName = dto.FullName.Trim(),
            University = dto.University.Trim(),
            Major = dto.Major.Trim(),
            GraduationYear = dto.GraduationYear,
            DesiredIndustry = dto.DesiredIndustry.Trim(),
            DesiredPosition = dto.DesiredPosition.Trim(),
            ExperienceLevel = dto.ExperienceLevel.Trim(),
            Bio = dto.Bio?.Trim() ?? "",
            Skills = dto.Skills.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).Take(30).ToList(),
            Experiences = dto.Experiences.Select(e => new CvExperienceItem
            {
                Title = e.Title,
                Org = e.Org,
                Period = e.Period,
                Description = e.Description
            }).ToList()
        };

        var html = HireMateCvHtml.Render(answers);
        var plain = HireMateCvHtml.ToPlainText(answers);
        var dir = Path.Combine(webRoot, "uploads", "cv", userId.ToString());
        Directory.CreateDirectory(dir);
        var fileName = $"hiremate-cv-{DateTime.UtcNow:yyyyMMddHHmmss}.html";
        var path = Path.Combine(dir, $"{Guid.NewGuid()}_{fileName}");
        await File.WriteAllTextAsync(path, html);

        var doc = new CvDocument
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Source = "Wizard",
            FileName = fileName,
            StoragePath = path,
            ContentType = "text/html",
            FileSize = Encoding.UTF8.GetByteCount(html),
            ExtractedText = plain,
            WizardAnswersJson = JsonSerializer.Serialize(answers),
            ParseSucceeded = false
        };
        await uow.CvDocumentRepository.CreateAsync(doc);

        var user = await users.FindByIdAsync(userId.ToString());
        if (user != null)
        {
            user.FullName = answers.FullName;
            user.UpdatedAt = DateTime.UtcNow;
            await users.UpdateAsync(user);
        }

        var profile = await GetOrCreateProfileAsync(userId);
        FillProfileFromWizard(profile, answers);
        profile.UpdatedAt = DateTime.UtcNow;

        await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = "CvGenerated",
            RefId = doc.Id,
            PayloadJson = JsonSerializer.Serialize(new { doc.FileName })
        });
        await uow.SaveChangesAsync();

        var analyzed = await AnalyzeAsync(userId, doc.Id);
        return analyzed.Status > 0
            ? analyzed
            : new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã tạo CV template. Phân tích AI chưa xong, hãy gọi analyze lại.", Map(doc));
    }

    public async Task<IServiceResult> ListAsync(Guid userId)
    {
        var list = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .Where(c => c.UserId == userId).OrderByDescending(c => c.UploadedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list.Select(Map));
    }

    public async Task<IServiceResult> GetAsync(Guid userId, Guid id)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        return doc == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, Map(doc));
    }

    public async Task<IServiceResult> AnalyzeAsync(Guid userId, Guid id)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        if (user.PlanSelectedAt == null)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng chọn gói trước khi phân tích CV");

        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        if (!CvTextExtractor.HasSelectableText(doc.ExtractedText))
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "Không đọc được chữ trên CV. Dùng PDF/DOCX có text hoặc tạo CV bằng wizard.");

        var rank = PlanTier.Rank(user.CurrentPlanCode);
        if (rank == 0)
        {
            var used = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .CountAsync(c => c.UserId == userId && c.ParseSucceeded && c.AnalyzedAt != null && c.Id != id);
            if (used >= 1 && !(doc.ParseSucceeded && doc.AnalyzedAt != null))
                return new ServiceResult(Const.FAIL_QUOTA_CODE,
                    "Gói Miễn phí chỉ được phân tích 1 CV để hoàn thiện hồ sơ. Nâng cấp để phân tích thêm.");
        }

        var snap = await aiQuota.GetSnapshotAsync(user);
        var maxOut = snap.MaxOutputChars;
        var promptUser = $"Analyze this CV text:\n{doc.ExtractedText}{CvAnalysisParser.CompactPromptSuffix(maxOut)}";
        var system = "You are a CV ATS analyzer for Vietnam students. Return JSON only with keys parseSucceeded, format, keywords, readability, professionalism, readinessScore, fitT1 (0-100 vs desired role in CV), extract{fullName,university,major,graduationYear,desiredIndustry,desiredPosition,experienceLevel,bio,skills,hobbies,experiences[{title,org,period,description}]}, suggestions (short array). Compact.";

        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + promptUser.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var aiResult = await aiQuota.CompleteAndLogAsync(
            user, system, promptUser, "cv", doc.Id, SettingKeys.AiCvAnalyzeMaxOutputChars);
        JsonDocument parsed;
        try
        {
            parsed = JsonDocument.Parse(CvAnalysisParser.UnwrapJson(aiResult.Content));
        }
        catch
        {
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không phân tích được kết quả AI cho CV. Vui lòng thử lại.");
        }

        using (parsed)
        {
            var root = parsed.RootElement;
            if (!CvAnalysisParser.TryReadScore(root, "format", out var format)
                || !CvAnalysisParser.TryReadScore(root, "keywords", out var keywords)
                || !CvAnalysisParser.TryReadScore(root, "readability", out var readability)
                || !CvAnalysisParser.TryReadScore(root, "professionalism", out var professionalism))
            {
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "AI không trả về đủ điểm CV hợp lệ. Vui lòng thử lại.");
            }

            var extract = CvAnalysisParser.ReadExtract(root);
            var parseOk = root.TryGetProperty("parseSucceeded", out var ps) && ps.ValueKind == JsonValueKind.True
                          || CvAnalysisParser.ParseLooksComplete(extract);
            if (doc.Source == "Wizard")
                parseOk = true;

            doc.FormatScore = format;
            doc.KeywordsScore = keywords;
            doc.ReadabilityScore = readability;
            doc.ProfessionalismScore = professionalism;
            doc.ReadinessScore = Average(format, keywords, readability, professionalism);
            if (CvAnalysisParser.TryReadScore(root, "readinessScore", out var ready))
                doc.ReadinessScore = ready;
            if (CvAnalysisParser.TryReadScore(root, "fitT1", out var fit))
                doc.FitT1Score = fit;
            else
                doc.FitT1Score = doc.ReadinessScore;
            doc.ParseSucceeded = parseOk;
            doc.AnalysisJson = aiResult.Content;
            doc.AiProvider = aiResult.Provider;
            doc.AnalyzedAt = DateTime.UtcNow;

            var profile = await GetOrCreateProfileAsync(userId);
            if (profile.ConfirmedAt == null)
                ApplyExtractIfEmpty(user, profile, extract);

            await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                EventType = "CvAnalyzed",
                RefId = doc.Id,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    doc.FormatScore,
                    doc.ParseSucceeded,
                    provider = aiResult.Provider
                })
            });
            await users.UpdateAsync(user);
            await uow.SaveChangesAsync();
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE,
                parseOk ? "Đã phân tích CV" : "Đã chấm ATS nhưng chưa đủ thông tin để hoàn thiện hồ sơ.",
                Map(doc));
        }
    }

    private async Task<IServiceResult?> RequirePlanAsync(Guid userId)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        if (user.PlanSelectedAt == null)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng chọn gói trước khi nộp CV");
        return null;
    }

    private async Task<CareerProfile> GetOrCreateProfileAsync(Guid userId)
    {
        var profile = await uow.CareerProfileRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile != null) return profile;
        profile = new CareerProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await uow.CareerProfileRepository.CreateAsync(profile);
        await uow.SaveChangesAsync();
        return profile;
    }

    private static void FillProfileFromWizard(CareerProfile profile, CvWizardAnswers a)
    {
        profile.University = a.University;
        profile.Major = a.Major;
        profile.GraduationYear = a.GraduationYear;
        profile.DesiredIndustry = a.DesiredIndustry;
        profile.DesiredPosition = a.DesiredPosition;
        profile.ExperienceLevel = a.ExperienceLevel;
        profile.Bio = string.IsNullOrWhiteSpace(a.Bio) ? profile.Bio : a.Bio;
        profile.SkillsJson = JsonSerializer.Serialize(a.Skills);
        profile.ExperiencesJson = JsonSerializer.Serialize(a.Experiences);
    }

    private static void ApplyExtractIfEmpty(UserAccount user, CareerProfile profile, CvExtractDraft d)
    {
        if (string.IsNullOrWhiteSpace(user.FullName) && !string.IsNullOrWhiteSpace(d.FullName))
            user.FullName = d.FullName!;
        if (string.IsNullOrWhiteSpace(profile.University)) profile.University = d.University;
        if (string.IsNullOrWhiteSpace(profile.Major)) profile.Major = d.Major;
        if (profile.GraduationYear == null) profile.GraduationYear = d.GraduationYear;
        if (string.IsNullOrWhiteSpace(profile.DesiredIndustry)) profile.DesiredIndustry = d.DesiredIndustry;
        if (string.IsNullOrWhiteSpace(profile.DesiredPosition)) profile.DesiredPosition = d.DesiredPosition;
        if (string.IsNullOrWhiteSpace(profile.ExperienceLevel)) profile.ExperienceLevel = d.ExperienceLevel;
        if (string.IsNullOrWhiteSpace(profile.Bio)) profile.Bio = d.Bio;
        if (string.IsNullOrWhiteSpace(profile.SkillsJson) && d.Skills.Count > 0)
            profile.SkillsJson = JsonSerializer.Serialize(d.Skills);
        if (string.IsNullOrWhiteSpace(profile.HobbiesJson) && d.Hobbies.Count > 0)
            profile.HobbiesJson = JsonSerializer.Serialize(d.Hobbies);
        if (string.IsNullOrWhiteSpace(profile.ExperiencesJson) && d.Experiences.Count > 0)
            profile.ExperiencesJson = JsonSerializer.Serialize(d.Experiences);
        profile.UpdatedAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;
    }

    private static int Average(params int[] xs) => xs.Length == 0 ? 0 : (int)Math.Round(xs.Average());

    private static object Map(CvDocument d) => new
    {
        d.Id,
        d.Source,
        d.FileName,
        d.ContentType,
        d.FileSize,
        d.UploadedAt,
        d.AnalyzedAt,
        d.ParseSucceeded,
        d.FormatScore,
        d.KeywordsScore,
        d.ReadabilityScore,
        d.ProfessionalismScore,
        d.ReadinessScore,
        d.FitT1Score,
        d.IsConfirmed,
        d.ConfirmedAt,
        analysis = d.AnalysisJson,
        provider = d.AiProvider
    };
}



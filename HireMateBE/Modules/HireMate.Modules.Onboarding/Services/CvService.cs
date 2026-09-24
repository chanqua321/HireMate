using HireMate.Modules.Ai;
using HireMate.Modules.Onboarding.Abstractions;
using HireMate.BuildingBlocks;
using HireMate.Modules.Onboarding.Cv;
using HireMate.Modules.Onboarding.Storage;
using System.Text;

using Common;
using Common.DTOs.OnboardingDto;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace HireMate.Modules.Onboarding.Services;

public class CvService(
    IUnitOfWork uow,
    IAiQuotaService aiQuota,
    UserManager<UserAccount> users,
    HireMateContext db,
    IFileStorageService storage,
    ILogger<CvService> logger) : ICvService
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> CreateGates = new();
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> EditGates = new();

    public async Task<IServiceResult> UploadAsync(
        Guid userId, IFormFile file, string? displayName = null, Guid? templateId = null)
    {
        // T1.1 CV-first: không yêu cầu PlanSelectedAt trước khi nộp CV
        var validated = await CvUploadValidator.ValidateAsync(file);
        if (!validated.IsValid)
            return new ServiceResult(Const.FAIL_CREATE_CODE, validated.Error!);

        string resolvedDisplay;
        if (!string.IsNullOrWhiteSpace(displayName))
        {
            if (!CvDisplayNameHelper.TryNormalize(displayName, out resolvedDisplay, out var nameErr))
                return new ServiceResult(Const.FAIL_CREATE_CODE, nameErr!);
        }
        else
        {
            resolvedDisplay = CvDisplayNameHelper.FallbackFromFileOrRole(file.FileName);
        }

        var template = await ResolveUsableTemplateAsync(userId, templateId);
        if (templateId.HasValue && template == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy template");

        var docId = Guid.NewGuid();
        var key = CvStorageKeys.Original(userId, docId, Path.GetExtension(file.FileName).ToLowerInvariant());
        var text = CvTextExtractor.ExtractFromBytes(validated.Bytes!, file.FileName);
        await storage.SaveAsync(key, new MemoryStream(validated.Bytes!));
        var doc = new CvDocument
        {
            Id = docId,
            UserId = userId,
            Source = "Upload",
            FileName = file.FileName,
            DisplayName = resolvedDisplay,
            TemplateId = template?.Id ?? CvSystemTemplateIds.Modern01,
            StoragePath = key,
            ContentType = file.ContentType,
            FileSize = file.Length,
            ExtractedText = text,
            ParseSucceeded = false
        };
        try
        {
            await uow.CvDocumentRepository.CreateAsync(doc);
            await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
            {
                Id = Guid.NewGuid(), UserId = userId, EventType = "CvUploaded", RefId = doc.Id,
                PayloadJson = JsonSerializer.Serialize(new
                {
                    doc.FileName, doc.DisplayName, doc.TemplateId,
                    hasText = CvTextExtractor.HasSelectableText(text)
                })
            });
            await uow.SaveChangesAsync();
        }
        catch
        {
            await DeleteAfterFailedCreateAsync(key);
            throw;
        }

        var msg = CvTextExtractor.HasSelectableText(text)
            ? Const.SUCCESS_CREATE_MSG
            : "Đã lưu file nhưng không đọc được chữ (PDF scan/ảnh). Hãy dùng file PDF/DOCX có chữ hoặc wizard tạo CV.";

        // T1.1: analyze ngay lúc upload — gợi ý sửa trước khi vào phỏng vấn
        if (CvTextExtractor.HasSelectableText(text))
        {
            var analyzed = await AnalyzeAsync(userId, doc.Id);
            return analyzed.Status > 0
                ? analyzed
                : new ServiceResult(Const.SUCCESS_CREATE_CODE,
                    "Đã tải CV. Phân tích AI chưa xong — mở Kho CV để xem gợi ý và thử phân tích lại.",
                    await MapAsync(doc));
        }

        return new ServiceResult(Const.SUCCESS_CREATE_CODE, msg, await MapAsync(doc));
    }

    public async Task<IServiceResult> PreviewDraftAsync(Guid userId, CvWizardDto dto)
    {
        var validation = ValidateWizardMinimum(dto);
        if (validation != null) return validation;

        var template = await ResolveUsableTemplateAsync(userId, dto.TemplateId);
        if (dto.TemplateId.HasValue && template == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy template");
        template ??= await GetSystemTemplateAsync(CvSystemTemplateIds.Modern01);

        var layout = CvLayoutDefinition.ParseOrDefault(template?.LayoutDefinitionJson, template?.LayoutKey);
        var document = CvTemplateDocumentMapper.Map(BuildAnswers(dto), layout);
        var previewPdf = HireMateCvPdf.Generate(document.Data, document.Layout);
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
        {
            html = HireMateCvHtml.Render(document.Data, document.Layout),
            pdfBase64 = Convert.ToBase64String(previewPdf),
            templateId = template?.Id ?? CvSystemTemplateIds.Modern01,
            templateName = template == null
                ? CvTemplateDisplay.StandardName
                : CvTemplateDisplay.Name(template.IsSystemTemplate, template.LayoutKey, template.Name),
            layoutKey = template?.LayoutKey ?? document.Layout.LayoutKey
        });
    }

    public async Task<IServiceResult> CreateFromWizardAsync(Guid userId, CvWizardDto dto)
    {
        var validation = ValidateWizardMinimum(dto);
        if (validation != null) return validation;

        if (string.IsNullOrWhiteSpace(dto.ClientRequestId))
            return await CreateFromWizardCoreAsync(userId, dto);

        var requestId = dto.ClientRequestId.Trim();
        var gateKey = $"{userId:N}:{requestId}";
        var gate = CreateGates.GetOrAdd(gateKey, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            var candidates = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .Where(c => c.UserId == userId && c.Source == "Wizard" && c.WizardAnswersJson != null)
                .OrderByDescending(c => c.UploadedAt)
                .Take(100)
                .ToListAsync();
            var existing = candidates.FirstOrDefault(c => HasClientRequestId(c.WizardAnswersJson, requestId));
            if (existing != null)
                return new ServiceResult(Const.SUCCESS_READ_CODE, "CV đã được tạo từ yêu cầu này", await MapAsync(existing));

            return await CreateFromWizardCoreAsync(userId, dto);
        }
        finally
        {
            gate.Release();
            CreateGates.TryRemove(gateKey, out _);
        }
    }

    private async Task<IServiceResult> CreateFromWizardCoreAsync(Guid userId, CvWizardDto dto)
    {
        // T1.1 CV-first: không yêu cầu PlanSelectedAt trước khi tạo CV wizard
        var answers = BuildAnswers(dto);

        string resolvedDisplay;
        if (!string.IsNullOrWhiteSpace(dto.DisplayName))
        {
            if (!CvDisplayNameHelper.TryNormalize(dto.DisplayName, out resolvedDisplay, out var nameErr))
                return new ServiceResult(Const.FAIL_CREATE_CODE, nameErr!);
        }
        else
        {
            resolvedDisplay = CvDisplayNameHelper.FallbackFromFileOrRole(null, answers.DesiredPosition);
        }

        var template = await ResolveUsableTemplateAsync(userId, dto.TemplateId);
        if (dto.TemplateId.HasValue && template == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy template");
        template ??= await GetSystemTemplateAsync(CvSystemTemplateIds.Modern01);
        var layout = CvLayoutDefinition.ParseOrDefault(template?.LayoutDefinitionJson, template?.LayoutKey);

        var plain = HireMateCvHtml.ToPlainText(answers);
        var pdfBytes = HireMateCvPdf.Generate(answers, layout);
        var fileName = $"HireMate-CV-{SanitizeFileName(answers.FullName)}-{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";
        var docId = Guid.NewGuid();
        var key = CvStorageKeys.Generated(userId, docId);
        await storage.SaveAsync(key, new MemoryStream(pdfBytes));

        var doc = new CvDocument
        {
            Id = docId, UserId = userId, Source = "Wizard", FileName = fileName,
            DisplayName = resolvedDisplay, TemplateId = template?.Id ?? CvSystemTemplateIds.Modern01,
            StoragePath = key, ContentType = "application/pdf", FileSize = pdfBytes.Length,
            ExtractedText = plain, WizardAnswersJson = JsonSerializer.Serialize(answers), ParseSucceeded = false
        };
        try
        {
            await uow.CvDocumentRepository.CreateAsync(doc);
            var profile = await GetOrCreateProfileAsync(userId);
            if (profile.ConfirmedCvDocumentId == null)
                ApplyWizardAnswersToProfile(profile, answers);
            await uow.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
            {
                Id = Guid.NewGuid(), UserId = userId, EventType = "CvGenerated", RefId = doc.Id,
                PayloadJson = JsonSerializer.Serialize(new { doc.FileName, doc.DisplayName, doc.TemplateId })
            });
            await uow.SaveChangesAsync();
        }
        catch
        {
            await DeleteAfterFailedCreateAsync(key);
            throw;
        }

        IServiceResult analyzed;
        try
        {
            analyzed = await AnalyzeAsync(userId, doc.Id);
        }
        catch
        {
            // The CV is already saved; an AI failure must not turn Confirm Create into a lost CV.
            return new ServiceResult(Const.SUCCESS_CREATE_CODE,
                "Đã lưu CV, nhưng chưa chấm điểm do dịch vụ phân tích gặp lỗi. Hãy thử Chấm điểm CV lại.",
                await MapAsync(doc));
        }
        return analyzed.Status > 0
            ? analyzed
            : new ServiceResult(Const.SUCCESS_CREATE_CODE,
                $"Đã lưu CV, nhưng chưa chấm điểm: {analyzed.Message}",
                await MapAsync(doc));
    }

    public async Task<IServiceResult> ListAsync(Guid userId)
    {
        var list = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .Where(c => c.UserId == userId).OrderByDescending(c => c.UploadedAt).ToListAsync();
        var activeId = await uow.CareerProfileRepository.GetQueryable().AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.ConfirmedCvDocumentId)
            .FirstOrDefaultAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG,
            await MapManyAsync(list, activeId));
    }

    public async Task<IServiceResult> GetAsync(Guid userId, Guid id)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");
        var activeId = await uow.CareerProfileRepository.GetQueryable().AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.ConfirmedCvDocumentId)
            .FirstOrDefaultAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG,
            await MapAsync(doc, activeCvDocumentId: activeId));
    }

    public async Task<IServiceResult> AnalyzeAsync(Guid userId, Guid id)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        // T1.1: chưa chọn gói = Free (rank 0). Chỉ trừ lượt khi analyze thành công.
        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        if (doc.Source == "Wizard"
                ? string.IsNullOrWhiteSpace(doc.ExtractedText)
                : !CvTextExtractor.HasSelectableText(doc.ExtractedText))
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "Không đọc được chữ trên CV. Dùng PDF/DOCX có text hoặc tạo CV bằng wizard.");

        var alreadyOk = doc.ParseSucceeded && doc.AnalyzedAt != null;

        var snap = await aiQuota.GetSnapshotAsync(user);
        var maxOut = snap.MaxOutputChars;
        var detectedLanguage = CvLanguage.Detect(doc.ExtractedText);
        var promptUser = $"Detected CV language: {detectedLanguage.Language}; dominant: {detectedLanguage.Dominant ?? "unknown"}. This is a signal, not a fact. Raw CV text follows unchanged:\n{doc.ExtractedText}{CvAnalysisParser.CompactPromptSuffix(maxOut)}";
        var system = "Analyze text-based Vietnamese, English, or mixed CVs with the same scoring criteria. Return JSON only, with fixed English keys: parseSucceeded, format, keywords, readability, professionalism, readinessScore, fitT1 (integer 0-100), extract{fullName,university,major,graduationYear,desiredIndustry,desiredPosition,experienceLevel,bio,skills[],hobbies[],experiences[{title,org,period,description}],education[],projects[],certifications[]}, suggestions[]. Recognize equivalent VI/EN section headings including Education/Học vấn, Work Experience/Kinh nghiệm làm việc, Skills/Kỹ năng, Projects/Dự án, Certifications/Chứng chỉ. Preserve all facts, dates, company/project/technology names and original data language. Do not translate or invent skills, experience, education, projects, certificates or a target role. Missing fields must be null or empty arrays. Suggestions may use the CV's dominant language. If evidence is insufficient, set parseSucceeded false; do not fabricate scores.";

        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + promptUser.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var quotaBlockCv = await EnsureCvAnalyzeQuotaAsync(user, id, alreadyOk);
        if (quotaBlockCv != null)
            return quotaBlockCv;
        var quotaReserved = !alreadyOk;

        AiCompletionResult aiResult;
        try
        {
            aiResult = await aiQuota.CompleteAndLogAsync(
                user, system, promptUser, "cv", doc.Id, SettingKeys.AiCvAnalyzeMaxOutputChars);
        }
        catch
        {
            if (quotaReserved)
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvAnalysis);
            throw;
        }
        if (string.IsNullOrWhiteSpace(aiResult.Content) || aiResult.UsedFallback)
        {
            if (quotaReserved)
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvAnalysis);
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "Dịch vụ AI chưa trả kết quả chấm điểm. CV đã được giữ nguyên; hãy thử Chấm điểm CV lại.");
        }
        JsonDocument? parsed = null;
        try
        {
            parsed = JsonDocument.Parse(CvAnalysisParser.UnwrapJson(aiResult.Content));
        }
        catch (JsonException)
        {
            if (quotaReserved)
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvAnalysis);
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "AI trả dữ liệu phân tích không hợp lệ. CV gốc được giữ nguyên; hãy thử lại.");
        }

        using (parsed)
        {
            var root = parsed.RootElement;
            if (root.ValueKind != JsonValueKind.Object
                || !CvAnalysisParser.TryReadScore(root, "format", out var format)
                || !CvAnalysisParser.TryReadScore(root, "keywords", out var keywords)
                || !CvAnalysisParser.TryReadScore(root, "readability", out var readability)
                || !CvAnalysisParser.TryReadScore(root, "professionalism", out var professionalism))
            {
                if (quotaReserved)
                    await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvAnalysis);
                return new ServiceResult(Const.FAIL_UPDATE_CODE,
                    "AI chưa trả đủ điểm phân tích hợp lệ. CV gốc được giữ nguyên; hãy thử lại.");
            }

            var extract = CvAnalysisParser.ReadExtract(root);
            // Wizard: ưu tiên dữ liệu form đã nhập
            if (doc.Source == "Wizard" && !string.IsNullOrWhiteSpace(doc.WizardAnswersJson))
            {
                try
                {
                    var wa = JsonSerializer.Deserialize<CvWizardAnswers>(doc.WizardAnswersJson);
                    if (wa != null)
                    {
                        extract.FullName = wa.FullName;
                        extract.University = wa.University;
                        extract.Major = wa.Major;
                        extract.GraduationYear = wa.GraduationYear;
                        extract.DesiredIndustry = wa.DesiredIndustry;
                        extract.DesiredPosition = wa.DesiredPosition;
                        extract.ExperienceLevel = wa.ExperienceLevel;
                        extract.Bio = wa.Bio;
                        extract.Skills = wa.Skills;
                        extract.Experiences = wa.Experiences;
                        extract.Education = wa.Educations.Select(e => e.Institution ?? string.Empty)
                            .Where(value => !string.IsNullOrWhiteSpace(value)).ToList();
                        extract.Projects = wa.Projects.Select(p => p.Name ?? string.Empty)
                            .Where(value => !string.IsNullOrWhiteSpace(value)).ToList();
                        extract.Certifications = wa.Certifications.Select(c => c.Name ?? string.Empty)
                            .Where(value => !string.IsNullOrWhiteSpace(value)).ToList();
                    }
                }
                catch { /* ignore */ }
            }

            var parseOk = root.TryGetProperty("parseSucceeded", out var ps) && ps.ValueKind == JsonValueKind.True
                          && (CvAnalysisParser.ParseLooksComplete(extract) || doc.Source == "Wizard");
            if (!parseOk)
            {
                if (quotaReserved)
                    await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvAnalysis);
                return new ServiceResult(Const.FAIL_UPDATE_CODE,
                    "CV chưa có đủ dữ liệu xác thực để chấm điểm. CV gốc được giữ nguyên; hãy kiểm tra nội dung và thử lại.");
            }

            var suggestions = CvAnalysisParser.ReadSuggestions(root);
            if (suggestions.Count == 0)
                suggestions = CvAnalysisParser.BuildHeuristicSuggestions(extract, doc.Source);

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
                doc.FitT1Score = null;
            doc.ParseSucceeded = parseOk;
            // Gắn suggestions vào JSON lưu DB để FE đọc
            try
            {
                using var enriched = JsonDocument.Parse(CvAnalysisParser.UnwrapJson(aiResult.Content));
                var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(enriched.RootElement.GetRawText())
                           ?? new Dictionary<string, JsonElement>();
                dict["suggestions"] = JsonSerializer.SerializeToElement(suggestions);
                dict["extract"] = JsonSerializer.SerializeToElement(extract, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
                dict["format"] = JsonSerializer.SerializeToElement(format);
                dict["keywords"] = JsonSerializer.SerializeToElement(keywords);
                dict["readability"] = JsonSerializer.SerializeToElement(readability);
                dict["professionalism"] = JsonSerializer.SerializeToElement(professionalism);
                dict["detectedLanguage"] = JsonSerializer.SerializeToElement(detectedLanguage.Language);
                dict["dominantLanguage"] = JsonSerializer.SerializeToElement(detectedLanguage.Dominant);
                doc.AnalysisJson = JsonSerializer.Serialize(dict);
            }
            catch
            {
                doc.AnalysisJson = JsonSerializer.Serialize(new
                {
                    parseSucceeded = parseOk,
                    format,
                    keywords,
                    readability,
                    professionalism,
                    readinessScore = doc.ReadinessScore,
                    fitT1 = doc.FitT1Score,
                    extract,
                    suggestions
                });
            }
            doc.AiProvider = aiResult.Provider;
            if (parseOk)
                doc.AnalyzedAt = DateTime.UtcNow;

            var profile = await GetOrCreateProfileAsync(userId);
            if (profile.ConfirmedAt == null && !string.Equals(doc.Source, "Wizard", StringComparison.OrdinalIgnoreCase))
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
            try
            {
                await users.UpdateAsync(user);
                await uow.SaveChangesAsync();
            }
            catch
            {
                if (quotaReserved)
                    await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvAnalysis);
                throw;
            }
            if (quotaReserved && !parseOk)
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvAnalysis);
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE,
                "Đã phân tích CV. Xem gợi ý cải thiện trước khi luyện phỏng vấn.",
                await MapAsync(doc, suggestions));
        }
    }

    /// <summary>Mọi gói: trần analyze thành công theo tháng (Free 1, Standard 20, Premium 70). Không unlimited.</summary>
    private async Task<IServiceResult?> EnsureCvAnalyzeQuotaAsync(UserAccount user, Guid currentCvId, bool alreadySucceeded)
    {
        // Re-analyze cùng CV đã thành công không tính thêm lượt mới
        if (alreadySucceeded)
            return null;

        return await aiQuota.TryConsumeFeatureAsync(user, AiQuotaFeature.CvAnalysis);
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
        return profile;
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

    private static void ApplyWizardAnswersToProfile(CareerProfile profile, CvWizardAnswers answers)
    {
        var education = answers.Educations?.FirstOrDefault(e => !string.IsNullOrWhiteSpace(e.Institution));
        if (!string.IsNullOrWhiteSpace(answers.DesiredIndustry))
            profile.DesiredIndustry = Truncate(answers.DesiredIndustry.Trim(), 150);
        if (!string.IsNullOrWhiteSpace(answers.DesiredPosition))
            profile.DesiredPosition = Truncate(answers.DesiredPosition.Trim(), 150);
        if (!string.IsNullOrWhiteSpace(answers.ExperienceLevel))
            profile.ExperienceLevel = Truncate(answers.ExperienceLevel.Trim(), 50);
        if (education != null)
        {
            profile.University = Truncate(education.Institution!.Trim(), 200);
            if (!string.IsNullOrWhiteSpace(education.Major))
                profile.Major = Truncate(education.Major.Trim(), 150);
            if (education.GraduationYear is > 0)
                profile.GraduationYear = education.GraduationYear;
        }
        var bio = answers.Summary?.Trim();
        if (string.IsNullOrWhiteSpace(bio)) bio = answers.CareerObjective?.Trim();
        if (string.IsNullOrWhiteSpace(bio)) bio = answers.Bio?.Trim();
        if (!string.IsNullOrWhiteSpace(bio)) profile.Bio = Truncate(bio, 1000);

        static string? JsonWithinLimit<T>(IReadOnlyCollection<T> items, int maxLength)
        {
            if (items.Count == 0) return null;
            var json = JsonSerializer.Serialize(items);
            return json.Length <= maxLength ? json : null;
        }

        profile.SkillsJson = JsonWithinLimit(answers.Skills ?? [], 2000) ?? profile.SkillsJson;
        profile.HobbiesJson = JsonWithinLimit(answers.Hobbies ?? [], 500) ?? profile.HobbiesJson;
        if (answers.Experiences?.Count > 0) profile.ExperiencesJson = JsonSerializer.Serialize(answers.Experiences);
        if (answers.Projects?.Count > 0) profile.ProjectsJson = JsonSerializer.Serialize(answers.Projects);
        if (answers.Certifications?.Count > 0) profile.CertificationsJson = JsonSerializer.Serialize(answers.Certifications);
        profile.UpdatedAt = DateTime.UtcNow;
    }

    private static int Average(params int[] xs) => xs.Length == 0 ? 0 : (int)Math.Round(xs.Average());

    public async Task<IServiceResult> ActivateAsync(Guid userId, Guid id)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        // Business rule: Interview yêu cầu CV đã analyze thành công
        if (!doc.ParseSucceeded || doc.AnalyzedAt == null)
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "CV chưa được phân tích thành công. Hãy phân tích CV trước khi kích hoạt.");

        var profile = await uow.CareerProfileRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            profile = new CareerProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await uow.CareerProfileRepository.CreateAsync(profile);
        }

        if (string.Equals(doc.Source, "Wizard", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(doc.WizardAnswersJson))
        {
            try
            {
                var answers = JsonSerializer.Deserialize<CvWizardAnswers>(doc.WizardAnswersJson);
                if (answers != null) ApplyWizardAnswersToProfile(profile, answers);
            }
            catch (JsonException) { /* Keep the existing profile if legacy draft JSON is invalid. */ }
        }

        var others = await uow.CvDocumentRepository.GetQueryable()
            .Where(c => c.UserId == userId && c.Id != doc.Id && c.IsConfirmed)
            .ToListAsync();
        foreach (var o in others)
        {
            o.IsConfirmed = false;
            o.ConfirmedAt = null;
        }

        doc.IsConfirmed = true;
        doc.ConfirmedAt = DateTime.UtcNow;
        profile.ConfirmedCvDocumentId = doc.Id;
        profile.ConfirmedAt = DateTime.UtcNow;
        profile.UpdatedAt = DateTime.UtcNow;

        await uow.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã kích hoạt CV làm hồ sơ phỏng vấn chính", new
        {
            success = true,
            activeCvDocumentId = doc.Id,
            cv = await MapAsync(doc, activeCvDocumentId: doc.Id)
        });
    }

    public async Task<IServiceResult> DeleteAsync(Guid userId, Guid id)
    {
        var doc = await db.CvDocuments
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        var storagePath = doc.StoragePath;
        await using (var tx = await db.Database.BeginTransactionAsync())
        {
            var profile = await db.CareerProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);
            if (profile?.ConfirmedCvDocumentId == doc.Id)
            {
                profile.ConfirmedCvDocumentId = null;
                profile.ConfirmedAt = null;
                profile.UpdatedAt = DateTime.UtcNow;
            }

            // Preserve immutable history. The UserId predicate prevents a deletion from
            // detaching another user's record even if inconsistent data exists.
            await db.JdMatchResults
                .Where(m => m.CvDocumentId == id && m.UserId == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.CvDocumentId, (Guid?)null));

            db.CvDocuments.Remove(doc);
            await db.SaveChangesAsync();
            await tx.CommitAsync();
        }

        // The database commit precedes external storage deletion. A failed delete is visible
        // and logged for operator cleanup; it cannot roll back the committed database change.
        var storageKey = storage.ResolveExistingKey(storagePath, userId);
        var cleanupFailed = false;
        if (storageKey == null && !string.IsNullOrWhiteSpace(storagePath))
        {
            cleanupFailed = true;
            logger.LogWarning("CV {CvId} had an unsafe or unavailable storage path; manual cleanup required", id);
        }
        else if (storageKey != null)
        {
            try
            {
                await storage.DeleteAsync(storageKey);
                if (doc.Source == "Wizard" && Path.IsPathFullyQualified(storagePath))
                {
                    var sidecar = storage.ResolveExistingKey(Path.ChangeExtension(storagePath, ".html"), userId);
                    if (sidecar != null) await storage.DeleteAsync(sidecar);
                }
            }
            catch (Exception ex)
            {
                cleanupFailed = true;
                logger.LogError(ex, "CV {CvId} database row deleted, storage cleanup failed for {StorageKey}", id, storageKey);
            }
        }

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE,
            cleanupFailed ? "Đã xóa CV; không thể dọn file lưu trữ, quản trị viên cần kiểm tra." : "Đã xóa CV", new
        {
            success = true,
            deletedCvDocumentId = id,
            activeCvDocumentId = (Guid?)null,
            storageCleanupRequired = cleanupFailed
        });
    }

    public async Task<IServiceResult> GetEditAsync(Guid userId, Guid id)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null || doc.Source != "Wizard" || string.IsNullOrWhiteSpace(doc.WizardAnswersJson))
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV có thể chỉnh sửa");
        try
        {
            var answers = JsonSerializer.Deserialize<CvWizardAnswers>(doc.WizardAnswersJson);
            if (answers == null) throw new JsonException("Empty wizard answers");
            return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new
            {
                id = doc.Id,
                displayName = doc.DisplayName,
                templateId = doc.TemplateId,
                content = answers
            });
        }
        catch (JsonException)
        {
            return new ServiceResult(Const.FAIL_READ_CODE, "Không đọc được dữ liệu gốc của CV này.");
        }
    }

    public async Task<IServiceResult> UpdateAsync(Guid userId, Guid id, CvWizardDto dto)
    {
        var gateKey = $"{userId:N}:{id:N}";
        var gate = EditGates.GetOrAdd(gateKey, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync();
        try
        {
            var doc = await uow.CvDocumentRepository.GetQueryable()
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
            if (doc == null || doc.Source != "Wizard" || string.IsNullOrWhiteSpace(doc.WizardAnswersJson))
                return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV có thể chỉnh sửa");

            var validation = ValidateWizardMinimum(dto);
            if (validation != null) return validation;

            CvWizardAnswers previousAnswers;
            try
            {
                previousAnswers = JsonSerializer.Deserialize<CvWizardAnswers>(doc.WizardAnswersJson)
                    ?? throw new JsonException("Empty wizard answers");
            }
            catch (JsonException)
            {
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không đọc được dữ liệu gốc của CV này.");
            }

            // Content edits never rename, switch templates, or alter the original create request key.
            var answers = BuildAnswers(dto);
            answers.ClientRequestId = previousAnswers.ClientRequestId;
            var template = await ResolveUsableTemplateAsync(userId, doc.TemplateId);
            if (doc.TemplateId.HasValue && template == null)
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Mẫu CV hiện tại không còn khả dụng. Hãy chọn lại mẫu trước khi sửa.");
            var layout = CvLayoutDefinition.ParseOrDefault(template?.LayoutDefinitionJson, template?.LayoutKey);
            byte[] pdfBytes;
            try
            {
                pdfBytes = HireMateCvPdf.Generate(answers, layout);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Could not render edited CV {CvId}", id);
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không tạo được PDF từ nội dung đã sửa. CV cũ được giữ nguyên.");
            }

            var key = CvStorageKeys.Generated(userId, id);
            byte[]? oldPdf = null;
            try
            {
                var oldKey = storage.ResolveExistingKey(doc.StoragePath, userId);
                if (oldKey == key && await storage.ExistsAsync(key))
                {
                    await using var oldStream = await storage.OpenReadAsync(key);
                    using var buffer = new MemoryStream();
                    await oldStream.CopyToAsync(buffer);
                    oldPdf = buffer.ToArray();
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Could not read prior PDF for CV edit {CvId}", id);
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không đọc được PDF hiện tại. CV cũ được giữ nguyên.");
            }
            try
            {
                await storage.SaveAsync(key, new MemoryStream(pdfBytes));
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Could not store edited CV {CvId}", id);
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không lưu được PDF đã sửa. CV cũ được giữ nguyên.");
            }

            try
            {
                doc.WizardAnswersJson = JsonSerializer.Serialize(answers);
                doc.ExtractedText = HireMateCvHtml.ToPlainText(answers);
                doc.StoragePath = key;
                doc.ContentType = "application/pdf";
                doc.FileSize = pdfBytes.Length;
                // Existing analysis belongs to the previous content. Re-analysis remains an explicit operation.
                doc.ParseSucceeded = false;
                doc.FormatScore = null;
                doc.KeywordsScore = null;
                doc.ReadabilityScore = null;
                doc.ProfessionalismScore = null;
                doc.ReadinessScore = null;
                doc.FitT1Score = null;
                doc.AnalysisJson = null;
                doc.AiProvider = null;
                doc.AnalyzedAt = null;
                await uow.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Could not persist edited CV {CvId}", id);
                try
                {
                    if (oldPdf != null) await storage.SaveAsync(key, new MemoryStream(oldPdf));
                    else await storage.DeleteAsync(key);
                }
                catch (Exception restoreError) { logger.LogError(restoreError, "Could not restore PDF after failed edit {CvId}", id); }
                return new ServiceResult(Const.FAIL_UPDATE_CODE, "Không lưu được thay đổi. CV cũ được giữ nguyên.");
            }
            return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã lưu thay đổi CV. Hãy chấm điểm lại để cập nhật đánh giá.", await MapAsync(doc));
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task DeleteAfterFailedCreateAsync(string key)
    {
        try { await storage.DeleteAsync(key); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to clean up uncommitted CV storage object {StorageKey}", key);
        }
    }

    private async Task<bool> StoredFileExistsAsync(CvDocument doc)
    {
        var key = storage.ResolveExistingKey(doc.StoragePath, doc.UserId);
        return key != null && await storage.ExistsAsync(key);
    }

    private async Task<byte[]?> ReadStoredFileAsync(CvDocument doc)
    {
        var key = storage.ResolveExistingKey(doc.StoragePath, doc.UserId);
        if (key == null || !await storage.ExistsAsync(key)) return null;
        try
        {
            await using var input = await storage.OpenReadAsync(key);
            using var buffer = new MemoryStream();
            await input.CopyToAsync(buffer);
            return buffer.ToArray();
        }
        catch (FileNotFoundException) { return null; }
        catch (DirectoryNotFoundException) { return null; }
    }

    public async Task<IServiceResult> GetDownloadAsync(Guid userId, Guid id)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        // Wizard: prefer the stored PDF; regenerate from answers only when it is missing.
        if (doc.Source == "Wizard")
        {
            if (doc.ContentType?.Contains("pdf", StringComparison.OrdinalIgnoreCase) == true)
            {
                var bytes = await ReadStoredFileAsync(doc);
                if (bytes != null)
                    return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new FileDownloadDto
                {
                    FileName = EnsurePdfName(doc.FileName),
                    ContentType = "application/pdf",
                    Bytes = bytes
                });
            }

            if (!string.IsNullOrWhiteSpace(doc.WizardAnswersJson))
            {
                try
                {
                    var answers = JsonSerializer.Deserialize<CvWizardAnswers>(doc.WizardAnswersJson);
                    if (answers != null)
                    {
                        CvLayoutDefinition? layout = null;
                        if (doc.TemplateId.HasValue)
                        {
                            var t = await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
                                .FirstOrDefaultAsync(x => x.Id == doc.TemplateId.Value);
                            if (t != null)
                                layout = CvLayoutDefinition.ParseOrDefault(t.LayoutDefinitionJson, t.LayoutKey);
                        }
                        var pdf = HireMateCvPdf.Generate(answers, layout);
                        try
                        {
                            var key = CvStorageKeys.Generated(userId, doc.Id);
                            await storage.SaveAsync(key, new MemoryStream(pdf));
                            doc.StoragePath = key;
                            doc.ContentType = "application/pdf";
                            doc.FileSize = pdf.Length;
                            await uow.SaveChangesAsync();
                        }
                        catch (Exception ex)
                        {
                            logger.LogWarning(ex, "CV {CvId} PDF regenerated but could not be cached", doc.Id);
                        }
                        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new FileDownloadDto
                        {
                            FileName = EnsurePdfName(doc.FileName),
                            ContentType = "application/pdf",
                            Bytes = pdf
                        });
                    }
                }
                catch (Exception ex) { logger.LogWarning(ex, "Could not regenerate PDF for CV {CvId}", doc.Id); }
            }

            // HTML cũ: vẫn cho tải
            var legacyBytes = await ReadStoredFileAsync(doc);
            if (legacyBytes != null)
            {
                return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new FileDownloadDto
                {
                    FileName = string.IsNullOrWhiteSpace(doc.FileName) ? "HireMate-CV.html" : doc.FileName,
                    ContentType = doc.ContentType ?? "text/html",
                    Bytes = legacyBytes
                });
            }
        }

        // Upload: trả file gốc
        if (doc.Source != "Wizard")
        {
            var bytes = await ReadStoredFileAsync(doc);
            if (bytes != null)
                return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new FileDownloadDto
            {
                FileName = string.IsNullOrWhiteSpace(doc.FileName) ? "CV" : doc.FileName,
                ContentType = string.IsNullOrWhiteSpace(doc.ContentType) ? "application/octet-stream" : doc.ContentType,
                Bytes = bytes
            });
        }

        return new ServiceResult(Const.WARNING_NO_DATA_CODE, "File CV không còn trên máy chủ");
    }

    private static string SanitizeFileName(string name)
    {
        var s = string.Join("-", name.Split(Path.GetInvalidFileNameChars(), StringSplitOptions.RemoveEmptyEntries)).Trim();
        return string.IsNullOrWhiteSpace(s) ? "UngVien" : s.Replace(' ', '-');
    }

    private static string EnsurePdfName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "HireMate-CV.pdf";
        return name.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) ? name : Path.ChangeExtension(name, ".pdf");
    }

    private static IServiceResult? ValidateWizardMinimum(CvWizardDto dto)
    {
        var errors = new List<ValidationResult>();
        if (!Validator.TryValidateObject(dto, new ValidationContext(dto), errors, validateAllProperties: true))
            return new ServiceResult(Const.FAIL_CREATE_CODE, errors[0].ErrorMessage ?? "Thông tin CV chưa hợp lệ");
        if (string.IsNullOrWhiteSpace(dto.FullName)
            || string.IsNullOrWhiteSpace(dto.DesiredIndustry)
            || string.IsNullOrWhiteSpace(dto.DesiredPosition))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng nhập Họ tên, Ngành nghề và Vị trí ứng tuyển.");
        if (dto.Educations?.Count > 0 && dto.Educations.Any(e => string.IsNullOrWhiteSpace(e.Institution)))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mỗi học vấn cần có Trường / Tổ chức.");
        if ((dto.Educations?.Count ?? 0) == 0 && string.IsNullOrWhiteSpace(dto.University))
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Vui lòng nhập ít nhất một Trường / Tổ chức trong Học vấn.");
        if (dto.Experiences?.Any(e => string.IsNullOrWhiteSpace(e.Title) || string.IsNullOrWhiteSpace(e.Org)) == true)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mỗi kinh nghiệm cần có Vị trí và Công ty.");
        if (dto.Activities?.Any(e => string.IsNullOrWhiteSpace(e.Title) || string.IsNullOrWhiteSpace(e.Org)) == true)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mỗi hoạt động cần có Tên và Tổ chức.");
        if (dto.Projects?.Any(p => string.IsNullOrWhiteSpace(p.Name)) == true)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "Mỗi dự án cần có Tên dự án.");
        return null;
    }

    private static bool HasClientRequestId(string? json, string requestId)
    {
        if (string.IsNullOrWhiteSpace(json)) return false;
        try
        {
            return string.Equals(JsonSerializer.Deserialize<CvWizardAnswers>(json)?.ClientRequestId,
                requestId, StringComparison.Ordinal);
        }
        catch { return false; }
    }

    private static CvWizardAnswers BuildAnswers(CvWizardDto dto)
    {
        static CvExperienceItem MapExperience(CvExperienceDto e) => new()
        {
            Title = e.Title, Org = e.Org, Period = e.Period, Description = e.Description,
            StartDate = e.StartDate, EndDate = e.EndDate, IsCurrent = e.IsCurrent,
            Role = e.Role, BulletPoints = e.BulletPoints
                .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).ToList()
        };

        var answers = new CvWizardAnswers
        {
            FullName = dto.FullName, University = dto.University, Major = dto.Major,
            GraduationYear = dto.GraduationYear, DesiredIndustry = dto.DesiredIndustry,
            DesiredPosition = dto.DesiredPosition, ExperienceLevel = dto.ExperienceLevel,
            Bio = dto.Bio, CareerObjective = dto.CareerObjective, Summary = dto.Summary,
            Email = dto.Email, Phone = dto.Phone, DateOfBirth = dto.DateOfBirth,
            Gender = dto.Gender, Address = dto.Address, AvatarUrl = dto.AvatarUrl,
            LinkedIn = dto.LinkedIn, GitHub = dto.GitHub, ClientRequestId = dto.ClientRequestId,
            Skills = dto.Skills, Experiences = dto.Experiences.Select(MapExperience).ToList(),
            Projects = dto.Projects, Certifications = dto.Certifications,
            Activities = dto.Activities.Select(MapExperience).ToList(), Hobbies = dto.Hobbies,
            References = dto.References, Educations = dto.Educations
        };
        return CvTemplateDocumentMapper.Map(answers).Data;
    }

    public async Task<IServiceResult> RenameAsync(Guid userId, Guid id, RenameCvDto dto)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        if (!CvDisplayNameHelper.TryNormalize(dto.DisplayName, out var normalized, out var error))
            return new ServiceResult(Const.FAIL_UPDATE_CODE, error!);

        // Rename DisplayName only — never mutate FileName / StoragePath / Active flags.
        var previousFileName = doc.FileName;
        doc.DisplayName = normalized;
        await uow.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã đổi tên CV", new
        {
            id = doc.Id,
            displayName = doc.DisplayName,
            fileName = previousFileName,
            renamed = true,
            createdNew = false
        });
    }

    public async Task<IServiceResult> ChangeTemplateAsync(Guid userId, Guid id, ChangeCvTemplateDto dto)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        var template = await ResolveUsableTemplateAsync(userId, dto.TemplateId);
        if (template == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy template");

        // Keep CV content; only switch layout reference.
        doc.TemplateId = template.Id;

        // Re-render through private storage; never write to a legacy/public physical path.
        if (doc.Source == "Wizard" && !string.IsNullOrWhiteSpace(doc.WizardAnswersJson)
            && !string.IsNullOrWhiteSpace(doc.StoragePath))
        {
            try
            {
                var answers = JsonSerializer.Deserialize<CvWizardAnswers>(doc.WizardAnswersJson);
                if (answers != null)
                {
                    var layout = CvLayoutDefinition.ParseOrDefault(template.LayoutDefinitionJson, template.LayoutKey);
                    var pdfBytes = HireMateCvPdf.Generate(answers, layout);
                    var key = CvStorageKeys.Generated(userId, doc.Id);
                    await storage.SaveAsync(key, new MemoryStream(pdfBytes));
                    doc.StoragePath = key;
                    doc.FileSize = pdfBytes.Length;
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Could not re-render PDF for CV {CvId}; template reference is still saved", doc.Id);
            }
        }

        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã đổi template CV", await MapAsync(doc));
    }

    public async Task<IServiceResult> OptimizeContentAsync(Guid userId, OptimizeCvContentDto dto)
    {
        var user = await users.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        Guid? fixedTemplateId = dto.TemplateId;
        CvWizardAnswers? draft = null;

        if (dto.SourceCvDocumentId.HasValue)
        {
            var src = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == dto.SourceCvDocumentId && c.UserId == userId);
            if (src == null)
                return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

            fixedTemplateId ??= src.TemplateId ?? CvSystemTemplateIds.Modern01;
            if (!string.IsNullOrWhiteSpace(src.WizardAnswersJson))
            {
                try { draft = JsonSerializer.Deserialize<CvWizardAnswers>(src.WizardAnswersJson); }
                catch { /* ignore */ }
            }

            if (draft == null)
            {
                // Content-only optimization from extracted text — do not invent new experience/projects.
                draft = new CvWizardAnswers
                {
                    FullName = user.FullName,
                    Bio = Truncate(src.ExtractedText ?? "", 800),
                    DesiredPosition = "",
                    DesiredIndustry = "",
                    University = "",
                    Major = "",
                    ExperienceLevel = "",
                    GraduationYear = DateTime.UtcNow.Year
                };
            }
        }
        else if (dto.Draft != null)
        {
            draft = BuildAnswers(dto.Draft);
            fixedTemplateId ??= dto.Draft.TemplateId ?? CvSystemTemplateIds.Modern01;
        }
        else
        {
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Cần SourceCvDocumentId hoặc Draft");
        }

        var template = await ResolveUsableTemplateAsync(userId, fixedTemplateId);
        if (fixedTemplateId.HasValue && template == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy template");
        template ??= await GetSystemTemplateAsync(CvSystemTemplateIds.Modern01);
        var lockedTemplateId = template?.Id ?? CvSystemTemplateIds.Modern01;

        var contentJson = JsonSerializer.Serialize(new
        {
            careerObjective = draft.CareerObjective,
            summary = draft.Summary,
            educations = draft.Educations.Select(x => new { context = new { x.Institution, x.Major }, x.Description }),
            experiences = draft.Experiences.Select(x => new { context = new { x.Title, x.Org, x.Role }, x.Description, x.BulletPoints }),
            projects = draft.Projects.Select(x => new { context = new { x.Name, x.Role, x.Technologies }, x.Description, x.BulletPoints }),
            activities = draft.Activities.Select(x => new { context = new { x.Title, x.Org, x.Role }, x.Description, x.BulletPoints }),
            certifications = draft.Certifications.Select(x => new { context = new { x.Name, x.Issuer }, x.Description }),
            skills = draft.Skills,
            hobbies = draft.Hobbies,
            references = draft.References.Select(x => new { context = new { x.Name, x.Title, x.Organization }, x.Description })
        });
        var jd = string.IsNullOrWhiteSpace(dto.JobDescription) ? "" : dto.JobDescription.Trim();
        var system =
            "You improve only the wording of existing CV content. Return one JSON object with exactly these keys: " +
            "careerObjective, summary, educations[{description}], experiences[{description,bulletPoints}], " +
            "projects[{description,bulletPoints}], activities[{description,bulletPoints}], " +
            "certifications[{description}], skills[string], hobbies[string], references[{description}]. " +
            "Keep every array in the same order and length. If an input field is empty, output it empty. " +
            "If a field cannot be improved, copy it exactly. Never invent facts, experience, projects, education, " +
            "certificates, achievements, metrics or skills. Never output personal data, identity fields, names, " +
            "companies, organizations, dates, IDs, URLs, email addresses, phone numbers, template or layout fields. " +
            "Return JSON only, with no markdown or explanation.";
        var promptUser =
            $"Career context: {draft.DesiredIndustry} · {draft.DesiredPosition}.\n" +
            (jd.Length > 0 ? $"JobDescription:\n{Truncate(jd, 4000)}\n" : "") +
            $"ExistingCvContentJson:\n{contentJson}";

        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + promptUser.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var aiResult = await aiQuota.CompleteAndLogAsync(
            user, system, promptUser, "cv_optimize", dto.SourceCvDocumentId, SettingKeys.AiCvAnalyzeMaxOutputChars);

        var optimized = JsonSerializer.Deserialize<CvWizardAnswers>(JsonSerializer.Serialize(draft)) ?? draft;
        try
        {
            using var parsed = JsonDocument.Parse(CvAnalysisParser.UnwrapJson(aiResult.Content));
            ApplyAiContentProposal(draft, optimized, parsed.RootElement);
        }
        catch
        {
            // Keep original draft on parse failure — still return fixed TemplateId.
        }

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "AI đã tạo đề xuất nội dung CV", new
        {
            templateId = lockedTemplateId,
            templateName = template?.Name,
            templateChanged = false,
            content = optimized,
            provider = aiResult.Provider
        });
    }

    private static void ApplyAiContentProposal(CvWizardAnswers original, CvWizardAnswers proposal, JsonElement root)
    {
        proposal.CareerObjective = ProposedText(root, "careerObjective", original.CareerObjective);
        proposal.Summary = ProposedText(root, "summary", original.Summary);
        proposal.Skills = ProposedStringList(root, "skills", original.Skills, requireMeaningToken: true);
        proposal.Hobbies = ProposedStringList(root, "hobbies", original.Hobbies);

        ApplyDescriptionArray(root, "educations", original.Educations, proposal.Educations,
            x => x.Description, (x, value) => x.Description = value);
        ApplyDescriptionAndBulletsArray(root, "experiences", original.Experiences, proposal.Experiences);
        ApplyDescriptionAndBulletsArray(root, "activities", original.Activities, proposal.Activities);
        ApplyDescriptionAndBulletsArray(root, "projects", original.Projects, proposal.Projects);
        ApplyDescriptionArray(root, "certifications", original.Certifications, proposal.Certifications,
            x => x.Description, (x, value) => x.Description = value);
        ApplyDescriptionArray(root, "references", original.References, proposal.References,
            x => x.Description, (x, value) => x.Description = value);
    }

    private static string ProposedText(JsonElement root, string property, string? original)
    {
        var source = original ?? string.Empty;
        if (string.IsNullOrWhiteSpace(source)) return source;
        return root.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            && !string.IsNullOrWhiteSpace(value.GetString())
                ? SafeProposal(source, value.GetString()!.Trim())
                : source;
    }

    private static List<string> ProposedStringList(JsonElement root, string property, IReadOnlyList<string> original,
        bool requireMeaningToken = false)
    {
        if (!root.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Array)
            return original.ToList();
        var proposed = value.EnumerateArray().ToList();
        return original.Select((item, index) =>
        {
            if (string.IsNullOrWhiteSpace(item) || index >= proposed.Count || proposed[index].ValueKind != JsonValueKind.String
                || string.IsNullOrWhiteSpace(proposed[index].GetString())) return item;
            var candidate = proposed[index].GetString()!.Trim();
            if (requireMeaningToken && !SharesMeaningToken(item, candidate)) return item;
            return SafeProposal(item, candidate);
        }).ToList();
    }

    private static string SafeProposal(string original, string candidate)
    {
        var originalProtected = ProtectedContentTokens(original).ToHashSet(StringComparer.Ordinal);
        var candidateProtected = ProtectedContentTokens(candidate).ToHashSet(StringComparer.Ordinal);
        return originalProtected.SetEquals(candidateProtected) ? candidate : original;
    }

    private static IEnumerable<string> ProtectedContentTokens(string value) =>
        Regex.Matches(value, @"https?://\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\+?\d[\d\s()./-]{2,}\d|(?=\S*[A-Za-z])(?=\S*\d)[A-Za-z0-9._/-]+")
            .Select(match => match.Value.TrimEnd('.', ',', ';', ':'));

    private static bool SharesMeaningToken(string original, string candidate)
    {
        var sourceTokens = Regex.Matches(original, @"[\p{L}\p{N}+#.]{2,}")
            .Select(x => x.Value).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return sourceTokens.Any(token => candidate.Contains(token, StringComparison.OrdinalIgnoreCase));
    }

    private static void ApplyDescriptionArray<T>(JsonElement root, string property,
        IReadOnlyList<T> original, IReadOnlyList<T> proposal,
        Func<T, string?> read, Action<T, string> write)
    {
        if (!root.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Array) return;
        var proposed = value.EnumerateArray().ToList();
        for (var i = 0; i < original.Count && i < proposal.Count && i < proposed.Count; i++)
        {
            var source = read(original[i]) ?? string.Empty;
            if (string.IsNullOrWhiteSpace(source)) continue;
            write(proposal[i], ProposedText(proposed[i], "description", source));
        }
    }

    private static void ApplyDescriptionAndBulletsArray(JsonElement root, string property,
        IReadOnlyList<CvExperienceItem> original, IReadOnlyList<CvExperienceItem> proposal)
    {
        if (!root.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Array) return;
        var proposed = value.EnumerateArray().ToList();
        for (var i = 0; i < original.Count && i < proposal.Count && i < proposed.Count; i++)
        {
            proposal[i].Description = ProposedText(proposed[i], "description", original[i].Description);
            proposal[i].BulletPoints = ProposedStringList(proposed[i], "bulletPoints", original[i].BulletPoints);
        }
    }

    private static void ApplyDescriptionAndBulletsArray(JsonElement root, string property,
        IReadOnlyList<CvProjectDto> original, IReadOnlyList<CvProjectDto> proposal)
    {
        if (!root.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.Array) return;
        var proposed = value.EnumerateArray().ToList();
        for (var i = 0; i < original.Count && i < proposal.Count && i < proposed.Count; i++)
        {
            proposal[i].Description = ProposedText(proposed[i], "description", original[i].Description);
            proposal[i].BulletPoints = ProposedStringList(proposed[i], "bulletPoints", original[i].BulletPoints);
        }
    }

    private async Task<CvTemplate?> ResolveUsableTemplateAsync(Guid userId, Guid? templateId)
    {
        if (!templateId.HasValue)
            return await GetSystemTemplateAsync(CvSystemTemplateIds.Modern01);

        return await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(t =>
                t.Id == templateId.Value
                && t.IsActive
                && (t.IsSystemTemplate || t.UserId == userId));
    }

    private async Task<CvTemplate?> GetSystemTemplateAsync(Guid id)
        => await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id && t.IsSystemTemplate && t.IsActive);

    private async Task<object> MapAsync(
        CvDocument d,
        IReadOnlyList<string>? suggestions = null,
        Guid? activeCvDocumentId = null)
    {
        string? templateName = null;
        string? templateLayoutKey = null;
        if (d.TemplateId.HasValue)
        {
            var t = await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
                .Where(x => x.Id == d.TemplateId.Value)
                .Select(x => new { x.Name, x.LayoutKey })
                .FirstOrDefaultAsync();
            templateName = t?.Name;
            templateLayoutKey = t?.LayoutKey;
        }

        return await MapCoreAsync(d, suggestions, activeCvDocumentId, templateName, templateLayoutKey);
    }

    private async Task<List<object>> MapManyAsync(IReadOnlyList<CvDocument> docs, Guid? activeId)
    {
        var templateIds = docs.Where(d => d.TemplateId.HasValue).Select(d => d.TemplateId!.Value).Distinct().ToList();
        var templates = templateIds.Count == 0
            ? new Dictionary<Guid, (string Name, string LayoutKey)>()
            : await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
                .Where(t => templateIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => (t.Name, t.LayoutKey));

        var mapped = new List<object>(docs.Count);
        foreach (var d in docs)
        {
            string? name = null;
            string? key = null;
            if (d.TemplateId.HasValue && templates.TryGetValue(d.TemplateId.Value, out var t))
            {
                name = t.Name;
                key = t.LayoutKey;
            }
            mapped.Add(await MapCoreAsync(d, null, activeId, name, key));
        }
        return mapped;
    }

    private static string Truncate(string s, int max)
        => string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s[..max]);

    private async Task<object> MapCoreAsync(
        CvDocument d,
        IReadOnlyList<string>? suggestions,
        Guid? activeCvDocumentId,
        string? templateName,
        string? templateLayoutKey)
    {
        var tips = suggestions?.ToList() ?? [];
        if (tips.Count == 0 && !string.IsNullOrWhiteSpace(d.AnalysisJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(CvAnalysisParser.UnwrapJson(d.AnalysisJson));
                tips = CvAnalysisParser.ReadSuggestions(doc.RootElement);
            }
            catch { /* ignore */ }
        }

        var isActive = activeCvDocumentId.HasValue && d.Id == activeCvDocumentId.Value;

        var displayName = CvDisplayNameHelper.Resolve(d.DisplayName, d.FileName);

        string? targetRole = null;
        string? targetField = null;
        string? targetMajor = null;
        try
        {
            if (!string.IsNullOrWhiteSpace(d.WizardAnswersJson))
            {
                var answers = JsonSerializer.Deserialize<CvWizardAnswers>(d.WizardAnswersJson);
                targetRole = answers?.DesiredPosition;
                targetField = answers?.DesiredIndustry;
                targetMajor = answers?.Educations?.FirstOrDefault(e => !string.IsNullOrWhiteSpace(e.Major))?.Major
                    ?? answers?.Major;
            }
            else if (!string.IsNullOrWhiteSpace(d.AnalysisJson))
            {
                using var analysis = JsonDocument.Parse(CvAnalysisParser.UnwrapJson(d.AnalysisJson));
                var extract = CvAnalysisParser.ReadExtract(analysis.RootElement);
                targetRole = extract.DesiredPosition;
                targetField = extract.DesiredIndustry;
                targetMajor = extract.Major;
            }
        }
        catch (JsonException) { /* Keep the CV available even if old analysis JSON is malformed. */ }

        var canDownload = !string.IsNullOrWhiteSpace(d.WizardAnswersJson) && d.Source == "Wizard"
            || await StoredFileExistsAsync(d);
        return new
        {
            d.Id,
            d.Source,
            d.FileName,
            displayName,
            targetRole,
            targetField,
            targetMajor,
            d.TemplateId,
            templateName,
            templateLayoutKey,
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
            isActive,
            d.ConfirmedAt,
            canDownload,
            downloadUrl = canDownload ? $"/api/Cv/{d.Id}/download" : null,
            analysis = d.AnalysisJson,
            suggestions = tips,
            provider = d.AiProvider
        };
    }
}

public sealed class FileDownloadDto
{
    public string FileName { get; set; } = "file";
    public string ContentType { get; set; } = "application/octet-stream";
    public byte[] Bytes { get; set; } = [];
}



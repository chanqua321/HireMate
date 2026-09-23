using HireMate.Modules.Ai;
using HireMate.Modules.Onboarding.Abstractions;
using HireMate.BuildingBlocks;
using HireMate.Modules.Onboarding.Cv;
using System.Text;

using Common;
using Common.DTOs.OnboardingDto;
using Infrastructure.Data;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace HireMate.Modules.Onboarding.Services;

public class CvService(
    IUnitOfWork uow,
    IAiQuotaService aiQuota,
    UserManager<UserAccount> users,
    HireMateContext db) : ICvService
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> CreateGates = new();

    public async Task<IServiceResult> UploadAsync(
        Guid userId, IFormFile file, string webRoot, string? displayName = null, Guid? templateId = null)
    {
        // T1.1 CV-first: không yêu cầu PlanSelectedAt trước khi nộp CV
        if (file.Length == 0)
            return new ServiceResult(Const.FAIL_CREATE_CODE, "File trống");

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
            DisplayName = resolvedDisplay,
            TemplateId = template?.Id ?? CvSystemTemplateIds.Modern01,
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
            PayloadJson = JsonSerializer.Serialize(new
            {
                doc.FileName,
                doc.DisplayName,
                doc.TemplateId,
                hasText = CvTextExtractor.HasSelectableText(text)
            })
        });
        await uow.SaveChangesAsync();

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

    public async Task<IServiceResult> CreateFromWizardAsync(Guid userId, CvWizardDto dto, string webRoot)
    {
        var validation = ValidateWizardMinimum(dto);
        if (validation != null) return validation;

        if (string.IsNullOrWhiteSpace(dto.ClientRequestId))
            return await CreateFromWizardCoreAsync(userId, dto, webRoot);

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

            return await CreateFromWizardCoreAsync(userId, dto, webRoot);
        }
        finally
        {
            gate.Release();
            CreateGates.TryRemove(gateKey, out _);
        }
    }

    private async Task<IServiceResult> CreateFromWizardCoreAsync(Guid userId, CvWizardDto dto, string webRoot)
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

        var html = HireMateCvHtml.Render(answers, layout);
        var plain = HireMateCvHtml.ToPlainText(answers);
        var pdfBytes = HireMateCvPdf.Generate(answers, layout);
        var dir = Path.Combine(webRoot, "uploads", "cv", userId.ToString());
        Directory.CreateDirectory(dir);
        var fileName = $"HireMate-CV-{SanitizeFileName(answers.FullName)}-{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";
        var path = Path.Combine(dir, $"{Guid.NewGuid()}_{fileName}");
        await File.WriteAllBytesAsync(path, pdfBytes);
        // Giữ bản HTML phụ để debug / mở nhanh
        var htmlPath = Path.ChangeExtension(path, ".html");
        await File.WriteAllTextAsync(htmlPath, html);

        var doc = new CvDocument
        {
            Id = Guid.NewGuid(), UserId = userId, Source = "Wizard", FileName = fileName,
            DisplayName = resolvedDisplay, TemplateId = template?.Id ?? CvSystemTemplateIds.Modern01,
            StoragePath = path, ContentType = "application/pdf", FileSize = pdfBytes.Length,
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
            TryDeleteStorageFile(path);
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
        var promptUser = $"Analyze this CV text:\n{doc.ExtractedText}{CvAnalysisParser.CompactPromptSuffix(maxOut)}";
        var system = "You are a CV ATS analyzer for Vietnam students. Return JSON only with keys parseSucceeded, format, keywords, readability, professionalism, readinessScore, fitT1 (0-100 vs desired role in CV), extract{fullName,university,major,graduationYear,desiredIndustry,desiredPosition,experienceLevel,bio,skills,hobbies,experiences[{title,org,period,description}]}, suggestions (short array). Compact.";

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
        catch
        {
            // Soft-fail: vẫn lưu điểm heuristic + gợi ý để user sửa trước phỏng vấn
            IServiceResult result;
            try
            {
                result = await PersistHeuristicAnalyzeAsync(user, doc, null, aiResult.Content, aiResult.Provider,
                    "AI trả JSON lỗi. Đã chấm sơ bộ — xem gợi ý và chỉnh CV rồi phân tích lại.");
            }
            catch
            {
                if (quotaReserved)
                    await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvAnalysis);
                throw;
            }
            if (quotaReserved && !doc.ParseSucceeded)
                await aiQuota.ReleaseFeatureAsync(user, AiQuotaFeature.CvAnalysis);
            return result;
        }

        using (parsed)
        {
            var root = parsed.RootElement;
            // Không fail cứng khi thiếu 1 điểm — dùng fallback để user vẫn nhận gợi ý
            var format = CvAnalysisParser.ReadScoreOr(root, "format", 55);
            var keywords = CvAnalysisParser.ReadScoreOr(root, "keywords", 55);
            var readability = CvAnalysisParser.ReadScoreOr(root, "readability", 55);
            var professionalism = CvAnalysisParser.ReadScoreOr(root, "professionalism", 55);

            var extract = CvAnalysisParser.ReadExtract(root);
            // Wizard: ưu tiên dữ liệu form đã nhập
            if (doc.Source == "Wizard" && !string.IsNullOrWhiteSpace(doc.WizardAnswersJson))
            {
                try
                {
                    var wa = JsonSerializer.Deserialize<CvWizardAnswers>(doc.WizardAnswersJson);
                    if (wa != null)
                    {
                        extract.FullName ??= wa.FullName;
                        extract.University ??= wa.University;
                        extract.Major ??= wa.Major;
                        extract.GraduationYear ??= wa.GraduationYear;
                        extract.DesiredIndustry ??= wa.DesiredIndustry;
                        extract.DesiredPosition ??= wa.DesiredPosition;
                        extract.ExperienceLevel ??= wa.ExperienceLevel;
                        extract.Bio ??= wa.Bio;
                        if (extract.Skills.Count == 0) extract.Skills = wa.Skills;
                        if (extract.Experiences.Count == 0) extract.Experiences = wa.Experiences;
                    }
                }
                catch { /* ignore */ }
            }

            var parseOk = root.TryGetProperty("parseSucceeded", out var ps) && ps.ValueKind == JsonValueKind.True
                          || CvAnalysisParser.ParseLooksComplete(extract);
            if (doc.Source == "Wizard")
                parseOk = true;

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
                doc.FitT1Score = doc.ReadinessScore;
            doc.ParseSucceeded = parseOk;
            // Gắn suggestions vào JSON lưu DB để FE đọc
            try
            {
                using var enriched = JsonDocument.Parse(CvAnalysisParser.UnwrapJson(aiResult.Content));
                var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(enriched.RootElement.GetRawText())
                           ?? new Dictionary<string, JsonElement>();
                dict["suggestions"] = JsonSerializer.SerializeToElement(suggestions);
                dict["format"] = JsonSerializer.SerializeToElement(format);
                dict["keywords"] = JsonSerializer.SerializeToElement(keywords);
                dict["readability"] = JsonSerializer.SerializeToElement(readability);
                dict["professionalism"] = JsonSerializer.SerializeToElement(professionalism);
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
                parseOk
                    ? "Đã phân tích CV. Xem gợi ý cải thiện trước khi luyện phỏng vấn."
                    : "Đã chấm ATS. Hãy sửa theo gợi ý rồi phân tích lại trước khi phỏng vấn.",
                await MapAsync(doc, suggestions));
        }
    }

    private async Task<IServiceResult> PersistHeuristicAnalyzeAsync(
        UserAccount user,
        CvDocument doc,
        CvExtractDraft? extract,
        string? rawAi,
        string? provider,
        string message)
    {
        extract ??= new CvExtractDraft();
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
                }
            }
            catch { /* ignore */ }
        }

        var suggestions = CvAnalysisParser.BuildHeuristicSuggestions(extract, doc.Source);
        var complete = CvAnalysisParser.ParseLooksComplete(extract) || doc.Source == "Wizard";
        var baseScore = complete ? 68 : 42;
        doc.FormatScore = baseScore;
        doc.KeywordsScore = Math.Max(35, baseScore - 8 + Math.Min(extract.Skills.Count * 3, 20));
        doc.ReadabilityScore = baseScore;
        doc.ProfessionalismScore = baseScore - 5;
        doc.ReadinessScore = Average(
            doc.FormatScore ?? 0,
            doc.KeywordsScore ?? 0,
            doc.ReadabilityScore ?? 0,
            doc.ProfessionalismScore ?? 0);
        doc.FitT1Score = doc.ReadinessScore;
        doc.ParseSucceeded = complete;
        if (complete) doc.AnalyzedAt = DateTime.UtcNow;
        doc.AiProvider = provider ?? "heuristic";
        doc.AnalysisJson = JsonSerializer.Serialize(new
        {
            parseSucceeded = complete,
            format = doc.FormatScore,
            keywords = doc.KeywordsScore,
            readability = doc.ReadabilityScore,
            professionalism = doc.ProfessionalismScore,
            readinessScore = doc.ReadinessScore,
            fitT1 = doc.FitT1Score,
            extract,
            suggestions,
            note = rawAi != null ? "ai_json_fallback" : "heuristic"
        });

        var profile = await GetOrCreateProfileAsync(user.Id);
        if (profile.ConfirmedAt == null && !string.Equals(doc.Source, "Wizard", StringComparison.OrdinalIgnoreCase))
            ApplyExtractIfEmpty(user, profile, extract);

        await users.UpdateAsync(user);
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, message, await MapAsync(doc, suggestions));
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

        // Xóa file sau khi DB commit — không đụng InterviewSession / CareerMemory
        TryDeleteStorageFile(storagePath);

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã xóa CV", new
        {
            success = true,
            deletedCvDocumentId = id,
            activeCvDocumentId = (Guid?)null
        });
    }

    private static void TryDeleteStorageFile(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) return;
        try
        {
            if (File.Exists(path))
                File.Delete(path);
            var htmlPath = Path.ChangeExtension(path, ".html");
            if (!string.IsNullOrWhiteSpace(htmlPath) && File.Exists(htmlPath))
                File.Delete(htmlPath);
        }
        catch
        {
            // Không fail API nếu xóa file vật lý lỗi
        }
    }

    public async Task<IServiceResult> GetDownloadAsync(Guid userId, Guid id)
    {
        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        // Wizard: ưu tiên PDF trên disk; nếu thiếu thì regenerate từ WizardAnswersJson
        if (doc.Source == "Wizard")
        {
            if (!string.IsNullOrWhiteSpace(doc.StoragePath) && File.Exists(doc.StoragePath)
                && doc.ContentType?.Contains("pdf", StringComparison.OrdinalIgnoreCase) == true)
            {
                var bytes = await File.ReadAllBytesAsync(doc.StoragePath);
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
                        if (!string.IsNullOrWhiteSpace(doc.StoragePath))
                        {
                            try
                            {
                                var storageDirectory = Path.GetDirectoryName(doc.StoragePath);
                                if (!string.IsNullOrWhiteSpace(storageDirectory)) Directory.CreateDirectory(storageDirectory);
                                await File.WriteAllBytesAsync(doc.StoragePath, pdf);
                                await File.WriteAllTextAsync(Path.ChangeExtension(doc.StoragePath, ".html"),
                                    HireMateCvHtml.Render(answers, layout));
                                doc.ContentType = "application/pdf";
                                doc.FileSize = pdf.Length;
                                await uow.SaveChangesAsync();
                            }
                            catch
                            {
                                // Cache write is best-effort. The regenerated PDF is still valid for this download.
                            }
                        }
                        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new FileDownloadDto
                        {
                            FileName = EnsurePdfName(doc.FileName),
                            ContentType = "application/pdf",
                            Bytes = pdf
                        });
                    }
                }
                catch { /* fallthrough */ }
            }

            // HTML cũ: vẫn cho tải
            if (!string.IsNullOrWhiteSpace(doc.StoragePath) && File.Exists(doc.StoragePath))
            {
                var bytes = await File.ReadAllBytesAsync(doc.StoragePath);
                return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new FileDownloadDto
                {
                    FileName = string.IsNullOrWhiteSpace(doc.FileName) ? "HireMate-CV.html" : doc.FileName,
                    ContentType = doc.ContentType ?? "text/html",
                    Bytes = bytes
                });
            }
        }

        // Upload: trả file gốc
        if (!string.IsNullOrWhiteSpace(doc.StoragePath) && File.Exists(doc.StoragePath))
        {
            var bytes = await File.ReadAllBytesAsync(doc.StoragePath);
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

        // If wizard CV exists on disk, optionally re-render PDF with new layout (content unchanged).
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
                    var html = HireMateCvHtml.Render(answers, layout);
                    await File.WriteAllBytesAsync(doc.StoragePath, pdfBytes);
                    var htmlPath = Path.ChangeExtension(doc.StoragePath, ".html");
                    await File.WriteAllTextAsync(htmlPath, html);
                    doc.FileSize = pdfBytes.Length;
                }
            }
            catch
            {
                // TemplateId still saved even if re-render fails.
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

        return MapCore(d, suggestions, activeCvDocumentId, templateName, templateLayoutKey);
    }

    private async Task<List<object>> MapManyAsync(IReadOnlyList<CvDocument> docs, Guid? activeId)
    {
        var templateIds = docs.Where(d => d.TemplateId.HasValue).Select(d => d.TemplateId!.Value).Distinct().ToList();
        var templates = templateIds.Count == 0
            ? new Dictionary<Guid, (string Name, string LayoutKey)>()
            : await uow.CvTemplateRepository.GetQueryable().AsNoTracking()
                .Where(t => templateIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => (t.Name, t.LayoutKey));

        return docs.Select(d =>
        {
            string? name = null;
            string? key = null;
            if (d.TemplateId.HasValue && templates.TryGetValue(d.TemplateId.Value, out var t))
            {
                name = t.Name;
                key = t.LayoutKey;
            }
            return MapCore(d, null, activeId, name, key);
        }).ToList();
    }

    private static string Truncate(string s, int max)
        => string.IsNullOrEmpty(s) ? s : (s.Length <= max ? s : s[..max]);

    private static object MapCore(
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
            canDownload = d.Source == "Wizard"
                ? !string.IsNullOrWhiteSpace(d.WizardAnswersJson) || (!string.IsNullOrWhiteSpace(d.StoragePath) && File.Exists(d.StoragePath))
                : !string.IsNullOrWhiteSpace(d.StoragePath) && File.Exists(d.StoragePath),
            downloadUrl = (d.Source == "Wizard"
                ? !string.IsNullOrWhiteSpace(d.WizardAnswersJson) || (!string.IsNullOrWhiteSpace(d.StoragePath) && File.Exists(d.StoragePath))
                : !string.IsNullOrWhiteSpace(d.StoragePath) && File.Exists(d.StoragePath))
                    ? $"/api/Cv/{d.Id}/download"
                    : null,
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



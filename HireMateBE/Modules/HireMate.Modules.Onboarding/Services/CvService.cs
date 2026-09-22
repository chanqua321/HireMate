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

    public async Task<IServiceResult> CreateFromWizardAsync(Guid userId, CvWizardDto dto, string webRoot)
    {
        // T1.1 CV-first: không yêu cầu PlanSelectedAt trước khi tạo CV wizard

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
            Id = Guid.NewGuid(),
            UserId = userId,
            Source = "Wizard",
            FileName = fileName,
            DisplayName = resolvedDisplay,
            TemplateId = template?.Id ?? CvSystemTemplateIds.Modern01,
            StoragePath = path,
            ContentType = "application/pdf",
            FileSize = pdfBytes.Length,
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
            PayloadJson = JsonSerializer.Serialize(new { doc.FileName, doc.DisplayName, doc.TemplateId })
        });
        await uow.SaveChangesAsync();

        var analyzed = await AnalyzeAsync(userId, doc.Id);
        return analyzed.Status > 0
            ? analyzed
            : new ServiceResult(Const.SUCCESS_CREATE_CODE,
                "Đã tạo CV theo template. Phân tích AI chưa xong, hãy gọi analyze lại.",
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
        var doc = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
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

        if (!CvTextExtractor.HasSelectableText(doc.ExtractedText))
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "Không đọc được chữ trên CV. Dùng PDF/DOCX có text hoặc tạo CV bằng wizard.");

        var alreadyOk = doc.ParseSucceeded && doc.AnalyzedAt != null;
        var quotaBlockCv = await EnsureCvAnalyzeQuotaAsync(user, id, alreadyOk);
        if (quotaBlockCv != null)
            return quotaBlockCv;

        var snap = await aiQuota.GetSnapshotAsync(user);
        var maxOut = snap.MaxOutputChars;
        var promptUser = $"Analyze this CV text:\n{doc.ExtractedText}{CvAnalysisParser.CompactPromptSuffix(maxOut)}";
        var system = "You are a CV ATS analyzer for Vietnam students. Return JSON only with keys parseSucceeded, format, keywords, readability, professionalism, readinessScore, fitT1 (0-100 vs desired role in CV), extract{fullName,university,major,graduationYear,desiredIndustry,desiredPosition,experienceLevel,bio,skills,hobbies,experiences[{title,org,period,description}]}, suggestions (short array). Compact.";

        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + promptUser.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var aiResult = await aiQuota.CompleteAndLogAsync(
            user, system, promptUser, "cv", doc.Id, SettingKeys.AiCvAnalyzeMaxOutputChars);
        JsonDocument? parsed = null;
        try
        {
            parsed = JsonDocument.Parse(CvAnalysisParser.UnwrapJson(aiResult.Content));
        }
        catch
        {
            // Soft-fail: vẫn lưu điểm heuristic + gợi ý để user sửa trước phỏng vấn
            return await PersistHeuristicAnalyzeAsync(user, doc, null, aiResult.Content, aiResult.Provider,
                "AI trả JSON lỗi. Đã chấm sơ bộ — xem gợi ý và chỉnh CV rồi phân tích lại.");
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
        if (profile.ConfirmedAt == null)
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

        await aiQuota.RefreshExpiryAsync(user);
        var planCode = await aiQuota.GetEffectivePlanCodeAsync(user);
        var limit = PlanTier.MonthlyCvAnalyzeLimit(planCode);
        var start = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var usedMonth = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
            .CountAsync(c => c.UserId == user.Id && c.ParseSucceeded && c.AnalyzedAt != null
                && c.AnalyzedAt >= start && c.Id != currentCvId);

        if (usedMonth >= limit)
            return new ServiceResult(Const.FAIL_QUOTA_CODE,
                $"Gói {PlanTier.DisplayName(planCode)} chỉ được phân tích tối đa {limit} CV thành công/tháng. Nâng cấp gói hoặc đợi chu kỳ mới.");
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
        var doc = await uow.CvDocumentRepository.GetQueryable()
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId);
        if (doc == null)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy CV");

        var profile = await uow.CareerProfileRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        var wasActive = doc.IsConfirmed
            || (profile != null && profile.ConfirmedCvDocumentId == doc.Id);

        // Clear confirmed flags BEFORE delete so filtered unique index IX_CvDocuments_UserId_OneConfirmed
        // is free when fallback is activated in a later save.
        if (profile != null && profile.ConfirmedCvDocumentId == doc.Id)
        {
            profile.ConfirmedCvDocumentId = null;
            profile.UpdatedAt = DateTime.UtcNow;
        }

        doc.IsConfirmed = false;
        doc.ConfirmedAt = null;
        await uow.SaveChangesAsync();

        var storagePath = doc.StoragePath;
        await uow.CvDocumentRepository.RemoveAsync(doc);
        await uow.SaveChangesAsync();

        Guid? newActiveId = null;
        if (wasActive)
        {
            var fallback = await PickFallbackActiveCvAsync(userId, excludeId: id);
            if (fallback != null)
            {
                if (profile == null)
                {
                    profile = await uow.CareerProfileRepository.GetQueryable()
                        .FirstOrDefaultAsync(p => p.UserId == userId);
                }
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

                var stray = await uow.CvDocumentRepository.GetQueryable()
                    .Where(c => c.UserId == userId && c.Id != fallback.Id && c.IsConfirmed)
                    .ToListAsync();
                foreach (var o in stray)
                {
                    o.IsConfirmed = false;
                    o.ConfirmedAt = null;
                }

                fallback.IsConfirmed = true;
                fallback.ConfirmedAt = DateTime.UtcNow;
                profile.ConfirmedCvDocumentId = fallback.Id;
                profile.ConfirmedAt = DateTime.UtcNow;
                profile.UpdatedAt = DateTime.UtcNow;
                newActiveId = fallback.Id;
                await uow.SaveChangesAsync();
            }
        }

        // Xóa file sau khi DB commit — không đụng InterviewSession / CareerMemory
        TryDeleteStorageFile(storagePath);

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã xóa CV", new
        {
            success = true,
            deletedCvDocumentId = id,
            activeCvDocumentId = newActiveId ?? profile?.ConfirmedCvDocumentId
        });
    }

    /// <summary>
    /// Deterministic fallback: CV đã analyze gần nhất; nếu không có → CV mới nhất còn lại.
    /// </summary>
    private async Task<CvDocument?> PickFallbackActiveCvAsync(Guid userId, Guid excludeId)
    {
        var analyzed = await uow.CvDocumentRepository.GetQueryable()
            .Where(c => c.UserId == userId && c.Id != excludeId
                && c.ParseSucceeded && c.AnalyzedAt != null)
            .OrderByDescending(c => c.AnalyzedAt)
            .ThenByDescending(c => c.UploadedAt)
            .FirstOrDefaultAsync();
        if (analyzed != null)
            return analyzed;

        return await uow.CvDocumentRepository.GetQueryable()
            .Where(c => c.UserId == userId && c.Id != excludeId)
            .OrderByDescending(c => c.UploadedAt)
            .FirstOrDefaultAsync();
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
        var doc = await uow.CvDocumentRepository.GetQueryable().AsNoTracking()
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
            draft = new CvWizardAnswers
            {
                FullName = dto.Draft.FullName.Trim(),
                University = dto.Draft.University.Trim(),
                Major = dto.Draft.Major.Trim(),
                GraduationYear = dto.Draft.GraduationYear,
                DesiredIndustry = dto.Draft.DesiredIndustry.Trim(),
                DesiredPosition = dto.Draft.DesiredPosition.Trim(),
                ExperienceLevel = dto.Draft.ExperienceLevel.Trim(),
                Bio = dto.Draft.Bio?.Trim() ?? "",
                Skills = dto.Draft.Skills.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).Take(30).ToList(),
                Experiences = dto.Draft.Experiences.Select(e => new CvExperienceItem
                {
                    Title = e.Title,
                    Org = e.Org,
                    Period = e.Period,
                    Description = e.Description
                }).ToList()
            };
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

        var contentJson = JsonSerializer.Serialize(draft);
        var jd = string.IsNullOrWhiteSpace(dto.JobDescription) ? "" : dto.JobDescription.Trim();
        var system =
            "You optimize CV CONTENT for ATS and Vietnam students. Return JSON only with keys: " +
            "bio, skills (array), experiences[{title,org,period,description}]. " +
            "Rules: rewrite wording only; do NOT invent experience/projects/certificates/skills with no basis; " +
            "do NOT change template/layout/fonts/colors; do NOT add templateId or layout fields. Compact.";
        var promptUser =
            $"FixedTemplateId={lockedTemplateId} (do not change).\n" +
            (jd.Length > 0 ? $"JobDescription:\n{Truncate(jd, 4000)}\n" : "") +
            $"ExistingCvContentJson:\n{Truncate(contentJson, 6000)}";

        var quotaBlock = await aiQuota.EnsureCanCallAsync(user, system.Length + promptUser.Length);
        if (quotaBlock != null)
            return quotaBlock;

        var aiResult = await aiQuota.CompleteAndLogAsync(
            user, system, promptUser, "cv_optimize", dto.SourceCvDocumentId, SettingKeys.AiCvAnalyzeMaxOutputChars);

        CvWizardAnswers optimized = draft!;
        try
        {
            using var parsed = JsonDocument.Parse(CvAnalysisParser.UnwrapJson(aiResult.Content));
            var root = parsed.RootElement;
            if (root.TryGetProperty("bio", out var bioEl) && bioEl.ValueKind == JsonValueKind.String)
                optimized.Bio = bioEl.GetString()?.Trim() ?? optimized.Bio;
            if (root.TryGetProperty("skills", out var skillsEl) && skillsEl.ValueKind == JsonValueKind.Array)
            {
                var skills = skillsEl.EnumerateArray()
                    .Select(x => x.GetString()?.Trim())
                    .Where(s => !string.IsNullOrWhiteSpace(s))
                    .Cast<string>()
                    .Take(30)
                    .ToList();
                // Only keep skills that overlap with original OR are rewordings of existing — drop pure inventions.
                if (skills.Count > 0)
                {
                    var original = new HashSet<string>(draft!.Skills, StringComparer.OrdinalIgnoreCase);
                    optimized.Skills = skills.Where(s =>
                        original.Count == 0
                        || original.Contains(s)
                        || original.Any(o => s.Contains(o, StringComparison.OrdinalIgnoreCase)
                                          || o.Contains(s, StringComparison.OrdinalIgnoreCase)))
                        .DefaultIfEmpty()
                        .Where(s => !string.IsNullOrWhiteSpace(s))
                        .Cast<string>()
                        .ToList();
                    if (optimized.Skills.Count == 0)
                        optimized.Skills = draft.Skills;
                }
            }
            if (root.TryGetProperty("experiences", out var expEl) && expEl.ValueKind == JsonValueKind.Array
                && draft!.Experiences.Count > 0)
            {
                var rewritten = new List<CvExperienceItem>();
                var arr = expEl.EnumerateArray().ToList();
                for (var i = 0; i < draft.Experiences.Count; i++)
                {
                    var src = draft.Experiences[i];
                    if (i < arr.Count)
                    {
                        var e = arr[i];
                        rewritten.Add(new CvExperienceItem
                        {
                            Title = e.TryGetProperty("title", out var t) ? t.GetString() ?? src.Title : src.Title,
                            Org = e.TryGetProperty("org", out var o) ? o.GetString() ?? src.Org : src.Org,
                            Period = e.TryGetProperty("period", out var p) ? p.GetString() ?? src.Period : src.Period,
                            Description = e.TryGetProperty("description", out var d)
                                ? d.GetString() ?? src.Description
                                : src.Description
                        });
                    }
                    else rewritten.Add(src);
                }
                optimized.Experiences = rewritten;
            }
        }
        catch
        {
            // Keep original draft on parse failure — still return fixed TemplateId.
        }

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Đã tối ưu nội dung CV (giữ nguyên template)", new
        {
            templateId = lockedTemplateId,
            templateName = template?.Name,
            templateChanged = false,
            content = optimized,
            provider = aiResult.Provider
        });
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

        var isActive = activeCvDocumentId.HasValue
            ? d.Id == activeCvDocumentId.Value
            : d.IsConfirmed;

        var displayName = CvDisplayNameHelper.Resolve(d.DisplayName, d.FileName);

        return new
        {
            d.Id,
            d.Source,
            d.FileName,
            displayName,
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
            canDownload = true,
            downloadUrl = $"/api/Cv/{d.Id}/download",
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



using HireMate.Modules.Ai;
using HireMate.Modules.Onboarding.Abstractions;
using HireMate.Modules.Onboarding.Cv;
using System.Text.Json;
using HireMate.BuildingBlocks;

using Common;
using Common.DTOs.OnboardingDto;
using Common.DTOs.ProfileDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace HireMate.Modules.Onboarding.Services;

public class OnboardingService(
    UserManager<UserAccount> userManager,
    IUnitOfWork unitOfWork,
    IAiQuotaService aiQuota) : IOnboardingService
{
    private readonly UserManager<UserAccount> _userManager = userManager;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;

    public async Task<IServiceResult> SaveGoalAsync(Guid userId, OnboardingGoalDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var profile = await GetOrCreateProfileAsync(userId);
        profile.DesiredIndustry = dto.DesiredIndustry;
        profile.DesiredPosition = dto.DesiredPosition;
        profile.ExperienceLevel = dto.ExperienceLevel;
        profile.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, MapProfile(user, profile));
    }

    public async Task<IServiceResult> SavePersonalAsync(Guid userId, OnboardingPersonalDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        user.FullName = dto.FullName;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var profile = await GetOrCreateProfileAsync(userId);
        profile.University = dto.University;
        profile.Major = dto.Major;
        profile.GraduationYear = dto.GraduationYear;
        profile.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG, MapProfile(user, profile));
    }

    public async Task<IServiceResult> GetStatusAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var latest = await _unitOfWork.CvDocumentRepository.GetQueryable().AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UploadedAt)
            .FirstOrDefaultAsync();
        var usedOk = await _unitOfWork.CvDocumentRepository.GetQueryable().AsNoTracking()
            .CountAsync(c => c.UserId == userId && c.ParseSucceeded && c.AnalyzedAt != null);
        var hasSuccessfulAnalyze = usedOk > 0
            || (latest != null && latest.ParseSucceeded && latest.AnalyzedAt != null);
        var snap = await aiQuota.GetSnapshotAsync(user);
        var cvLimit = PlanTier.MonthlyCvAnalyzeLimit(user.CurrentPlanCode);
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var usedCvMonth = await _unitOfWork.CvDocumentRepository.GetQueryable().AsNoTracking()
            .CountAsync(c => c.UserId == userId && c.ParseSucceeded && c.AnalyzedAt != null && c.AnalyzedAt >= monthStart);
        var remaining = Math.Max(0, cvLimit - usedCvMonth);

        string next;
        if (latest == null)
            next = "upload_cv";
        else if (!hasSuccessfulAnalyze)
            next = "analyze";
        else if (user.PlanSelectedAt == null)
            next = "select_plan";
        else if (!user.OnboardingCompleted)
            next = "review_confirm";
        else
            next = "done";

        var usedSessions = await _unitOfWork.InterviewSessionRepository.GetQueryable().AsNoTracking()
            .CountAsync(s => s.UserId == userId && s.StartedAt >= monthStart);
        var interviewLimit = PlanTier.MonthlyInterviewSessions(user.CurrentPlanCode);

        var jdQuota = await aiQuota.GetFeatureQuotaAsync(user, AiQuotaFeature.JdMatch);
        var emailQuota = await aiQuota.GetFeatureQuotaAsync(user, AiQuotaFeature.CvEmailGeneration);

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, new OnboardingStatusDto
        {
            HasSelectedPlan = user.PlanSelectedAt != null,
            CurrentPlanCode = PlanTier.Normalize(user.CurrentPlanCode),
            IsPremium = user.IsPremium,
            OnboardingCompleted = user.OnboardingCompleted,
            HasCv = latest != null,
            LatestCvId = latest?.Id,
            LatestParseSucceeded = latest?.ParseSucceeded ?? false,
            ReadinessScore = latest?.ReadinessScore,
            FitT1Score = latest?.FitT1Score,
            RemainingFreeAnalyzes = remaining,
            MonthlyAiCharBudget = snap.MonthlyBudget,
            UsedAiChars = snap.UsedChars,
            RemainingAiChars = snap.MonthlyBudget <= 0 ? -1 : snap.RemainingChars,
            PlanExpiresAt = snap.PlanExpiresAt,
            PlanExpired = snap.IsExpired,
            NextStep = next,
            MonthlyInterviewLimit = interviewLimit,
            UsedInterviewSessions = usedSessions,
            RemainingInterviewSessions = Math.Max(0, interviewLimit - usedSessions),
            QuestionsPerSession = PlanTier.QuestionsPerSession(user.CurrentPlanCode),
            MonthlyJdMatchLimit = jdQuota.Limit,
            UsedJdMatches = jdQuota.Used,
            RemainingJdMatches = jdQuota.Remaining,
            MonthlyCvEmailGenerationLimit = emailQuota.Limit,
            UsedCvEmailGenerations = emailQuota.Used,
            RemainingCvEmailGenerations = emailQuota.Remaining
        });
    }

    public async Task<IServiceResult> ConfirmAsync(Guid userId, ConfirmOnboardingDto? review)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");
        if (user.PlanSelectedAt == null)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Vui lòng chọn gói trước khi hoàn thiện hồ sơ");

        if (review != null)
            await ApplyConfirmAsync(user, review);

        var profile = await GetOrCreateProfileAsync(userId);

        // Source of truth: keep existing ConfirmedCvDocumentId. Never replace with latest analyzed CV.
        CvDocument? existingOwned = null;
        if (profile.ConfirmedCvDocumentId is Guid existingId)
        {
            existingOwned = await _unitOfWork.CvDocumentRepository.GetQueryable()
                .FirstOrDefaultAsync(c => c.Id == existingId && c.UserId == userId);
        }

        var targetId = ActiveCvConfirmPolicy.ResolveOnboardingTarget(
            profile.ConfirmedCvDocumentId,
            existingOwned != null,
            latestAnalyzedId: null);

        var cv = targetId.HasValue ? existingOwned : null;

        if (cv == null)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Hãy bấm “Chọn làm CV phỏng vấn” trong Kho CV trước khi xác nhận");

        // Older wizard CVs may have been activated before the one-form CV flow synced
        // their fields to CareerProfile. Recover only values the user actually entered.
        if (string.Equals(cv.Source, "Wizard", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(cv.WizardAnswersJson))
        {
            try
            {
                var answers = JsonSerializer.Deserialize<CvWizardAnswers>(cv.WizardAnswersJson);
                if (answers != null)
                {
                    if (string.IsNullOrWhiteSpace(user.FullName)) user.FullName = answers.FullName;
                    if (string.IsNullOrWhiteSpace(profile.University))
                        profile.University = answers.Educations?.FirstOrDefault(e => !string.IsNullOrWhiteSpace(e.Institution))?.Institution
                            ?? answers.University;
                    if (string.IsNullOrWhiteSpace(profile.DesiredIndustry)) profile.DesiredIndustry = answers.DesiredIndustry;
                    if (string.IsNullOrWhiteSpace(profile.DesiredPosition)) profile.DesiredPosition = answers.DesiredPosition;
                }
            }
            catch (JsonException) { /* Keep the stored profile when an old draft is unreadable. */ }
        }

        var missing = new List<string>();
        if (string.IsNullOrWhiteSpace(user.FullName)) missing.Add("Họ tên");
        if (string.IsNullOrWhiteSpace(profile.University)) missing.Add("Trường / Tổ chức trong Học vấn");
        if (string.IsNullOrWhiteSpace(profile.DesiredIndustry)) missing.Add("Ngành nghề");
        if (string.IsNullOrWhiteSpace(profile.DesiredPosition)) missing.Add("Vị trí ứng tuyển");
        if (missing.Count > 0)
        {
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                $"CV đang kích hoạt thiếu {string.Join(", ", missing)}. Hãy vào Tạo CV, điền đủ thông tin, tạo CV mới rồi kích hoạt.");
        }

        var others = await _unitOfWork.CvDocumentRepository.GetQueryable()
            .Where(c => c.UserId == userId && c.Id != cv.Id && c.IsConfirmed)
            .ToListAsync();
        foreach (var o in others)
        {
            o.IsConfirmed = false;
            o.ConfirmedAt = null;
        }

        cv.IsConfirmed = true;
        cv.ConfirmedAt ??= DateTime.UtcNow;
        profile.ConfirmedAt ??= DateTime.UtcNow;
        profile.ConfirmedCvDocumentId = cv.Id;
        profile.UpdatedAt = DateTime.UtcNow;
        user.OnboardingCompleted = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        await _unitOfWork.CareerMemoryEventRepository.CreateAsync(new CareerMemoryEvent
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            EventType = "ProfileConfirmed",
            RefId = cv.Id
        });
        await _unitOfWork.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Hồ sơ đã hoàn thiện", MapProfile(user, profile));
    }

    private async Task ApplyConfirmAsync(UserAccount user, ConfirmOnboardingDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.FullName))
        {
            user.FullName = dto.FullName.Trim();
            user.UpdatedAt = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);
        }
        var profile = await GetOrCreateProfileAsync(user.Id);
        if (dto.DesiredIndustry != null) profile.DesiredIndustry = dto.DesiredIndustry;
        if (dto.DesiredPosition != null) profile.DesiredPosition = dto.DesiredPosition;
        if (dto.ExperienceLevel != null) profile.ExperienceLevel = dto.ExperienceLevel;
        if (dto.University != null) profile.University = dto.University;
        if (dto.Major != null) profile.Major = dto.Major;
        if (dto.GraduationYear.HasValue) profile.GraduationYear = dto.GraduationYear;
        if (dto.Bio != null) profile.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();
        if (dto.Hobbies != null) profile.HobbiesJson = SerializeHobbies(dto.Hobbies);
        if (dto.Skills != null) profile.SkillsJson = SerializeHobbies(dto.Skills);
        if (dto.Experiences != null) profile.ExperiencesJson = SerializeExperiences(dto.Experiences);
        if (dto.Projects != null) profile.ProjectsJson = SerializeProjects(dto.Projects);
        if (dto.Certifications != null) profile.CertificationsJson = SerializeCertifications(dto.Certifications);
        profile.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task ApplyReviewAsync(UserAccount user, UpdateProfileDto dto)
    {
        user.FullName = dto.FullName;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        var profile = await GetOrCreateProfileAsync(user.Id);
        if (dto.DesiredIndustry != null) profile.DesiredIndustry = dto.DesiredIndustry;
        if (dto.DesiredPosition != null) profile.DesiredPosition = dto.DesiredPosition;
        if (dto.ExperienceLevel != null) profile.ExperienceLevel = dto.ExperienceLevel;
        if (dto.University != null) profile.University = dto.University;
        if (dto.Major != null) profile.Major = dto.Major;
        if (dto.GraduationYear.HasValue) profile.GraduationYear = dto.GraduationYear;
        if (dto.Bio != null) profile.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();
        if (dto.Hobbies != null) profile.HobbiesJson = SerializeHobbies(dto.Hobbies);
        if (dto.Skills != null) profile.SkillsJson = SerializeHobbies(dto.Skills);
        if (dto.Experiences != null) profile.ExperiencesJson = SerializeExperiences(dto.Experiences);
        if (dto.Projects != null) profile.ProjectsJson = SerializeProjects(dto.Projects);
        if (dto.Certifications != null) profile.CertificationsJson = SerializeCertifications(dto.Certifications);
        profile.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();
    }

    private async Task<CareerProfile> GetOrCreateProfileAsync(Guid userId)
    {
        var profile = await _unitOfWork.CareerProfileRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile != null)
            return profile;

        profile = new CareerProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _unitOfWork.CareerProfileRepository.CreateAsync(profile);
        await _unitOfWork.SaveChangesAsync();
        return profile;
    }

    internal static ProfileDto MapProfile(UserAccount user, CareerProfile? profile) => new()
    {
        UserId = user.Id,
        Email = user.Email ?? string.Empty,
        Phone = user.PhoneNumber,
        AvatarUrl = user.AvatarUrl,
        FullName = user.FullName,
        OnboardingCompleted = user.OnboardingCompleted,
        IsPremium = user.IsPremium,
        DesiredIndustry = profile?.DesiredIndustry,
        DesiredPosition = profile?.DesiredPosition,
        ExperienceLevel = profile?.ExperienceLevel,
        University = profile?.University,
        Major = profile?.Major,
        GraduationYear = profile?.GraduationYear,
        Bio = profile?.Bio,
        Hobbies = ParseHobbies(profile?.HobbiesJson),
        Skills = ParseHobbies(profile?.SkillsJson),
        Experiences = ParseExperiences(profile?.ExperiencesJson),
        Projects = ParseProjects(profile?.ProjectsJson),
        Certifications = ParseCertifications(profile?.CertificationsJson),
        ConfirmedAt = profile?.ConfirmedAt,
        ConfirmedCvDocumentId = profile?.ConfirmedCvDocumentId,
        HasSelectedPlan = user.PlanSelectedAt != null,
        CurrentPlanCode = PlanTier.Normalize(user.CurrentPlanCode)
    };

    internal static List<CvExperienceDto> ParseExperiences(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<CvExperienceDto>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    internal static List<CvProjectDto> ParseProjects(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<CvProjectDto>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    internal static List<CvCertificationDto> ParseCertifications(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return JsonSerializer.Deserialize<List<CvCertificationDto>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    internal static List<string> ParseHobbies(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }

    /// <summary>Xóa field demo/auto-fill khi hồ sơ trông giống dữ liệu mẫu (không ghi đè dữ liệu thật).</summary>
    public static bool ClearAutoFilledDemo(CareerProfile? profile)
    {
        if (profile == null)
            return false;

        var hobbies = ParseHobbies(profile.HobbiesJson);
        var dummyHits = 0;
        if (Eq(profile.DesiredIndustry, "Công nghệ thông tin")) dummyHits++;
        if (IsDummyExperience(profile.ExperienceLevel)) dummyHits++;
        if (IsDummyUniversity(profile.University)) dummyHits++;
        if (IsDummyBio(profile.Bio)) dummyHits++;
        if (IsDummySkillList(hobbies)) dummyHits++;
        if (profile.GraduationYear == 2026) dummyHits++;
        if (IsDummyPosition(profile.DesiredPosition)) dummyHits++;

        if (dummyHits < 2)
            return false;

        if (Eq(profile.DesiredIndustry, "Công nghệ thông tin"))
            profile.DesiredIndustry = null;
        if (IsDummyExperience(profile.ExperienceLevel))
            profile.ExperienceLevel = null;
        if (IsDummyUniversity(profile.University))
            profile.University = null;
        if (IsDummyBio(profile.Bio))
            profile.Bio = null;
        if (IsDummySkillList(hobbies))
            profile.HobbiesJson = null;
        if (profile.GraduationYear == 2026 && string.IsNullOrWhiteSpace(profile.University))
            profile.GraduationYear = null;
        if (IsDummyPosition(profile.DesiredPosition))
            profile.DesiredPosition = null;
        if (Eq(profile.Major, "Công nghệ thông tin"))
            profile.Major = null;

        profile.UpdatedAt = DateTime.UtcNow;
        return true;
    }

    private static bool Eq(string? value, string expected) =>
        !string.IsNullOrWhiteSpace(value) &&
        string.Equals(value.Trim(), expected, StringComparison.OrdinalIgnoreCase);

    private static bool IsDummyExperience(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var v = value.Trim();
        return Eq(v, "1-3 năm")
            || Eq(v, "1 - 3 năm")
            || Eq(v, "1 - 3 năm (Mid-level)")
            || Eq(v, "1 - 2 năm kinh nghiệm");
    }

    private static bool IsDummyUniversity(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var v = value.Trim();
        return Eq(v, "Đại học Bách Khoa TP.HCM")
            || Eq(v, "Đại học Bách Khoa")
            || Eq(v, "Đại học Bách Khoa TP.HCM - Kỹ thuật Phần mềm");
    }

    private static bool IsDummyBio(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var v = value.Trim();
        return Eq(v, "Kỹ sư phần mềm đam mê công nghệ, luôn chủ động học hỏi và hướng tới môi trường chuyên nghiệp.")
            || Eq(v, "Tôi là một kỹ sư phần mềm có đam mê với phát triển sản phẩm thực tế.")
            || Eq(v, "Hồ sơ được phân tích bởi HireMate AI")
            || v.Contains("kỹ sư phần mềm có đam mê", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsDummyPosition(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var v = value.Trim();
        return Eq(v, "Lập trình viên Frontend")
            || Eq(v, "Lập trình viên")
            || Eq(v, "Frontend Developer")
            || Eq(v, "Lập trình viên Backend");
    }

    private static bool IsDummySkillList(List<string> skills)
    {
        if (skills.Count == 0) return false;
        string[] dummy = ["react", "typescript", "javascript", "git", "rest api", "tailwindcss"];
        return skills.All(s => dummy.Contains(s.Trim().ToLowerInvariant()));
    }

    internal static string? SerializeHobbies(List<string>? hobbies)
    {
        if (hobbies == null || hobbies.Count == 0)
            return null;
        var cleaned = hobbies
            .Where(h => !string.IsNullOrWhiteSpace(h))
            .Select(h => h.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(40)
            .ToList();
        return cleaned.Count == 0 ? null : JsonSerializer.Serialize(cleaned);
    }

    internal static string? SerializeExperiences(List<CvExperienceDto>? items)
    {
        if (items == null) return null;
        var cleaned = items
            .Where(e => !string.IsNullOrWhiteSpace(e.Title) || !string.IsNullOrWhiteSpace(e.Org)
                || !string.IsNullOrWhiteSpace(e.Description))
            .Take(20)
            .Select(e => new CvExperienceDto
            {
                Title = Trunc(e.Title, 150),
                Org = Trunc(e.Org, 150),
                Period = Trunc(e.Period, 80),
                Description = Trunc(e.Description, 1000)
            })
            .ToList();
        return cleaned.Count == 0 ? "[]" : JsonSerializer.Serialize(cleaned);
    }

    internal static string? SerializeProjects(List<CvProjectDto>? items)
    {
        if (items == null) return null;
        var cleaned = items
            .Where(p => !string.IsNullOrWhiteSpace(p.Name) || !string.IsNullOrWhiteSpace(p.Description))
            .Take(20)
            .Select(p => new CvProjectDto
            {
                Name = Trunc(p.Name, 150),
                Description = Trunc(p.Description, 1000),
                Role = Trunc(p.Role, 150),
                Technologies = (p.Technologies ?? [])
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .Select(t => t.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .Take(20)
                    .ToList(),
                Url = Trunc(p.Url, 500),
                Period = Trunc(p.Period, 80)
            })
            .ToList();
        return cleaned.Count == 0 ? "[]" : JsonSerializer.Serialize(cleaned);
    }

    internal static string? SerializeCertifications(List<CvCertificationDto>? items)
    {
        if (items == null) return null;
        var cleaned = items
            .Where(c => !string.IsNullOrWhiteSpace(c.Name))
            .Take(20)
            .Select(c => new CvCertificationDto
            {
                Name = Trunc(c.Name, 200),
                Issuer = Trunc(c.Issuer, 150),
                IssueDate = Trunc(c.IssueDate, 40),
                ExpiryDate = Trunc(c.ExpiryDate, 40),
                CredentialId = Trunc(c.CredentialId, 120),
                CredentialUrl = Trunc(c.CredentialUrl, 500)
            })
            .ToList();
        return cleaned.Count == 0 ? "[]" : JsonSerializer.Serialize(cleaned);
    }

    private static string? Trunc(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var t = value.Trim();
        return t.Length <= max ? t : t[..max];
    }
}

public class ProfileService(
    UserManager<UserAccount> userManager,
    IUnitOfWork unitOfWork) : IProfileService
{
    private readonly UserManager<UserAccount> _userManager = userManager;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;

    public async Task<IServiceResult> GetAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        var profile = await _unitOfWork.CareerProfileRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (OnboardingService.ClearAutoFilledDemo(profile))
            await _unitOfWork.SaveChangesAsync();

        var dto = OnboardingService.MapProfile(user, profile);
        dto.CurrentPlanCode = string.IsNullOrWhiteSpace(user.CurrentPlanCode)
            ? (user.IsPremium ? "premium" : "free")
            : user.CurrentPlanCode;
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, dto);
    }

    public async Task<IServiceResult> UpdateAsync(Guid userId, UpdateProfileDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy người dùng");

        user.FullName = dto.FullName;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        var profile = await _unitOfWork.CareerProfileRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            profile = new CareerProfile
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.CareerProfileRepository.CreateAsync(profile);
        }

        // Partial update: chỉ ghi đè field được gửi — tránh xóa University/mục tiêu
        // khi FE chỉ cập nhật name/bio/hobbies trong onboarding.
        if (dto.DesiredIndustry != null)
            profile.DesiredIndustry = dto.DesiredIndustry;
        if (dto.DesiredPosition != null)
            profile.DesiredPosition = dto.DesiredPosition;
        if (dto.ExperienceLevel != null)
            profile.ExperienceLevel = dto.ExperienceLevel;
        if (dto.University != null)
            profile.University = dto.University;
        if (dto.Major != null)
            profile.Major = dto.Major;
        if (dto.GraduationYear.HasValue)
            profile.GraduationYear = dto.GraduationYear;
        if (dto.Bio != null)
            profile.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();
        if (dto.Hobbies != null)
            profile.HobbiesJson = OnboardingService.SerializeHobbies(dto.Hobbies);
        if (dto.Skills != null)
            profile.SkillsJson = OnboardingService.SerializeHobbies(dto.Skills);
        if (dto.Experiences != null)
            profile.ExperiencesJson = OnboardingService.SerializeExperiences(dto.Experiences);
        if (dto.Projects != null)
            profile.ProjectsJson = OnboardingService.SerializeProjects(dto.Projects);
        if (dto.Certifications != null)
            profile.CertificationsJson = OnboardingService.SerializeCertifications(dto.Certifications);
        profile.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG,
            OnboardingService.MapProfile(user, profile));
    }
}



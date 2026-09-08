using HireMate.Modules.Ai;
using HireMate.Modules.Onboarding.Abstractions;
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
        var snap = await aiQuota.GetSnapshotAsync(user);
        var premium = PlanTier.Rank(user.CurrentPlanCode) > 0;
        var remaining = premium ? -1 : Math.Max(0, 1 - usedOk);

        var next = user.PlanSelectedAt == null ? "select_plan"
            : latest == null ? "cv"
            : !user.OnboardingCompleted ? "review_confirm"
            : "dashboard";

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
            NextStep = next
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
        var cv = await _unitOfWork.CvDocumentRepository.GetQueryable()
            .Where(c => c.UserId == userId && c.ParseSucceeded)
            .OrderByDescending(c => c.AnalyzedAt ?? c.UploadedAt)
            .FirstOrDefaultAsync();

        if (cv == null)
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Cần CV đã phân tích thành công (upload hoặc wizard) trước khi xác nhận");

        if (string.IsNullOrWhiteSpace(user.FullName)
            || string.IsNullOrWhiteSpace(profile.University)
            || string.IsNullOrWhiteSpace(profile.DesiredIndustry)
            || string.IsNullOrWhiteSpace(profile.DesiredPosition))
        {
            return new ServiceResult(Const.FAIL_UPDATE_CODE,
                "Thiếu họ tên, trường, ngành hoặc vị trí mục tiêu. Hãy review hồ sơ rồi Confirm.");
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
        cv.ConfirmedAt = DateTime.UtcNow;
        profile.ConfirmedAt = DateTime.UtcNow;
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
        if (dto.Experiences != null) profile.ExperiencesJson = JsonSerializer.Serialize(dto.Experiences);
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
        if (dto.Experiences != null) profile.ExperiencesJson = JsonSerializer.Serialize(dto.Experiences);
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

    internal static string? SerializeHobbies(List<string>? hobbies)
    {
        if (hobbies == null || hobbies.Count == 0)
            return null;
        var cleaned = hobbies
            .Where(h => !string.IsNullOrWhiteSpace(h))
            .Select(h => h.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(20)
            .ToList();
        return cleaned.Count == 0 ? null : JsonSerializer.Serialize(cleaned);
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
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        var dto = OnboardingService.MapProfile(user, profile);
        dto.CurrentPlanCode = await ResolveCurrentPlanCodeAsync(userId, user.IsPremium);
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, dto);
    }

    private async Task<string> ResolveCurrentPlanCodeAsync(Guid userId, bool isPremium)
    {
        var paid = await _unitOfWork.InvoiceRepository.GetQueryable().AsNoTracking()
            .Include(i => i.Plan)
            .Where(i => i.UserId == userId && i.Status == "Paid")
            .OrderByDescending(i => i.PaidAt ?? i.CreatedAt)
            .Select(i => i.Plan != null ? i.Plan.Code : null)
            .FirstOrDefaultAsync();

        if (!string.IsNullOrWhiteSpace(paid))
            return PlanTier.Normalize(paid);
        return isPremium ? "premium" : "free";
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
            profile.ExperiencesJson = JsonSerializer.Serialize(dto.Experiences);
        profile.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG,
            OnboardingService.MapProfile(user, profile));
    }
}



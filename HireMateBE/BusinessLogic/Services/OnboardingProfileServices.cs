using BusinessLogic.Base;
using BusinessLogic.IServices;
using Common;
using Common.DTOs.OnboardingDto;
using Common.DTOs.ProfileDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace BusinessLogic.Services;

public class OnboardingService(
    UserManager<UserAccount> userManager,
    IUnitOfWork unitOfWork) : IOnboardingService
{
    private readonly UserManager<UserAccount> _userManager = userManager;
    private readonly IUnitOfWork _unitOfWork = unitOfWork;

    public async Task<IServiceResult> SaveGoalAsync(Guid userId, OnboardingGoalDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "User not found");

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
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "User not found");

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

    public async Task<IServiceResult> ConfirmAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "User not found");

        var profile = await _unitOfWork.CareerProfileRepository.GetQueryable()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null
            || string.IsNullOrWhiteSpace(profile.DesiredIndustry)
            || string.IsNullOrWhiteSpace(profile.DesiredPosition)
            || string.IsNullOrWhiteSpace(profile.University)
            || string.IsNullOrWhiteSpace(user.FullName))
        {
            return new ServiceResult(Const.FAIL_UPDATE_CODE, "Complete goal and personal steps before confirm");
        }

        user.OnboardingCompleted = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, "Onboarding completed", MapProfile(user, profile));
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
        GraduationYear = profile?.GraduationYear
    };
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
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "User not found");

        var profile = await _unitOfWork.CareerProfileRepository.GetQueryable()
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId);

        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG,
            OnboardingService.MapProfile(user, profile));
    }

    public async Task<IServiceResult> UpdateAsync(Guid userId, UpdateProfileDto dto)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || user.IsDeleted)
            return new ServiceResult(Const.WARNING_NO_DATA_CODE, "User not found");

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

        profile.DesiredIndustry = dto.DesiredIndustry;
        profile.DesiredPosition = dto.DesiredPosition;
        profile.ExperienceLevel = dto.ExperienceLevel;
        profile.University = dto.University;
        profile.Major = dto.Major;
        profile.GraduationYear = dto.GraduationYear;
        profile.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG,
            OnboardingService.MapProfile(user, profile));
    }
}

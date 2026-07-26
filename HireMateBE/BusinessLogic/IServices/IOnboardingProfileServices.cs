using BusinessLogic.Base;
using Common.DTOs.OnboardingDto;
using Common.DTOs.ProfileDto;

namespace BusinessLogic.IServices;

public interface IOnboardingService
{
    Task<IServiceResult> SaveGoalAsync(Guid userId, OnboardingGoalDto dto);
    Task<IServiceResult> SavePersonalAsync(Guid userId, OnboardingPersonalDto dto);
    Task<IServiceResult> ConfirmAsync(Guid userId);
}

public interface IProfileService
{
    Task<IServiceResult> GetAsync(Guid userId);
    Task<IServiceResult> UpdateAsync(Guid userId, UpdateProfileDto dto);
}

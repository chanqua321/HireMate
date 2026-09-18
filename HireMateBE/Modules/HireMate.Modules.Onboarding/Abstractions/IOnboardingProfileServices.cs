using HireMate.BuildingBlocks;
using Common.DTOs.OnboardingDto;
using Common.DTOs.ProfileDto;
using Microsoft.AspNetCore.Http;

namespace HireMate.Modules.Onboarding.Abstractions;

public interface ICvService
{
    Task<IServiceResult> UploadAsync(Guid userId, IFormFile file, string webRoot);
    Task<IServiceResult> CreateFromWizardAsync(Guid userId, CvWizardDto dto, string webRoot);
    Task<IServiceResult> ListAsync(Guid userId);
    Task<IServiceResult> GetAsync(Guid userId, Guid id);
    Task<IServiceResult> AnalyzeAsync(Guid userId, Guid id);
}

public interface IOnboardingService
{
    Task<IServiceResult> GetStatusAsync(Guid userId);
    Task<IServiceResult> SaveGoalAsync(Guid userId, OnboardingGoalDto dto);
    Task<IServiceResult> SavePersonalAsync(Guid userId, OnboardingPersonalDto dto);
    Task<IServiceResult> ConfirmAsync(Guid userId, ConfirmOnboardingDto? review);
}

public interface IProfileService
{
    Task<IServiceResult> GetAsync(Guid userId);
    Task<IServiceResult> UpdateAsync(Guid userId, UpdateProfileDto dto);
}


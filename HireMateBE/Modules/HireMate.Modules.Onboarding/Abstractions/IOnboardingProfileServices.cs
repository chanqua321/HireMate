using HireMate.BuildingBlocks;
using Common.DTOs.OnboardingDto;
using Common.DTOs.ProfileDto;
using Microsoft.AspNetCore.Http;

namespace HireMate.Modules.Onboarding.Abstractions;

public interface ICvService
{
    Task<IServiceResult> UploadAsync(Guid userId, IFormFile file, string webRoot, string? displayName = null, Guid? templateId = null);
    Task<IServiceResult> CreateFromWizardAsync(Guid userId, CvWizardDto dto, string webRoot);
    Task<IServiceResult> PreviewDraftAsync(Guid userId, CvWizardDto dto);
    Task<IServiceResult> ListAsync(Guid userId);
    Task<IServiceResult> GetAsync(Guid userId, Guid id);
    Task<IServiceResult> AnalyzeAsync(Guid userId, Guid id);
    /// <summary>Trả FileDownloadDto trong Data khi thành công.</summary>
    Task<IServiceResult> GetDownloadAsync(Guid userId, Guid id);
    /// <summary>Set CV làm Active (ConfirmedCvDocumentId + IsConfirmed). Ownership từ userId.</summary>
    Task<IServiceResult> ActivateAsync(Guid userId, Guid id);
    /// <summary>Xóa CV thuộc user; nếu đang Active thì fallback CV khác hoặc clear ConfirmedCvDocumentId.</summary>
    Task<IServiceResult> DeleteAsync(Guid userId, Guid id);
    /// <summary>Đổi DisplayName (không đổi FileName). Ownership → 404 nếu không thuộc user.</summary>
    Task<IServiceResult> RenameAsync(Guid userId, Guid id, RenameCvDto dto);
    /// <summary>Đổi TemplateId; giữ nguyên CV data / FileName / DisplayName / Active.</summary>
    Task<IServiceResult> ChangeTemplateAsync(Guid userId, Guid id, ChangeCvTemplateDto dto);
    /// <summary>AI tối ưu CONTENT only — không đổi template/layout. Trả structured JSON + TemplateId giữ nguyên.</summary>
    Task<IServiceResult> OptimizeContentAsync(Guid userId, OptimizeCvContentDto dto);
}

public interface ICvTemplateService
{
    Task<IServiceResult> ListAvailableAsync(Guid userId);
    Task<IServiceResult> GetAsync(Guid userId, Guid id);
    /// <summary>Lưu làm mẫu từ CV hiện có — metadata/layout definition, không clone PDF layout 100%.</summary>
    Task<IServiceResult> CreateFromCvAsync(Guid userId, Guid cvDocumentId, CreateCustomTemplateDto dto);
    Task<IServiceResult> UpdateAsync(Guid userId, Guid id, UpdateCvTemplateDto dto);
    Task<IServiceResult> DeleteAsync(Guid userId, Guid id);
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


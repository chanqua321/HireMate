using HireMate.BuildingBlocks;
using Common.DTOs.PublicDto;
using Microsoft.AspNetCore.Http;

namespace HireMate.Modules.Career.Abstractions;

public interface IMatchService
{
    Task<IServiceResult> MatchAsync(Guid userId, MatchRequestDto dto);
    Task<IServiceResult> GetAsync(Guid userId, Guid id);
}

public interface IEmailGenService
{
    Task<IServiceResult> GenerateAsync(Guid userId, EmailGenerateDto dto);
}

public interface ICareerOsService
{
    Task<IServiceResult> GetMemoryAsync(Guid userId);
    Task<IServiceResult> GetProfileHubAsync(Guid userId);
    Task<IServiceResult> GetProgressAsync(Guid userId);
    Task<IServiceResult> GetDevelopmentAsync(Guid userId);
    Task<IServiceResult> GetPathAsync(Guid userId);
    Task<IServiceResult> GetLearningAsync(Guid userId);
    Task<IServiceResult> GetResourcesAsync(string? category);
    Task<IServiceResult> GetResourceAsync(Guid id);
}


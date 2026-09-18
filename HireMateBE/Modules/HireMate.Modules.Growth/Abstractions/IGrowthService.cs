using HireMate.BuildingBlocks;
using Common.DTOs.PublicDto;

namespace HireMate.Modules.Growth.Abstractions;

public interface IGrowthService
{
    Task<IServiceResult> GetReferralAsync(Guid userId);
    Task<IServiceResult> ApplyReferralAsync(Guid userId, ApplyReferralDto dto);
    Task<IServiceResult> GetBadgesAsync(Guid userId);
    Task<IServiceResult> GetLeaderboardAsync();
    Task<IServiceResult> GetBenchmarkAsync(Guid userId);
}


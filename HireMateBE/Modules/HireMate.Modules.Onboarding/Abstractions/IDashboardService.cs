using HireMate.BuildingBlocks;

namespace HireMate.Modules.Onboarding.Abstractions;

public interface IDashboardService
{
    Task<IServiceResult> GetAsync(Guid userId);
}


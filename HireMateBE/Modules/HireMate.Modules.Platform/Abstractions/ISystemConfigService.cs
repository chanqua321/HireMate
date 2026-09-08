using HireMate.BuildingBlocks;
using Infrastructure.Models;

namespace HireMate.Modules.Platform.Abstractions;

public interface ISystemConfigService
{
    Task<string?> GetAsync(string key);
    Task<bool> GetBoolAsync(string key, bool defaultValue = false);
    Task<int> GetIntAsync(string key, int defaultValue);
    Task<IServiceResult> ListAsync();
    Task<IServiceResult> UpsertAsync(IReadOnlyList<SystemSetting> items);
}


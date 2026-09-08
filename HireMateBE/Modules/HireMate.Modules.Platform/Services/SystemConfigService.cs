using HireMate.Modules.Platform.Abstractions;
using HireMate.BuildingBlocks;
using Common;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace HireMate.Modules.Platform.Services;

public class SystemConfigService(IUnitOfWork uow) : ISystemConfigService
{
    public async Task<string?> GetAsync(string key)
    {
        var row = await uow.SystemSettingRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(s => s.Key == key);
        return row?.Value;
    }

    public async Task<bool> GetBoolAsync(string key, bool defaultValue = false)
    {
        var raw = await GetAsync(key);
        if (string.IsNullOrWhiteSpace(raw)) return defaultValue;
        return raw.Equals("true", StringComparison.OrdinalIgnoreCase) || raw == "1";
    }

    public async Task<int> GetIntAsync(string key, int defaultValue)
    {
        var raw = await GetAsync(key);
        return int.TryParse(raw, out var n) ? n : defaultValue;
    }

    public async Task<IServiceResult> ListAsync()
    {
        var list = await uow.SystemSettingRepository.GetQueryable().AsNoTracking()
            .OrderBy(s => s.Key).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> UpsertAsync(IReadOnlyList<SystemSetting> items)
    {
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Key))
                continue;
            var e = await uow.SystemSettingRepository.GetQueryable()
                .FirstOrDefaultAsync(s => s.Key == item.Key);
            if (e == null)
            {
                item.UpdatedAt = DateTime.UtcNow;
                await uow.SystemSettingRepository.CreateAsync(item);
            }
            else
            {
                e.Value = item.Value;
                if (item.Description != null)
                    e.Description = item.Description;
                e.UpdatedAt = DateTime.UtcNow;
            }
        }

        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_UPDATE_CODE, Const.SUCCESS_UPDATE_MSG);
    }
}


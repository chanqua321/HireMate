using Infrastructure.IUnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BusinessLogic.Background;

/// <summary>Xóa refresh token hết hạn / đã revoke quá 7 ngày.</summary>
public class RefreshTokenCleanupService(IServiceScopeFactory scopeFactory, ILogger<RefreshTokenCleanupService> logger) : BackgroundService
{
    private readonly TimeSpan _interval = TimeSpan.FromHours(6);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // delay nhẹ lúc startup để DB migrate/seed xong
        try { await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken); }
        catch (OperationCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CleanupAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Refresh token cleanup failed");
            }

            try { await Task.Delay(_interval, stoppingToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task CleanupAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        var cutoff = DateTime.UtcNow.AddDays(-7);

        var stale = await uow.RefreshTokenRepository.GetQueryable()
            .Where(t => t.ExpiresAt < DateTime.UtcNow || (t.RevokedAt != null && t.RevokedAt < cutoff))
            .ToListAsync(ct);

        if (stale.Count == 0) return;

        foreach (var t in stale)
            await uow.RefreshTokenRepository.RemoveAsync(t);

        await uow.SaveChangesAsync();
        logger.LogInformation("Removed {Count} stale refresh tokens", stale.Count);
    }
}

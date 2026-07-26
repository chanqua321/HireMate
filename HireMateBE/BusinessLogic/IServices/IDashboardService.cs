using BusinessLogic.Base;

namespace BusinessLogic.IServices;

public interface IDashboardService
{
    Task<IServiceResult> GetAsync(Guid userId);
}

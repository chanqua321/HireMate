using HireMate.BuildingBlocks;
using Common.DTOs.PublicDto;

namespace HireMate.Modules.Content.Abstractions;

public interface IPublicContentService
{
    Task<IServiceResult> JoinWaitlistAsync(WaitlistDto dto);
    Task<IServiceResult> ContactAsync(ContactDto dto);
    Task<IServiceResult> GetPageAsync(string slug);
    Task<IServiceResult> GetBlogListAsync();
    Task<IServiceResult> GetBlogAsync(string slug);
    Task<IServiceResult> GetFaqAsync();
    Task<IServiceResult> CreateTicketAsync(CreateTicketDto dto);
}


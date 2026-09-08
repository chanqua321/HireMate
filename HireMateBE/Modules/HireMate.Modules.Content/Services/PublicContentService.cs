using HireMate.BuildingBlocks;
using Common;
using Common.DTOs.PublicDto;
using Infrastructure.IUnitOfWork;
using Infrastructure.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using HireMate.Modules.Content.Abstractions;

namespace HireMate.Modules.Content.Services;

public class PublicContentService(IUnitOfWork uow) : IPublicContentService
{
    public async Task<IServiceResult> JoinWaitlistAsync(WaitlistDto dto)
    {
        var exists = await uow.WaitlistRepository.GetQueryable().AnyAsync(x => x.Email == dto.Email);
        if (exists)
            return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Bạn đã có trong danh sách chờ");

        await uow.WaitlistRepository.CreateAsync(new WaitlistEntry
        {
            Id = Guid.NewGuid(),
            Email = dto.Email,
            FullName = dto.FullName,
            University = dto.University
        });
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã tham gia danh sách chờ");
    }

    public async Task<IServiceResult> ContactAsync(ContactDto dto)
    {
        await uow.ContactRepository.CreateAsync(new ContactMessage
        {
            Id = Guid.NewGuid(),
            FullName = dto.FullName,
            Email = dto.Email,
            Subject = dto.Subject,
            Body = dto.Body
        });
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã nhận tin nhắn");
    }

    public async Task<IServiceResult> GetPageAsync(string slug)
    {
        var page = await uow.ContentPageRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(p => p.Slug == slug && p.IsPublished);
        return page == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy trang")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, page);
    }

    public async Task<IServiceResult> GetBlogListAsync()
    {
        var list = await uow.BlogPostRepository.GetQueryable().AsNoTracking()
            .Where(b => b.IsPublished).OrderByDescending(b => b.PublishedAt).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> GetBlogAsync(string slug)
    {
        var post = await uow.BlogPostRepository.GetQueryable().AsNoTracking()
            .FirstOrDefaultAsync(b => b.Slug == slug && b.IsPublished);
        return post == null
            ? new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy bài viết")
            : new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, post);
    }

    public async Task<IServiceResult> GetFaqAsync()
    {
        var list = await uow.FaqRepository.GetQueryable().AsNoTracking()
            .Where(f => f.IsPublished).OrderBy(f => f.SortOrder).ToListAsync();
        return new ServiceResult(Const.SUCCESS_READ_CODE, Const.SUCCESS_READ_MSG, list);
    }

    public async Task<IServiceResult> CreateTicketAsync(CreateTicketDto dto)
    {
        await uow.SupportTicketRepository.CreateAsync(new SupportTicket
        {
            Id = Guid.NewGuid(),
            Email = dto.Email,
            Subject = dto.Subject,
            Body = dto.Body,
            Status = "Open"
        });
        await uow.SaveChangesAsync();
        return new ServiceResult(Const.SUCCESS_CREATE_CODE, "Đã tạo ticket hỗ trợ");
    }
}



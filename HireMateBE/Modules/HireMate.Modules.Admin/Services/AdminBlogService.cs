using Common;
using Common.DTOs.PublicDto;
using HireMate.BuildingBlocks;
using Infrastructure.Models;
using Infrastructure.Queries;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HireMate.Modules.Admin.Services;

public partial class AdminService
{
    private static IServiceResult BlogMissing() => new ServiceResult(Const.WARNING_NO_DATA_CODE, "Không tìm thấy bài viết.");
    private static IServiceResult BlogInvalid(string message) => new ServiceResult(Const.ERROR_VALIDATION_CODE, message);

    public async Task<IServiceResult> BlogsAsync() => new ServiceResult(1, "Danh sách bài viết",
        await uow.BlogPostRepository.GetQueryable().AsNoTracking().OrderByDescending(p => p.CreatedAt)
            .ReadBlogs(uow.UserAccountRepository.GetQueryable(), true).ToListAsync());

    public async Task<IServiceResult> BlogAsync(Guid id)
    {
        var post = await uow.BlogPostRepository.GetQueryable().AsNoTracking().Where(p => p.Id == id)
            .ReadBlogs(uow.UserAccountRepository.GetQueryable(), true).FirstOrDefaultAsync();
        return post == null ? BlogMissing() : new ServiceResult(1, "Bài viết", post);
    }

    public async Task<IServiceResult> SaveBlogAsync(Guid? id, Guid adminId, BlogWriteDto dto)
    {
        var post = id.HasValue ? await uow.BlogPostRepository.GetByIdAsync(id.Value) : null;
        if (id.HasValue && post == null) return BlogMissing();
        var title = (dto.Title ?? "").Trim();
        var slug = BlogContract.NormalizeSlug(dto.Slug);
        var tag = (dto.Tag ?? "").Trim();
        var summary = (dto.Summary ?? "").Trim();
        var body = (dto.Body ?? "").Trim();
        if (title.Length is 0 or > 200) return BlogInvalid("Tiêu đề bắt buộc, tối đa 200 ký tự.");
        if (slug.Length is 0 or > 120) return BlogInvalid("Slug bắt buộc, tối đa 120 ký tự hợp lệ.");
        if (!BlogContract.Categories.Contains(tag)) return BlogInvalid("Danh mục không hợp lệ.");
        if (summary.Length > 500) return BlogInvalid("Mô tả ngắn tối đa 500 ký tự.");
        if (dto.IsPublished && body.Length == 0) return BlogInvalid("Cần nhập nội dung trước khi xuất bản.");
        if (body.Length > 100_000) return BlogInvalid("Nội dung tối đa 100.000 ký tự.");
        // Body is plain text. All consumers must use text rendering, never raw HTML.
        if (await uow.BlogPostRepository.GetQueryable().AnyAsync(p => p.Slug == slug && p.Id != id))
            return BlogInvalid("Slug đã được sử dụng. Hãy chọn slug khác.");
        var now = DateTime.UtcNow;
        if (post == null)
        {
            if (adminId == Guid.Empty) return BlogInvalid("Không xác định được tài khoản quản trị.");
            post = new BlogPost { Id = Guid.NewGuid(), AuthorId = adminId, CreatedAt = now };
            await uow.BlogPostRepository.CreateAsync(post);
        }
        post.Title = title;
        post.Slug = slug;
        post.Tag = tag;
        post.Summary = summary;
        post.Body = body;
        // Unpublish clears PublishedAt; republish starts a new publication period.
        post.PublishedAt = dto.IsPublished ? (post.IsPublished ? post.PublishedAt : now) : null;
        post.IsPublished = dto.IsPublished;
        post.UpdatedAt = now;
        try { await uow.SaveChangesAsync(); }
        catch (DbUpdateException)
        {
            if (await uow.BlogPostRepository.GetQueryable().AsNoTracking()
                .AnyAsync(p => p.Slug == slug && p.Id != post.Id))
                return BlogInvalid("Slug đã được sử dụng. Hãy chọn slug khác.");
            throw;
        }
        return await BlogAsync(post.Id);
    }

    public async Task<IServiceResult> DeleteBlogAsync(Guid id)
    {
        var post = await uow.BlogPostRepository.GetByIdAsync(id);
        if (post == null) return BlogMissing();
        await uow.BlogPostRepository.RemoveAsync(post);
        await uow.SaveChangesAsync();
        await CleanupCoverAsync(post.CoverImageKey);
        return new ServiceResult(1, "Đã xóa bài viết.");
    }

    public async Task<IServiceResult> SetBlogCoverAsync(Guid id, IFormFile? file)
    {
        var post = await uow.BlogPostRepository.GetByIdAsync(id);
        if (post == null) return BlogMissing();
        if (blogStorage == null) throw new InvalidOperationException("Blog storage is not configured.");
        string? key = null;
        if (file != null)
        {
            if (file.Length is <= 0 or > BlogCoverValidator.MaxBytes)
                return BlogInvalid("Ảnh phải là PNG/JPEG và không quá 5 MB.");
            await using var input = file.OpenReadStream();
            using var buffer = new MemoryStream();
            var chunk = new byte[8192];
            int count;
            while ((count = await input.ReadAsync(chunk)) > 0)
            {
                if (buffer.Length + count > BlogCoverValidator.MaxBytes) return BlogInvalid("Ảnh vượt quá 5 MB.");
                buffer.Write(chunk, 0, count);
            }
            var extension = BlogCoverValidator.Extension(buffer.ToArray(), file.ContentType);
            if (extension == null) return BlogInvalid("Nội dung ảnh không hợp lệ. Chỉ nhận PNG/JPEG thực sự.");
            key = $"blogs/{id:N}/{Guid.NewGuid():N}.{extension}";
            buffer.Position = 0;
            await blogStorage.SaveAsync(key, buffer);
        }
        var previous = post.CoverImageKey;
        post.CoverImageKey = key;
        post.UpdatedAt = DateTime.UtcNow;
        try { await uow.SaveChangesAsync(); }
        catch { await CleanupCoverAsync(key); throw; }
        await CleanupCoverAsync(previous);
        return await BlogAsync(id);
    }

    private async Task CleanupCoverAsync(string? key)
    {
        if (key == null || blogStorage == null) return;
        try { await blogStorage.DeleteAsync(key); }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // DB is already committed. Report success truthfully; log cleanup for operators.
            blogLogger?.LogWarning(ex, "Unable to clean up old blog cover {Key}", key);
        }
    }
}

public static class BlogCoverValidator
{
    public const int MaxBytes = 5 * 1024 * 1024;
    public static string? Extension(byte[] data, string contentType)
    {
        if (data.Length is < 24 or > MaxBytes) return null;
        if (contentType == "image/png" && ValidPng(data)) return "png";
        if (contentType == "image/jpeg" && ValidJpeg(data)) return "jpg";
        return null;
    }

    private static bool Dimensions(uint width, uint height) => width is > 0 and <= 10000 && height is > 0 and <= 10000
        && (long)width * height <= 25_000_000;

    private static bool ValidPng(byte[] data)
    {
        if (!data.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })) return false;
        var hasImage = false;
        for (var offset = 8; offset <= data.Length - 12;)
        {
            var length = System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(data.AsSpan(offset, 4));
            if (length > data.Length - offset - 12) return false;
            var type = data.AsSpan(offset + 4, 4);
            if (offset == 8 && (length != 13 || !type.SequenceEqual("IHDR"u8)
                || !Dimensions(System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(data.AsSpan(offset + 8, 4)),
                    System.Buffers.Binary.BinaryPrimitives.ReadUInt32BigEndian(data.AsSpan(offset + 12, 4))))) return false;
            if (type.SequenceEqual("IDAT"u8) && length > 0) hasImage = true;
            if (type.SequenceEqual("IEND"u8)) return length == 0 && hasImage && offset + 12 == data.Length;
            offset += (int)length + 12;
        }
        return false;
    }

    private static bool ValidJpeg(byte[] data)
    {
        if (data[0] != 255 || data[1] != 216 || data[^2] != 255 || data[^1] != 217) return false;
        var hasFrame = false;
        var offset = 2;
        while (offset < data.Length - 4)
        {
            if (data[offset++] != 255) return false;
            while (offset < data.Length && data[offset] == 255) offset++;
            if (offset >= data.Length - 2) return false;
            var marker = data[offset++];
            var length = (data[offset] << 8) | data[offset + 1];
            if (length < 2 || offset + length > data.Length - 2) return false;
            if (marker is 0xC0 or 0xC1 or 0xC2)
            {
                if (length < 8 || !Dimensions((uint)((data[offset + 5] << 8) | data[offset + 6]),
                    (uint)((data[offset + 3] << 8) | data[offset + 4]))) return false;
                hasFrame = true;
            }
            if (marker == 0xDA) return hasFrame && length >= 6 && offset + length < data.Length - 2;
            offset += length;
        }
        return false;
    }
}

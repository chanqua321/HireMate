using Common;
using HireMate.Modules.Onboarding.Storage;
using Infrastructure.IUnitOfWork;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace APIs.Controllers.Content;

[ApiController]
public class BlogCoverController(IUnitOfWork uow, IFileStorageService storage) : ControllerBase
{
    [HttpGet("api/Admin/blog/{id:guid}/cover")]
    [Authorize(Policy = AppPolicies.AdminOnly)]
    public async Task<IActionResult> AdminCover(Guid id)
        => await Read(await uow.BlogPostRepository.GetQueryable().AsNoTracking()
            .Where(p => p.Id == id).Select(p => p.CoverImageKey).FirstOrDefaultAsync());

    [HttpGet("api/Blog/{slug}/cover")]
    [AllowAnonymous]
    public async Task<IActionResult> PublicCover(string slug)
        => await Read(await uow.BlogPostRepository.GetQueryable().AsNoTracking()
            .Where(p => p.Slug == slug && p.IsPublished).Select(p => p.CoverImageKey).FirstOrDefaultAsync());

    private async Task<IActionResult> Read(string? key)
    {
        Response.Headers.CacheControl = "no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        if (key == null || !await storage.ExistsAsync(key)) return NotFound();
        try { return File(await storage.OpenReadAsync(key), key.EndsWith(".png") ? "image/png" : "image/jpeg"); }
        catch (FileNotFoundException) { return NotFound(); }
    }
}

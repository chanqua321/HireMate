using HireMate.Modules.Platform.Abstractions;
using HireMate.Modules.Admin.Abstractions;
using APIs;


using Common;
using Common.DTOs.PublicDto;
using Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Admin;

[Authorize(Policy = AppPolicies.AdminOnly)]
[Route("api/[controller]")]
public class AdminController(IAdminService svc, ISystemConfigService settings) : HireMateControllerBase
{
    [HttpGet("analytics")]
    public async Task<IActionResult> Analytics()
        => this.FromService(await svc.AnalyticsAsync());

    [HttpGet("interviews")]
    public async Task<IActionResult> Interviews()
        => this.FromService(await svc.InterviewStatsAsync());

    [HttpGet("users")]
    public async Task<IActionResult> Users([FromQuery] string? q, [FromQuery] string? role, [FromQuery] string? plan,
        [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => this.FromService(await svc.UsersAsync(q, role, plan, status, page, pageSize));

    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> UserDetail(Guid id)
        => this.FromService(await svc.UserDetailAsync(id));

    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard([FromQuery] string? range, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? granularity)
        => this.FromService(await svc.DashboardAsync(range, from, to, granularity));

    [HttpGet("payments")]
    public async Task<IActionResult> Payments([FromQuery] string? q, [FromQuery] string? status, [FromQuery] string? plan,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        => this.FromService(await svc.PaymentsAsync(q, status, plan, from, to, page, pageSize));

    [HttpPatch("users/{id:guid}")]
    public async Task<IActionResult> PatchUser(Guid id, [FromBody] PatchUserDto dto)
        => this.FromService(await svc.PatchUserAsync(id, dto));

    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue()
        => this.FromService(await svc.RevenueAsync());

    [HttpGet("revenue/series")]
    public async Task<IActionResult> RevenueSeries([FromQuery] string? granularity, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        => this.FromService(await svc.RevenueSeriesAsync(granularity, from, to));

    [HttpGet("tickets")]
    public async Task<IActionResult> Tickets()
        => this.FromService(await svc.ListTicketsAsync());

    [HttpPost("tickets")]
    public async Task<IActionResult> CreateTicket([FromBody] AdminCreateTicketDto dto)
        => this.FromService(await svc.CreateTicketAsync(dto), 201);

    [HttpPatch("tickets/{id:guid}")]
    public async Task<IActionResult> PatchTicket(Guid id, [FromBody] PatchTicketDto dto)
        => this.FromService(await svc.PatchTicketAsync(id, dto));

    [HttpPost("blog")]
    public async Task<IActionResult> Blog([FromBody] BlogWriteDto post)
        => this.FromService(await svc.SaveBlogAsync(null, UserId, post), 201);

    [HttpGet("blog")]
    public async Task<IActionResult> Blogs() => this.FromService(await svc.BlogsAsync());

    [HttpGet("blog/categories")]
    public IActionResult BlogCategories() => Ok(new { data = BlogContract.Categories });

    [HttpGet("blog/{id:guid}")]
    public async Task<IActionResult> BlogDetail(Guid id) => this.FromService(await svc.BlogAsync(id));

    [HttpPut("blog/{id:guid}")]
    public async Task<IActionResult> EditBlog(Guid id, [FromBody] BlogWriteDto post)
        => this.FromService(await svc.SaveBlogAsync(id, UserId, post));

    [HttpDelete("blog/{id:guid}")]
    public async Task<IActionResult> DeleteBlog(Guid id) => this.FromService(await svc.DeleteBlogAsync(id));

    [HttpPost("blog/{id:guid}/cover")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadBlogCover(Guid id, IFormFile file)
        => this.FromService(await svc.SetBlogCoverAsync(id, file));

    [HttpDelete("blog/{id:guid}/cover")]
    public async Task<IActionResult> RemoveBlogCover(Guid id)
        => this.FromService(await svc.SetBlogCoverAsync(id, null));

    [HttpGet("faq")]
    public async Task<IActionResult> Faqs()
        => this.FromService(await svc.ListFaqsAsync());

    [HttpPost("faq")]
    public async Task<IActionResult> Faq([FromBody] FaqItem item)
        => this.FromService(await svc.UpsertFaqAsync(item));

    [HttpDelete("faq/{id:guid}")]
    public async Task<IActionResult> DeleteFaq(Guid id)
        => this.FromService(await svc.DeleteFaqAsync(id));

    [HttpGet("resources")]
    public async Task<IActionResult> ResourceList()
        => this.FromService(await svc.ListResourcesAsync());

    [HttpPost("resources")]
    public async Task<IActionResult> Resources([FromBody] AdminResourceWriteDto dto)
    {
        var item = new ResourceItem
        {
            Id = dto.Id,
            Title = dto.Title.Trim(),
            Category = dto.Category?.Trim() ?? string.Empty,
            Summary = dto.Description?.Trim() ?? string.Empty,
            Industry = dto.Type?.Trim(),
            Body = ResourceContent.Pack(dto.Url, dto.Type, dto.Free, dto.Featured),
            IsPublished = dto.IsPublished
        };
        return this.FromService(await svc.UpsertResourceAsync(item));
    }

    [HttpDelete("resources/{id:guid}")]
    public async Task<IActionResult> DeleteResource(Guid id)
        => this.FromService(await svc.DeleteResourceAsync(id));

    [HttpPost("pages")]
    public async Task<IActionResult> Pages([FromBody] ContentPage page)
        => this.FromService(await svc.UpsertPageAsync(page));

    [HttpPost("plans")]
    public async Task<IActionResult> Plans([FromBody] SubscriptionPlan plan)
        => this.FromService(await svc.UpsertPlanAsync(plan));

    [HttpGet("promos")]
    public async Task<IActionResult> PromoList()
        => this.FromService(await svc.ListPromosAsync());

    [HttpPost("promos")]
    public async Task<IActionResult> Promos([FromBody] PromoCode promo)
        => this.FromService(await svc.UpsertPromoAsync(promo));

    [HttpDelete("promos/{id:guid}")]
    public async Task<IActionResult> DeletePromo(Guid id)
        => this.FromService(await svc.DeletePromoAsync(id));

    [HttpGet("badges")]
    public async Task<IActionResult> Badges()
        => this.FromService(await svc.ListBadgesAsync());

    [HttpPost("badges")]
    public async Task<IActionResult> SaveBadge([FromBody] Badge badge)
        => this.FromService(await svc.UpsertBadgeAsync(badge));

    [HttpGet("settings")]
    public async Task<IActionResult> Settings()
        => this.FromService(await settings.ListAsync());

    [HttpPut("settings")]
    public async Task<IActionResult> PutSettings([FromBody] List<SystemSetting> items)
        => this.FromService(await settings.UpsertAsync(items));

    [HttpGet("questions")]
    public async Task<IActionResult> Questions([FromQuery] string? search, [FromQuery] string? language,
        [FromQuery] string? industry, [FromQuery] string? position, [FromQuery] string? category,
        [FromQuery] string? difficulty, [FromQuery] string? seniority, [FromQuery] bool? isActive)
        => this.FromService(await svc.QuestionsAsync(search, language, industry, position, category, difficulty, seniority, isActive));

    [HttpGet("questions/{id:guid}")]
    public async Task<IActionResult> Question(Guid id)
        => this.FromService(await svc.QuestionAsync(id));

    [HttpPost("questions")]
    public async Task<IActionResult> CreateQuestion([FromBody] AdminQuestionWriteDto dto)
        => this.FromService(await svc.CreateQuestionAsync(UserId, dto), 201);

    [HttpPut("questions/{id:guid}")]
    public async Task<IActionResult> UpdateQuestion(Guid id, [FromBody] AdminQuestionWriteDto dto)
        => this.FromService(await svc.UpdateQuestionAsync(id, dto));

    [HttpPatch("questions/{id:guid}/status")]
    public async Task<IActionResult> SetQuestionStatus(Guid id, [FromBody] QuestionStatusDto dto)
        => this.FromService(await svc.SetQuestionActiveAsync(id, dto.IsActive));
}

public sealed class QuestionStatusDto
{
    public bool IsActive { get; set; }
}


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
    public async Task<IActionResult> Users([FromQuery] string? q)
        => this.FromService(await svc.UsersAsync(q));

    [HttpPatch("users/{id:guid}")]
    public async Task<IActionResult> PatchUser(Guid id, [FromBody] PatchUserDto dto)
        => this.FromService(await svc.PatchUserAsync(id, dto));

    [HttpGet("revenue")]
    public async Task<IActionResult> Revenue()
        => this.FromService(await svc.RevenueAsync());

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
    public async Task<IActionResult> Blog([FromBody] BlogPost post)
        => this.FromService(await svc.UpsertBlogAsync(post));

    [HttpPost("faq")]
    public async Task<IActionResult> Faq([FromBody] FaqItem item)
        => this.FromService(await svc.UpsertFaqAsync(item));

    [HttpPost("resources")]
    public async Task<IActionResult> Resources([FromBody] ResourceItem item)
        => this.FromService(await svc.UpsertResourceAsync(item));

    [HttpPost("pages")]
    public async Task<IActionResult> Pages([FromBody] ContentPage page)
        => this.FromService(await svc.UpsertPageAsync(page));

    [HttpPost("plans")]
    public async Task<IActionResult> Plans([FromBody] SubscriptionPlan plan)
        => this.FromService(await svc.UpsertPlanAsync(plan));

    [HttpPost("promos")]
    public async Task<IActionResult> Promos([FromBody] PromoCode promo)
        => this.FromService(await svc.UpsertPromoAsync(promo));

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


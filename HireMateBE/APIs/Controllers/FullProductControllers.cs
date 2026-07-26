using APIs;
using BusinessLogic.IServices;
using Common.DTOs.PublicDto;
using Infrastructure.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace APIs.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WaitlistController(IPublicContentService svc) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Join([FromBody] WaitlistDto dto) => this.FromService(await svc.JoinWaitlistAsync(dto), 201);
}

[ApiController]
[Route("api/[controller]")]
public class ContactController(IPublicContentService svc) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Send([FromBody] ContactDto dto) => this.FromService(await svc.ContactAsync(dto), 201);

    [HttpPost("ticket")]
    [AllowAnonymous]
    public async Task<IActionResult> Ticket([FromBody] CreateTicketDto dto)
        => this.FromService(await svc.CreateTicketAsync(dto), 201);
}

[ApiController]
[Route("api/Content")]
public class ContentController(IPublicContentService svc) : ControllerBase
{
    [HttpGet("pages/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> Page(string slug) => this.FromService(await svc.GetPageAsync(slug));
}

[ApiController]
[Route("api/[controller]")]
public class BlogController(IPublicContentService svc) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List() => this.FromService(await svc.GetBlogListAsync());

    [HttpGet("{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(string slug) => this.FromService(await svc.GetBlogAsync(slug));
}

[ApiController]
[Route("api/[controller]")]
public class FaqController(IPublicContentService svc) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List() => this.FromService(await svc.GetFaqAsync());
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class CvController(ICvService svc, IWebHostEnvironment env) : ControllerBase
{
    [HttpPost("upload")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (!this.TryGetUserId(out var userId)) return Unauthorized();
        var root = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        return this.FromService(await svc.UploadAsync(userId, file, root), 201);
    }

    [HttpGet]
    public async Task<IActionResult> List()
    {
        if (!this.TryGetUserId(out var userId)) return Unauthorized();
        return this.FromService(await svc.ListAsync(userId));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return Unauthorized();
        return this.FromService(await svc.GetAsync(userId, id));
    }

    [HttpPost("{id:guid}/analyze")]
    public async Task<IActionResult> Analyze(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return Unauthorized();
        return this.FromService(await svc.AnalyzeAsync(userId, id));
    }
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class MatchController(IMatchService svc) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Match([FromBody] MatchRequestDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return Unauthorized();
        return this.FromService(await svc.MatchAsync(userId, dto), 201);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        if (!this.TryGetUserId(out var userId)) return Unauthorized();
        return this.FromService(await svc.GetAsync(userId, id));
    }
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class EmailController(IEmailGenService svc) : ControllerBase
{
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] EmailGenerateDto dto)
    {
        if (!this.TryGetUserId(out var userId)) return Unauthorized();
        return this.FromService(await svc.GenerateAsync(userId, dto));
    }
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class CareerController(ICareerOsService svc) : ControllerBase
{
    [HttpGet("memory")]
    public async Task<IActionResult> Memory()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetMemoryAsync(id));
    }

    [HttpGet("profile")]
    public async Task<IActionResult> ProfileHub()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetProfileHubAsync(id));
    }

    [HttpGet("progress")]
    public async Task<IActionResult> Progress()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetProgressAsync(id));
    }

    [HttpGet("development")]
    public async Task<IActionResult> Development()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetDevelopmentAsync(id));
    }

    [HttpGet("path")]
    public async Task<IActionResult> Path()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetPathAsync(id));
    }

    [HttpGet("learning")]
    public async Task<IActionResult> Learning()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetLearningAsync(id));
    }
}

[ApiController]
[Route("api/[controller]")]
public class ResourcesController(ICareerOsService svc) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List([FromQuery] string? category) => this.FromService(await svc.GetResourcesAsync(category));

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid id) => this.FromService(await svc.GetResourceAsync(id));
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
[EnableRateLimiting("api")]
public class BillingController(IBillingService svc) : ControllerBase
{
    [HttpGet("plans")]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> Plans() => this.FromService(await svc.GetPlansAsync());

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutDto dto)
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        return this.FromService(await svc.CheckoutAsync(id, dto, ip), 201);
    }

    /// <summary>Browser return from VNPay — redirects to FrontendReturnUrl.</summary>
    [HttpGet("vnpay-return")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayReturn()
    {
        var query = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString(), StringComparer.OrdinalIgnoreCase);
        var result = await svc.HandleVnPayReturnAsync(query);
        var redirect = result.Data?.GetType().GetProperty("redirectUrl")?.GetValue(result.Data)?.ToString();
        if (!string.IsNullOrWhiteSpace(redirect))
            return Redirect(redirect);
        return this.FromService(result);
    }

    /// <summary>Server IPN from VNPay.</summary>
    [HttpGet("vnpay-ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayIpn()
    {
        var query = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString(), StringComparer.OrdinalIgnoreCase);
        var result = await svc.HandleVnPayIpnAsync(query);
        if (result.Data is not null)
            return Ok(result.Data);
        return Ok(new { RspCode = "99", Message = result.Message });
    }

    /// <summary>Server webhook from PayOS (set URL in PayOS dashboard / confirm-webhook).</summary>
    [HttpPost("payos-webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> PayOsWebhook()
    {
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync();
        var result = await svc.HandlePayOsWebhookAsync(body);
        // PayOS cần HTTP 2xx để coi là nhận webhook thành công
        return Ok(new { error = result.Status > 0 ? (int?)null : 1, message = result.Message });
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetInvoicesAsync(id));
    }

    [HttpGet("invoices/{id:guid}")]
    public async Task<IActionResult> Invoice(Guid id)
    {
        if (!this.TryGetUserId(out var uid)) return Unauthorized();
        return this.FromService(await svc.GetInvoiceAsync(uid, id));
    }
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class ReferralController(IGrowthService svc) : ControllerBase
{
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetReferralAsync(id));
    }

    [HttpPost("apply")]
    public async Task<IActionResult> Apply([FromBody] ApplyReferralDto dto)
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.ApplyReferralAsync(id, dto));
    }
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class GamificationController(IGrowthService svc) : ControllerBase
{
    [HttpGet("badges")]
    public async Task<IActionResult> Badges()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetBadgesAsync(id));
    }

    [HttpGet("leaderboard")]
    [AllowAnonymous]
    public async Task<IActionResult> Leaderboard() => this.FromService(await svc.GetLeaderboardAsync());
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class BenchmarkController(IGrowthService svc) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.GetBenchmarkAsync(id));
    }
}

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class AdminController(IAdminService svc) : ControllerBase
{
    [HttpGet("analytics")] public async Task<IActionResult> Analytics() => this.FromService(await svc.AnalyticsAsync());
    [HttpGet("interviews")] public async Task<IActionResult> Interviews() => this.FromService(await svc.InterviewStatsAsync());
    [HttpGet("users")] public async Task<IActionResult> Users([FromQuery] string? q) => this.FromService(await svc.UsersAsync(q));
    [HttpPatch("users/{id:guid}")] public async Task<IActionResult> PatchUser(Guid id, [FromBody] PatchUserDto dto) => this.FromService(await svc.PatchUserAsync(id, dto));
    [HttpGet("revenue")] public async Task<IActionResult> Revenue() => this.FromService(await svc.RevenueAsync());
    [HttpGet("tickets")] public async Task<IActionResult> Tickets() => this.FromService(await svc.ListTicketsAsync());
    [HttpPatch("tickets/{id:guid}")] public async Task<IActionResult> PatchTicket(Guid id, [FromBody] PatchTicketDto dto) => this.FromService(await svc.PatchTicketAsync(id, dto));
    [HttpPost("blog")] public async Task<IActionResult> Blog([FromBody] BlogPost post) => this.FromService(await svc.UpsertBlogAsync(post));
    [HttpPost("faq")] public async Task<IActionResult> Faq([FromBody] FaqItem item) => this.FromService(await svc.UpsertFaqAsync(item));
    [HttpPost("resources")] public async Task<IActionResult> Resources([FromBody] ResourceItem item) => this.FromService(await svc.UpsertResourceAsync(item));
    [HttpPost("pages")] public async Task<IActionResult> Pages([FromBody] ContentPage page) => this.FromService(await svc.UpsertPageAsync(page));
    [HttpPost("plans")] public async Task<IActionResult> Plans([FromBody] SubscriptionPlan plan) => this.FromService(await svc.UpsertPlanAsync(plan));
    [HttpPost("promos")] public async Task<IActionResult> Promos([FromBody] PromoCode promo) => this.FromService(await svc.UpsertPromoAsync(promo));
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class UniversityController(IB2BService svc) : ControllerBase
{
    [HttpGet("dashboard")]
    public async Task<IActionResult> Dashboard()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.UniversityDashboardAsync(id));
    }

    [HttpGet("students")]
    public async Task<IActionResult> Students()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.UniversityStudentsAsync(id));
    }
}

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class EnterpriseController(IB2BService svc) : ControllerBase
{
    [HttpGet("insights")]
    public async Task<IActionResult> Insights()
    {
        if (!this.TryGetUserId(out var id)) return Unauthorized();
        return this.FromService(await svc.EnterpriseInsightsAsync(id));
    }
}

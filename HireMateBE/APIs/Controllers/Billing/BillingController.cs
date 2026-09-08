using HireMate.Modules.Billing.Abstractions;
using APIs;

using Common;
using Common.DTOs.PublicDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace APIs.Controllers.Billing;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
[EnableRateLimiting("api")]
public class BillingController(IBillingService svc) : HireMateControllerBase
{
    [HttpGet("plans")]
    [AllowAnonymous]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> Plans()
        => this.FromService(await svc.GetPlansAsync());

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutDto dto)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        return this.FromService(await svc.CheckoutAsync(UserId, dto, ip), 201);
    }

    [HttpGet("invoices")]
    public async Task<IActionResult> Invoices()
        => this.FromService(await svc.GetInvoicesAsync(UserId));

    [HttpGet("invoices/{id:guid}")]
    public async Task<IActionResult> Invoice(Guid id)
        => this.FromService(await svc.GetInvoiceAsync(UserId, id));
}


using HireMate.Modules.Content.Abstractions;
using APIs;

using Common.DTOs.PublicDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Content;

[Route("api/[controller]")]
public class ContactController(IPublicContentService svc) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Send([FromBody] ContactDto dto)
        => this.FromService(await svc.ContactAsync(dto), 201);

    [HttpPost("ticket")]
    [AllowAnonymous]
    public async Task<IActionResult> Ticket([FromBody] CreateTicketDto dto)
        => this.FromService(await svc.CreateTicketAsync(dto), 201);
}


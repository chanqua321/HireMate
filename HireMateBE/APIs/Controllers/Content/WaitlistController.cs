using HireMate.Modules.Content.Abstractions;
using APIs;

using Common.DTOs.PublicDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Content;

[Route("api/[controller]")]
public class WaitlistController(IPublicContentService svc) : ControllerBase
{
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> Join([FromBody] WaitlistDto dto)
        => this.FromService(await svc.JoinWaitlistAsync(dto), 201);
}


using HireMate.Modules.Career.Abstractions;
using APIs;

using Common;
using Common.DTOs.PublicDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Career;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class EmailController(IEmailGenService svc) : HireMateControllerBase
{
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromBody] EmailGenerateDto dto)
        => this.FromService(await svc.GenerateAsync(UserId, dto));
}


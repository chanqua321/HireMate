using HireMate.Modules.Career.Abstractions;
using APIs;

using Common;
using Common.DTOs.PublicDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Career;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class MatchController(IMatchService svc) : HireMateControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Match([FromBody] MatchRequestDto dto)
        => this.FromService(await svc.MatchAsync(UserId, dto), 201);

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
        => this.FromService(await svc.GetAsync(UserId, id));
}


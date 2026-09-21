using HireMate.Modules.Career.Abstractions;
using APIs;
using Common;
using Common.DTOs.JdDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Career;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/Jd")]
public class JdController(IJobDescriptionService svc) : HireMateControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateJobDescriptionDto dto)
        => this.FromService(await svc.CreateAsync(UserId, dto), 201);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] bool includeArchived = false)
        => this.FromService(await svc.ListAsync(UserId, includeArchived));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
        => this.FromService(await svc.GetAsync(UserId, id));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateJobDescriptionDto dto)
        => this.FromService(await svc.UpdateAsync(UserId, id, dto));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Archive(Guid id)
        => this.FromService(await svc.ArchiveAsync(UserId, id));

    [HttpGet("{id:guid}/matches")]
    public async Task<IActionResult> Matches(Guid id)
        => this.FromService(await svc.ListMatchesAsync(UserId, id));
}

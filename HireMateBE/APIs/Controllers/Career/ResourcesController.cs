using HireMate.Modules.Career.Abstractions;
using APIs;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Career;

[Route("api/[controller]")]
public class ResourcesController(ICareerOsService svc) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List([FromQuery] string? category)
        => this.FromService(await svc.GetResourcesAsync(category));

    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(Guid id)
        => this.FromService(await svc.GetResourceAsync(id));
}


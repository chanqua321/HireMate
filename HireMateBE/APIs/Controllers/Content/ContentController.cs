using HireMate.Modules.Content.Abstractions;
using APIs;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Content;

[Route("api/Content")]
public class ContentController(IPublicContentService svc) : ControllerBase
{
    [HttpGet("pages/{slug}")]
    [AllowAnonymous]
    public async Task<IActionResult> Page(string slug)
        => this.FromService(await svc.GetPageAsync(slug));
}


using HireMate.Modules.Content.Abstractions;
using APIs;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Content;

[Route("api/[controller]")]
public class FaqController(IPublicContentService svc) : ControllerBase
{
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> List()
        => this.FromService(await svc.GetFaqAsync());
}


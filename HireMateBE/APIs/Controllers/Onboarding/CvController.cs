using HireMate.Modules.Onboarding.Abstractions;
using APIs;

using Common;
using Common.DTOs.OnboardingDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Onboarding;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class CvController(ICvService svc, IWebHostEnvironment env) : HireMateControllerBase
{
    [HttpPost("upload")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> Upload(IFormFile file)
    {
        var root = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        return this.FromService(await svc.UploadAsync(UserId, file, root), 201);
    }

    [HttpPost("wizard")]
    public async Task<IActionResult> Wizard([FromBody] CvWizardDto dto)
    {
        var root = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        return this.FromService(await svc.CreateFromWizardAsync(UserId, dto, root), 201);
    }

    [HttpGet]
    public async Task<IActionResult> List()
        => this.FromService(await svc.ListAsync(UserId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
        => this.FromService(await svc.GetAsync(UserId, id));

    [HttpPost("{id:guid}/analyze")]
    public async Task<IActionResult> Analyze(Guid id)
        => this.FromService(await svc.AnalyzeAsync(UserId, id));
}


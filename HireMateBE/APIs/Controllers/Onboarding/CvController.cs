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
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] string? displayName = null,
        [FromForm] Guid? templateId = null)
    {
        var root = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        return this.FromService(await svc.UploadAsync(UserId, file, root, displayName, templateId), 201);
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

    [HttpPut("{id:guid}/name")]
    public async Task<IActionResult> Rename(Guid id, [FromBody] RenameCvDto dto)
        => this.FromService(await svc.RenameAsync(UserId, id, dto));

    [HttpPut("{id:guid}/template")]
    public async Task<IActionResult> ChangeTemplate(Guid id, [FromBody] ChangeCvTemplateDto dto)
        => this.FromService(await svc.ChangeTemplateAsync(UserId, id, dto));

    [HttpPost("optimize-content")]
    public async Task<IActionResult> OptimizeContent([FromBody] OptimizeCvContentDto dto)
        => this.FromService(await svc.OptimizeContentAsync(UserId, dto));

    [HttpPost("{id:guid}/analyze")]
    public async Task<IActionResult> Analyze(Guid id)
        => this.FromService(await svc.AnalyzeAsync(UserId, id));

    [HttpPost("{id:guid}/activate")]
    public async Task<IActionResult> Activate(Guid id)
        => this.FromService(await svc.ActivateAsync(UserId, id));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
        => this.FromService(await svc.DeleteAsync(UserId, id));

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var result = await svc.GetDownloadAsync(UserId, id);
        if (result.Status <= 0 || result.Data is not HireMate.Modules.Onboarding.Services.FileDownloadDto file)
            return this.FromService(result);

        // Ép tải file PDF (tránh trình duyệt hiện raw %PDF-1.7 như text)
        var contentType = string.IsNullOrWhiteSpace(file.ContentType)
            ? "application/pdf"
            : file.ContentType;
        var fileName = string.IsNullOrWhiteSpace(file.FileName) ? "HireMate-CV.pdf" : file.FileName;
        if (contentType.Contains("pdf", StringComparison.OrdinalIgnoreCase)
            && !fileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            fileName += ".pdf";

        // FileContentResult safely encodes Vietnamese file names in Content-Disposition.
        return File(file.Bytes, contentType, fileName);
    }

    [HttpPost("preview-draft")]
    public async Task<IActionResult> PreviewDraft([FromBody] CvWizardDto dto)
        => this.FromService(await svc.PreviewDraftAsync(UserId, dto));

    [HttpGet("{id:guid}/preview")]
    public async Task<IActionResult> Preview(Guid id)
    {
        var result = await svc.GetDownloadAsync(UserId, id);
        if (result.Status <= 0 || result.Data is not HireMate.Modules.Onboarding.Services.FileDownloadDto file)
            return this.FromService(result);
        Response.Headers["Content-Disposition"] = "inline";
        return File(file.Bytes, file.ContentType);
    }
}

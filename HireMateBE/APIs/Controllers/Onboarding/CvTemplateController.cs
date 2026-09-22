using HireMate.Modules.Onboarding.Abstractions;
using APIs;
using Common;
using Common.DTOs.OnboardingDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Onboarding;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class CvTemplateController(ICvTemplateService svc) : HireMateControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
        => this.FromService(await svc.ListAvailableAsync(UserId));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
        => this.FromService(await svc.GetAsync(UserId, id));

    /// <summary>
    /// Lưu CV hiện có thành custom template (layout metadata).
    /// Không clone pixel-perfect layout từ PDF binary.
    /// </summary>
    [HttpPost("from-cv/{cvDocumentId:guid}")]
    public async Task<IActionResult> CreateFromCv(Guid cvDocumentId, [FromBody] CreateCustomTemplateDto? dto)
        => this.FromService(await svc.CreateFromCvAsync(UserId, cvDocumentId, dto ?? new CreateCustomTemplateDto()), 201);

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCvTemplateDto dto)
        => this.FromService(await svc.UpdateAsync(UserId, id, dto));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
        => this.FromService(await svc.DeleteAsync(UserId, id));
}

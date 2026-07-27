using BusinessLogic.IServices;
using Common;
using Common.DTOs.InterviewDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace APIs.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class InterviewController(IInterviewService interviewService) : ControllerBase
{
    private readonly IInterviewService _interviewService = interviewService;

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession([FromBody] CreateInterviewSessionDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });

        var result = await _interviewService.CreateSessionAsync(userId, dto);
        if (result.Status == Const.FAIL_QUOTA_CODE)
            return StatusCode(StatusCodes.Status403Forbidden, new { message = result.Message });
        if (result.Status == Const.FAIL_CREATE_CODE)
            return BadRequest(new { message = result.Message });
        if (result.Status == Const.WARNING_NO_DATA_CODE)
            return NotFound(new { message = result.Message });
        return Created(string.Empty, new { data = result.Data, message = result.Message });
    }

    [HttpGet("sessions/{id:guid}/questions")]
    public async Task<IActionResult> GetQuestions(Guid id)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });

        var result = await _interviewService.GetQuestionsAsync(userId, id);
        return Map(result);
    }

    [HttpPost("sessions/{id:guid}/answers")]
    public async Task<IActionResult> SubmitAnswer(Guid id, [FromBody] SubmitAnswerDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });

        var result = await _interviewService.SubmitAnswerAsync(userId, id, dto);
        return Map(result);
    }

    [HttpPost("sessions/{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });

        var result = await _interviewService.CompleteAsync(userId, id);
        return Map(result);
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> History()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });

        var result = await _interviewService.GetHistoryAsync(userId);
        return Ok(new { data = result.Data, message = result.Message });
    }

    [HttpGet("sessions/{id:guid}")]
    public async Task<IActionResult> Detail(Guid id)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });

        var result = await _interviewService.GetDetailAsync(userId, id);
        return Map(result);
    }

    [HttpPost("suggested-answer")]
    public async Task<IActionResult> Suggested([FromBody] Common.DTOs.PublicDto.SuggestedAnswerDto dto)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });
        return Map(await _interviewService.SuggestedAnswerAsync(userId, dto));
    }

    [HttpPost("sessions/{id:guid}/voice")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> Voice(Guid id, IFormFile file)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new { message = "Token không hợp lệ" });
        await using var stream = file.OpenReadStream();
        return Map(await _interviewService.UploadVoiceAsync(userId, id, stream, file.FileName));
    }

    [AllowAnonymous]
    [HttpGet("question-bank")]
    public async Task<IActionResult> QuestionBank()
    {
        var result = await _interviewService.GetQuestionBankAsync();
        return Ok(new { data = result.Data, message = result.Message });
    }

    private bool TryGetUserId(out Guid userId)
    {
        userId = Guid.Empty;
        var claim = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return !string.IsNullOrEmpty(claim) && Guid.TryParse(claim, out userId);
    }

    private IActionResult Map(BusinessLogic.Base.IServiceResult result)
    {
        if (result.Status == Const.WARNING_NO_DATA_CODE)
            return NotFound(new { message = result.Message });
        if (result.Status is -1 or -3)
            return BadRequest(new { message = result.Message });
        return Ok(new { data = result.Data, message = result.Message });
    }
}

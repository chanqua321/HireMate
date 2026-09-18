using HireMate.Modules.Interview.Abstractions;
using APIs;

using Common;
using Common.DTOs.InterviewDto;
using Common.DTOs.PublicDto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIs.Controllers.Interview;

[Authorize(Roles = AppRoles.Authenticated)]
[Route("api/[controller]")]
public class InterviewController(IInterviewService interviewService) : HireMateControllerBase
{
    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession([FromBody] CreateInterviewSessionDto dto)
        => this.FromService(await interviewService.CreateSessionAsync(UserId, dto), 201);

    [HttpGet("sessions/{id:guid}/questions")]
    public async Task<IActionResult> GetQuestions(Guid id)
        => this.FromService(await interviewService.GetQuestionsAsync(UserId, id));

    [HttpPost("sessions/{id:guid}/answers")]
    public async Task<IActionResult> SubmitAnswer(Guid id, [FromBody] SubmitAnswerDto dto)
        => this.FromService(await interviewService.SubmitAnswerAsync(UserId, id, dto));

    [HttpPost("sessions/{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id)
        => this.FromService(await interviewService.CompleteAsync(UserId, id));

    [HttpGet("sessions")]
    public async Task<IActionResult> History()
        => this.FromService(await interviewService.GetHistoryAsync(UserId));

    [HttpGet("sessions/{id:guid}")]
    public async Task<IActionResult> Detail(Guid id)
        => this.FromService(await interviewService.GetDetailAsync(UserId, id));

    [HttpPost("suggested-answer")]
    public async Task<IActionResult> Suggested([FromBody] SuggestedAnswerDto dto)
        => this.FromService(await interviewService.SuggestedAnswerAsync(UserId, dto));

    [HttpPost("sessions/{id:guid}/voice")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> Voice(Guid id, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "File giọng nói là bắt buộc" });
        await using var stream = file.OpenReadStream();
        return this.FromService(await interviewService.UploadVoiceAsync(UserId, id, stream, file.FileName));
    }

    [HttpGet("question-bank")]
    [Authorize(Roles = AppRoles.Authenticated)]
    public async Task<IActionResult> QuestionBank()
        => this.FromService(await interviewService.GetQuestionBankAsync());
}



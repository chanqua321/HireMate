using System.Text.Json;
using Common;
using HireMate.Modules.Onboarding.Cv;
using HireMate.Modules.Ai;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using System.Net;
using System.Text;
using System.ComponentModel.DataAnnotations;
using Common.DTOs.PublicDto;
using HireMate.Modules.Interview.Services;
using Infrastructure.Models;

if (args.Length >= 2 && args[0] == "--evaluation-schema")
{
    Console.WriteLine(InterviewEvaluationPolicy.ResponseSchema(args[1],
        args.Length > 2 ? args[2] : null).GetRawText());
    return;
}
if (args.Length >= 5 && args[0] == "--parse-evaluation-file")
{
    var analysis = InterviewEvaluationPolicy.TryParse(File.ReadAllText(args[4]),
        args[1], args[2], args[3], args.Length > 5 ? args[5] : null);
    Console.WriteLine(JsonSerializer.Serialize(new
    {
        valid = analysis != null, score = analysis?.WeightedScore,
        status = analysis?.EvidenceStatus,
        followUp = analysis?.NeedsFollowUp,
        dimensions = analysis?.Dimensions.ToDictionary(x => x.Key, x => new
        { score = x.Value.Score, confidence = x.Value.Confidence,
          evidence = x.Value.Evidence, reason = x.Value.Reason })
    }));
    return;
}

static void Check(bool condition, string name)
{
    if (!condition) throw new Exception($"FAIL: {name}");
    Console.WriteLine($"PASS: {name}");
}

await AdminSeedSmoke.RunAsync(Check);
await FileStorageSmoke.RunAsync(Check);
await CvUploadSmoke.RunAsync(Check);
await CvEditSmoke.RunAsync(Check);
await PayOsSettlementSmoke.RunAsync(Check);

var en = """
John Nguyen
Backend Developer
Career Objective
Software engineering graduate seeking a Backend Developer position.
Education
Bachelor of Software Engineering, FPT University
Work Experience
Backend Developer Intern, ABC Technology
Skills
C#, ASP.NET Core, SQL Server, Docker
Projects
HireMate, AI-powered career preparation platform
Certifications
Microsoft Azure Fundamentals
""";
var vi = """
Nguyễn Minh Anh
Lập trình viên Backend
Mục tiêu nghề nghiệp
Tôi muốn phát triển kỹ năng lập trình và làm việc trong ngành công nghệ.
Học vấn
Đại học FPT, Kỹ thuật phần mềm
Kinh nghiệm làm việc
Thực tập sinh tại Công ty ABC
Kỹ năng
C#, ASP.NET Core, SQL Server
Dự án
HireMate
Chứng chỉ
Microsoft Azure Fundamentals
""";
var mixed = """
Nguyễn Minh Anh
Backend Developer
Mục tiêu nghề nghiệp
Tôi muốn phát triển kỹ năng lập trình.
Education
Đại học FPT
Kinh nghiệm làm việc
Thực tập sinh tại Công ty ABC
Technical Skills
C#, ASP.NET Core, SQL Server
Projects
HireMate
""";

Check(CvLanguage.Detect(en).Language == "en", "English CV language");
Check(CvLanguage.Detect(vi).Language == "vi", "Vietnamese CV language");
Check(CvLanguage.Detect(mixed).Language == "mixed", "Mixed CV language");
Check(CvLanguage.Resolve("vi", en) == "vi", "Explicit language overrides English CV");
Check(CvLanguage.Resolve("en", vi) == "en", "Explicit language overrides Vietnamese CV");
Check(CvLanguage.Resolve(null, mixed) == CvLanguage.Detect(mixed).Dominant, "Mixed CV dominant language");
Check(CvLanguage.Detect("C# ASP.NET Core GitHub").Language == "unknown", "Technology names do not fake language");

var json = """
{"extract":{"fullName":"John Nguyen","desiredPosition":"Backend Developer","education":["FPT University"],"skills":["C#","ASP.NET Core"],"experiences":[{"title":"Backend Developer Intern","org":"ABC Technology"}],"projects":["HireMate"],"certifications":["Microsoft Azure Fundamentals"]},"format":75,"keywords":80,"readability":76,"professionalism":78}
""";
using var document = JsonDocument.Parse(json);
var extract = CvAnalysisParser.ReadExtract(document.RootElement);
Check(CvAnalysisParser.ParseLooksComplete(extract), "English CV extract can pass without Vietnamese industry label");
Check(extract.Education.SequenceEqual(["FPT University"]) && extract.Projects.SequenceEqual(["HireMate"])
    && extract.Certifications.SequenceEqual(["Microsoft Azure Fundamentals"]), "Education/projects/certifications retained");
Check(extract.Skills.SequenceEqual(["C#", "ASP.NET Core"]) && extract.Experiences[0].Org == "ABC Technology", "Skill and experience facts retained");
Check(CvAnalysisParser.TryReadScore(document.RootElement, "format", out var score) && score == 75,
    "Real AI score accepted");
Check(!CvAnalysisParser.TryReadScore(document.RootElement, "missing", out _), "Missing score not fabricated");
var invalid = new AdminQuestionWriteDto { Content = " ", Language = "fr" };
Check(Validator.TryValidateObject(invalid, new ValidationContext(invalid), new List<ValidationResult>(), true) == false,
    "Invalid admin question language rejected by DTO validation");

foreach (var language in new[] { "vi", "en" })
{
    var handler = new CaptureHandler();
    using var http = new HttpClient(handler) { BaseAddress = new Uri("https://example.test/") };
    var options = Options.Create(new AiOptions { Enabled = true, ApiKey = "test-only" });
    var whisper = new OpenAiWhisperSpeechToTextService(http, options,
        NullLogger<OpenAiWhisperSpeechToTextService>.Instance);
    var result = await whisper.TranscribeAsync(new MemoryStream([1, 2, 3]), "answer.webm", "audio/webm", language);
    Check(result.Ok && handler.RequestBody.Contains($"\r\n{language}\r\n"), $"Whisper STT sends {language} language");

    var geminiHandler = new CaptureHandler { Gemini = true };
    using var geminiHttp = new HttpClient(geminiHandler) { BaseAddress = new Uri("https://example.test/") };
    var gemini = new GeminiSpeechToTextService(geminiHttp, options,
        NullLogger<GeminiSpeechToTextService>.Instance);
    await gemini.TranscribeAsync(new MemoryStream([1, 2, 3]), "answer.webm", "audio/webm", language);
    Check(geminiHandler.RequestBody.Contains(language == "en" ? "English" : "Vietnamese"),
        $"Gemini STT prompt requests {language}");
}

const string answerText = "I used SQL JOIN to combine matching records and checked the output.";
const string quotedEvidence = "SQL JOIN to combine matching records";
string Payload(string category, int score, string quote = quotedEvidence,
    string status = EvidenceStatus.StrongEvidence, string? cvQuote = null,
    object? followUp = null, double confidence = 0.85, bool? result = true)
{
    var dimensions = InterviewEvaluationPolicy.Weights(category).Keys.ToDictionary(
        key => key, _ => new
        {
            score, confidence, status, evidence = new[] { quote },
            reason = "The answer demonstrates the stated concept."
        });
    object? star = InterviewEvaluationPolicy.Weights(category).ContainsKey("star")
        ? new { situation = true, task = true, action = true, result = result ?? true }
        : null;
    return JsonSerializer.Serialize(new
    {
        dimensions, evidenceStatus = status, cvQuote, star,
        feedback = new { status = score < 40 ? "invalid" : "good",
            comment = "I see your point. Please add one concrete detail.", starTip = (string?)null },
        followUp
    });
}

var correct = InterviewEvaluationPolicy.TryParse(Payload("Technical", 92),
    "Technical", "Explain SQL JOIN.", answerText, null);
Check(correct is { AnalysisAvailable: true, WeightedScore: 92 }
    && correct.Dimensions["technicalKnowledge"].Evidence.Single() == quotedEvidence,
    "Technical score requires grounded evidence and weighted backend score");
Check(InterviewEvaluationPolicy.TryParse(Payload("Technical", 65),
    "Technical", "Explain SQL JOIN.", answerText, null)?.WeightedScore == 65,
    "Partial technical answer retains rubric score");
Check(InterviewEvaluationPolicy.TryParse(Payload("Technical", 15),
    "Technical", "Explain SQL JOIN.", answerText, null)?.WeightedScore == 15,
    "Incorrect technical answer retains low rubric score");
Check(correct?.StarScore == null && correct is not null && !correct.Dimensions.ContainsKey("star"),
    "STAR is non-applicable for technical question");
var definitionWeights = InterviewEvaluationPolicy.Weights("Technical", "What is authentication?");
Check(!definitionWeights.ContainsKey("problemSolving") && definitionWeights.Values.Sum() == 90,
    "Definition questions exclude non-applicable problem solving before normalization");
var definitionDimensions = correct!.Dimensions
    .Where(pair => pair.Key != "problemSolving")
    .ToDictionary(pair => pair.Key, pair => pair.Value);
Check(InterviewEvaluationPolicy.WeightedScore(definitionDimensions,
    "Technical", "What is authentication?") == 92,
    "Backend normalizes only applicable weights, never treats omitted dimension as zero");
Check(correct is { NeedsFollowUp: false, FollowUpReason: null },
    "No follow-up is generated without an explicit gap trigger");
Check(InterviewEvaluationPolicy.Weights("Technical").Keys.SequenceEqual(
        InterviewEvaluationPolicy.Weights("Technical follow-up").Keys),
    "Technical follow-up retains its technical rubric");
Check(InterviewEvaluationPolicy.TryParse(Payload("Technical", 92, "Redis caching"),
    "Technical", "Explain SQL JOIN.", answerText, null) == null,
    "Ungrounded AI evidence is rejected");
Check(InterviewEvaluationPolicy.TryParse(Payload("Technical", 92).Replace("\"score\":92", "\"score\":150"),
    "Technical", "Explain SQL JOIN.", answerText, null) == null,
    "AI score above 100 is rejected rather than clamped");
Check(InterviewEvaluationPolicy.TryParse(Payload("Technical", 92).Replace("\"score\":92", "\"score\":-1"),
    "Technical", "Explain SQL JOIN.", answerText, null) == null,
    "Negative AI score is rejected");
Check(InterviewEvaluationPolicy.TryParse("{bad json", "Technical", "Q", answerText, null) == null,
    "Malformed AI JSON is rejected");
Check(InterviewEvaluationPolicy.TryParse(Payload("Technical", 92),
    "Technical", "Q", "", null) == null, "Empty answer cannot produce analysis");
Check(InterviewEvaluationPolicy.TryParse(Payload("Technical", 70, confidence: 0.35),
    "Technical", "Q", answerText, null)?.Dimensions["relevance"].Confidence == 0.35,
    "Low confidence does not automatically lower score");
Check(InterviewEvaluationPolicy.TryParse(Payload("Technical", 70, confidence: 1.2),
    "Technical", "Q", answerText, null) == null, "Invalid confidence is rejected");
Check(InterviewEvaluationPolicy.TryParse(Payload("General", 75, quote: "xa\u0301c nhận"),
    "General", "Bạn xác nhận điều gì?", "Tôi xác nhận danh tính.", null) != null,
    "Vietnamese evidence accepts canonical Unicode normalization only");
var viAnswer = "Authentication xác định người gửi yêu cầu là ai.";
var viDimensions = InterviewEvaluationPolicy.Weights("Technical", "Authentication là gì?").Keys
    .ToDictionary(key => key, _ => new { score = 85, confidence = 0.9,
        status = EvidenceStatus.Verified, evidence = new[] { viAnswer },
        reason = "Định nghĩa đúng khái niệm." });
var viPayload = JsonSerializer.Serialize(new { dimensions = viDimensions,
    evidenceStatus = EvidenceStatus.Verified, cvQuote = (string?)null, star = (object?)null,
    feedback = new { status = "good", comment = "Bạn giải thích đúng.", starTip = (string?)null },
    followUp = (object?)null });
Check(InterviewEvaluationPolicy.TryParse(viPayload, "Technical", "Authentication là gì?",
    viAnswer, null) is { WeightedScore: 85 },
    "Vietnamese definition question uses the same valid contract");

var behavioral = InterviewEvaluationPolicy.TryParse(Payload("Behavioral", 82),
    "Behavioral", "Describe teamwork.", answerText, null);
Check(behavioral?.StarScore == 82 && behavioral.StarResult == true,
    "Strong behavioral STAR is applicable and persisted");
var weakStar = InterviewEvaluationPolicy.TryParse(Payload("Behavioral", 52, result: false,
    followUp: new { trigger = "MissingResult", reason = "No result was described." }),
    "Behavioral", "Describe teamwork.", answerText, null);
Check(weakStar?.StarResult == false && weakStar.NeedsFollowUp
    && weakStar.FollowUpReason?.StartsWith("MissingResult") == true,
    "Weak STAR follow-up requires a missing-result trigger");
var unsupportedFollowUp = InterviewEvaluationPolicy.TryParse(Payload("Technical", 70,
    followUp: new { trigger = "MissingResult", reason = "No result." }),
    "Technical", "Q", answerText, null);
Check(unsupportedFollowUp is { AnalysisAvailable: true, NeedsFollowUp: false },
    "Unsupported STAR follow-up is dropped without losing valid analysis");

var cvContext = "Project HireMate used SQL Server.";
Check(InterviewEvaluationPolicy.TryParse(Payload("CVBased", 85,
    status: EvidenceStatus.Verified), "CVBased", "Discuss the project.", answerText,
    cvContext)?.EvidenceStatus == EvidenceStatus.Verified,
    "CV answer can be marked verified without inventing a contradiction");
Check(InterviewEvaluationPolicy.TryParse(Payload("CVBased", 70,
    status: EvidenceStatus.NeedsValidation), "CVBased", "Discuss the project.", answerText,
    cvContext)?.EvidenceStatus == EvidenceStatus.NeedsValidation,
    "Missing CV mention is NeedsValidation, not contradiction");
Check(InterviewEvaluationPolicy.TryParse(Payload("CVBased", 45,
    status: EvidenceStatus.CvInconsistency, cvQuote: "used SQL Server"),
    "CVBased", "Discuss the project.", answerText, cvContext)?.EvidenceStatus
    == EvidenceStatus.CvInconsistency, "Explicit CV quote supports contradiction status");
Check(InterviewEvaluationPolicy.TryParse(Payload("CVBased", 45,
    status: EvidenceStatus.CvInconsistency, cvQuote: "used MongoDB"),
    "CVBased", "Discuss the project.", answerText, cvContext) == null,
    "Unquoted CV contradiction is rejected");

var answerA = new InterviewAnswer
{
    Id = Guid.NewGuid(), QuestionCategory = "Technical", QuestionText = "Explain SQL JOIN.",
    AnswerText = answerText, AnalysisAvailable = true,
    AnalysisJson = JsonSerializer.Serialize(correct),
    RelevanceScore = correct!.Relevance, CompletenessScore = correct.Completeness,
    TechnicalKnowledgeScore = correct.TechnicalKnowledge,
    ProblemSolvingScore = correct.ProblemSolving, CommunicationScore = correct.Communication
};
var answerB = new InterviewAnswer
{
    Id = Guid.NewGuid(), QuestionCategory = "Behavioral", QuestionText = "Describe teamwork.",
    AnswerText = answerText, AnalysisAvailable = true,
    AnalysisJson = JsonSerializer.Serialize(behavioral),
    RelevanceScore = behavioral!.Relevance, CompletenessScore = behavioral.Completeness,
    CommunicationScore = behavioral.Communication, StarScore = behavioral.StarScore
};
Check(InterviewEvaluationPolicy.EvidenceQuote(answerA, "technicalKnowledge") == quotedEvidence,
    "Persisted analysis traces dimension score to answer quote");
var skippedAnswer = new InterviewAnswer { Id = Guid.NewGuid(), Skipped = true, AnswerText = null };
var session = new InterviewSession { Id = Guid.NewGuid(), Position = "Backend Developer" };
Check(StructuredFeedbackBuilder.Build(session, [answerA, answerB, skippedAnswer]).OverallScore == 87,
    "Backend aggregates only evidence-backed applicable scores");
Check(StructuredFeedbackBuilder.Build(session, [skippedAnswer]).OverallScore == null,
    "Unavailable analyses do not create an overall score");
var malformedPersisted = new InterviewAnswer { AnalysisAvailable = true,
    QuestionCategory = "Technical", QuestionText = "What is authentication?",
    AnalysisJson = "{\"Dimensions\":null}" };
Check(InterviewEvaluationPolicy.WeightedScore(malformedPersisted) == null,
    "Malformed or legacy persisted analysis cannot create a score");
var englishFeedback = StructuredFeedbackBuilder.Build(session, [answerA, answerB], "en");
Check(englishFeedback.Summary?.Contains("Overall score") == true
    && !System.Text.RegularExpressions.Regex.IsMatch(
        string.Join(" ", new[] { englishFeedback.Summary, englishFeedback.CvConsistencySummary }
            .Concat(englishFeedback.Strengths.Select(x => x.Description))
            .Concat(englishFeedback.Weaknesses.Select(x => x.Description))
            .Concat(englishFeedback.SkillGaps.Select(x => x.Description))
            .Concat(englishFeedback.EvidenceGaps.Select(x => x.Gap))
            .Concat(englishFeedback.Improvements)), "[\u00C0-\u1EF9]"),
    "Deterministic feedback uses English for English interview sessions");
var outputHandler = new StubAiHandler();
using var outputHttp = new HttpClient(outputHandler) { BaseAddress = new Uri("https://example.test/") };
var outputClient = new OpenAiCompatibleAiClient(outputHttp,
    Options.Create(new AiOptions { Enabled = true, Provider = "OpenAI", ApiKey = "synthetic-test-key",
        Model = "gpt-5.6-luna" }), NullLogger<OpenAiCompatibleAiClient>.Instance);
outputHandler.Json = "{\"choices\":[{\"finish_reason\":\"stop\",\"message\":{\"content\":\"{\\\"ok\\\":true}\"}}]}";
var smallResponse = await outputClient.CompleteAsync("system", "user", maxOutputChars: 100,
    responseSchema: InterviewEvaluationPolicy.ResponseSchema("Technical"));
Check(smallResponse.Content == "{\"ok\":true}" && outputHandler.RequestBody.Contains("json_schema"),
    "OpenAI client sends strict schema and retains complete JSON");
Check((await outputClient.CompleteAsync("system", "user", maxOutputChars: 5,
    responseSchema: InterviewEvaluationPolicy.ResponseSchema("Technical"))).Content == "",
    "Over-limit provider output is rejected, never truncated into a partial JSON object");
outputHandler.Json = "{\"choices\":[{\"finish_reason\":\"length\",\"message\":{\"content\":\"{\\\"ok\\\":true}\"}}]}";
Check((await outputClient.CompleteAsync("system", "user", maxOutputChars: 100,
    responseSchema: InterviewEvaluationPolicy.ResponseSchema("Technical"))).Content == "",
    "Token-limited provider output is rejected even when it looks like valid JSON");
outputHandler.StatusCode = HttpStatusCode.TooManyRequests;
Check((await outputClient.CompleteAsync("system", "user", maxOutputChars: 100)).Content == "",
    "Provider 429 yields unavailable analysis content");
outputHandler.StatusCode = HttpStatusCode.InternalServerError;
Check((await outputClient.CompleteAsync("system", "user", maxOutputChars: 100)).Content == "",
    "Provider 5xx yields unavailable analysis content");
outputHandler.StatusCode = HttpStatusCode.OK;
outputHandler.Timeout = true;
Check((await outputClient.CompleteAsync("system", "user", maxOutputChars: 100)).Content == "",
    "Provider timeout yields unavailable analysis content");
var geminiOutputHandler = new StubAiHandler
{
    Json = "{\"candidates\":[{\"finishReason\":\"MAX_TOKENS\",\"content\":{\"parts\":[{\"text\":\"{\\\"ok\\\":true}\"}]}}]}"
};
using var geminiOutputHttp = new HttpClient(geminiOutputHandler)
    { BaseAddress = new Uri("https://example.test/") };
var geminiOutputClient = new GeminiAiClient(geminiOutputHttp,
    Options.Create(new AiOptions { Enabled = true, Provider = "Gemini", ApiKey = "synthetic-test-key",
        Model = "gemini-test" }), NullLogger<GeminiAiClient>.Instance);
Check((await geminiOutputClient.CompleteAsync("system", "user", maxOutputChars: 100,
    responseSchema: InterviewEvaluationPolicy.ResponseSchema("Technical"))).Content == "",
    "Gemini token-limited output is rejected rather than parsed");
geminiOutputHandler.Json = "{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"{\\\"ok\\\":true}\"}]}}]}";
Check((await geminiOutputClient.CompleteAsync("system", "user", maxOutputChars: 5,
    responseSchema: InterviewEvaluationPolicy.ResponseSchema("Technical"))).Content == "",
    "Gemini over-limit output is rejected rather than sliced");
Console.WriteLine("All deterministic smoke checks passed.");

sealed class CaptureHandler : HttpMessageHandler
{
    public bool Gemini { get; init; }
    public string RequestBody { get; private set; } = string.Empty;
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        RequestBody = await request.Content!.ReadAsStringAsync(ct);
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(Gemini
                ? "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"hello\"}]}}]}"
                : "{\"text\":\"hello\"}", Encoding.UTF8, "application/json")
        };
    }
}

sealed class StubAiHandler : HttpMessageHandler
{
    public string Json { get; set; } = string.Empty;
    public HttpStatusCode StatusCode { get; set; } = HttpStatusCode.OK;
    public bool Timeout { get; set; }
    public string RequestBody { get; private set; } = string.Empty;
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        if (Timeout) throw new TaskCanceledException("Synthetic provider timeout");
        RequestBody = await request.Content!.ReadAsStringAsync(ct);
        return new HttpResponseMessage(StatusCode)
        {
            Content = new StringContent(Json, Encoding.UTF8, "application/json")
        };
    }
}

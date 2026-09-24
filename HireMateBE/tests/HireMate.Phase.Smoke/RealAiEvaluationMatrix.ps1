param([switch]$ShowResponses, [string[]]$Only)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$cfg = Get-Content -Raw (Join-Path $root 'APIs\appsettings.json') | ConvertFrom-Json
$dll = Join-Path $PSScriptRoot 'bin\Release\net8.0\HireMate.Phase.Smoke.dll'
if (!(Test-Path $dll)) { throw 'Build the smoke project in Release before running this matrix.' }
if ([string]::IsNullOrWhiteSpace($cfg.Ai.ApiKey)) { throw 'AI provider key is not configured.' }

$cases = @(
    @{name='technical_strong'; category='Technical'; question='What is authentication?'; answer='Authentication verifies the identity of a requester before granting access.'; cv=''},
    @{name='technical_partial'; category='Technical'; question='What is authentication?'; answer='It checks a user.'; cv=''},
    @{name='technical_wrong'; category='Technical'; question='What is authentication?'; answer='Authentication grants a user permission to edit database tables.'; cv=''},
    @{name='technical_off_topic'; category='Technical'; question='What is authentication?'; answer='The weather was nice yesterday.'; cv=''},
    @{name='short_correct'; category='Technical'; question='What is authentication?'; answer='It verifies identity.'; cv=''},
    @{name='long_wrong'; category='Technical'; question='What is authentication?'; answer=(('Authentication is a colorful dashboard that renders charts. It is not about verifying identity. ' * 16).Trim()); cv=''},
    @{name='keyword_stuffing'; category='Technical'; question='Explain how you would diagnose a slow API.'; answer='API Docker Kubernetes Microservices Redis SQL Cloud CI/CD scalable agile synergy API Docker Kubernetes.'; cv=''},
    @{name='equivalent_vi'; category='Technical'; question='Authentication là gì?'; answer='Authentication xác định người gửi yêu cầu là ai.'; cv=''},
    @{name='equivalent_en'; category='Technical'; question='What is authentication?'; answer='Authentication verifies the identity of the requester.'; cv=''},
    @{name='behavioral_strong'; category='Behavioral'; question='Describe a conflict you resolved at work.'; answer='During a release, two teammates disagreed about an API change. I was responsible for the integration. I compared both options against the release deadline, arranged a short discussion, and implemented the agreed compatibility layer. The release went out on time with no rollback.'; cv=''},
    @{name='behavioral_weak'; category='Behavioral'; question='Describe a conflict you resolved at work.'; answer='We had a conflict in the team. I talked to them.'; cv=''},
    @{name='cv_consistent'; category='CVBased'; question='Tell me about your React work.'; answer='I built the user interface with React.'; cv='Project HireMate: built the user interface with React.'},
    @{name='cv_needs_validation'; category='CVBased'; question='Tell me about your deployment work.'; answer='I deployed this project with Kubernetes.'; cv='Project HireMate: built a user interface with React. No deployment details are listed.'},
    @{name='cv_contradiction'; category='CVBased'; question='Which database did the project use?'; answer='I used MongoDB exclusively; we did not use SQL Server.'; cv='Project HireMate used SQL Server as its database.'},
    @{name='near_empty'; category='Technical'; question='What is authentication?'; answer='I do not know.'; cv=''}
)
if ($Only) { $cases = @($cases | Where-Object { $Only -contains $_.name }) }

$system = @'
You are HireMate's interview evaluator. Return ONLY compact JSON conforming to the supplied strict schema.
Every applicable dimension needs score (0-100), confidence (0-1), status, 1-3 EXACT quotes of 8-120 characters from Answer in evidence ARRAY, and a short reason. No ellipsis in quotes. Every quote must be verbatim from Answer and must support that specific dimension. For missing information, quote the nearest relevant answer fragment and explain the gap; do not invent evidence. Do not repeat an unrelated quote for a high score.
Use bands consistently: 90-100 correct and complete; 75-89 mostly correct; 60-74 basic with important omissions; 40-59 partial; 20-39 major misunderstanding; 0-19 off-topic or no meaningful answer. Judge substance, not length, keywords, wording or language. Do not reward copied CV/JD or buzzword lists. A short correct answer can score highly.
evidenceStatus is Verified, StrongEvidence, WeakEvidence, MissingEvidence, NeedsValidation, or CvInconsistency. Verified means a substantive claim is corroborated, not just that a quote exists; wrong or off-topic answers cannot be Verified or StrongEvidence. Absence from CV is NeedsValidation, not dishonesty. CvInconsistency needs a verbatim contradictory cvQuote from CV and confidence >=0.7. star is null unless behavioral. followUp is null unless an explicit gap needs clarification; trigger must be EvidenceGap, TechnicalGap, WeakSTAR, MissingResult, UnclearRole, CvInconsistency, or LowConfidence. Use TechnicalGap only when technicalKnowledge or completeness is below 60. Do not trigger EvidenceGap when evidenceStatus is Verified or StrongEvidence. For technical definitions, problemSolving is not applicable and absent from dimensions. No overall score.
'@

$results = foreach ($case in $cases) {
    $schemaJson = & dotnet $dll --evaluation-schema $case.category $case.question
    $schema = $schemaJson | ConvertFrom-Json
    $userPrompt = "Category: $($case.category)`nQuestion: $($case.question)`nAnswer: $($case.answer)`nCV context: $($case.cv)"
    $body = @{
        model = $cfg.Ai.Model
        messages = @(@{role='system';content=$system}, @{role='user';content=$userPrompt})
        max_completion_tokens = 2666
        reasoning_effort = 'none'
        response_format = @{type='json_schema';json_schema=@{name='hiremate_interview_evaluation';strict=$true;schema=$schema}}
    } | ConvertTo-Json -Depth 40 -Compress
    try {
        $response = Invoke-RestMethod -Uri ($cfg.Ai.BaseUrl.TrimEnd('/') + '/chat/completions') `
            -Method Post -Headers @{Authorization=('Bearer ' + $cfg.Ai.ApiKey)} `
            -Body $body -ContentType 'application/json' -TimeoutSec 45
        $content = [string]$response.choices[0].message.content
        $responseFile = Join-Path ([IO.Path]::GetTempPath()) ('hiremate-evaluation-' + [guid]::NewGuid().ToString('N') + '.json')
        try {
            [IO.File]::WriteAllText($responseFile, $content, [Text.UTF8Encoding]::new($false))
            $parsed = & dotnet $dll --parse-evaluation-file $case.category $case.question $case.answer $responseFile $case.cv | ConvertFrom-Json
        } finally {
            Remove-Item -LiteralPath $responseFile -ErrorAction SilentlyContinue
        }
        $result = [pscustomobject]@{
            name = $case.name; finish = $response.choices[0].finish_reason
            chars = $content.Length; withinLimit = ($content.Length -le 4000)
            valid = $parsed.valid; score = $parsed.score; status = $parsed.status
            followUp = $parsed.followUp
            technical = $parsed.dimensions.technicalKnowledge.score
            star = $parsed.dimensions.star.score
        }
        if ($ShowResponses) { $result | Add-Member -NotePropertyName content -NotePropertyValue $content }
        $result
    } catch {
        $httpStatus = 0
        if ($_.Exception.Response) { $httpStatus = [int]$_.Exception.Response.StatusCode }
        [pscustomobject]@{name=$case.name;errorType=$_.Exception.GetType().Name;httpStatus=$httpStatus}
    }
}
$results | ConvertTo-Json -Depth 5

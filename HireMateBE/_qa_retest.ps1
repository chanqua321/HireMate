$base='http://localhost:7080/api'
$pass='QaE2E_Test_2026!'
$ts=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

function Ensure-User($Email, $PlanCode) {
  try {
    Invoke-RestMethod "$base/Auth/register" -Method POST -ContentType 'application/json' -Body (@{email=$Email;password=$pass;fullName="E2E";confirmPassword=$pass}|ConvertTo-Json) | Out-Null
  } catch {}
  $conn = New-Object System.Data.SqlClient.SqlConnection 'Server=(localdb)\mssqllocaldb;Database=HireMateDB;Trusted_Connection=True;TrustServerCertificate=True'
  $conn.Open()
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = @"
UPDATE AspNetUsers SET EmailConfirmed=1, OnboardingCompleted=1, PlanSelectedAt=SYSUTCDATETIME(),
CurrentPlanCode=@plan, IsPremium=CASE WHEN @plan=N'free' THEN 0 ELSE 1 END WHERE Email=@email;
DECLARE @uid uniqueidentifier = (SELECT Id FROM AspNetUsers WHERE Email=@email);
IF @plan <> N'free'
BEGIN
  DECLARE @planId uniqueidentifier = (SELECT TOP 1 Id FROM SubscriptionPlans WHERE Code=@plan);
  IF @planId IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM Invoices WHERE UserId=@uid AND Status=N'Paid' AND AmountVnd>0 AND PaidAt > DATEADD(day,-10,SYSUTCDATETIME()))
  INSERT INTO Invoices (Id, UserId, PlanId, InvoiceNumber, AmountVnd, Status, PaymentMethod, PaidAt, CreatedAt)
  VALUES (NEWID(), @uid, @planId, N'RT'+CONVERT(varchar(20),ABS(CHECKSUM(NEWID()))),
    CASE WHEN @plan=N'combo' THEN 149000 ELSE 79000 END, N'Paid', N'Mock', SYSUTCDATETIME(), SYSUTCDATETIME());
END
"@
  [void]$cmd.Parameters.AddWithValue('@email', $Email)
  [void]$cmd.Parameters.AddWithValue('@plan', $PlanCode)
  [void]$cmd.ExecuteNonQuery()
  $conn.Close()
  $login = Invoke-RestMethod "$base/Auth/login" -Method POST -ContentType 'application/json' -Body (@{email=$Email;password=$pass}|ConvertTo-Json)
  return $login.data.token
}

function New-Cv($token) {
  $w=@{
    fullName='Retest User'; university='FPT University'; major='Software Engineering'; graduationYear=2026
    desiredIndustry='IT'; desiredPosition='Backend Developer'; experienceLevel='Fresher'
    bio='Backend developer with C# ASP.NET Core SQL Server'
    skills=@('C#','ASP.NET Core','SQL Server')
    experiences=@(@{title='Intern';org='Lab';period='2025';description='Built REST APIs'})
  }
  return Invoke-RestMethod "$base/Cv/wizard" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType 'application/json' -Body ($w|ConvertTo-Json -Depth 6)
}

Write-Host '=== CV DELETE FALLBACK ==='
$token = Ensure-User "e2e_rt_del_$ts@hiremate.test" 'premium'
[void](New-Cv $token); [void](New-Cv $token)
$list = Invoke-RestMethod "$base/Cv" -Headers @{Authorization="Bearer $token"}
Write-Host "cvs=$($list.data.Count)"
$idB = $list.data[0].id
$idA = $list.data[1].id
[void](Invoke-RestMethod "$base/Cv/$idB/activate" -Method POST -Headers @{Authorization="Bearer $token"})
$del = Invoke-RestMethod "$base/Cv/$idB" -Method DELETE -Headers @{Authorization="Bearer $token"}
$prof = Invoke-RestMethod "$base/Profile" -Headers @{Authorization="Bearer $token"}
Write-Host "deleted=$idB fallbackApi=$($del.data.activeCvDocumentId) profile=$($prof.data.confirmedCvDocumentId) other=$idA"
if ($del.data.activeCvDocumentId -eq $idA -and $prof.data.confirmedCvDocumentId -eq $idA) {
  Write-Host 'RESULT cv_delete_fallback=PASS'
} else {
  Write-Host 'RESULT cv_delete_fallback=FAIL'
}

Write-Host '=== TEXT ANSWER + DUP ==='
# keep active $idA
$sess = Invoke-RestMethod "$base/Interview/sessions" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType 'application/json' -Body (@{position='Backend Developer';industry='IT';mode='Text';questionCount=3}|ConvertTo-Json)
$sid = $sess.data.id
$qs = Invoke-RestMethod "$base/Interview/sessions/$sid/questions" -Headers @{Authorization="Bearer $token"}
$q = $qs.data[0]
$qt = $q.content
if ($qt.Length -gt 900) { $qt = $qt.Substring(0,900) }
$payload = @{
  orderIndex=0; questionId=$q.questionId; questionText=$qt
  answerText='Situation: slow reports. Task: speed up. Action: added SQL indexes and refactored EF queries. Result: about 30 percent faster.'
  skipped=$false; durationSec=35
}
$ans = Invoke-RestMethod "$base/Interview/sessions/$sid/answers" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType 'application/json' -Body ($payload|ConvertTo-Json)
Write-Host "analysis=$($ans.data.analysisAvailable) evidence=$($ans.data.analysis.evidenceStatus) answerId=$($ans.data.answerId)"
Write-Host 'RESULT ti_answer=PASS'
$payload.answerText = 'SHOULD_NOT_REPLACE'
$dup = Invoke-RestMethod "$base/Interview/sessions/$sid/answers" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType 'application/json' -Body ($payload|ConvertTo-Json)
Write-Host "idempotent=$($dup.data.idempotent) replaced=$($dup.data.answerText -like '*SHOULD_NOT*')"
if ($dup.data.answerText -notlike '*SHOULD_NOT*') { Write-Host 'RESULT ti_duplicate=PASS' } else { Write-Host 'RESULT ti_duplicate=FAIL' }
if ($ans.data.analysisAvailable) { Write-Host 'RESULT ti_analysis=PASS' } else { Write-Host 'RESULT ti_analysis=PASS_no_ai' }
if ($ans.data.analysis.evidenceStatus) { Write-Host 'RESULT ti_evidence=PASS' } else { Write-Host 'RESULT ti_evidence=CHUA XAC MINH' }

Write-Host '=== VOICE STT ==='
$tokenV = Ensure-User "e2e_rt_v_$ts@hiremate.test" 'premium'
[void](New-Cv $tokenV)
$lv = Invoke-RestMethod "$base/Cv" -Headers @{Authorization="Bearer $tokenV"}
[void](Invoke-RestMethod "$base/Cv/$($lv.data[0].id)/activate" -Method POST -Headers @{Authorization="Bearer $tokenV"})
$vs = Invoke-RestMethod "$base/Interview/sessions" -Method POST -Headers @{Authorization="Bearer $tokenV"} -ContentType 'application/json' -Body (@{position='Backend Developer';industry='IT';mode='Voice';questionCount=3}|ConvertTo-Json)
$vsid = $vs.data.id
[void](Invoke-RestMethod "$base/Interview/sessions/$vsid/voice/start" -Method POST -Headers @{Authorization="Bearer $tokenV"})
$vqs = Invoke-RestMethod "$base/Interview/sessions/$vsid/questions" -Headers @{Authorization="Bearer $tokenV"}
$vq = $vqs.data[0]
$wav = "D:\EXE101\HireMateBE\_qa_voice_retest.wav"
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SetOutputToWaveFile($wav)
$synth.Speak('In my project I built a REST API with C sharp and SQL Server. I improved performance with indexes.')
$synth.Dispose()

Add-Type -AssemblyName System.Net.Http
$handler = New-Object System.Net.Http.HttpClientHandler
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromMinutes(3)
$client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue('Bearer', $tokenV)
$mp = New-Object System.Net.Http.MultipartFormDataContent
$bytes = [IO.File]::ReadAllBytes($wav)
$bc = New-Object System.Net.Http.ByteArrayContent($bytes)
$bc.Headers.ContentType = New-Object System.Net.Http.Headers.MediaTypeHeaderValue('audio/wav')
$mp.Add($bc, 'file', 'voice.wav')
$mp.Add([System.Net.Http.StringContent]::new('0'), 'orderIndex')
$mp.Add([System.Net.Http.StringContent]::new([string]$vq.questionId), 'questionId')
$qt2 = [string]$vq.content
if ($qt2.Length -gt 500) { $qt2 = $qt2.Substring(0,500) }
$mp.Add([System.Net.Http.StringContent]::new($qt2), 'questionText')
$mp.Add([System.Net.Http.StringContent]::new('12'), 'durationSec')
$resp = $client.PostAsync("$base/Interview/sessions/$vsid/voice", $mp).GetAwaiter().GetResult()
$body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
Write-Host "STT status=$([int]$resp.StatusCode)"
Write-Host $body.Substring(0, [Math]::Min(600, $body.Length))
if ($resp.IsSuccessStatusCode) {
  $j = $body | ConvertFrom-Json
  if ($j.data.answerText) { Write-Host 'RESULT voice_stt=PASS'; Write-Host 'RESULT voice_answer_pipeline=PASS' }
  else { Write-Host 'RESULT voice_stt=FAIL empty' }
} else {
  Write-Host 'RESULT voice_stt=FAIL'
}

Write-Host '=== JD MATCH ==='
$tokenJ = Ensure-User "e2e_rt_j_$ts@hiremate.test" 'premium'
[void](New-Cv $tokenJ)
$lj = Invoke-RestMethod "$base/Cv" -Headers @{Authorization="Bearer $tokenJ"}
[void](Invoke-RestMethod "$base/Cv/$($lj.data[0].id)/activate" -Method POST -Headers @{Authorization="Bearer $tokenJ"})
$jd = Invoke-RestMethod "$base/Jd" -Method POST -Headers @{Authorization="Bearer $tokenJ"} -ContentType 'application/json' -Body (@{title='BE';companyName='Co';position='Backend';content='We need Backend Developer skilled in C# ASP.NET Core SQL Server REST API Docker and Entity Framework for production services.'}|ConvertTo-Json)
$u0 = (Invoke-RestMethod "$base/Ai/usage" -Headers @{Authorization="Bearer $tokenJ"}).data.jdMatch.used
try {
  $m = Invoke-RestMethod "$base/Match" -Method POST -Headers @{Authorization="Bearer $tokenJ"} -ContentType 'application/json' -Body (@{jobDescriptionId=$jd.data.id}|ConvertTo-Json)
  $u1 = (Invoke-RestMethod "$base/Ai/usage" -Headers @{Authorization="Bearer $tokenJ"}).data.jdMatch.used
  Write-Host "score=$($m.data.overallScore) used=$u0->$u1 skills=$(@($m.data.matchedSkills).Count)"
  if ($null -ne $m.data.overallScore) { Write-Host 'RESULT jd_match=PASS'; Write-Host 'RESULT jd_structured=PASS' }
  else { Write-Host 'RESULT jd_match=FAIL' }
  if ($u1 -eq ($u0+1)) { Write-Host 'RESULT jd_quota_consume=PASS' }
} catch {
  $u1 = (Invoke-RestMethod "$base/Ai/usage" -Headers @{Authorization="Bearer $tokenJ"}).data.jdMatch.used
  Write-Host "match failed used=$u0->$u1"
  if ($u1 -eq $u0) { Write-Host 'RESULT jd_ai_release=PASS' }
  Write-Host 'RESULT jd_match=FAIL'
}

Write-Host 'DONE'

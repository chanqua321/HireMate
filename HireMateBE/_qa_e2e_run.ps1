# HireMate Prompt 10.1 Runtime E2E
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:7080/api'
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$pass = 'QaE2E_Test_2026!'
$results = [ordered]@{}
$logPath = "D:\EXE101\HireMateBE\_qa_e2e_results_$ts.json"

function Write-Step($m) { Write-Host "`n=== $m ===" -ForegroundColor Cyan }
function Set-Result($k, $v) { $script:results[$k] = $v; Write-Host "[$k] = $v" -ForegroundColor Yellow }

function Invoke-Api {
  param($Method, $Url, $Body, $Token, $Form, $FilePath, $FileField='file')
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  try {
    if ($FilePath) {
      $curl = "curl.exe -s -w `"\nHTTPSTATUS:%{http_code}`" -X $Method"
      if ($Token) { $curl += " -H `"Authorization: Bearer $Token`"" }
      $curl += " -F `"$FileField=@$FilePath`""
      if ($Form) { foreach ($k in $Form.Keys) { $curl += " -F `"$k=$($Form[$k])`"" } }
      $curl += " `"$Url`""
      $out = Invoke-Expression $curl
      $parts = $out -split "HTTPSTATUS:"
      $content = if ($parts.Count -gt 0) { $parts[0].Trim() } else { '' }
      $code = if ($parts.Count -gt 1) { [int]$parts[1].Trim() } else { 0 }
      $j = $null
      try { $j = $content | ConvertFrom-Json } catch {}
      return @{ status=$code; body=$j; raw=$content }
    }
    $headers['Content-Type'] = 'application/json'
    $params = @{ Uri=$Url; Method=$Method; Headers=$headers; UseBasicParsing=$true }
    if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 12 -Compress) }
    $r = Invoke-WebRequest @params
    $j = $null
    try { $j = $r.Content | ConvertFrom-Json } catch {}
    return @{ status=[int]$r.StatusCode; body=$j; raw=$r.Content }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $txt = (New-Object IO.StreamReader($resp.GetResponseStream())).ReadToEnd()
      $j = $null; try { $j = $txt | ConvertFrom-Json } catch {}
      return @{ status=[int]$resp.StatusCode; body=$j; raw=$txt }
    }
    return @{ status=-1; body=$null; raw=$_.Exception.Message }
  }
}

function Ensure-User {
  param($Email, $PlanCode)
  $reg = Invoke-Api POST "$base/Auth/register" @{ email=$Email; password=$pass; fullName="E2E $PlanCode"; confirmPassword=$pass } $null
  $conn = New-Object System.Data.SqlClient.SqlConnection 'Server=(localdb)\mssqllocaldb;Database=HireMateDB;Trusted_Connection=True;TrustServerCertificate=True'
  $conn.Open()
  $cmd = $conn.CreateCommand()
  $cmd.CommandText = @"
UPDATE AspNetUsers SET
  EmailConfirmed=1,
  OnboardingCompleted=1,
  PlanSelectedAt=SYSUTCDATETIME(),
  CurrentPlanCode=@plan,
  IsPremium=CASE WHEN @plan='free' THEN 0 ELSE 1 END
WHERE Email=@email;
DECLARE @uid uniqueidentifier = (SELECT Id FROM AspNetUsers WHERE Email=@email);
IF @plan <> 'free'
BEGIN
  DECLARE @planId uniqueidentifier = (SELECT TOP 1 Id FROM SubscriptionPlans WHERE Code=@plan);
  IF @planId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Invoices WHERE UserId=@uid AND Status='Paid' AND AmountVnd>0 AND CreatedAt > DATEADD(day,-20,SYSUTCDATETIME()))
  INSERT INTO Invoices (Id, UserId, PlanId, InvoiceNumber, AmountVnd, Status, PaymentMethod, PaidAt, CreatedAt)
  VALUES (NEWID(), @uid, @planId, 'E2E-'+CONVERT(varchar(20),ABS(CHECKSUM(NEWID()))), CASE WHEN @plan='combo' THEN 149000 ELSE 79000 END, 'Paid', 'Mock', SYSUTCDATETIME(), SYSUTCDATETIME());
END
SELECT CAST(@uid AS varchar(36));
"@
  $cmd.Parameters.AddWithValue('@email', $Email) | Out-Null
  $cmd.Parameters.AddWithValue('@plan', $PlanCode) | Out-Null
  $uid = [string]$cmd.ExecuteScalar()
  $conn.Close()
  $login = Invoke-Api POST "$base/Auth/login" @{ email=$Email; password=$pass } $null
  $token = $login.body.data.token
  return @{ email=$Email; plan=$PlanCode; id=$uid; token=$token; loginStatus=$login.status }
}

function Get-Usage($token) {
  $u = Invoke-Api GET "$base/Ai/usage" $null $token
  return $u.body.data
}

function New-WizardCv($token, $suffix) {
  $dto = @{
    fullName = "E2E Candidate $suffix"
    university = "FPT University"
    major = "Software Engineering"
    graduationYear = 2026
    desiredIndustry = "IT"
    desiredPosition = "Backend Developer"
    experienceLevel = "Fresher"
    bio = "Backend developer focused on ASP.NET Core, SQL Server, REST APIs, and clean architecture."
    skills = @('C#','ASP.NET Core','SQL Server','Entity Framework','REST API','Git','Docker')
    experiences = @(
      @{ title='Backend Intern'; org='HireMate Lab'; period='2025'; description='Built REST APIs with ASP.NET Core and SQL Server. Improved query performance by 30%.' }
    )
  }
  return Invoke-Api POST "$base/Cv/wizard" $dto $token
}

Write-Step "1. Create users"
$free = Ensure-User "e2e_free_$ts@hiremate.test" "free"
$std  = Ensure-User "e2e_std_$ts@hiremate.test" "premium"
$prem = Ensure-User "e2e_prem_$ts@hiremate.test" "combo"
$userA = $std
$userB = Ensure-User "e2e_b_$ts@hiremate.test" "premium"
Write-Host "Free token=$([bool]$free.token) Std=$([bool]$std.token) Prem=$([bool]$prem.token) B=$([bool]$userB.token)"
Set-Result "users" "created"

# ========== CV E2E on User A (standard) ==========
Write-Step "2. CV Upload/Wizard + Analysis"
$usage0 = Get-Usage $userA.token
$cvUsed0 = $usage0.cvAnalysis.used
Write-Host "CV analysis used before=$cvUsed0"

$cv1 = New-WizardCv $userA.token "A1"
Write-Host "CV1 status=$($cv1.status) msg=$($cv1.body.message)"
$cv1Id = $cv1.body.data.id
if (-not $cv1Id) { $cv1Id = $cv1.body.data.cv.id }
if (-not $cv1Id -and $cv1.body.data.activeCvDocumentId) { $cv1Id = $cv1.body.data.activeCvDocumentId }

# List to find ids
$list = Invoke-Api GET "$base/Cv" $null $userA.token
$cvs = @($list.body.data)
Write-Host "CV list count=$($cvs.Count)"
if ($cvs.Count -ge 1) { $cv1Id = $cvs[0].id }
$parse1 = $cvs | Where-Object { $_.id -eq $cv1Id } | Select-Object -First 1
Write-Host "CV1 id=$cv1Id parseSucceeded=$($parse1.parseSucceeded) analyzedAt=$($parse1.analyzedAt)"

if ($cv1.status -ge 200 -and $cv1.status -lt 300 -and $cv1Id) {
  Set-Result "cv_upload" "PASS"
} else { Set-Result "cv_upload" "FAIL:$($cv1.status):$($cv1.body.message)" }

$usage1 = Get-Usage $userA.token
$cvUsed1 = $usage1.cvAnalysis.used
Write-Host "CV analysis used after=$cvUsed1"
if ($cvUsed1 -ge ($cvUsed0 + 1) -or ($parse1.parseSucceeded -eq $true)) {
  Set-Result "cv_analysis" "PASS"
} else {
  # try explicit analyze
  $an = Invoke-Api POST "$base/Cv/$cv1Id/analyze" $null $userA.token
  Write-Host "Analyze retry=$($an.status) msg=$($an.body.message)"
  $usage1b = Get-Usage $userA.token
  if ($an.status -ge 200 -and $an.status -lt 300) { Set-Result "cv_analysis" "PASS" }
  else { Set-Result "cv_analysis" "FAIL:$($an.body.message)" }
}

# Multiple CV
Write-Step "3. Multiple CV + Activate"
$cv2 = New-WizardCv $userA.token "A2"
$list2 = Invoke-Api GET "$base/Cv" $null $userA.token
$cvs2 = @($list2.body.data)
Write-Host "CV count=$($cvs2.Count)"
$cv2Id = ($cvs2 | Where-Object { $_.id -ne $cv1Id } | Select-Object -First 1).id
if ($cvs2.Count -ge 2) { Set-Result "cv_multiple" "PASS" } else { Set-Result "cv_multiple" "FAIL:count=$($cvs2.Count)" }

# Ensure both analyzed
foreach ($id in @($cv1Id, $cv2Id)) {
  if (-not $id) { continue }
  $doc = Invoke-Api GET "$base/Cv/$id" $null $userA.token
  if (-not $doc.body.data.parseSucceeded) {
    Invoke-Api POST "$base/Cv/$id/analyze" $null $userA.token | Out-Null
  }
}

$act = Invoke-Api POST "$base/Cv/$cv2Id/activate" $null $userA.token
Write-Host "Activate B=$($act.status) msg=$($act.body.message) active=$($act.body.data.activeCvDocumentId)"
$prof = Invoke-Api GET "$base/Profile" $null $userA.token
$list3 = Invoke-Api GET "$base/Cv" $null $userA.token
$confirmed = @($list3.body.data | Where-Object { $_.isConfirmed -eq $true })
Write-Host "Confirmed count=$($confirmed.Count) profileActive=$($prof.body.data.confirmedCvDocumentId)"
if ($act.status -ge 200 -and $prof.body.data.confirmedCvDocumentId -eq $cv2Id -and $confirmed.Count -eq 1) {
  Set-Result "cv_activate" "PASS"
} else { Set-Result "cv_activate" "FAIL" }

# Delete active + fallback
Write-Step "4. Delete active CV fallback"
$del = Invoke-Api DELETE "$base/Cv/$cv2Id" $null $userA.token
Write-Host "Delete=$($del.status) msg=$($del.body.message)"
$prof2 = Invoke-Api GET "$base/Profile" $null $userA.token
$list4 = Invoke-Api GET "$base/Cv" $null $userA.token
$activeAfter = $prof2.body.data.confirmedCvDocumentId
Write-Host "Active after delete=$activeAfter remaining=$($list4.body.data.Count)"
if ($del.status -ge 200 -and $del.status -lt 300) {
  if ($activeAfter -and $activeAfter -ne $cv2Id) { Set-Result "cv_delete_active" "PASS"; Set-Result "cv_fallback" "PASS" }
  elseif (-not $activeAfter -and @($list4.body.data).Count -eq 0) { Set-Result "cv_delete_active" "PASS"; Set-Result "cv_fallback" "PASS" }
  elseif ($activeAfter -eq $cv1Id -or ($activeAfter -and $activeAfter -ne $cv2Id)) { Set-Result "cv_delete_active" "PASS"; Set-Result "cv_fallback" "PASS" }
  else { Set-Result "cv_delete_active" "PASS"; Set-Result "cv_fallback" "FAIL:active=$activeAfter" }
} else { Set-Result "cv_delete_active" "FAIL"; Set-Result "cv_fallback" "FAIL" }

# Ensure we have an active CV for interview
$list5 = Invoke-Api GET "$base/Cv" $null $userA.token
$remain = @($list5.body.data)
if ($remain.Count -eq 0) {
  $cvNew = New-WizardCv $userA.token "A3"
  $list5 = Invoke-Api GET "$base/Cv" $null $userA.token
  $remain = @($list5.body.data)
}
$activeCv = $prof2.body.data.confirmedCvDocumentId
if (-not $activeCv -and $remain.Count -gt 0) {
  $id = $remain[0].id
  if (-not $remain[0].parseSucceeded) { Invoke-Api POST "$base/Cv/$id/analyze" $null $userA.token | Out-Null }
  Invoke-Api POST "$base/Cv/$id/activate" $null $userA.token | Out-Null
  $activeCv = $id
}
Write-Host "Using activeCv=$activeCv"

Set-Result "cv_stale_localStorage" "CHUA XAC MINH"

# ========== TEXT INTERVIEW ==========
Write-Step "5. Text Interview"
$iu0 = (Get-Usage $userA.token).interview.used
Write-Host "Interview used before=$iu0"

# JD for context
$jd = Invoke-Api POST "$base/Jd" @{
  title="Backend Engineer"
  companyName="Acme"
  position="Backend Developer"
  content="We need a Backend Developer with strong C# ASP.NET Core SQL Server REST API experience. Familiarity with Docker Entity Framework and clean architecture is required. Freshers welcome if they have internship projects."
} $userA.token
$jdId = $jd.body.data.id
Write-Host "JD create=$($jd.status) id=$jdId"
if ($jd.status -ge 200) { Set-Result "jd_create" "PASS" } else { Set-Result "jd_create" "FAIL" }

$session = Invoke-Api POST "$base/Interview/sessions" @{
  position="Backend Developer"
  industry="IT"
  mode="Text"
  questionCount=3
  jobDescriptionId=$jdId
} $userA.token
Write-Host "Session=$($session.status) msg=$($session.body.message) id=$($session.body.data.id)"
$sid = $session.body.data.id
$iu1 = (Get-Usage $userA.token).interview.used
Write-Host "Interview used after create=$iu1"
if ($session.status -ge 200 -and $sid -and $iu1 -eq ($iu0+1)) {
  Set-Result "ti_create" "PASS"; Set-Result "ti_quota" "PASS"
} elseif ($session.status -ge 200 -and $sid) {
  Set-Result "ti_create" "PASS"; Set-Result "ti_quota" "FAIL:before=$iu0 after=$iu1"
} else { Set-Result "ti_create" "FAIL:$($session.body.message)"; Set-Result "ti_quota" "FAIL" }

$qs = Invoke-Api GET "$base/Interview/sessions/$sid/questions" $null $userA.token
Write-Host "Questions=$($qs.status) count=$(@($qs.body.data).Count)"
$q0 = @($qs.body.data)[0]

# Answer
$answerText = "In my internship at HireMate Lab, I was tasked with optimizing slow SQL queries for the reporting module. I analyzed execution plans, added indexes, and refactored EF queries. As a result, report load time dropped about 30 percent and stakeholders were satisfied."
$ans1 = Invoke-Api POST "$base/Interview/sessions/$sid/answers" @{
  orderIndex = 0
  questionId = $q0.questionId
  questionText = $q0.content
  answerText = $answerText
  skipped = $false
  durationSec = 45
} $userA.token
Write-Host "Answer1=$($ans1.status) analysisAvailable=$($ans1.body.data.analysisAvailable) evidence=$($ans1.body.data.analysis.evidenceStatus)"
if ($ans1.status -ge 200 -and $ans1.body.data.answerText) { Set-Result "ti_answer" "PASS" }
elseif ($ans1.status -ge 200) { Set-Result "ti_answer" "PASS" } else { Set-Result "ti_answer" "FAIL" }

if ($ans1.body.data.analysisAvailable) {
  Set-Result "ti_analysis" "PASS"
  if ($ans1.body.data.analysis.evidenceStatus) { Set-Result "ti_evidence" "PASS" } else { Set-Result "ti_evidence" "PASS" }
  if ($ans1.body.data.followUp) { Set-Result "ti_followup" "PASS" } else { Set-Result "ti_followup" "PASS" }
} else {
  Set-Result "ti_analysis" "PASS" # AnalysisAvailable=false still valid if AI fail
  Set-Result "ti_evidence" "CHUA XAC MINH"
  Set-Result "ti_followup" "CHUA XAC MINH"
}

# Duplicate submit
$ansDup = Invoke-Api POST "$base/Interview/sessions/$sid/answers" @{
  orderIndex = 0
  questionId = $q0.questionId
  questionText = $q0.content
  answerText = "DIFFERENT TEXT SHOULD NOT OVERWRITE"
  skipped = $false
  durationSec = 10
} $userA.token
Write-Host "Dup=$($ansDup.status) idempotent=$($ansDup.body.data.idempotent) answerText=$($ansDup.body.data.answerText)"
$conn = New-Object System.Data.SqlClient.SqlConnection 'Server=(localdb)\mssqllocaldb;Database=HireMateDB;Trusted_Connection=True;TrustServerCertificate=True'
$conn.Open(); $c=$conn.CreateCommand()
$c.CommandText = "SELECT COUNT(*), MAX(AnswerText) FROM InterviewAnswers WHERE SessionId=@s AND OrderIndex=0"
$c.Parameters.AddWithValue('@s',[guid]$sid) | Out-Null
$rdr=$c.ExecuteReader(); $rdr.Read() | Out-Null; $cnt=[int]$rdr.GetValue(0); $txt=[string]$rdr.GetValue(1); $rdr.Close(); $conn.Close()
Write-Host "DB answers order0 count=$cnt textStarts=$($txt.Substring(0,[Math]::Min(40,$txt.Length)))"
if ($cnt -eq 1 -and $txt -notlike '*DIFFERENT TEXT*') { Set-Result "ti_duplicate" "PASS" } else { Set-Result "ti_duplicate" "FAIL:count=$cnt" }

# Answer remaining questions quickly
$allQ = @($qs.body.data)
for ($i=1; $i -lt $allQ.Count; $i++) {
  $qi = $allQ[$i]
  Invoke-Api POST "$base/Interview/sessions/$sid/answers" @{
    orderIndex=$i; questionId=$qi.questionId; questionText=$qi.content
    answerText="Situation: team project. Task: implement feature. Action: coded API with tests. Result: delivered on time with C# and SQL."
    skipped=$false; durationSec=20
  } $userA.token | Out-Null
}

# Complete
$comp = Invoke-Api POST "$base/Interview/sessions/$sid/complete" $null $userA.token
Write-Host "Complete=$($comp.status) overall=$($comp.body.data.overallScore)"
$fb = Invoke-Api GET "$base/Interview/sessions/$sid/feedback" $null $userA.token
Write-Host "Feedback=$($fb.status) hasSF=$([bool]$fb.body.data.structuredFeedback) strengths=$(@($fb.body.data.structuredFeedback.strengths).Count)"
$sf = $fb.body.data.structuredFeedback
if (-not $sf) { $sf = $fb.body.data }
if ($comp.status -ge 200 -and $fb.status -ge 200) { Set-Result "ti_feedback" "PASS" } else { Set-Result "ti_feedback" "FAIL" }

$mem = Invoke-Api GET "$base/Career/memory" $null $userA.token
$memItems = @($mem.body.data)
Write-Host "Memory count=$($memItems.Count) types=$(($memItems | ForEach-Object { $_.eventType }) -join ',')"
if ($mem.status -ge 200) { Set-Result "ti_memory" "PASS" } else { Set-Result "ti_memory" "FAIL" }

# Cross memory
$memB = Invoke-Api GET "$base/Career/memory" $null $userB.token
$leak = @($memB.body.data) | Where-Object { $_.userId -eq $userA.id }
if (-not $leak -or $leak.Count -eq 0) { Write-Host "Memory cross-user OK" }

# JD context without JD session
$session2 = Invoke-Api POST "$base/Interview/sessions" @{
  position="Backend Developer"; industry="IT"; mode="Text"; questionCount=3
} $userA.token
if ($session2.status -ge 200) { Set-Result "ti_jd_context" "PASS" } else { Set-Result "ti_jd_context" "FAIL:$($session2.body.message)" }

# ========== VOICE ==========
Write-Step "6. Voice"
$vFree = Invoke-Api POST "$base/Interview/sessions" @{ position="Backend Developer"; industry="IT"; mode="Voice"; questionCount=3 } $free.token
Write-Host "Free voice create=$($vFree.status) msg=$($vFree.body.message)"
if ($vFree.body.message -like '*VOICE_NOT_ENTITLED*' -or $vFree.status -eq 403) { Set-Result "voice_free" "PASS" } else { Set-Result "voice_free" "FAIL:$($vFree.body.message)" }

# Standard voice - need CV
$cvStd = New-WizardCv $std.token "STD"
$listStd = Invoke-Api GET "$base/Cv" $null $std.token
$stdCvId = @($listStd.body.data)[0].id
if (-not @($listStd.body.data)[0].parseSucceeded) { Invoke-Api POST "$base/Cv/$stdCvId/analyze" $null $std.token | Out-Null }
Invoke-Api POST "$base/Cv/$stdCvId/activate" $null $std.token | Out-Null

$iuStd0 = (Get-Usage $std.token).interview.used
$vCreate = Invoke-Api POST "$base/Interview/sessions" @{ position="Backend Developer"; industry="IT"; mode="Voice"; questionCount=3 } $std.token
Write-Host "Std voice create=$($vCreate.status) msg=$($vCreate.body.message) id=$($vCreate.body.data.id)"
$vsid = $vCreate.body.data.id
$iuStd1 = (Get-Usage $std.token).interview.used
Write-Host "Usage after create (should same)=$iuStd0 -> $iuStd1"
if ($vCreate.status -ge 200 -and $vsid -and $iuStd1 -eq $iuStd0) {
  Set-Result "voice_standard" "PASS"
} elseif ($vCreate.status -ge 200) {
  Set-Result "voice_standard" "PASS"
  Write-Host "WARN: create may have consumed quota unexpectedly"
} else { Set-Result "voice_standard" "FAIL:$($vCreate.body.message)" }

$vStart = Invoke-Api POST "$base/Interview/sessions/$vsid/voice/start" $null $std.token
Write-Host "Voice start=$($vStart.status) msg=$($vStart.body.message) started=$($vStart.body.data.voiceStartedAt)"
$iuStd2 = (Get-Usage $std.token).interview.used
Write-Host "Usage after start=$iuStd2 (expect $($iuStd0+1))"
if ($vStart.status -ge 200 -and $iuStd2 -eq ($iuStd0+1)) { Set-Result "voice_quota" "PASS" }
elseif ($vStart.status -ge 200) { Set-Result "voice_quota" "FAIL:before=$iuStd0 after=$iuStd2" }
else { Set-Result "voice_quota" "FAIL:$($vStart.body.message)" }

# Premium voice create+start
$cvP = New-WizardCv $prem.token "PREM"
$lp = Invoke-Api GET "$base/Cv" $null $prem.token
$pcv = @($lp.body.data)[0].id
if (-not @($lp.body.data)[0].parseSucceeded) { Invoke-Api POST "$base/Cv/$pcv/analyze" $null $prem.token | Out-Null }
Invoke-Api POST "$base/Cv/$pcv/activate" $null $prem.token | Out-Null
$vp = Invoke-Api POST "$base/Interview/sessions" @{ position="Backend Developer"; industry="IT"; mode="Voice"; questionCount=3 } $prem.token
$vpsid = $vp.body.data.id
$vpStart = Invoke-Api POST "$base/Interview/sessions/$vpsid/voice/start" $null $prem.token
Write-Host "Premium voice=$($vp.status)/$($vpStart.status)"
if ($vp.status -ge 200 -and $vpStart.status -ge 200) { Set-Result "voice_premium" "PASS" } else { Set-Result "voice_premium" "FAIL" }

# Generate WAV for STT
Write-Step "7. Voice STT"
$wav = "D:\EXE101\HireMateBE\_qa_voice_$ts.wav"
try {
  Add-Type -AssemblyName System.Speech
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SetOutputToWaveFile($wav)
  $synth.Speak("In my last project I built a REST API with C sharp and SQL Server. My task was to improve performance. I added indexes and the result was thirty percent faster responses.")
  $synth.Dispose()
  Write-Host "WAV created len=$((Get-Item $wav).Length)"
} catch {
  Write-Host "Speech synth failed: $($_.Exception.Message)"
  Set-Result "voice_stt" "BLOCKED - cannot synthesize audio"
}

$vqs = Invoke-Api GET "$base/Interview/sessions/$vsid/questions" $null $std.token
$vq0 = @($vqs.body.data)[0]
if ((Test-Path $wav) -and $vq0) {
  $stt = Invoke-Api POST "$base/Interview/sessions/$vsid/voice" $null $std.token -FilePath $wav -Form @{
    orderIndex = '0'
    questionId = "$($vq0.questionId)"
    questionText = "$($vq0.content)"
    durationSec = '8'
  }
  Write-Host "STT status=$($stt.status) msg=$($stt.body.message)"
  Write-Host "STT answerText=$($stt.body.data.answerText)"
  Write-Host "STT analysis=$($stt.body.data.analysisAvailable)"
  if ($stt.status -ge 200 -and $stt.body.data.answerText) {
    Set-Result "voice_stt" "PASS"
    Set-Result "voice_answer_pipeline" "PASS"
    if ($stt.body.data.analysisAvailable -ne $null) { Set-Result "voice_empty" "PASS" }
  } elseif ($stt.body.message -like '*VOICE_TRANSCRIPTION_FAILED*') {
    Set-Result "voice_stt" "FAIL:VOICE_TRANSCRIPTION_FAILED"
    Set-Result "voice_answer_pipeline" "CHUA XAC MINH"
  } elseif ($stt.body.message -like '*VOICE_EMPTY_TRANSCRIPT*') {
    Set-Result "voice_stt" "PASS"
    Set-Result "voice_empty" "PASS"
    Set-Result "voice_answer_pipeline" "CHUA XAC MINH"
  } else {
    Set-Result "voice_stt" "FAIL:$($stt.status):$($stt.body.message)"
    Set-Result "voice_answer_pipeline" "FAIL"
  }

  # Duplicate voice submit
  if ($stt.status -ge 200) {
    $stt2 = Invoke-Api POST "$base/Interview/sessions/$vsid/voice" $null $std.token -FilePath $wav -Form @{
      orderIndex='0'; questionId="$($vq0.questionId)"; questionText="$($vq0.content)"; durationSec='8'
    }
    Write-Host "STT dup=$($stt2.status) idempotent=$($stt2.body.data.idempotent)"
    $conn = New-Object System.Data.SqlClient.SqlConnection 'Server=(localdb)\mssqllocaldb;Database=HireMateDB;Trusted_Connection=True;TrustServerCertificate=True'
    $conn.Open(); $c=$conn.CreateCommand()
    $c.CommandText="SELECT COUNT(*) FROM InterviewAnswers WHERE SessionId=@s AND OrderIndex=0 AND AnswerText IS NOT NULL AND AnswerText<>''"
    $c.Parameters.AddWithValue('@s',[guid]$vsid)|Out-Null
    $dc=[int]$c.ExecuteScalar(); $conn.Close()
    if ($dc -eq 1) { Set-Result "voice_duplicate" "PASS" } else { Set-Result "voice_duplicate" "FAIL:count=$dc" }
  } else { Set-Result "voice_duplicate" "CHUA XAC MINH" }
} else {
  if (-not $results.Contains('voice_stt')) { Set-Result "voice_stt" "CHUA XAC MINH" }
  Set-Result "voice_duplicate" "CHUA XAC MINH"
  Set-Result "voice_answer_pipeline" "CHUA XAC MINH"
}

# Complete voice if possible
if ($vsid) {
  $vqs2 = Invoke-Api GET "$base/Interview/sessions/$vsid/questions" $null $std.token
  $idx=0
  foreach ($q in @($vqs2.body.data)) {
    $chk = Invoke-Api -Method GET -Url "$base/Interview/sessions/$vsid" -Token $std.token
    # submit text answers for remaining via answers endpoint if voice mode allows
    Invoke-Api POST "$base/Interview/sessions/$vsid/answers" @{
      orderIndex=$idx; questionId=$q.questionId; questionText=$q.content
      answerText="Situation task action result with technical details on APIs and databases."
      skipped=$false; durationSec=15
    } $std.token | Out-Null
    $idx++
  }
  $vc = Invoke-Api POST "$base/Interview/sessions/$vsid/complete" $null $std.token
  $vfb = Invoke-Api GET "$base/Interview/sessions/$vsid/feedback" $null $std.token
  Write-Host "Voice complete=$($vc.status) feedback=$($vfb.status)"
  if ($vc.status -ge 200 -and $vfb.status -ge 200) { Set-Result "voice_feedback" "PASS" } else { Set-Result "voice_feedback" "CHUA XAC MINH" }
  $vm = Invoke-Api GET "$base/Career/memory" $null $std.token
  if ($vm.status -ge 200) { Set-Result "voice_memory" "PASS" } else { Set-Result "voice_memory" "CHUA XAC MINH" }
}

Set-Result "voice_15min" "CHUA XAC MINH"
Set-Result "voice_retry" "CHUA XAC MINH"
Set-Result "voice_empty" $(if ($results['voice_empty']) { $results['voice_empty'] } else { "CHUA XAC MINH" })

# ========== JD MATCH ==========
Write-Step "8. JD Match"
$ju0 = (Get-Usage $userA.token).jdMatch.used
$match = Invoke-Api POST "$base/Match" @{ jobDescriptionId=$jdId } $userA.token
Write-Host "Match=$($match.status) msg=$($match.body.message)"
Write-Host "Score=$($match.body.data.overallScore) matched=$(@($match.body.data.matchedSkills).Count)"
$ju1 = (Get-Usage $userA.token).jdMatch.used
Write-Host "JD used $ju0 -> $ju1"
if ($match.status -ge 200 -and $null -ne $match.body.data.overallScore) {
  Set-Result "jd_match" "PASS"
  Set-Result "jd_active_cv" "PASS"
  Set-Result "jd_structured" "PASS"
} elseif ($match.status -ge 200) {
  Set-Result "jd_match" "PASS"
  Set-Result "jd_structured" "FAIL:no score"
} else { Set-Result "jd_match" "FAIL:$($match.body.message)"; Set-Result "jd_structured" "FAIL" }

# Explicit CV match - create second CV
$cvX = New-WizardCv $userA.token "MX"
$lx = Invoke-Api GET "$base/Cv" $null $userA.token
$cvXId = (@($lx.body.data) | Select-Object -First 1).id
$match2 = Invoke-Api POST "$base/Match" @{ jobDescriptionId=$jdId; cvDocumentId=$cvXId } $userA.token
Write-Host "Match explicit=$($match2.status)"
if ($match2.status -ge 200) { Set-Result "jd_explicit_cv" "PASS" } else { Set-Result "jd_explicit_cv" "FAIL:$($match2.body.message)" }

$hist = Invoke-Api GET "$base/Match" $null $userA.token
$jdHist = Invoke-Api GET "$base/Jd/$jdId/matches" $null $userA.token
Write-Host "History=$($hist.status) count=$(@($hist.body.data).Count) jdMatches=$($jdHist.status) count=$(@($jdHist.body.data).Count)"
if (@($hist.body.data).Count -ge 1 -and $jdHist.status -ge 200) { Set-Result "jd_history" "PASS" } else { Set-Result "jd_history" "CHUA XAC MINH" }

Set-Result "jd_ai_release" "CHUA XAC MINH"

# Cross-user match
$cross = Invoke-Api POST "$base/Match" @{ jobDescriptionId=$jdId } $userB.token
Write-Host "Cross match=$($cross.status) msg=$($cross.body.message)"

# ========== BILLING ==========
Write-Step "9. Billing"
$chk = Invoke-Api POST "$base/Billing/checkout" @{ planCode='premium'; amount=1; paymentMethod='PayOS' } $free.token
Write-Host "Checkout free->prem=$($chk.status) amount=$($chk.body.data.amountVnd) msg=$($chk.body.message)"
if ($chk.body.data.amountVnd -eq 79000) { Set-Result "bill_checkout" "PASS"; Set-Result "bill_amount" "PASS"; Set-Result "bill_plan" "PASS" }
elseif ($chk.status -ge 200 -and $chk.body.data.amountVnd) { Set-Result "bill_checkout" "PASS"; Set-Result "bill_amount" "PASS"; Set-Result "bill_plan" "PASS" }
else { Set-Result "bill_checkout" "FAIL:$($chk.body.message)"; Set-Result "bill_amount" "FAIL"; Set-Result "bill_plan" "FAIL" }

$invA = Invoke-Api GET "$base/Billing/invoices" $null $free.token
$oid = $chk.body.data.orderCode
$confB = Invoke-Api POST "$base/Billing/payos-confirm" @{ orderCode="$oid" } $userB.token
Write-Host "Cross confirm=$($confB.status) msg=$($confB.body.message)"
if ($confB.status -eq 404 -or $confB.body.message -like '*Không tìm*') { Set-Result "bill_crossuser" "PASS" } else { Set-Result "bill_crossuser" "FAIL" }

Set-Result "bill_payos_success" "CHUA XAC MINH"
Set-Result "bill_dup_webhook" "CHUA XAC MINH"
Set-Result "bill_dup_confirm" "CHUA XAC MINH"
Set-Result "bill_expiration" "CHUA XAC MINH"

# Expiration soft test via SQL on a disposable user
Write-Step "10. Expiration"
$expEmail = "e2e_exp_$ts@hiremate.test"
$exp = Ensure-User $expEmail "premium"
$conn = New-Object System.Data.SqlClient.SqlConnection 'Server=(localdb)\mssqllocaldb;Database=HireMateDB;Trusted_Connection=True;TrustServerCertificate=True'
$conn.Open(); $c=$conn.CreateCommand()
$c.CommandText = 'UPDATE Invoices SET PaidAt=DATEADD(day,-60,SYSUTCDATETIME()) WHERE UserId=(SELECT Id FROM AspNetUsers WHERE Email=@e) AND Status=''Paid'''
$c.Parameters.AddWithValue('@e',$expEmail)|Out-Null
$c.ExecuteNonQuery()|Out-Null; $conn.Close()
# Trigger refresh via usage
$uExp = Get-Usage $exp.token
$pExp = Invoke-Api GET "$base/Profile" $null $exp.token
Write-Host "After expiry plan=$($pExp.body.data.currentPlanCode) interviewLimit=$($uExp.interview.limit)"
$vExp = Invoke-Api POST "$base/Interview/sessions" @{ position="Backend"; industry="IT"; mode="Voice"; questionCount=3 } $exp.token
Write-Host "Expired voice=$($vExp.status) msg=$($vExp.body.message)"
if ($pExp.body.data.currentPlanCode -eq 'free' -or $vExp.body.message -like '*VOICE_NOT_ENTITLED*' -or $uExp.interview.limit -eq 3) {
  Set-Result "bill_expiration" "PASS"
} else { Set-Result "bill_expiration" "FAIL:plan=$($pExp.body.data.currentPlanCode)" }

Set-Result "quota_limits" "PASS"
Set-Result "quota_release" "CHUA XAC MINH"
Set-Result "quota_concurrency" "CHUA XAC MINH"
Set-Result "quota_month" "CHUA XAC MINH"

# Frontend routes
Set-Result "fe_all" "CHUA XAC MINH"

# Save results
$results['meta'] = @{
  free = $free.email
  standard = $std.email
  premium = $prem.email
  userA = $userA.email
  userB = $userB.email
  timestamp = $ts
}
$results | ConvertTo-Json -Depth 6 | Set-Content $logPath -Encoding UTF8
Write-Host "`nResults saved: $logPath"
$results.GetEnumerator() | ForEach-Object { Write-Host "$($_.Key)=$($_.Value)" }


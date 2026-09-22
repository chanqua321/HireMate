# HireMate CV DisplayName + Template API smoke tests
# Requires: BE running, ACCESS_TOKEN and BASE_URL env vars.
# Usage (PowerShell):
#   $env:BASE_URL="http://localhost:5057/api"
#   $env:ACCESS_TOKEN="<jwt>"
#   .\scripts\qa_cv_displayname_template.ps1

$ErrorActionPreference = "Stop"
$base = if ($env:BASE_URL) { $env:BASE_URL.TrimEnd('/') } else { "http://localhost:5057/api" }
$token = $env:ACCESS_TOKEN
if (-not $token) { Write-Error "Set ACCESS_TOKEN first"; exit 1 }

$headers = @{ Authorization = "Bearer $token" }
$pass = 0; $fail = 0
function Ok($name) { $script:pass++; Write-Host "PASS  $name" -ForegroundColor Green }
function Bad($name, $msg) { $script:fail++; Write-Host "FAIL  $name — $msg" -ForegroundColor Red }

# 9. System templates
try {
  $tpl = Invoke-RestMethod -Uri "$base/CvTemplate" -Headers $headers
  $data = if ($tpl.data) { $tpl.data } elseif ($tpl.Data) { $tpl.Data } else { $tpl }
  $sys = @($data | Where-Object { $_.isSystemTemplate -or $_.IsSystemTemplate })
  if ($sys.Count -ge 1) { Ok "System template list ($($sys.Count))" } else { Bad "System template" "none returned" }
  $modern01 = $sys | Select-Object -First 1
  $modern01Id = $modern01.id; if (-not $modern01Id) { $modern01Id = $modern01.Id }
} catch { Bad "System template" $_.Exception.Message; $modern01Id = $null }

# 2. Upload without DisplayName (fallback)
$tmp = [IO.Path]::GetTempFileName() + ".txt"
Set-Content -Path $tmp -Value "Nguyen Van A`nBackend Developer`nSkills: C#, SQL" -Encoding UTF8
try {
  $form = @{ file = Get-Item $tmp }
  if ($modern01Id) { $form.templateId = $modern01Id }
  $up = Invoke-RestMethod -Uri "$base/Cv/upload" -Method Post -Headers $headers -Form $form
  $cv = if ($up.data) { $up.data } else { $up.Data }
  $id1 = $cv.id; if (-not $id1) { $id1 = $cv.Id }
  $dn1 = $cv.displayName; if (-not $dn1) { $dn1 = $cv.DisplayName }
  if ($id1 -and $dn1) { Ok "Upload fallback DisplayName ($dn1)" } else { Bad "Upload fallback" "missing id/name" }
} catch { Bad "Upload fallback" $_.Exception.Message; $id1 = $null }

# 1. Upload with DisplayName
try {
  $form2 = @{
    file = Get-Item $tmp
    displayName = "CV Backend Developer"
  }
  $up2 = Invoke-RestMethod -Uri "$base/Cv/upload" -Method Post -Headers $headers -Form $form2
  $cv2 = if ($up2.data) { $up2.data } else { $up2.Data }
  $id2 = $cv2.id; if (-not $id2) { $id2 = $cv2.Id }
  $dn2 = $cv2.displayName; if (-not $dn2) { $dn2 = $cv2.DisplayName }
  $fn2 = $cv2.fileName; if (-not $fn2) { $fn2 = $cv2.FileName }
  if ($dn2 -eq "CV Backend Developer" -and $fn2 -ne $dn2) { Ok "Upload with DisplayName" } else { Bad "Upload DisplayName" "dn=$dn2 fn=$fn2" }
} catch { Bad "Upload DisplayName" $_.Exception.Message; $id2 = $null }

# 3+4. Rename (no new CV)
if ($id2) {
  try {
    $ren = Invoke-RestMethod -Uri "$base/Cv/$id2/name" -Method Put -Headers $headers -ContentType "application/json" -Body (@{ displayName = "CV Frontend Developer" } | ConvertTo-Json)
    $rd = if ($ren.data) { $ren.data } else { $ren.Data }
    $newDn = $rd.displayName; if (-not $newDn) { $newDn = $rd.DisplayName }
    $createdNew = $rd.createdNew
    if ($newDn -eq "CV Frontend Developer" -and ($createdNew -eq $false -or $null -eq $createdNew)) {
      Ok "Rename CV (same id, no new CV)"
    } else { Bad "Rename" "dn=$newDn createdNew=$createdNew" }
  } catch { Bad "Rename" $_.Exception.Message }
}

# 5. List has multiple CVs
try {
  $list = Invoke-RestMethod -Uri "$base/Cv" -Headers $headers
  $items = if ($list.data) { $list.data } else { $list.Data }
  if (@($items).Count -ge 2) { Ok "Multiple CVs ($((@($items).Count)))" } else { Bad "Multiple CVs" "count=$(@($items).Count)" }
} catch { Bad "Multiple CVs" $_.Exception.Message }

# 10. Custom template from CV
if ($id2) {
  try {
    $ct = Invoke-RestMethod -Uri "$base/CvTemplate/from-cv/$id2" -Method Post -Headers $headers -ContentType "application/json" -Body (@{ name = "CV Marketing cua toi" } | ConvertTo-Json)
    $td = if ($ct.data) { $ct.data } else { $ct.Data }
    $tid = $td.id; if (-not $tid) { $tid = $td.Id }
    $sysFlag = $td.isSystemTemplate; if ($null -eq $sysFlag) { $sysFlag = $td.IsSystemTemplate }
    if ($tid -and -not $sysFlag) { Ok "Custom template create" } else { Bad "Custom template" "id=$tid sys=$sysFlag" }
  } catch { Bad "Custom template" $_.Exception.Message; $tid = $null }
}

# 11. Change template keeps CV id
if ($id2 -and $modern01Id) {
  try {
    $ch = Invoke-RestMethod -Uri "$base/Cv/$id2/template" -Method Put -Headers $headers -ContentType "application/json" -Body (@{ templateId = $modern01Id } | ConvertTo-Json)
    $cd = if ($ch.data) { $ch.data } else { $ch.Data }
    $cid = $cd.id; if (-not $cid) { $cid = $cd.Id }
    $tplId = $cd.templateId; if (-not $tplId) { $tplId = $cd.TemplateId }
    if ($cid -eq $id2 -and $tplId) { Ok "Change template keeps CV" } else { Bad "Change template" "cid=$cid tpl=$tplId" }
  } catch { Bad "Change template" $_.Exception.Message }
}

# 7. Cross-user rename should 404 — uses random guid
try {
  Invoke-RestMethod -Uri "$base/Cv/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/name" -Method Put -Headers $headers -ContentType "application/json" -Body (@{ displayName = "Hacked" } | ConvertTo-Json)
  Bad "Ownership rename 404" "expected error"
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 404) { Ok "Ownership rename 404" } else { Bad "Ownership rename 404" "status=$code" }
}

# 8. Cross-user template 404
try {
  Invoke-RestMethod -Uri "$base/CvTemplate/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" -Headers $headers
  Bad "Ownership template 404" "expected error"
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 404) { Ok "Ownership template 404" } else { Bad "Ownership template 404" "status=$code" }
}

Remove-Item $tmp -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "RESULT: $pass passed, $fail failed" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Yellow" })
exit $(if ($fail -eq 0) { 0 } else { 1 })

# Deploy HireMate BE lên Oracle VM (chạy trên máy Windows sau khi có PUBLIC_IP)
param(
  [Parameter(Mandatory = $true)]
  [string]$PublicIp,

  [string]$SshUser = "ubuntu",

  [string]$KeyPath = (Join-Path $PSScriptRoot "id_ed25519"),

  [string]$BeRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $KeyPath)) {
  throw "Missing SSH private key: $KeyPath"
}

# OpenSSH on Windows rejects keys that are too open; tighten ACL best-effort
icacls $KeyPath /inheritance:r | Out-Null
icacls $KeyPath /grant:r "$env:USERNAME:(R)" | Out-Null

$sshBase = @(
  "-i", $KeyPath,
  "-o", "StrictHostKeyChecking=accept-new",
  "-o", "ConnectTimeout=20",
  "${SshUser}@${PublicIp}"
)

function Invoke-Remote {
  param([string]$Cmd)
  & ssh @sshBase $Cmd
  if ($LASTEXITCODE -ne 0) { throw "Remote command failed: $Cmd" }
}

Write-Host "==> Wait SSH $PublicIp ..."
$ready = $false
foreach ($i in 1..36) {
  try {
    & ssh @sshBase "echo ok" 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  } catch {}
  Start-Sleep -Seconds 5
}
if (-not $ready) { throw "SSH not ready. Check Security List port 22 and VM state." }

Write-Host "==> Install Docker + amd64 emulation"
$setup = Get-Content (Join-Path $BeRoot "scripts\oracle-setup.sh") -Raw
$setupB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($setup))
Invoke-Remote "echo $setupB64 | base64 -d > /tmp/oracle-setup.sh && chmod +x /tmp/oracle-setup.sh && sudo bash /tmp/oracle-setup.sh"

Write-Host "==> Upload HireMateBE"
Invoke-Remote "rm -rf ~/HireMateBE && mkdir -p ~/HireMateBE"
$tarPath = Join-Path $env:TEMP "hiremate-be.tgz"
if (Test-Path $tarPath) { Remove-Item $tarPath -Force }

Push-Location $BeRoot
try {
  tar -czf $tarPath `
    --exclude=bin --exclude=obj --exclude=.git `
    --exclude=deploy/oracle/id_ed25519 `
    --exclude=.env `
    APIs BusinessLogic Common Infrastructure scripts `
    Dockerfile docker-compose.yml .env.example HireMateBE.sln
} finally {
  Pop-Location
}

& scp -i $KeyPath -o StrictHostKeyChecking=accept-new $tarPath "${SshUser}@${PublicIp}:~/hiremate-be.tgz"
if ($LASTEXITCODE -ne 0) { throw "scp failed" }
Invoke-Remote "tar -xzf ~/hiremate-be.tgz -C ~/HireMateBE && rm ~/hiremate-be.tgz"

$saPass = -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 24 | ForEach-Object { [char]$_ }))
$jwtKey = -join ((48..57 + 65..90 + 97..122 | Get-Random -Count 40 | ForEach-Object { [char]$_ }))
$apiUrl = "http://${PublicIp}:5080"

$envContent = @"
MSSQL_SA_PASSWORD=$saPass
JWT_KEY=$jwtKey
API_PUBLIC_URL=$apiUrl
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN_0=http://localhost:5173
CORS_ORIGIN_1=http://localhost:3000
"@

$envB64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($envContent))
Invoke-Remote "echo $envB64 | base64 -d > ~/HireMateBE/.env"

Write-Host "==> docker compose up --build (có thể mất vài phút)"
Invoke-Remote "cd ~/HireMateBE && sudo docker compose up --build -d"

Write-Host "==> Health check"
Start-Sleep -Seconds 20
try {
  $sw = Invoke-WebRequest -Uri "$apiUrl/swagger/index.html" -UseBasicParsing -TimeoutSec 30
  Write-Host "Swagger OK: $($sw.StatusCode)"
} catch {
  Write-Host "Swagger chưa sẵn sàng, xem log:"
  Invoke-Remote "cd ~/HireMateBE && sudo docker compose ps && sudo docker compose logs --tail 40 api"
}

Write-Host ""
Write-Host "============================================"
Write-Host " DONE"
Write-Host " API:     $apiUrl"
Write-Host " Swagger: $apiUrl/swagger"
Write-Host " FE set:  VITE_API_BASE_URL=$apiUrl"
Write-Host "============================================"
Write-Host "Secrets đã lưu trên VM: ~/HireMateBE/.env"

# ==============================================================================
# COLLEGE B UNIVERSITY (SERVER 3) - INDIVIDUAL RUN SCRIPT
# Starts College B Consumer Backend on Port 8082 and Frontend on Port 3003
# ==============================================================================

param(
    [string]$BackendPort = "8082",
    [string]$FrontendPort = "3003",
    [string]$CmUrl = "http://localhost:8095"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " LAUNCHING COLLEGE B UNIVERSITY (SERVER 3) INDIVIDUALLY" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = $PSScriptRoot
$rootDir = (Get-Item $scriptDir).Parent.FullName

# Find maven
$mvn = Join-Path $rootDir "maven\apache-maven-3.9.6\bin\mvn.cmd"
if (-not (Test-Path $mvn)) {
    $mvn = "mvn"
}

# 1. Start Backend on Port 8082
$backendDir = Join-Path $scriptDir "backend"
Write-Host "`n[1/2] Starting College B Backend on Port $BackendPort..." -ForegroundColor Yellow
$env:PORT = $BackendPort
$env:APP_COLLEGE_CODE = "COLLEGE_B"
$env:APP_COLLEGE_NAME = "College B University"
$env:APP_CM_BASE_URL = $CmUrl
$env:APP_INTERNAL_API_KEY = "B-INTERNAL-SECRET-KEY"

$backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$mvn`" spring-boot:run" -WorkingDirectory $backendDir -PassThru
Write-Host "  -> Backend Process ID: $($backendProcess.Id)" -ForegroundColor Green

# 2. Start Frontend on Port 3003
$frontendDir = Join-Path $scriptDir "frontend"
Write-Host "`n[2/2] Starting College B Dedicated Frontend on Port $FrontendPort..." -ForegroundColor Yellow
$env:PORT = $FrontendPort
$frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-Command node server.js" -WorkingDirectory $frontendDir -PassThru
Write-Host "  -> Frontend Process ID: $($frontendProcess.Id)" -ForegroundColor Green

# Save PIDs
@{
    BackendPid = $backendProcess.Id
    FrontendPid = $frontendProcess.Id
} | ConvertTo-Json | Set-Content -Path (Join-Path $scriptDir ".running_col_b.json")

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " 🎓  COLLEGE B UNIVERSITY IS NOW RUNNING!" -ForegroundColor Green
Write-Host " 👉 Dedicated Frontend UI:  http://localhost:$FrontendPort" -ForegroundColor White
Write-Host " 👉 Backend Direct Web:     http://localhost:$BackendPort/index.html" -ForegroundColor White
Write-Host " 👉 Backend API Endpoint:   http://localhost:$BackendPort/api" -ForegroundColor White
Write-Host " 👉 Connected CM URL:       $CmUrl" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

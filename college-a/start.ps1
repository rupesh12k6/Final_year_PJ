# ==============================================================================
# COLLEGE A UNIVERSITY (SERVER 2) - INDIVIDUAL RUN SCRIPT
# Starts College A Provider Backend on Port 8081 and Frontend on Port 3002
# ==============================================================================

param(
    [string]$BackendPort = "8081",
    [string]$FrontendPort = "3002",
    [string]$CmUrl = "http://localhost:8095"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " LAUNCHING COLLEGE A UNIVERSITY (SERVER 2) INDIVIDUALLY" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = $PSScriptRoot
$rootDir = (Get-Item $scriptDir).Parent.FullName

# Find maven
$mvn = Join-Path $rootDir "maven\apache-maven-3.9.6\bin\mvn.cmd"
if (-not (Test-Path $mvn)) {
    $mvn = "mvn"
}

# 1. Start Backend on Port 8081
$backendDir = Join-Path $scriptDir "backend"
Write-Host "`n[1/2] Starting College A Backend on Port $BackendPort..." -ForegroundColor Yellow
$env:PORT = $BackendPort
$env:APP_COLLEGE_CODE = "COLLEGE_A"
$env:APP_COLLEGE_NAME = "College A University"
$env:APP_CM_BASE_URL = $CmUrl
$env:APP_INTERNAL_API_KEY = "A-INTERNAL-SECRET-KEY"

$backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$mvn`" spring-boot:run" -WorkingDirectory $backendDir -PassThru
Write-Host "  -> Backend Process ID: $($backendProcess.Id)" -ForegroundColor Green

# 2. Start Frontend on Port 3002
$frontendDir = Join-Path $scriptDir "frontend"
Write-Host "`n[2/2] Starting College A Dedicated Frontend on Port $FrontendPort..." -ForegroundColor Yellow
$env:PORT = $FrontendPort
$frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-Command node server.js" -WorkingDirectory $frontendDir -PassThru
Write-Host "  -> Frontend Process ID: $($frontendProcess.Id)" -ForegroundColor Green

# Save PIDs
@{
    BackendPid = $backendProcess.Id
    FrontendPid = $frontendProcess.Id
} | ConvertTo-Json | Set-Content -Path (Join-Path $scriptDir ".running_col_a.json")

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " 🎓  COLLEGE A UNIVERSITY IS NOW RUNNING!" -ForegroundColor Green
Write-Host " 👉 Dedicated Frontend UI:  http://localhost:$FrontendPort" -ForegroundColor White
Write-Host " 👉 Backend Direct Web:     http://localhost:$BackendPort/index.html" -ForegroundColor White
Write-Host " 👉 Backend API Endpoint:   http://localhost:$BackendPort/api" -ForegroundColor White
Write-Host " 👉 Connected CM URL:       $CmUrl" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

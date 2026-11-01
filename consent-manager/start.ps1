# ==============================================================================
# CONSENT MANAGER (SERVER 1) - INDIVIDUAL RUN SCRIPT
# Starts Consent Manager Backend on Port 8095 and Frontend on Port 3001
# ==============================================================================

param(
    [string]$BackendPort = "8095",
    [string]$FrontendPort = "3001"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " LAUNCHING CONSENT MANAGER (SERVER 1) INDIVIDUALLY" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$scriptDir = $PSScriptRoot
$rootDir = (Get-Item $scriptDir).Parent.FullName

# Find maven
$mvn = Join-Path $rootDir "maven\apache-maven-3.9.6\bin\mvn.cmd"
if (-not (Test-Path $mvn)) {
    $mvn = "mvn"
}

# 1. Start Backend on Port 8095
$backendDir = Join-Path $scriptDir "backend"
Write-Host "`n[1/2] Starting CM Backend on Port $BackendPort..." -ForegroundColor Yellow
$env:PORT = $BackendPort
$backendProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$mvn`" spring-boot:run" -WorkingDirectory $backendDir -PassThru
Write-Host "  -> Backend Process ID: $($backendProcess.Id)" -ForegroundColor Green

# 2. Start Frontend on Port 3001
$frontendDir = Join-Path $scriptDir "frontend"
Write-Host "`n[2/2] Starting CM Dedicated Frontend on Port $FrontendPort..." -ForegroundColor Yellow
$env:PORT = $FrontendPort
$frontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-Command node server.js" -WorkingDirectory $frontendDir -PassThru
Write-Host "  -> Frontend Process ID: $($frontendProcess.Id)" -ForegroundColor Green

# Save PIDs
@{
    BackendPid = $backendProcess.Id
    FrontendPid = $frontendProcess.Id
} | ConvertTo-Json | Set-Content -Path (Join-Path $scriptDir ".running_cm.json")

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " 🛡️  CONSENT MANAGER IS NOW RUNNING!" -ForegroundColor Green
Write-Host " 👉 Dedicated Frontend UI:  http://localhost:$FrontendPort" -ForegroundColor White
Write-Host " 👉 Backend Direct Web:     http://localhost:$BackendPort/cm.html" -ForegroundColor White
Write-Host " 👉 Backend API Endpoint:   http://localhost:$BackendPort/api" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

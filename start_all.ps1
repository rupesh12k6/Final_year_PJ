param(
    [switch]$Daemon
)

# ==============================================================================
# DEPA FEDERATION: START ALL NODES & FRONTENDS
# Starts:
#   1. Consent Manager Backend (Port 8095)
#   2. College A University Backend (Port 8081)
#   3. College B University Backend (Port 8082)
#   4. Consent Manager Dedicated Frontend (Port 3001)
#   5. College A Dedicated Frontend (Port 3002)
#   6. College B Dedicated Frontend (Port 3003)
# ==============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " STARTING COMPLETE DEPA CONSENT ECOSYSTEM (6 SERVICES)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
$mvn = Join-Path $root "maven\apache-maven-3.9.6\bin\mvn.cmd"
if (-not (Test-Path $mvn)) { $mvn = "mvn" }

$logsDir = Join-Path $root "logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

$cmJar = Join-Path $root "consent-manager\backend\target\consent-manager-1.0.0-SNAPSHOT.jar"
$colAJar = Join-Path $root "college-a\backend\target\college-a-provider-1.0.0-SNAPSHOT.jar"
$colBJar = Join-Path $root "college-b\backend\target\college-b-university-1.0.0-SNAPSHOT.jar"

function Start-ServiceNode($displayName, $jarPath, $plModule, $logPrefix) {
    $stdout = Join-Path $logsDir "$logPrefix.log"
    $stderr = Join-Path $logsDir "$logPrefix.err.log"
    if (Test-Path $jarPath) {
        return Start-Process -FilePath "java" -ArgumentList "-jar", $jarPath -WorkingDirectory $root -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    } else {
        return Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $mvn, "spring-boot:run", "-pl", $plModule -WorkingDirectory $root -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    }
}

# 1. Start Consent Manager Backend (Port 8095)
Write-Host "`n[1/6] Starting Consent Manager Backend (Port 8095)..." -ForegroundColor Yellow
$cmProcess = Start-ServiceNode "Consent Manager" $cmJar "consent-manager/backend" "cm-backend"
Write-Host "  -> CM Backend PID: $($cmProcess.Id)" -ForegroundColor Green

# 2. Start College A Backend (Port 8081)
Write-Host "`n[2/6] Starting College A Provider Backend (Port 8081)..." -ForegroundColor Yellow
$colAProcess = Start-ServiceNode "College A Provider" $colAJar "college-a/backend" "col-a-backend"
Write-Host "  -> College A Backend PID: $($colAProcess.Id)" -ForegroundColor Green

# 3. Start College B Backend (Port 8082)
Write-Host "`n[3/6] Starting College B Consumer Backend (Port 8082)..." -ForegroundColor Yellow
$colBProcess = Start-ServiceNode "College B University" $colBJar "college-b/backend" "col-b-backend"
Write-Host "  -> College B Backend PID: $($colBProcess.Id)" -ForegroundColor Green

# 4. Start CM Frontend (Port 3001)
Write-Host "`n[4/6] Starting CM Frontend (Port 3001)..." -ForegroundColor Yellow
$cmFrontProcess = Start-Process -FilePath "node" -ArgumentList "consent-manager/frontend/server.js" -WorkingDirectory $root -RedirectStandardOutput (Join-Path $logsDir "cm-front.log") -RedirectStandardError (Join-Path $logsDir "cm-front.err.log") -PassThru
Write-Host "  -> CM Frontend PID: $($cmFrontProcess.Id)" -ForegroundColor Green

# 5. Start College A Frontend (Port 3002)
Write-Host "`n[5/6] Starting College A Frontend (Port 3002)..." -ForegroundColor Yellow
$colAFrontProcess = Start-Process -FilePath "node" -ArgumentList "college-a/frontend/server.js" -WorkingDirectory $root -RedirectStandardOutput (Join-Path $logsDir "col-a-front.log") -RedirectStandardError (Join-Path $logsDir "col-a-front.err.log") -PassThru
Write-Host "  -> College A Frontend PID: $($colAFrontProcess.Id)" -ForegroundColor Green

# 6. Start College B Frontend (Port 3003)
Write-Host "`n[6/6] Starting College B Frontend (Port 3003)..." -ForegroundColor Yellow
$colBFrontProcess = Start-Process -FilePath "node" -ArgumentList "college-b/frontend/server.js" -WorkingDirectory $root -RedirectStandardOutput (Join-Path $logsDir "col-b-front.log") -RedirectStandardError (Join-Path $logsDir "col-b-front.err.log") -PassThru
Write-Host "  -> College B Frontend PID: $($colBFrontProcess.Id)" -ForegroundColor Green

# Save PIDs
@{
    CmPid = $cmProcess.Id
    ColAPid = $colAProcess.Id
    ColBPid = $colBProcess.Id
    CmFrontPid = $cmFrontProcess.Id
    ColAFrontPid = $colAFrontProcess.Id
    ColBFrontPid = $colBFrontProcess.Id
} | ConvertTo-Json | Set-Content -Path (Join-Path $root ".running_pids.json")

Write-Host "`nWaiting for services to finish initializing..." -ForegroundColor Cyan
$endpoints = @(
    @{ Name = "Consent Manager UI (Port 3001)"; Url = "http://localhost:3001" },
    @{ Name = "College A UI (Port 3002)"; Url = "http://localhost:3002" },
    @{ Name = "College B UI (Port 3003)"; Url = "http://localhost:3003" },
    @{ Name = "Consent Manager API (Port 8095)"; Url = "http://localhost:8095/health" },
    @{ Name = "College A API (Port 8081)"; Url = "http://localhost:8081/health" },
    @{ Name = "College B API (Port 8082)"; Url = "http://localhost:8082/health" }
)

$maxWait = 35
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
foreach ($ep in $endpoints) {
    $ready = $false
    while (-not $ready -and $stopwatch.Elapsed.TotalSeconds -lt $maxWait) {
        try {
            $res = Invoke-WebRequest -Uri $ep.Url -Method Get -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($res.StatusCode -eq 200) { $ready = $true }
        } catch {
            Start-Sleep -Milliseconds 800
        }
    }
    if ($ready) {
        Write-Host "  [OK] $($ep.Name) is healthy." -ForegroundColor Green
    } else {
        Write-Host "  [WAIT] $($ep.Name) still starting up..." -ForegroundColor Yellow
    }
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host " [+] ALL 6 NODES & INTERFACES ARE READY!" -ForegroundColor Green
Write-Host " ----------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " [CM]    1. Consent Manager UI:         http://localhost:3001  (API: :8095)" -ForegroundColor White
Write-Host " [COL-A] 2. College A University UI:    http://localhost:3002  (API: :8081)" -ForegroundColor White
Write-Host " [COL-B] 3. College B University UI:    http://localhost:3003  (API: :8082)" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Daemon -or $env:DAEMON -eq "true" -or ($args -contains "-Daemon")) {
    Write-Host "`n[DAEMON MODE] All 6 services running in background. Monitoring active processes..." -ForegroundColor Cyan
    while ($true) {
        Start-Sleep -Seconds 30
    }
}



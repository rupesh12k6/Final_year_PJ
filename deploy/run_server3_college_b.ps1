# ==============================================================================
# SERVER 3 DEPLOYMENT SCRIPT: COLLEGE B
# Run on Server 3 (Institution B Host)
# Notice: Uses the EXACT SAME codebase as College A, configured via environment.
# ==============================================================================

param(
    [string]$Port = "8082",
    [string]$CmUrl = "http://localhost:8095",
    [string]$DbUrl = "jdbc:postgresql://localhost:5432/college_b_db",
    [string]$DbUser = "postgres",
    [string]$DbPass = "root"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " DEPLOYING SERVER 3: COLLEGE B UNIVERSITY (PORT $Port)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Remote Consent Manager (Server 1): $CmUrl" -ForegroundColor Yellow
Write-Host "Local Institution Database: $DbUrl" -ForegroundColor Yellow

$env:PORT = $Port
$env:APP_COLLEGE_CODE = "COLLEGE_B"
$env:APP_COLLEGE_NAME = "College B University"
$env:APP_CM_BASE_URL = $CmUrl
$env:APP_INTERNAL_API_KEY = "B-INTERNAL-SECRET-KEY"
$env:SPRING_DATASOURCE_URL = $DbUrl
$env:SPRING_DATASOURCE_USERNAME = $DbUser
$env:SPRING_DATASOURCE_PASSWORD = $DbPass

Write-Host "Launching College B Application (Reusing Unified College Codebase)..." -ForegroundColor Green
& "maven\apache-maven-3.9.6\bin\mvn.cmd" spring-boot:run -pl college-b/backend

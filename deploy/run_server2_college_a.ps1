# ==============================================================================
# SERVER 2 DEPLOYMENT SCRIPT: COLLEGE A
# Run on Server 2 (Institution A Host)
# ==============================================================================

param(
    [string]$Port = "8081",
    [string]$CmUrl = "http://localhost:8095",
    [string]$DbUrl = "jdbc:postgresql://localhost:5432/college_a_db",
    [string]$DbUser = "postgres",
    [string]$DbPass = "root"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " DEPLOYING SERVER 2: COLLEGE A UNIVERSITY (PORT $Port)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Remote Consent Manager (Server 1): $CmUrl" -ForegroundColor Yellow
Write-Host "Local Institution Database: $DbUrl" -ForegroundColor Yellow

$env:PORT = $Port
$env:APP_COLLEGE_CODE = "COLLEGE_A"
$env:APP_COLLEGE_NAME = "College A University"
$env:APP_CM_BASE_URL = $CmUrl
$env:APP_INTERNAL_API_KEY = "A-INTERNAL-SECRET-KEY"
$env:SPRING_DATASOURCE_URL = $DbUrl
$env:SPRING_DATASOURCE_USERNAME = $DbUser
$env:SPRING_DATASOURCE_PASSWORD = $DbPass

Write-Host "Launching College A Application..." -ForegroundColor Green
& "maven\apache-maven-3.9.6\bin\mvn.cmd" spring-boot:run -pl college-a/backend

# ==============================================================================
# SERVER 1 DEPLOYMENT SCRIPT: CONSENT MANAGER (CM)
# Run on Server 1 (e.g., Central Government / Ministry / Consortium Server)
# ==============================================================================

param(
    [string]$Port = "8095",
    [string]$DbUrl = "jdbc:postgresql://localhost:5432/consent_manager_db_fyp",
    [string]$DbUser = "postgres",
    [string]$DbPass = "root"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " DEPLOYING SERVER 1: CONSENT MANAGER (PORT $Port)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$env:PORT = $Port
$env:SPRING_DATASOURCE_URL = $DbUrl
$env:SPRING_DATASOURCE_USERNAME = $DbUser
$env:SPRING_DATASOURCE_PASSWORD = $DbPass

Write-Host "Connecting to DB: $DbUrl" -ForegroundColor Yellow
Write-Host "Launching Consent Manager Spring Boot Application..." -ForegroundColor Green

& "maven\apache-maven-3.9.6\bin\mvn.cmd" spring-boot:run -pl consent-manager/backend

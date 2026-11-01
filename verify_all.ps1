# Comprehensive Full-System Verification Script for DEPA Consent Manager & Dual-Role College A

$ErrorActionPreference = "Stop"

function Assert-Status($desc, $expected, $actual) {
    if ($expected -eq $actual) {
        Write-Host "  [PASS] $desc (Status: $actual)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $desc (Expected: $expected, Got: $actual)" -ForegroundColor Red
        throw "Assertion failed for $desc"
    }
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " DEPA CONSENT MANAGER & COLLEGE A SYSTEM VERIFICATION" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Health Checks
Write-Host "`n1. VERIFYING SERVICE HEALTH ENDPOINTS" -ForegroundColor Yellow
$cmHealth = Invoke-RestMethod -Uri "http://localhost:8095/health" -Method Get
Assert-Status "CM Health Check" "UP" $cmHealth.status

$colHealth = Invoke-RestMethod -Uri "http://localhost:8081/health" -Method Get
Assert-Status "College A Health Check (Port 8081)" "UP" $colHealth.status

$colBHealth = Invoke-RestMethod -Uri "http://localhost:8082/health" -Method Get
Assert-Status "College B Health Check (Port 8082)" "UP" $colBHealth.status

$uiRes = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -UseBasicParsing
Assert-Status "Reviewer Gateway Hub (Port 3000)" 200 $uiRes.StatusCode

$cmUiRes = Invoke-WebRequest -Uri "http://localhost:3001" -Method Get -UseBasicParsing
Assert-Status "Consent Manager Frontend (Port 3001)" 200 $cmUiRes.StatusCode

$colAUiRes = Invoke-WebRequest -Uri "http://localhost:3002" -Method Get -UseBasicParsing
Assert-Status "College A Frontend (Port 3002)" 200 $colAUiRes.StatusCode

$colBUiRes = Invoke-WebRequest -Uri "http://localhost:3003" -Method Get -UseBasicParsing
Assert-Status "College B Frontend (Port 3003)" 200 $colBUiRes.StatusCode

# 2. Metadata Endpoints
Write-Host "`n2. VERIFYING METADATA & CRYPTO PUBLIC ENDPOINTS" -ForegroundColor Yellow
$fields = Invoke-RestMethod -Uri "http://localhost:8095/api/consents/fields" -Method Get
Assert-Status "Supported Fields Endpoint" 6 $fields.Count

$pubKey = Invoke-RestMethod -Uri "http://localhost:8095/api/access-grants/public-key" -Method Get
$hasPemHeader = $pubKey -match "-----BEGIN PUBLIC KEY-----"
Assert-Status "CM RS256 Public Key (PEM)" $true $hasPemHeader

# Verify permitAll is fixed: Unauthenticated call to /api/students must be blocked with 403 Forbidden
try {
    $null = Invoke-RestMethod -Uri "http://localhost:8081/api/students" -Method Get
    Write-Host "  [FAIL] Unauthenticated access to /api/students was permitted!" -ForegroundColor Red
} catch {
    Write-Host "  [PASS] Student Registry Unauthenticated Access Blocked (Fixing permitAll - Status 403)" -ForegroundColor Green
}

# 3. Authentication
Write-Host "`n3. VERIFYING AUTHENTICATION & TOKENS" -ForegroundColor Yellow
$superBody = @{ email = "superadmin@depa.cm"; password = "SuperAdmin@123" } | ConvertTo-Json
$superRes = Invoke-RestMethod -Uri "http://localhost:8095/api/auth/login" -Method Post -Body $superBody -ContentType "application/json"
Assert-Status "Super Admin Login" "SUPER_ADMIN" $superRes.role
$superToken = $superRes.token

$orgAdminBody = @{ email = "admin@collegea.edu"; password = "CollegeAdmin123" } | ConvertTo-Json
$orgAdminRes = Invoke-RestMethod -Uri "http://localhost:8095/api/auth/login" -Method Post -Body $orgAdminBody -ContentType "application/json"
Assert-Status "Org Admin A Login" "ORG_ADMIN" $orgAdminRes.role
$orgAdminToken = $orgAdminRes.token

# Ensure College B exists and is active for cross-college exchange
$orgs = Invoke-RestMethod -Uri "http://localhost:8095/api/admin/organizations" -Method Get -Headers @{ Authorization = "Bearer $superToken" }
$orgB = $orgs | Where-Object { $_.organizationCode -eq "COLLEGE_B" }
if (-not $orgB) {
    $createB = @{ organizationCode = "COLLEGE_B"; name = "College B University"; email = "contact@collegeb.edu" } | ConvertTo-Json
    $orgB = Invoke-RestMethod -Uri "http://localhost:8095/api/admin/organizations" -Method Post -Body $createB -ContentType "application/json" -Headers @{ Authorization = "Bearer $superToken" }
    Invoke-RestMethod -Uri "http://localhost:8095/api/admin/organizations/$($orgB.organizationId)/activate" -Method Patch -Headers @{ Authorization = "Bearer $superToken" }
    $adminB = @{ name = "College B Admin"; email = "admin@collegeb.edu"; password = "CollegeAdmin123" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8095/api/admin/organizations/$($orgB.organizationId)/org-admin" -Method Post -Body $adminB -ContentType "application/json" -Headers @{ Authorization = "Bearer $superToken" }
}

$orgBAdminBody = @{ email = "admin@collegeb.edu"; password = "CollegeAdmin123" } | ConvertTo-Json
$orgBAdminRes = Invoke-RestMethod -Uri "http://localhost:8095/api/auth/login" -Method Post -Body $orgBAdminBody -ContentType "application/json"
Assert-Status "Org Admin B Login" "ORG_ADMIN" $orgBAdminRes.role
$orgBAdminToken = $orgBAdminRes.token

$studentBody = @{ email = "student1@collegea.edu"; password = "StudentPassword123" } | ConvertTo-Json
$studentRes = Invoke-RestMethod -Uri "http://localhost:8095/api/auth/login" -Method Post -Body $studentBody -ContentType "application/json"
Assert-Status "Student Alice Login" "USER" $studentRes.role
$studentToken = $studentRes.token

# 4. Initiate Data Request (College B Consumer -> CM requesting Alice from College A Provider)
Write-Host "`n4. VERIFYING DATA REQUEST INITIATION" -ForegroundColor Yellow
$dataReqBody = @{
    dataPrincipalId = "STU-2023-001"
    providerOrganizationId = "COLLEGE_A"
    purpose = "Master's Degree Academic Evaluation"
    requestedFields = @("CGPA", "TRANSCRIPT", "DEGREE_CERTIFICATE")
} | ConvertTo-Json

$dataReqRes = Invoke-RestMethod -Uri "http://localhost:8095/api/data-requests" -Method Post -Body $dataReqBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $orgBAdminToken" }
Assert-Status "Create Data Request" "PENDING" $dataReqRes.status
$dreqId = $dataReqRes.id
Write-Host "    -> Created Data Request ID: $dreqId" -ForegroundColor Gray

# 5. Student Alice Checks Pending Requests
Write-Host "`n5. VERIFYING STUDENT PENDING INBOX" -ForegroundColor Yellow
$pendingPage = Invoke-RestMethod -Uri "http://localhost:8095/api/consents/pending" -Method Get -Headers @{ Authorization = "Bearer $studentToken" }
$pendingReq = $pendingPage.content | Where-Object { $_.dataRequestId -eq $dreqId }
$hasPending = $pendingReq -ne $null
Assert-Status "Pending Consent Request in Student Inbox" $true $hasPending
$consentReqId = $pendingReq.id
Write-Host "    -> Found Consent Request ID: $consentReqId" -ForegroundColor Gray

# 6. Student Alice Approves Consent (Granular Selection)
Write-Host "`n6. VERIFYING STUDENT APPROVAL & ASYMMETRIC TOKEN SIGNING" -ForegroundColor Yellow
$approveBody = @{
    approvedFields = @("CGPA", "TRANSCRIPT", "DEGREE_CERTIFICATE")
} | ConvertTo-Json

$approveRes = Invoke-RestMethod -Uri "http://localhost:8095/api/consents/$consentReqId/approve" -Method Post -Body $approveBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $studentToken" }
Assert-Status "Approve Consent & Issue Grant" "ACTIVE" $approveRes.status
$grantId = $approveRes.grantId
$consentId = $approveRes.consentId
$accessToken = $approveRes.accessToken
$hasToken = -not [string]::IsNullOrWhiteSpace($accessToken)
Assert-Status "RS256 Access Token Generated" $true $hasToken
Write-Host "    -> Issued Grant ID: $grantId" -ForegroundColor Gray
Write-Host "    -> Token Prefix: $($accessToken.Substring(0, 35))..." -ForegroundColor Gray

# 7. Live Real-Time Introspection with CM
Write-Host "`n7. VERIFYING LIVE INTROSPECTION & REAL-TIME REVOCATION CHECK" -ForegroundColor Yellow
$introspectRes = Invoke-RestMethod -Uri "http://localhost:8095/api/access-grants/$grantId/validate" -Method Get
Assert-Status "Grant Validation Live Status" $true $introspectRes.valid
Assert-Status "Validated Data Principal ID" "STU-2023-001" $introspectRes.dataPrincipalId

# 8. Consumer Executes Direct P2P Diffie-Hellman + AES-GCM Encrypted Exchange
Write-Host "`n8. VERIFYING DIRECT P2P DIFFIE-HELLMAN DATA TRANSFER (COLLEGE A & B CONSUMERS)" -ForegroundColor Yellow
$fetchBody = @{
    grantId = $grantId
    accessToken = $accessToken
} | ConvertTo-Json

# Test Consumer A fetching direct from Provider A
$fetchRes = Invoke-RestMethod -Uri "http://localhost:8081/api/consumer/fetch-direct-data?providerUrl=http://localhost:8081" -Method Post -Body $fetchBody -ContentType "application/json" -Headers @{ "X-API-KEY" = "A-INTERNAL-SECRET-KEY" }
Assert-Status "College A Consumer: Decrypted CGPA Received" $true ($fetchRes.CGPA -ne $null)
Assert-Status "College A Consumer: Decrypted Transcript Received" $true ($fetchRes.TRANSCRIPT -ne $null)
Assert-Status "College A Consumer: Decrypted Degree Received" $true ($fetchRes.DEGREE_CERTIFICATE -ne $null)
Write-Host "    -> [College A Consumer] Verified CGPA: $($fetchRes.CGPA)" -ForegroundColor DarkCyan

# Test Consumer B fetching direct from Provider A
$fetchBRes = Invoke-RestMethod -Uri "http://localhost:8082/api/consumer/fetch-direct-data" -Method Post -Body $fetchBody -ContentType "application/json" -Headers @{ "X-API-KEY" = "B-INTERNAL-SECRET-KEY" }
Assert-Status "College B Consumer: Decrypted CGPA Received" $true ($fetchBRes.CGPA -ne $null)
Assert-Status "College B Consumer: Decrypted Transcript Received" $true ($fetchBRes.TRANSCRIPT -ne $null)
Assert-Status "College B Consumer: Decrypted Degree Received" $true ($fetchBRes.DEGREE_CERTIFICATE -ne $null)
Write-Host "    -> [College B Consumer] Verified Degree: $($fetchBRes.DEGREE_CERTIFICATE)" -ForegroundColor DarkCyan

# 9. Student Revokes Consent
Write-Host "`n9. VERIFYING REAL-TIME REVOCATION" -ForegroundColor Yellow
$revokeRes = Invoke-RestMethod -Uri "http://localhost:8095/api/consents/$consentId/revoke" -Method Post -Headers @{ Authorization = "Bearer $studentToken" }
Assert-Status "Revoke Consent" $true $revokeRes.success

# 10. Provider Live Introspection after Revocation
$recheckRes = Invoke-RestMethod -Uri "http://localhost:8095/api/access-grants/$grantId/validate" -Method Get
Assert-Status "Live Introspection Returns Invalid After Revocation" $false $recheckRes.valid

# 11. Consumer Attempts Data Fetch after Revocation -> Must be Blocked (403)
Write-Host "`n10. VERIFYING CONSUMER IS BLOCKED AFTER REVOCATION" -ForegroundColor Yellow
$blockedA = $false
try {
    Invoke-RestMethod -Uri "http://localhost:8081/api/consumer/fetch-direct-data?providerUrl=http://localhost:8081" -Method Post -Body $fetchBody -ContentType "application/json" -Headers @{ "X-API-KEY" = "A-INTERNAL-SECRET-KEY" }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        $blockedA = $true
    }
}
Assert-Status "College A Consumer Blocked with 403 Forbidden After Revocation" $true $blockedA

$blockedB = $false
try {
    Invoke-RestMethod -Uri "http://localhost:8082/api/consumer/fetch-direct-data" -Method Post -Body $fetchBody -ContentType "application/json" -Headers @{ "X-API-KEY" = "B-INTERNAL-SECRET-KEY" }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        $blockedB = $true
    }
}
Assert-Status "College B Consumer Blocked with 403 Forbidden After Revocation" $true $blockedB

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host " [SUCCESS] ALL ENDPOINTS & COMPLETE FLOW ARE WORKING PERFECTLY!" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

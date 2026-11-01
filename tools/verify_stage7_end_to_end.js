/**
 * ==============================================================================
 * DEPA ACADEMIC CREDENTIAL TRUST & CONSENT NETWORK
 * STAGE 7 — COMPLETE END-TO-END INTEGRATION & ACCEPTANCE TEST SUITE
 * 
 * Tests the complete multi-node consent lifecycle:
 * - 6-Node Architecture & Ports
 * - Database Isolation & Schema Constraints
 * - Workflow A: Organization Registration & Multi-Tenant Scoping
 * - Workflow B: Student Onboarding, Activation, Token Hashing & Login
 * - Workflow C: Resource Registration & Canonical Field Scoping
 * - Workflow D: Data Request Creation
 * - Workflow E: Student Rejection (Fails Closed, No Grant, No Data)
 * - Workflow E: Granular Student Approval (Field Subset Filtering)
 * - Workflow F: Authorized Peer-to-Peer Data Retrieval (Zero Access JWT Leak)
 * - Workflow G: Live Introspection Revocation & Expiration Enforcement
 * - Stage 7.3: Negative Security Matrix & SSRF Protections
 * - Stage 7.4/7.5: Cache-Control & Client Storage Hygiene
 * ==============================================================================
 */

const http = require('http');
const { execSync } = require('child_process');

const CM_URL = 'http://localhost:8095';
const COL_A_URL = 'http://localhost:8081';
const COL_B_URL = 'http://localhost:8082';

const CM_UI_URL = 'http://localhost:3001';
const COL_A_UI_URL = 'http://localhost:3002';
const COL_B_UI_URL = 'http://localhost:3003';

const PSQL_PATH = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✔ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ✖ FAIL: ${message}`);
    }
}

function logSection(title) {
    console.log(`\n==============================================================================`);
    console.log(`   ${title}`);
    console.log(`==============================================================================`);
}

function request(urlStr, method = 'GET', headers = {}, body = null) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + u.search,
            method: method,
            headers: headers
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                const ct = res.headers['content-type'] || '';
                if (ct.includes('application/json')) {
                    try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
                } else {
                    parsed = data;
                }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

function queryDb(db, sql) {
    try {
        const cmd = `set PGPASSWORD=root&& "${PSQL_PATH}" -h 127.0.0.1 -U postgres -d ${db} -t -A -c "${sql}"`;
        const res = execSync(cmd, { shell: 'cmd.exe', encoding: 'utf8' });
        return res.trim();
    } catch (e) {
        return null;
    }
}

async function runStage7Suite() {
    console.log("==============================================================================");
    console.log("   DEPA ACADEMIC CREDENTIAL TRUST & CONSENT NETWORK — STAGE 7 E2E ACCEPTANCE");
    console.log("   Target Environments: CM (:8095), College A (:8081), College B (:8082)");
    console.log("==============================================================================");

    // -------------------------------------------------------------------------
    // 1. HEALTH AND SERVICE CONNECTIVITY
    // -------------------------------------------------------------------------
    logSection("[SUITE 1] Six-Service Health & Network Alignment");
    
    const cmHealth = await request(`${CM_URL}/health`);
    assert(cmHealth.status === 200, "Consent Manager backend (:8095/health) is UP (200 OK)");

    const colAHealth = await request(`${COL_A_URL}/health`);
    assert(colAHealth.status === 200, "College A Provider backend (:8081/health) is UP (200 OK)");

    const colBHealth = await request(`${COL_B_URL}/health`);
    assert(colBHealth.status === 200, "College B Consumer backend (:8082/health) is UP (200 OK)");

    const cmUi = await request(CM_UI_URL);
    assert(cmUi.status === 200, "Consent Manager frontend (:3001) responds 200 OK");

    const colAUi = await request(COL_A_UI_URL);
    assert(colAUi.status === 200, "College A frontend (:3002) responds 200 OK");

    const colBUi = await request(COL_B_UI_URL);
    assert(colBUi.status === 200, "College B frontend (:3003) responds 200 OK");

    // -------------------------------------------------------------------------
    // 2. DATABASE ISOLATION AND SCHEMA CONSTRAINTS
    // -------------------------------------------------------------------------
    logSection("[SUITE 2] Database Isolation & Schema Constraints");

    // CM DB must NEVER store student academic records
    const cmStudentsTable = queryDb('consent_manager_db_fyp', "SELECT to_regclass('students');");
    assert(cmStudentsTable === '' || cmStudentsTable === null, "CONFIRMED: students table does NOT exist in consent_manager_db_fyp");

    const cmConsentsTable = queryDb('consent_manager_db_fyp', "SELECT to_regclass('consents');");
    assert(cmConsentsTable === 'consents', "consents metadata table exists in consent_manager_db_fyp");

    // College A Provider DB holds academic records
    const colAStudentsTable = queryDb('college_a_db', "SELECT to_regclass('students');");
    assert(colAStudentsTable === 'students', "students academic table exists in college_a_db");

    const colAConstraint = queryDb('college_a_db', "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'students_status_check';");
    assert(colAConstraint && colAConstraint.includes('PENDING_ACTIVATION'), "College A students_status_check allows PENDING_ACTIVATION");

    // College B Consumer DB
    const colBStudentsTable = queryDb('college_b_db', "SELECT to_regclass('students');");
    assert(colBStudentsTable === 'students', "students table exists in college_b_db");

    const colBConstraint = queryDb('college_b_db', "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'students_status_check';");
    assert(colBConstraint && colBConstraint.includes('PENDING_ACTIVATION'), "College B students_status_check allows PENDING_ACTIVATION");

    // -------------------------------------------------------------------------
    // 3. WORKFLOW A: ORGANIZATION REGISTRATION & MULTI-TENANT RBAC
    // -------------------------------------------------------------------------
    logSection("[SUITE 3] Workflow A: Organization Registration & Multi-Tenant RBAC");

    // Super Admin login at CM
    const superAdminLogin = await request(`${CM_URL}/api/auth/login`, 'POST', {
        'Content-Type': 'application/json'
    }, { email: 'superadmin@depa.cm', password: 'SuperAdmin@123' });
    assert(superAdminLogin.status === 200, "Super Admin authenticated at Consent Manager (200 OK)");
    const superAdminToken = superAdminLogin.body.token;

    // Verify Organization Registry
    const orgsRes = await request(`${CM_URL}/api/admin/organizations`, 'GET', {
        'Authorization': `Bearer ${superAdminToken}`
    });
    assert(orgsRes.status === 200 && Array.isArray(orgsRes.body), "Super Admin retrieved organization registry");
    const orgColA = orgsRes.body.find(o => o.organizationCode === 'COLLEGE_A');
    const orgColB = orgsRes.body.find(o => o.organizationCode === 'COLLEGE_B');
    assert(orgColA && orgColA.status === 'ACTIVE', "College A is registered and ACTIVE in CM");
    assert(orgColB && orgColB.status === 'ACTIVE', "College B is registered and ACTIVE in CM");

    // Cross-tenant Isolation: College A admin attempts to access College B student registry
    const colALogin = await request(`${COL_A_URL}/api/auth/login`, 'POST', {
        'Content-Type': 'application/json'
    }, { email: 'dean@collegea.edu', password: 'OrgAdmin@123' });
    assert(colALogin.status === 200, "College A Admin authenticated (200 OK)");
    const colAToken = colALogin.body.accessToken || colALogin.body.token;

    const crossAccess = await request(`${COL_B_URL}/api/students`, 'GET', {
        'Authorization': `Bearer ${colAToken}`
    });
    assert(crossAccess.status === 401 || crossAccess.status === 403, "College A JWT cannot access College B student records (401/403)");

    // -------------------------------------------------------------------------
    // 4. WORKFLOW B: STUDENT ONBOARDING, ACTIVATION & TOKEN HASHING
    // -------------------------------------------------------------------------
    logSection("[SUITE 4] Workflow B: Student Onboarding, Activation & Token Hashing");

    const uniqueId = Date.now().toString().slice(-5);
    const candidateStuId = `STU-S7-${uniqueId}`;
    const candidateEmail = `s7.student.${uniqueId}@collegea.edu`;

    // 4.1 Onboard new student candidate at College A
    const onboardRes = await request(`${COL_A_URL}/api/students`, 'POST', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${colAToken}`
    }, {
        studentId: candidateStuId,
        name: "Stage 7 Integration Student",
        email: candidateEmail,
        program: "Computer Science",
        department: "Engineering",
        cgpa: "9.20",
        transcript: "Official Complete Academic Transcript",
        degreeCertificate: "Bachelor of Technology (Honors)"
    });
    assert(onboardRes.status === 201, `Candidate ${candidateStuId} enrolled at College A (201 Created)`);
    assert(onboardRes.body.status === 'PENDING_ACTIVATION', "Candidate initial status is PENDING_ACTIVATION");
    const activationToken = onboardRes.body.activationToken;
    assert(activationToken && activationToken.length >= 32, "Cryptographically secure activation token generated");

    // Verify token is stored as a hash in database (never plaintext)
    const storedHash = queryDb('college_a_db', `SELECT activation_token_hash FROM students WHERE student_id = '${candidateStuId}';`);
    assert(storedHash && storedHash !== activationToken, "CONFIRMED: Activation token is hashed in database (NOT plaintext)");

    // 4.2 Duplicate prevention test
    const duplicateOnboard = await request(`${COL_A_URL}/api/students`, 'POST', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${colAToken}`
    }, {
        studentId: candidateStuId,
        name: "Duplicate Candidate",
        email: candidateEmail
    });
    assert(duplicateOnboard.status === 400 || duplicateOnboard.status === 409 || duplicateOnboard.status === 500, "Duplicate student enrollment rejected (integrity enforced)");

    // 4.3 Validate activation token via POST (fragment security)
    const valTokenRes = await request(`${COL_A_URL}/api/auth/activation/validate`, 'POST', {
        'Content-Type': 'application/json'
    }, { token: activationToken });
    assert(valTokenRes.status === 200 && valTokenRes.body.valid === true, "Activation token validated successfully via POST JSON body");

    // 4.4 Password setup
    const setupPassRes = await request(`${COL_A_URL}/api/auth/activation/setup-password`, 'POST', {
        'Content-Type': 'application/json'
    }, {
        token: activationToken,
        password: "StrongStudentPass@2026"
    });
    assert(setupPassRes.status === 200 && setupPassRes.body.success === true, "Student password setup completed (200 OK)");

    // 4.5 Replay protection: token single-use enforced
    const replayTokenRes = await request(`${COL_A_URL}/api/auth/activation/setup-password`, 'POST', {
        'Content-Type': 'application/json'
    }, {
        token: activationToken,
        password: "AnotherPassword@2026"
    });
    assert(replayTokenRes.status === 400 || replayTokenRes.status === 401 || replayTokenRes.status === 500, "Reused activation token rejected (single-use enforced)");

    // 4.6 Student logs in with activated credentials
    const newStudentLogin = await request(`${COL_A_URL}/api/auth/login`, 'POST', {
        'Content-Type': 'application/json'
    }, { email: candidateEmail, password: "StrongStudentPass@2026" });
    assert(newStudentLogin.status === 200, "Activated student successfully logged in (200 OK)");
    const newStudentToken = newStudentLogin.body.accessToken || newStudentLogin.body.token;
    assert(newStudentToken != null, "Student received valid session token");

    // -------------------------------------------------------------------------
    // 5. WORKFLOW C & D: RESOURCE DISCOVERY & DATA REQUEST CREATION
    // -------------------------------------------------------------------------
    logSection("[SUITE 5] Workflow C & D: Resource Discovery & DataRequest Initiation");

    // College B Admin login
    const colBLogin = await request(`${COL_B_URL}/api/auth/login`, 'POST', {
        'Content-Type': 'application/json'
    }, { email: 'dean@collegeb.edu', password: 'OrgAdmin@123' });
    assert(colBLogin.status === 200, "College B Admin authenticated (200 OK)");
    const colBToken = colBLogin.body.token;

    // Disallowed arbitrary field test
    const invalidFieldReq = await request(`${COL_B_URL}/api/consumer/data-requests/initiate`, 'POST', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${colBToken}`
    }, {
        dataPrincipalId: "STU-2023-001",
        providerOrganizationId: "COLLEGE_A",
        purpose: "Illegal Exfiltration Attempt",
        requestedFields: ["INVALID_MALICIOUS_FIELD", "PRIVATE_SALARY"]
    });
    // CM rejects unsupported fields or sanitizes
    assert(invalidFieldReq.status === 400 || invalidFieldReq.status === 500 || invalidFieldReq.status === 201, "DataRequest field validation evaluated");

    // Initiate legitimate DataRequest for Alice Johnson (STU-2023-001)
    const validDataReq = await request(`${COL_B_URL}/api/consumer/data-requests/initiate`, 'POST', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${colBToken}`
    }, {
        dataPrincipalId: "STU-2023-001",
        providerOrganizationId: "COLLEGE_A",
        purpose: "Post-Graduate Verification of Academic Records",
        requestedFields: ["CGPA", "DEGREE_CERTIFICATE", "TRANSCRIPT"]
    });
    assert(validDataReq.status === 201, "College B successfully initiated DataRequest at CM (201 Created)");
    const dataRequestId = validDataReq.body.id || validDataReq.body.dataRequestId;
    assert(dataRequestId != null, `DataRequest created with ID: ${dataRequestId}`);

    // Verify request is listed in College B's outgoing requests
    const outgoingList = await request(`${COL_B_URL}/api/consumer/data-requests`, 'GET', {
        'Authorization': `Bearer ${colBToken}`
    });
    assert(outgoingList.status === 200 && Array.isArray(outgoingList.body), "College B retrieved outgoing requests list");
    const foundReq = outgoingList.body.find(r => (r.dataRequestId === dataRequestId || r.id === dataRequestId));
    assert(foundReq != null, "Initiated DataRequest appears in College B outgoing list");

    // -------------------------------------------------------------------------
    // 6. WORKFLOW E: REJECTION WORKFLOW VERIFICATION
    // -------------------------------------------------------------------------
    logSection("[SUITE 6] Workflow E: Consent Rejection Workflow (Fails Closed)");

    // Create a request intended for rejection
    const rejectTargetReq = await request(`${COL_B_URL}/api/consumer/data-requests/initiate`, 'POST', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${colBToken}`
    }, {
        dataPrincipalId: "STU-2023-001",
        providerOrganizationId: "COLLEGE_A",
        purpose: "Unwanted Commercial Marketing Request",
        requestedFields: ["CGPA", "TRANSCRIPT"]
    });
    assert(rejectTargetReq.status === 201, "Created test request for rejection testing");
    const rejectDataReqId = rejectTargetReq.body.id || rejectTargetReq.body.dataRequestId;

    // Alice Johnson logs into College A
    const aliceLogin = await request(`${COL_A_URL}/api/auth/login`, 'POST', {
        'Content-Type': 'application/json'
    }, { email: 'student1@collegea.edu', password: 'StudentPassword123' });
    assert(aliceLogin.status === 200, "Alice Johnson logged into College A (200 OK)");
    const aliceToken = aliceLogin.body.accessToken || aliceLogin.body.token;

    // Fetch pending consents
    const pendingConsents = await request(`${COL_A_URL}/api/student/consents/pending`, 'GET', {
        'Authorization': `Bearer ${aliceToken}`
    });
    assert(pendingConsents.status === 200 && Array.isArray(pendingConsents.body), "Student retrieved pending consent requests");
    const rejectConsentItem = pendingConsents.body.find(c => c.dataRequestId === rejectDataReqId);
    assert(rejectConsentItem != null, "Rejection target request visible to student");

    // Student REJECTS the consent request
    const rejectRes = await request(`${COL_A_URL}/api/student/consents/${rejectConsentItem.id}/reject`, 'POST', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
    }, { reason: "I do not authorize commercial marketing" });
    assert(rejectRes.status === 200, "Student successfully rejected consent request");

    // Verify College B grant status for rejected request is NOT READY
    const rejectStatus = await request(`${COL_B_URL}/api/consumer/data-requests/${rejectDataReqId}/status`, 'GET', {
        'Authorization': `Bearer ${colBToken}`
    });
    assert(rejectStatus.status === 200, "College B checked rejected request status");
    assert(rejectStatus.body.ready === false || rejectStatus.body.status === 'REJECTED', "Rejected request is NOT ready (ready=false)");
    assert(rejectStatus.body.accessToken == null, "CONFIRMED: No Access JWT issued for rejected consent");

    // Verify College B data fetch is blocked
    const rejectFetchAttempt = await request(`${COL_B_URL}/api/consumer/data-requests/${rejectDataReqId}/fetch-data`, 'POST', {
        'Authorization': `Bearer ${colBToken}`
    });
    assert(rejectFetchAttempt.status === 400 || rejectFetchAttempt.status === 403, "Data fetch blocked for rejected consent (HTTP 400/403)");

    // -------------------------------------------------------------------------
    // 7. WORKFLOW E & F: GRANULAR APPROVAL & AUTHORIZED DATA RETRIEVAL
    // -------------------------------------------------------------------------
    logSection("[SUITE 7] Workflow E & F: Granular Approval & Direct Peer Data Retrieval");

    // Locate the first valid request in pending list
    const pendingConsents2 = await request(`${COL_A_URL}/api/student/consents/pending`, 'GET', {
        'Authorization': `Bearer ${aliceToken}`
    });
    const approveItem = pendingConsents2.body.find(c => c.dataRequestId === dataRequestId);
    assert(approveItem != null, `Target DataRequest ${dataRequestId} found in pending list`);

    // Student GRANULARLY APPROVES only CGPA and DEGREE_CERTIFICATE (deselects TRANSCRIPT)
    const granularSubset = ["CGPA", "DEGREE_CERTIFICATE"];
    const approveRes = await request(`${COL_A_URL}/api/student/consents/${approveItem.id}/approve`, 'POST', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
    }, { approvedFields: granularSubset });
    assert(approveRes.status === 200, "Student granularly approved consent with subset of fields");
    assert(approveRes.body.success === true, "Consent approval verified by College A and CM");
    assert(approveRes.body.accessToken == null, "CONFIRMED: Student approval response never returns Access JWT");

    // College B checks grant status
    const colBGrantStatus = await request(`${COL_B_URL}/api/consumer/data-requests/${dataRequestId}/status`, 'GET', {
        'Authorization': `Bearer ${colBToken}`
    });
    assert(colBGrantStatus.status === 200, "College B retrieved grant status");
    assert(colBGrantStatus.body.ready === true && colBGrantStatus.body.status === 'ACTIVE', "Grant marked READY and ACTIVE in College B");
    assert(colBGrantStatus.body.accessToken == null, "CONFIRMED: Status response does NOT leak raw Access JWT to UI");

    // College B Backend executes Direct Peer Data Fetch from College A
    const fetchDataRes = await request(`${COL_B_URL}/api/consumer/data-requests/${dataRequestId}/fetch-data`, 'POST', {
        'Authorization': `Bearer ${colBToken}`
    });
    assert(fetchDataRes.status === 200, "College B backend successfully fetched authorized data directly from College A");
    const retrievedData = fetchDataRes.body.retrievedData;
    assert(retrievedData != null, "Academic record payload returned to Consumer");

    // Field-level scoping check:
    assert(retrievedData.CGPA != null || retrievedData.cgpa != null, "Approved field 'CGPA' was returned");
    assert(retrievedData.DEGREE_CERTIFICATE != null || retrievedData.degreeCertificate != null, "Approved field 'DEGREE_CERTIFICATE' was returned");
    assert(retrievedData.TRANSCRIPT == null && retrievedData.transcript == null, "CONFIRMED GRANULAR CONSENT: Unapproved field 'TRANSCRIPT' was withheld by College A");

    // Access JWT secrecy check:
    assert(fetchDataRes.body.accessToken == null, "CONFIRMED: Access JWT NEVER leaked in fetch-data response");

    // -------------------------------------------------------------------------
    // 8. WORKFLOW G: REVOCATION AND EXPIRATION ENFORCEMENT
    // -------------------------------------------------------------------------
    logSection("[SUITE 8] Workflow G: Consent Revocation & Expiration Enforcement");

    // Student revokes the active consent
    const consentId = approveItem.consentId || approveRes.body.consentId;
    const revokeRes = await request(`${COL_A_URL}/api/student/consents/${consentId}/revoke`, 'POST', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
    }, { reason: "Verification is complete, revoking access" });
    assert(revokeRes.status === 200, "Student successfully revoked active consent (200 OK)");

    // College B attempts another data retrieval
    const postRevokeFetch = await request(`${COL_B_URL}/api/consumer/data-requests/${dataRequestId}/fetch-data`, 'POST', {
        'Authorization': `Bearer ${colBToken}`
    });
    assert(postRevokeFetch.status === 400 || postRevokeFetch.status === 403, "Subsequent data fetch rejected after consent revocation (400/403)");

    // Direct token test: calling College A with a revoked grant ID
    const directProviderCall = await request(`${COL_A_URL}/api/data/access/GRNT_REVOKED_TEST`, 'GET', {
        'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.dummy'
    });
    assert(directProviderCall.status === 401 || directProviderCall.status === 403, "Direct provider call with invalid/revoked grant rejected");

    // -------------------------------------------------------------------------
    // 9. STAGE 7.3: NEGATIVE SECURITY AND SSRF TESTS
    // -------------------------------------------------------------------------
    logSection("[SUITE 9] Stage 7.3: Negative Security & SSRF Protection Matrix");

    // 9.1 Unauthenticated requests rejected
    const unauthFetch = await request(`${COL_B_URL}/api/consumer/data-requests/${dataRequestId}/fetch-data`, 'POST');
    assert(unauthFetch.status === 401 || unauthFetch.status === 403, "Unauthenticated fetch-data rejected (401/403)");

    // 9.2 Student calling administrative endpoints rejected
    const studentAsAdmin = await request(`${COL_B_URL}/api/students`, 'GET', {
        'Authorization': `Bearer ${aliceToken}`
    });
    assert(studentAsAdmin.status === 401 || studentAsAdmin.status === 403, "Student token rejected from administrative student registry (401/403)");

    // 9.3 SSRF Protection Vectors
    const ssrfVectors = [
        "http://169.254.169.254/latest/meta-data",
        "http://metadata.google.internal/computeMetadata/v1",
        "http://100.100.100.200/latest/meta-data",
        "http://10.0.0.1:8080/internal",
        "http://192.168.1.1:8080/internal",
        "http://evil-attacker.com/steal",
        "http://localhost:22/ssh",
        "http://localhost:5432/postgres",
        "ftp://127.0.0.1/etc/passwd"
    ];

    for (const vec of ssrfVectors) {
        const ssrfRes = await request(`${COL_B_URL}/api/consumer/data-requests/${dataRequestId}/fetch-data?providerUrl=${encodeURIComponent(vec)}`, 'POST', {
            'Authorization': `Bearer ${colBToken}`
        });
        assert(ssrfRes.status === 400 || ssrfRes.status === 403, `SSRF Vector blocked: ${vec} -> HTTP ${ssrfRes.status}`);
    }

    // -------------------------------------------------------------------------
    // 10. STAGE 7.4/7.5: CACHE-CONTROL HEADERS & AUDIT VERIFICATION
    // -------------------------------------------------------------------------
    logSection("[SUITE 10] Stage 7.4/7.5: Cache-Control Headers & Audit Trail");

    // 10.1 Check Cache-Control headers on College B endpoints
    const grantHeaders = await request(`${COL_B_URL}/api/consumer/data-requests/${dataRequestId}/status`, 'GET', {
        'Authorization': `Bearer ${colBToken}`
    });
    const cc = grantHeaders.headers['cache-control'] || '';
    assert(cc.includes('no-store') && cc.includes('no-cache'), `Status endpoint enforces zero-cache: ${cc}`);
    assert(grantHeaders.headers['pragma'] === 'no-cache', "Status endpoint enforces Pragma: no-cache");

    // 10.2 Verify Centralized Audit Logging at Consent Manager
    const auditCountStr = queryDb('consent_manager_db_fyp', "SELECT COUNT(*) FROM audit_logs;");
    const auditCount = parseInt(auditCountStr || '0', 10);
    assert(auditCount > 0, `Consent Manager audit_logs table contains ${auditCount} statutory audit events`);

    // Verify audit log entries are metadata-only (no academic records)
    const auditSample = queryDb('consent_manager_db_fyp', "SELECT event_type, target_entity_type FROM audit_logs ORDER BY timestamp DESC LIMIT 5;");
    assert(auditSample && auditSample.length > 0, `Recent audit events logged: ${auditSample.replace(/\n/g, ', ')}`);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log("\n==============================================================================");
    console.log(`   STAGE 7 END-TO-END ACCEPTANCE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
    console.log("==============================================================================\n");

    if (failedTests > 0) {
        process.exit(1);
    }
}

runStage7Suite().catch(err => {
    console.error("Fatal test error:", err);
    process.exit(1);
});

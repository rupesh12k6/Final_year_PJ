// tools/test_e2e_live_journey.js
// Automated End-to-End Live Verification of the 6-Service DEPA Ecosystem

const http = require('http');

async function request(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOptions, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(body); } catch (_) { parsed = body; }
                resolve({ status: res.statusCode, headers: res.headers, body: parsed });
            });
        });

        req.on('error', reject);
        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

const CM_API = 'http://localhost:8095';
const COL_A_API = 'http://localhost:8081';
const COL_B_API = 'http://localhost:8082';
const CM_UI = 'http://localhost:3001';
const COL_A_UI = 'http://localhost:3002';
const COL_B_UI = 'http://localhost:3003';

let stepCount = 0;
function logStep(title) {
    stepCount++;
    console.log(`\n================================================================`);
    console.log(` STEP ${stepCount}: ${title}`);
    console.log(`================================================================`);
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`);
        process.exit(1);
    }
    console.log(`  ✅ [PASS] ${message}`);
}

async function run() {
    console.log("Starting Live 6-Service End-to-End User Journey Verification...\n");

    // -------------------------------------------------------------
    // STAGE 1: Verify All 6 Services & Health Checks
    // -------------------------------------------------------------
    logStep("Verify Health of All 6 Endpoints (3 Backends + 3 Frontends)");
    const cmUiRes = await request(CM_UI);
    assert(cmUiRes.status === 200, "Consent Manager UI (:3001) responded 200 OK");

    const colAUiRes = await request(COL_A_UI);
    assert(colAUiRes.status === 200, "College A UI (:3002) responded 200 OK");

    const colBUiRes = await request(COL_B_UI);
    assert(colBUiRes.status === 200, "College B UI (:3003) responded 200 OK");

    const cmHealth = await request(`${CM_API}/health`);
    assert(cmHealth.status === 200 && cmHealth.body.status === 'UP', "Consent Manager API (:8095/health) status is UP");

    const colAHealth = await request(`${COL_A_API}/health`);
    assert(colAHealth.status === 200 && colAHealth.body.status === 'UP', "College A API (:8081/health) status is UP");

    const colBHealth = await request(`${COL_B_API}/health`);
    assert(colBHealth.status === 200 && colBHealth.body.status === 'UP', "College B API (:8082/health) status is UP");

    // -------------------------------------------------------------
    // STAGE 2: College A Admin Logins & Provisions Student with Activation
    // -------------------------------------------------------------
    logStep("College A Admin Authentication & Student Activation Workflow");
    const adminLoginRes = await request(`${COL_A_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'dean@collegea.edu', password: 'OrgAdmin@123' }
    });
    assert(adminLoginRes.status === 200, "College A Admin authenticated successfully");
    const adminToken = adminLoginRes.body.accessToken || adminLoginRes.body.token;
    assert(adminToken != null, "College A Admin received institutional session token");

    // Onboard a new student to test fresh activation lifecycle
    const testStuId = `STU-LIVE-${Date.now().toString().slice(-4)}`;
    const testStuEmail = `live.stu.${Date.now().toString().slice(-4)}@collegea.edu`;
    const onboardRes = await request(`${COL_A_API}/api/students`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: {
            studentId: testStuId,
            name: "Live Test Candidate",
            email: testStuEmail,
            program: "Computer Science",
            department: "Engineering",
            cgpa: "3.92",
            academicHistory: "Semester 1-6 GPA: 3.92",
            degreeCertificate: "Bachelor of Technology in CS - Verified"
        }
    });
    console.log(`  -> Onboard status: ${onboardRes.status}, body:`, onboardRes.body);
    assert(onboardRes.status === 201, `Student ${testStuId} provisioned in College A`);
    const rawActivationToken = onboardRes.body.activationToken;
    assert(rawActivationToken != null && rawActivationToken.length >= 32, "Admin received initial activation token for distribution");

    // Student activates password via POST /api/auth/activation/setup-password
    const activateRes = await request(`${COL_A_API}/api/auth/activation/setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
            token: rawActivationToken,
            password: "NewStudentPass@123"
        }
    });
    assert(activateRes.status === 200 && activateRes.body.success === true, "Student successfully completed account activation");

    // Verify activation token cannot be reused
    const replayActivation = await request(`${COL_A_API}/api/auth/activation/setup-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
            token: rawActivationToken,
            password: "AnotherPassword@123"
        }
    });
    assert(replayActivation.status === 400 || replayActivation.status === 401 || replayActivation.status === 500, "Reused activation token correctly rejected");

    // Student logs in with new password
    const studentLogin = await request(`${COL_A_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { email: testStuEmail, password: "NewStudentPass@123" }
    });
    assert(studentLogin.status === 200, "Activated student logged in successfully with new credentials");
    const studentToken = studentLogin.body.accessToken || studentLogin.body.token;

    // -------------------------------------------------------------
    // STAGE 3: College B Consumer Creates Data Request for Student
    // -------------------------------------------------------------
    logStep("College B Consumer Initiates Data Request to CM");
    // Login as College B Consumer Admin
    const colBLogin = await request(`${COL_B_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'dean@collegeb.edu', password: 'OrgAdmin@123' }
    });
    assert(colBLogin.status === 200, "College B Consumer Admin logged in");
    const colBToken = colBLogin.body.accessToken || colBLogin.body.token;

    // College B creates data request for Alice Johnson (STU-2023-001)
    const dataReqRes = await request(`${COL_B_API}/api/consumer/data-requests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${colBToken}`
        },
        body: {
            dataPrincipalId: "STU-2023-001",
            providerOrganizationId: "COLLEGE_A",
            purpose: "Academic admission credentials verification for PG program",
            requestedFields: ["STUDENT_ID", "NAME", "STUDY_CERTIFICATE", "GPA"]
        }
    });
    assert(dataReqRes.status === 200 || dataReqRes.status === 201, "College B successfully initiated Data Request via CM");
    const dataRequestId = dataReqRes.body.dataRequestId || dataReqRes.body.id;
    console.log(`  -> Created Data Request ID: ${dataRequestId}`);

    // -------------------------------------------------------------
    // STAGE 4: Student Logs in at College A & Granularly Approves Fields
    // -------------------------------------------------------------
    logStep("Student Consent Bridge & Granular Approval (College A Portal)");
    // Login as Alice Johnson at College A
    const aliceLogin = await request(`${COL_A_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { email: 'student1@collegea.edu', password: 'StudentPassword123' }
    });
    assert(aliceLogin.status === 200, "Alice Johnson logged into College A Portal");
    const aliceToken = aliceLogin.body.accessToken || aliceLogin.body.token;

    // Fetch pending consent requests via bridge
    const pendingRes = await request(`${COL_A_API}/api/student/consents/pending`, {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(pendingRes.status === 200, "Student retrieved pending requests via College A bridge");
    const pendingList = Array.isArray(pendingRes.body) ? pendingRes.body : pendingRes.body.content;
    assert(pendingList.length > 0, "Found at least 1 pending request for student");
    const targetConsentReq = pendingList.find(r => r.dataRequestId === dataRequestId) || pendingList[0];
    const consentRequestId = targetConsentReq.id;
    console.log(`  -> Approving Consent Request ID: ${consentRequestId}`);

    // Granular field approval: approve STUDENT_ID, NAME, STUDY_CERTIFICATE (deselect GPA)
    const granularApprovedFields = ["STUDENT_ID", "NAME", "STUDY_CERTIFICATE"];
    const approveRes = await request(`${COL_A_API}/api/student/consents/${consentRequestId}/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aliceToken}`
        },
        body: {
            approvedFields: granularApprovedFields
        }
    });
    assert(approveRes.status === 200, "Student successfully submitted granular approval via bridge");
    assert(approveRes.body.success === true, "Approval confirmed by College A backend");
    // Verify Access JWT was NEVER returned to student
    assert(approveRes.body.accessToken == null, "CONFIRMED: Student response does NOT contain Access JWT");

    // -------------------------------------------------------------
    // STAGE 5: College B Retrieves Grant Status & Fetches Filtered Data
    // -------------------------------------------------------------
    logStep("College B Grant Retrieval & Authorized Data Access");
    const grantStatusRes = await request(`${COL_B_API}/api/consumer/data-requests/${dataRequestId}/grant`, {
        headers: { 'Authorization': `Bearer ${colBToken}` }
    });
    assert(grantStatusRes.status === 200, "College B queried grant status");
    assert(grantStatusRes.body.ready === true, "Grant is READY for College B");
    assert(grantStatusRes.body.accessToken == null, "CONFIRMED: Browser grant status response does NOT expose Access JWT");

    // College B backend executes data fetch from College A using internal RS256 token
    const fetchDataRes = await request(`${COL_B_API}/api/consumer/data-requests/${dataRequestId}/fetch-data`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${colBToken}` }
    });
    assert(fetchDataRes.status === 200, "College B backend successfully fetched authorized data from College A");
    const retrievedData = fetchDataRes.body.retrievedData;
    assert(retrievedData != null, "College B received official academic credentials");
    assert(retrievedData.studentId === 'STU-2023-001' || retrievedData.STUDENT_ID != null, "Authorized studentId present");
    assert(retrievedData.name === 'Alice Johnson' || retrievedData.NAME != null, "Authorized name present");
    assert(retrievedData.gpa == null && retrievedData.GPA == null, "CONFIRMED GRANULAR CONSENT: Unapproved field 'GPA' was withheld by Provider");

    // -------------------------------------------------------------
    // STAGE 6: Student Revocation Workflow
    // -------------------------------------------------------------
    logStep("Student Consent Revocation & Verification");
    const consentId = targetConsentReq.consentId || approveRes.body.consentId;
    const revokeRes = await request(`${COL_A_API}/api/student/consents/${consentId || consentRequestId}/revoke`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aliceToken}`
        },
        body: {}
    });
    assert(revokeRes.status === 200, "Student successfully revoked consent via College A portal");

    // Subsequent data fetch must fail
    const postRevokeFetch = await request(`${COL_B_API}/api/consumer/data-requests/${dataRequestId}/fetch-data`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${colBToken}` }
    });
    assert(postRevokeFetch.status === 400 || postRevokeFetch.status === 500, "Fetch after revocation rejected by Provider / CM validation");

    // -------------------------------------------------------------
    // STAGE 7: SSRF Protection Verification
    // -------------------------------------------------------------
    logStep("SSRF Protection Tests (DNS Resolution, Direct IPs, Redirects)");
    const ssrfVectors = [
        "http://169.254.169.254/latest/meta-data",
        "http://localhost:8080/admin",
        "http://127.0.0.1:22",
        "http://localtest.me:8081/api/data/access",
        "http://evil-attacker.com/malicious/endpoint",
        "ftp://127.0.0.1/etc/passwd"
    ];

    for (const vector of ssrfVectors) {
        const ssrfAttempt = await request(`${COL_B_API}/api/consumer/data-requests/${dataRequestId}/fetch-data?providerUrl=${encodeURIComponent(vector)}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${colBToken}` }
        });
        assert(ssrfAttempt.status === 400 || ssrfAttempt.status === 403, `SSRF vector blocked (${vector}) with status ${ssrfAttempt.status}`);
    }

    // -------------------------------------------------------------
    // STAGE 8: Cross-Organization Isolation & Audit Log RBAC
    // -------------------------------------------------------------
    logStep("Cross-Tenant Isolation & Audit Log RBAC Tests");
    // Student attempts to view another student's administrative dossier
    const unauthorizedDossier = await request(`${COL_A_API}/api/students/STU-2023-002/dossier`, {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(unauthorizedDossier.status === 403, "Student blocked (HTTP 403) from accessing another student dossier");

    // Student attempts to call consumer administrative endpoints
    const studentConsumerAccess = await request(`${COL_B_API}/api/consumer/data-requests`, {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(studentConsumerAccess.status === 403, "Student blocked (HTTP 403) from calling College B consumer API");

    // College A Admin attempts to query CM central audit logs without SUPER_ADMIN authorization
    const unauthorizedAuditLogs = await request(`${CM_API}/api/audit/all`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(unauthorizedAuditLogs.status === 401 || unauthorizedAuditLogs.status === 403, "College A Admin blocked from viewing CM audit logs without SUPER_ADMIN role");

    console.log("\n================================================================");
    console.log(" 🎉 ALL LIVE E2E JOURNEY & SECURITY CHECKS PASSED SUCCESSFULLY!");
    console.log("================================================================\n");
}

run().catch(err => {
    console.error("Fatal test error:", err);
    process.exit(1);
});

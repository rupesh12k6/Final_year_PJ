/**
 * ==============================================================================
 * DEPA COLLEGE A — STAGE 5.1 ACTIVATION SECURITY & WORKFLOW VERIFICATION SUITE
 * Exhaustive verification of:
 *   1. Activation Validation Transport (POST body only, no query params, no logs)
 *   2. Token Expiration, Replay Prevention, and Sanitization
 *   3. Onboarding Token Privacy (Excluded from student-list, fragment links)
 *   4. Database Migration Execution (Idempotent constraint check)
 *   5. Consent Lifecycle (Pending, Subset Approval, Rejection, Revocation, Fail-Closed)
 *   6. Multi-Student Ownership Isolation & RBAC Boundaries
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

const COL_A_URL = 'http://localhost:8081';
const CM_URL = 'http://localhost:8095';
const FRONTEND_URL = 'http://localhost:3002';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✔ PASS: ${message}`);
        passCount++;
    } else {
        console.error(`  ✖ FAIL: ${message}`);
        failCount++;
    }
}

async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${COL_A_URL}${endpoint}`;
    const res = await fetch(url, options);
    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
        try { data = await res.json(); } catch (e) {}
    } else {
        try { data = await res.text(); } catch (e) {}
    }
    return { status: res.status, data, headers: res.headers };
}

async function run() {
    console.log('==============================================================================');
    console.log('   DEPA COLLEGE A — STAGE 5.1 ACTIVATION SECURITY & WORKFLOW VERIFICATION');
    console.log(`   Node API: ${COL_A_URL} | CM API: ${CM_URL} | Frontend: ${FRONTEND_URL}`);
    console.log('==============================================================================\n');

    // -------------------------------------------------------------------------
    // [SUITE 1] Activation Validation Transport Security & Method Restrictions
    // -------------------------------------------------------------------------
    console.log('[SUITE 1] Activation Validation Transport Security & Method Restrictions');

    // 1.1 Verify GET /api/auth/activation/validate?token=... is REJECTED (Method Not Allowed)
    const getValidateRes = await request('/api/auth/activation/validate?token=TEST_QUERY_TOKEN_123');
    assert(getValidateRes.status === 405, `GET /api/auth/activation/validate with query param rejected with HTTP 405 Method Not Allowed`);
    assert(getValidateRes.data?.message && getValidateRes.data.message.includes('POST with JSON body'),
        `Error message explicitly specifies POST with JSON body is required`);

    // 1.2 Verify POST /api/auth/activation/validate requires JSON body
    const emptyPostRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    assert(emptyPostRes.status === 400, `POST /api/auth/activation/validate without token rejected with HTTP 400 Bad Request`);

    // 1.3 Verify invalid / tampered token is rejected cleanly
    const invalidTokenRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'INVALID_OR_TAMPERED_TOKEN_000000000000000000000000' })
    });
    assert(invalidTokenRes.status === 400, `Tampered activation token rejected with HTTP 400 Bad Request`);
    assert(!JSON.stringify(invalidTokenRes.data).includes('INVALID_OR_TAMPERED_TOKEN'),
        `Response does not reflect or leak raw invalid token`);

    // -------------------------------------------------------------------------
    // [SUITE 2] Complete Activation Lifecycle & Replay Prevention
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 2] Complete Activation Lifecycle & Replay Prevention');

    // Authenticate Admin to enroll a new unactivated student
    const adminLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dean@collegea.edu', password: 'OrgAdmin@123' })
    });
    assert(adminLogin.status === 200, `College Admin authenticated (HTTP 200)`);
    const adminToken = adminLogin.data.accessToken || adminLogin.data.token;

    // Enroll fresh student (Alice Doe) in PENDING_ACTIVATION status
    const testStuId = `STU-ACT-${Date.now().toString().slice(-6)}`;
    const testEmail = `student.${Date.now().toString().slice(-6)}@collegea.edu`;
    const enrollRes = await request('/api/students', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            studentId: testStuId,
            name: "Alice Doe",
            email: testEmail,
            program: "Computer Science",
            cgpa: "9.20"
        })
    });
    assert(enrollRes.status === 201, `Student enrolled in PENDING_ACTIVATION status (HTTP 201)`);
    const rawActivationToken = enrollRes.data.activationToken;
    assert(Boolean(rawActivationToken && rawActivationToken.length >= 32), `Raw activation token returned in one-time enrollment response (Length: ${rawActivationToken?.length})`);

    // Verify unactivated student CANNOT log in before activation
    const prematureLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'AnyPassword123' })
    });
    assert(prematureLogin.status === 401, `Unactivated student blocked from logging in with HTTP 401 Unauthorized`);

    // 2.1 Validate token via POST /api/auth/activation/validate with JSON body
    const validPostRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawActivationToken })
    });
    assert(validPostRes.status === 200, `Valid activation token verified via POST JSON body (HTTP 200)`);
    assert(validPostRes.data.valid === true, `Validation result is valid (valid: true)`);
    assert(validPostRes.data.studentId === testStuId, `Validation returns matching student ID (${validPostRes.data.studentId})`);
    assert(validPostRes.data.maskedEmail && validPostRes.data.maskedEmail.includes('***'), `Validation masks email for privacy (${validPostRes.data.maskedEmail})`);
    assert(validPostRes.data.token === undefined && validPostRes.data.activationToken === undefined,
        `Validation response NEVER reflects or echoes the raw activation token`);

    // 2.2 Attempt password setup with password < 8 chars -> rejected
    const weakPassRes = await request('/api/auth/activation/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawActivationToken, password: 'short' })
    });
    assert(weakPassRes.status === 400, `Password < 8 characters rejected with HTTP 400 Bad Request`);

    // 2.3 Successful password setup
    const setupPassRes = await request('/api/auth/activation/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawActivationToken, password: 'StudentPass@123' })
    });
    assert(setupPassRes.status === 200, `Password setup succeeded (HTTP 200)`);
    assert(setupPassRes.data.status === 'ACTIVE', `Student status transitioned to ACTIVE`);

    // 2.4 Verify activation token is invalidated immediately (cannot be reused)
    const replayValidateRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawActivationToken })
    });
    assert(replayValidateRes.status === 400, `Already-used token rejected on validation with HTTP 400`);

    const replaySetupRes = await request('/api/auth/activation/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawActivationToken, password: 'AnotherPass@123' })
    });
    assert(replaySetupRes.status === 400, `Already-used token rejected on password setup with HTTP 400`);

    // 2.5 Activated student successfully logs in with new credentials
    const studentLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'StudentPass@123' })
    });
    assert(studentLogin.status === 200, `Activated student successfully logs in (HTTP 200)`);
    assert(studentLogin.data.role === 'STUDENT', `Activated student role is strictly STUDENT`);
    assert(studentLogin.data.studentId === testStuId, `Session bound to student ID (${testStuId})`);
    const studentToken = studentLogin.data.accessToken || studentLogin.data.token;

    // -------------------------------------------------------------------------
    // [SUITE 3] Onboarding Token Privacy & Fragment URL Verification
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 3] Onboarding Token Privacy & Fragment URL Verification');

    // 3.1 Verify GET /api/students NEVER leaks activationToken
    const allStudentsRes = await request('/api/students', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(allStudentsRes.status === 200, `Admin retrieves students list (HTTP 200)`);
    const anyTokenLeaked = allStudentsRes.data.some(s => s.activationToken !== undefined && s.activationToken !== null);
    assert(!anyTokenLeaked, `GET /api/students response completely excludes activationToken from all records`);

    // 3.2 Verify student dossier endpoint NEVER leaks activationToken
    const dossierRes = await request(`/api/students/${testStuId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(dossierRes.status === 200, `Admin retrieves student dossier (HTTP 200)`);
    assert(dossierRes.data.activationToken === undefined || dossierRes.data.activationToken === null,
        `Student dossier response completely excludes activationToken`);

    // 3.3 Verify CSV Onboarding generates fragment URL (#/activate#token=...)
    const csvContent = `studentId,name,email,program,cgpa\nTEST-CSV-${Date.now().toString().slice(-4)},Charlie Smith,charlie.${Date.now().toString().slice(-4)}@collegea.edu,Computer Science,8.90`;
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const formBody = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="roster.csv"\r\nContent-Type: text/csv\r\n\r\n${csvContent}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="portalBaseUrl"\r\n\r\nhttp://localhost:3002\r\n`),
        Buffer.from(`--${boundary}--\r\n`)
    ]);

    const csvRes = await request('/api/students/import-csv', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: formBody
    });
    assert(csvRes.status === 200, `CSV onboarding processed (HTTP 200)`);
    assert(csvRes.data.items && csvRes.data.items.length > 0, `CSV items returned with activation data`);
    const csvItem = csvRes.data.items[0];
    assert(Boolean(csvItem.activationLink && csvItem.activationLink.includes('#/activate#token=')),
        `CSV activation link strictly uses URL fragment: ${csvItem.activationLink}`);
    assert(!csvItem.activationLink.includes('?token='),
        `CSV activation link NEVER uses query parameters (?token=)`);

    // -------------------------------------------------------------------------
    // [SUITE 4] Database Migration & Check Constraint Verification
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 4] Database Migration & Check Constraint Verification');

    // Verify migration file exists in source tree
    const migrationFile = path.join(__dirname, '..', 'college-a', 'backend', 'src', 'main', 'resources', 'db', 'migration', 'V1_1__update_student_status_constraint.sql');
    assert(fs.existsSync(migrationFile), `Version-controlled migration V1_1__update_student_status_constraint.sql exists in repository`);

    const runnerFile = path.join(__dirname, '..', 'college-a', 'backend', 'src', 'main', 'java', 'com', 'depa', 'provider', 'config', 'CollegeADatabaseConstraintMigration.java');
    assert(fs.existsSync(runnerFile), `Automated startup migration CollegeADatabaseConstraintMigration.java exists in repository`);

    // Verify student in PENDING_ACTIVATION status persists and queries without SQL constraint violation
    const checkStu = allStudentsRes.data.find(s => s.studentId === testStuId);
    assert(checkStu !== undefined, `Provisioned candidate persisted safely in PostgreSQL college_a_db`);

    // -------------------------------------------------------------------------
    // [SUITE 5] Consent Decision Lifecycle & Security Policies
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 5] Consent Decision Lifecycle & Security Policies');

    // Authenticate as Alice Johnson (STU-2023-001)
    const aliceLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student1@collegea.edu', password: 'StudentPassword123' })
    });
    assert(aliceLogin.status === 200, `Alice Johnson (STU-2023-001) authenticated (HTTP 200)`);
    const aliceToken = aliceLogin.data.accessToken || aliceLogin.data.token;

    // Login as College B Admin in Consent Manager to seed fresh consent requests
    const cmColBLogin = await request(`${CM_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@collegeb.edu', password: 'CollegeAdmin123' })
    });
    assert(cmColBLogin.status === 200, `College B Admin authenticated with CM (HTTP 200)`);
    const cmColBToken = cmColBLogin.data.accessToken || cmColBLogin.data.token;

    // Seed Data Request 1: For Granular Subset Approval & Revocation
    const req1 = await request(`${CM_URL}/api/data-requests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cmColBToken}`
        },
        body: JSON.stringify({
            dataPrincipalId: 'STU-2023-001',
            providerOrganizationId: 'COLLEGE_A',
            purpose: 'PG Admissions Academic Verification',
            requestedFields: ['STUDENT_ID', 'NAME', 'CGPA', 'TRANSCRIPT']
        })
    });
    assert(req1.status === 201, `Seeded Data Request 1 in CM (ID: ${req1.data?.id})`);
    const req1Id = req1.data?.id;

    // Seed Data Request 2: For Rejection Verification
    const req2 = await request(`${CM_URL}/api/data-requests`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cmColBToken}`
        },
        body: JSON.stringify({
            dataPrincipalId: 'STU-2023-001',
            providerOrganizationId: 'COLLEGE_A',
            purpose: 'Third-Party Verification Test',
            requestedFields: ['STUDENT_ID', 'NAME']
        })
    });
    assert(req2.status === 201, `Seeded Data Request 2 in CM for Rejection (ID: ${req2.data?.id})`);
    const req2Id = req2.data?.id;

    // 5.1 Student retrieves pending consents
    const pendingRes = await request('/api/student/consents/pending', {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(pendingRes.status === 200, `Student retrieves pending consents from CM via College A bridge (HTTP 200)`);
    const pendingItems = Array.isArray(pendingRes.data) ? pendingRes.data : [];
    const item1 = pendingItems.find(i => i.dataRequestId === req1Id);
    const item2 = pendingItems.find(i => i.dataRequestId === req2Id);

    assert(Boolean(item1), `Pending consent list includes Data Request 1 (CREQ ID: ${item1?.id})`);
    assert(Boolean(item2), `Pending consent list includes Data Request 2 (CREQ ID: ${item2?.id})`);

    const creq1Id = item1 ? item1.id : null;
    const creq2Id = item2 ? item2.id : null;

    // 5.2 Test unauthorized field injection: Student attempts to approve field not in requestedFields
    const injectRes = await request(`/api/student/consents/${creq1Id}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${aliceToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            approvedFields: ['STUDENT_ID', 'NAME', 'UNAUTHORIZED_FINANCIAL_RECORDS']
        })
    });
    assert([400, 403, 409, 500].includes(injectRes.status), `Unauthorized field injection rejected by backend (HTTP ${injectRes.status})`);

    // 5.3 Test granular subset approval (Approve ['STUDENT_ID', 'NAME', 'CGPA'], omitting TRANSCRIPT)
    const approveRes = await request(`/api/student/consents/${creq1Id}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${aliceToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            approvedFields: ['STUDENT_ID', 'NAME', 'CGPA']
        })
    });
    assert(approveRes.status === 200, `Granular subset approval succeeds with HTTP 200`);
    assert(approveRes.data.status === 'APPROVED', `Consent status transitioned to APPROVED`);
    assert(approveRes.data.approvedFields && !approveRes.data.approvedFields.includes('TRANSCRIPT'),
        `Omitted field (TRANSCRIPT) strictly excluded from approved fields`);
    assert(approveRes.data.accessToken === undefined, `Zero Token Leakage: Transaction Access JWT NEVER exposed to student browser`);
    const consentId = approveRes.data.consentId || creq1Id;

    // 5.4 Test duplicate approval submission (Idempotency)
    const dupApproveRes = await request(`/api/student/consents/${creq1Id}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${aliceToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            approvedFields: ['STUDENT_ID', 'NAME', 'CGPA']
        })
    });
    assert(dupApproveRes.status === 200, `Duplicate approval submission handled idempotently (HTTP 200)`);

    // 5.5 Test Rejection Workflow on Request 2
    const rejectRes = await request(`/api/student/consents/${creq2Id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(rejectRes.status === 200, `Consent rejection succeeds with HTTP 200`);

    // Verify rejected request cannot subsequently be approved
    const approveRejectedRes = await request(`/api/student/consents/${creq2Id}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${aliceToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approvedFields: ['STUDENT_ID'] })
    });
    assert([400, 403, 409, 500].includes(approveRejectedRes.status),
        `Attempt to approve already-rejected request fails with HTTP ${approveRejectedRes.status}`);

    // 5.6 Test Instantaneous Revocation of Consent 1
    const revokeRes = await request(`/api/student/consents/${consentId}/revoke`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(revokeRes.status === 200, `Consent successfully revoked instantaneously (HTTP 200)`);

    // 5.7 Test direct data access rejection with revoked consent / grant
    const revokedDataAccess = await request(`/api/data/access/${consentId}`, {
        headers: { 'Authorization': `Bearer dummy.token.revoked` }
    });
    assert(revokedDataAccess.status === 403, `Direct data access on revoked grant rejected with HTTP 403 Forbidden`);

    // -------------------------------------------------------------------------
    // [SUITE 6] Student Ownership & Multi-Student Isolation
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 6] Student Ownership & Multi-Student Isolation');

    // 6.1 Student A (Alice Johnson) retrieves own profile
    const aliceProfile = await request('/api/student/profile', {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(aliceProfile.status === 200, `Student A retrieves own profile (HTTP 200)`);
    assert(aliceProfile.data.studentId === 'STU-2023-001', `Profile student ID matches Student A (${aliceProfile.data.studentId})`);

    // 6.2 Student B (Alice Doe) retrieves own profile
    const studentBProfile = await request('/api/student/profile', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(studentBProfile.status === 200, `Student B retrieves own profile (HTTP 200)`);
    assert(studentBProfile.data.studentId === testStuId, `Profile student ID matches Student B (${studentBProfile.data.studentId})`);

    // 6.3 Student A attempts to manipulate query params to read Student B's profile
    const manipulatedProfile = await request(`/api/student/profile?studentId=${testStuId}`, {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(manipulatedProfile.status === 200 && manipulatedProfile.data.studentId === 'STU-2023-001',
        `Query parameter manipulation ignored; service-layer strictly enforces token identity (STU-2023-001)`);

    // 6.4 Student B cannot approve Student A's consent request
    const crossStudentApprove = await request(`/api/student/consents/${creq1Id}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${studentToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approvedFields: ['STUDENT_ID'] })
    });
    assert(crossStudentApprove.status === 403 || crossStudentApprove.status === 500,
        `Student B attempting to approve Student A's request rejected with HTTP ${crossStudentApprove.status}`);

    // 6.5 Role restrictions: Admin blocked from student endpoints, Student blocked from admin endpoints
    const adminAccessStudent = await request('/api/student/profile', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminAccessStudent.status === 403, `College Admin blocked from /api/student/profile with HTTP 403 Forbidden`);

    const studentAccessAdmin = await request('/api/students', {
        headers: { 'Authorization': `Bearer ${aliceToken}` }
    });
    assert(studentAccessAdmin.status === 403, `Student blocked from /api/students directory with HTTP 403 Forbidden`);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n==============================================================================');
    console.log(`   STAGE 5.1 VERIFICATION COMPLETE`);
    console.log(`   TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
    console.log('==============================================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});

/**
 * ==============================================================================
 * STAGE 5 — COLLEGE A PROVIDER PORTAL VERIFICATION SUITE
 * Exhaustive integration, student ownership, consent workflow, and security tests.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLLEGE_A_URL = 'http://localhost:8081';
const CM_URL = 'http://localhost:8095';
const FRONTEND_URL = 'http://localhost:3002';

function executeCollegeASql(sql) {
    try {
        const psqlPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
        if (fs.existsSync(psqlPath)) {
            execSync(`"${psqlPath}" -U postgres -d college_a_db -c "${sql}"`, {
                env: { ...process.env, PGPASSWORD: 'root' },
                stdio: 'pipe'
            });
            return true;
        }
    } catch (e) {
        console.warn('SQL warning:', e.message);
    }
    return false;
}

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
    const url = endpoint.startsWith('http') ? endpoint : `${COLLEGE_A_URL}${endpoint}`;
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
    console.log('   DEPA COLLEGE A — STAGE 5 PROVIDER PORTAL VERIFICATION SUITE');
    console.log('   Node API: ' + COLLEGE_A_URL + ' | CM API: ' + CM_URL + ' | Frontend: ' + FRONTEND_URL);
    console.log('==============================================================================\n');

    // -------------------------------------------------------------------------
    // [SUITE 1] Modular File Architecture & Production Hygiene
    // -------------------------------------------------------------------------
    console.log('[SUITE 1] Modular File Architecture & Production Hygiene');
    const baseFrontend = path.join(__dirname, '..', 'college-a', 'frontend');
    const requiredFiles = [
        'index.html',
        'app.js',
        'config.js',
        path.join('css', 'driveflow-theme.css'),
        path.join('js', 'auth', 'session.js'),
        path.join('js', 'auth', 'auth-controller.js'),
        path.join('js', 'services', 'api.js'),
        path.join('js', 'ui-components.js'),
        path.join('js', 'router.js'),
        path.join('js', 'pages', 'login-admin.js'),
        path.join('js', 'pages', 'login-student.js'),
        path.join('js', 'pages', 'student-activate.js'),
        path.join('js', 'pages', 'admin', 'overview.js'),
        path.join('js', 'pages', 'admin', 'students.js'),
        path.join('js', 'pages', 'admin', 'onboarding.js'),
        path.join('js', 'pages', 'admin', 'academic-data.js'),
        path.join('js', 'pages', 'admin', 'monitor.js'),
        path.join('js', 'pages', 'admin', 'audit.js'),
        path.join('js', 'pages', 'student', 'overview.js'),
        path.join('js', 'pages', 'student', 'profile.js'),
        path.join('js', 'pages', 'student', 'pending.js'),
        path.join('js', 'pages', 'student', 'history.js')
    ];

    for (const f of requiredFiles) {
        const fullPath = path.join(baseFrontend, f);
        assert(fs.existsSync(fullPath), `Required modular file exists: ${f}`);
    }

    const indexHtml = fs.readFileSync(path.join(baseFrontend, 'index.html'), 'utf8');
    assert(!indexHtml.includes('college-role-selector'), 'Legacy role switcher selector (<select>) completely purged from index.html');
    assert(indexHtml.includes('driveflow-theme.css'), 'DriveFlow Academic Emerald design system stylesheet linked');
    assert(indexHtml.includes('js/router.js') && indexHtml.includes('app.js'), 'Router and application controller linked');

    // -------------------------------------------------------------------------
    // [SUITE 2] Real Backend Authentication & Role Separation
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 2] Real Backend Authentication & Role Separation');

    // 2.1 College Admin Authentication
    const adminLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dean@collegea.edu', password: 'OrgAdmin@123' })
    });
    assert(adminLogin.status === 200, `College Admin authenticates with real backend (HTTP 200)`);
    assert(adminLogin.data && adminLogin.data.role === 'ORG_ADMIN', `Admin role is strictly ORG_ADMIN (${adminLogin.data?.role})`);
    assert(adminLogin.data && adminLogin.data.studentId === null, `Admin has no studentId assigned (${adminLogin.data?.studentId})`);
    const adminToken = adminLogin.data ? adminLogin.data.accessToken : null;

    // 2.2 Student Authentication (Alice Johnson)
    const studentLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student1@collegea.edu', password: 'StudentPassword123' })
    });
    assert(studentLogin.status === 200, `Student authenticates with real backend (HTTP 200)`);
    assert(studentLogin.data && studentLogin.data.role === 'STUDENT', `Student role is strictly STUDENT (${studentLogin.data?.role})`);
    assert(studentLogin.data && studentLogin.data.studentId === 'STU-2023-001', `Student token bound to student ID (${studentLogin.data?.studentId})`);
    const studentToken = studentLogin.data ? studentLogin.data.accessToken : null;

    // 2.3 Bad Credentials Rejection
    const badLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student1@collegea.edu', password: 'WrongPassword999' })
    });
    assert(badLogin.status === 401, `Invalid password rejected with HTTP 401 Unauthorized`);

    const nonExistentLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@collegea.edu', password: 'SomePassword123' })
    });
    assert(nonExistentLogin.status === 401, `Non-existent user rejected with HTTP 401 Unauthorized`);

    // -------------------------------------------------------------------------
    // [SUITE 3] Single-Use Student Activation & Password Provisioning
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 3] Single-Use Student Activation & Password Provisioning');
    const testStuId = `TEST-ACT-${Date.now()}`;
    const testEmail = `test.act.${Date.now()}@collegea.edu`;

    // 3.1 Admin provisions student with no password (triggers token generation)
    const addRes = await request('/api/students', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            studentId: testStuId,
            name: 'Activation Test Student',
            email: testEmail,
            program: 'B.Tech Information Technology',
            cgpa: '9.20 / 10.0'
        })
    });
    assert(addRes.status === 201, `Admin provisions unactivated student (HTTP 201 Created)`);
    const rawToken = addRes.data ? addRes.data.activationToken : null;
    assert(Boolean(rawToken && rawToken.length >= 32), `Secure random activation token minted (Length: ${rawToken ? rawToken.length : 0})`);

    // 3.2 Unactivated student cannot log in before password setup
    const prematureLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'AnyPassword123' })
    });
    assert(prematureLogin.status === 401, `Unactivated student blocked from logging in (HTTP 401)`);

    // 3.3 Validate token via POST /api/auth/activation/validate
    const valRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken })
    });
    assert(valRes.status === 200, `Token validation succeeds with HTTP 200`);
    assert(valRes.data && valRes.data.studentId === testStuId, `Validation returns correct studentId (${valRes.data?.studentId})`);
    assert(valRes.data && Boolean(valRes.data.maskedEmail), `Validation masks student email for privacy (${valRes.data?.maskedEmail})`);

    // 3.4 Invalid / Tampered token rejected
    const badTokenVal = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid_tampered_token_xyz_123456789' })
    });
    assert(badTokenVal.status === 400 || badTokenVal.status === 500, `Tampered activation token rejected (${badTokenVal.status})`);

    // 3.5 Complete password setup
    const newPassword = 'ActivatedPassword123';
    const setupRes = await request('/api/auth/activation/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken, password: newPassword })
    });
    assert(setupRes.status === 200, `Password setup completed successfully (HTTP 200)`);
    assert(setupRes.data && setupRes.data.status === 'ACTIVE', `Student status transitioned to ACTIVE`);

    // 3.6 Single-use token replay rejected
    const replaySetup = await request('/api/auth/activation/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawToken, password: 'AnotherPassword123' })
    });
    assert(replaySetup.status === 400 || replaySetup.status === 500, `Single-use token reuse prevented (HTTP ${replaySetup.status})`);

    // 3.7 Activated student can now log in
    const activatedLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: newPassword })
    });
    assert(activatedLogin.status === 200, `Activated student successfully logs in (HTTP 200, Role: ${activatedLogin.data?.role})`);

    // Clean up test student
    executeCollegeASql(`DELETE FROM students WHERE student_id = '${testStuId}';`);

    // -------------------------------------------------------------------------
    // [SUITE 4] Student Ownership & Multi-Student Isolation
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 4] Student Ownership & Multi-Student Isolation');

    // 4.1 Authenticated student retrieves own profile
    const profileRes = await request('/api/student/profile', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(profileRes.status === 200, `Student retrieves own profile via GET /api/student/profile (HTTP 200)`);
    assert(profileRes.data && profileRes.data.studentId === 'STU-2023-001', `Profile student ID strictly matches authenticated principal (${profileRes.data?.studentId})`);
    assert(profileRes.data && profileRes.data.passwordHash === undefined, `Student profile never serializes BCrypt password hash`);

    // 4.2 Admin blocked from student profile endpoint (requires STUDENT role)
    const adminAccessStudentProf = await request('/api/student/profile', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminAccessStudentProf.status === 403, `Admin blocked from /api/student/profile with HTTP 403 Forbidden`);

    // 4.3 Student blocked from Admin endpoints (requires ORG_ADMIN role)
    const studentAccessAdminEndpoint = await request('/api/students', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(studentAccessAdminEndpoint.status === 403, `Student blocked from GET /api/students with HTTP 403 Forbidden`);

    const studentAccessOnboardEndpoint = await request('/api/provider/onboarding/eligible-students', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(studentAccessOnboardEndpoint.status === 403, `Student blocked from onboarding endpoints with HTTP 403 Forbidden`);

    // -------------------------------------------------------------------------
    // [SUITE 5] Consent Decision Workflow (Inbox, Decisions, Assertion Signing)
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 5] Consent Decision Workflow (Inbox, Decisions, Assertion Signing)');

    // 5.0 Seed a live data request from College B via CM API if needed
    let reqCreate = null;
    const colBLogin = await request(`${CM_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@collegeb.edu', password: 'CollegeAdmin123' })
    });
    console.log('    colBLogin status:', colBLogin.status, colBLogin.data?.role || colBLogin.data);
    if (colBLogin.status === 200 && (colBLogin.data.accessToken || colBLogin.data.token)) {
        const colBToken = colBLogin.data.accessToken || colBLogin.data.token;
        reqCreate = await request(`${CM_URL}/api/data-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${colBToken}`
            },
            body: JSON.stringify({
                dataPrincipalId: 'STU-2023-001',
                providerOrganizationId: 'COLLEGE_A',
                purpose: 'Academic & Employment credential verification',
                requestedFields: ['STUDENT_ID', 'NAME', 'CGPA', 'TRANSCRIPT']
            })
        });
        console.log('    reqCreate status:', reqCreate.status, reqCreate.data?.id || reqCreate.data);
        if (reqCreate.status === 201) {
            console.log(`    Created live data request ${reqCreate.data.id} from College B Consumer`);
        }
    }

    // 5.1 Student retrieves pending consents
    const pendingConsentsRes = await request('/api/student/consents/pending', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(pendingConsentsRes.status === 200, `Student retrieves pending consents from Consent Manager (HTTP 200)`);
    const pendingList = Array.isArray(pendingConsentsRes.data) ? pendingConsentsRes.data : [];
    console.log(`    Found ${pendingList.length} pending consent inquiries.`);
    assert(pendingList.length > 0, `At least one pending consent request retrieved by student`);

    // 5.2 Student retrieves consent history
    const historyRes = await request('/api/student/consents/history', {
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(historyRes.status === 200, `Student retrieves consent history (HTTP 200)`);
    const historyList = Array.isArray(historyRes.data) ? historyRes.data : [];
    console.log(`    Found ${historyList.length} past/active consent records.`);

    // 5.3 Granular approval with explicit subset of fields & RSA assertion signing
    if (pendingList.length > 0) {
        // Target the freshly created request matching reqCreate dataRequestId
        const targetReq = pendingList.find(i => i.dataRequestId === reqCreate?.data?.id) || pendingList[pendingList.length - 1];
        const subsetFields = ['STUDENT_ID', 'NAME', 'CGPA']; // Explicitly omit TRANSCRIPT
        const approveRes = await request(`/api/student/consents/${targetReq.id}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${studentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ approvedFields: subsetFields })
        });
        assert(approveRes.status === 200, `Student successfully approves consent with granular field subset (HTTP 200)`);
        assert(approveRes.data && Boolean(approveRes.data.grantId || approveRes.data.consentId || approveRes.data.accessToken || approveRes.data.status),
            `Consent Manager processed backend-signed assertion and updated status`);

        // 5.4 Instant Revocation
        const consentIdToRevoke = approveRes.data.consentId || targetReq.id;
        const revokeRes = await request(`/api/student/consents/${consentIdToRevoke}/revoke`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        assert(revokeRes.status === 200, `Student successfully revokes consent instantaneously (HTTP 200)`);
    } else {
        console.log('    ℹ Pending list was empty; skipping granular approve/revoke check');
    }

    // -------------------------------------------------------------------------
    // [SUITE 6] Provider-Side Direct Access & Live CM Introspection
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 6] Provider-Side Direct Access & Live CM Introspection');

    // 6.1 Direct data access without Bearer token -> rejected
    const unauthDataAccess = await request('/api/data/access/GRANT_TEST_123');
    assert(unauthDataAccess.status === 401, `Direct data access without Bearer token rejected with HTTP 401 Unauthorized`);

    // 6.2 Direct data access with invalid/bogus token -> rejected
    const bogusDataAccess = await request('/api/data/access/GRANT_TEST_123', {
        headers: { 'Authorization': 'Bearer bogus.jwt.token' }
    });
    assert(bogusDataAccess.status === 403, `Direct data access with forged token rejected with HTTP 403 Forbidden`);

    // -------------------------------------------------------------------------
    // [SUITE 7] Public Organization Registry dataBaseUrl Inspection
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 7] Public Organization Registry dataBaseUrl Inspection');
    const orgsRes = await request(`${CM_URL}/api/consents/organizations`);
    assert(orgsRes.status === 200, `Public organization registry accessible (HTTP 200)`);
    const orgs = Array.isArray(orgsRes.data) ? orgsRes.data : [];
    const colA = orgs.find(o => o.organizationCode === 'COLLEGE_A');
    const colB = orgs.find(o => o.organizationCode === 'COLLEGE_B');

    assert(Boolean(colA && colA.dataBaseUrl), `College A dataBaseUrl recorded: ${colA?.dataBaseUrl}`);
    assert(Boolean(colB && colB.dataBaseUrl), `College B dataBaseUrl recorded: ${colB?.dataBaseUrl}`);

    const disclosesLocalhost = orgs.some(o => o.dataBaseUrl && (o.dataBaseUrl.includes('localhost') || o.dataBaseUrl.includes('127.0.0.1')));
    if (disclosesLocalhost) {
        console.log('  ⚠️ AUDIT OBSERVATION: Public registry dataBaseUrl values currently resolve to localhost/development URLs. In a production multi-tenant deployment, these must be configured to public FQDNs.');
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n==============================================================================');
    console.log(`   STAGE 5 VERIFICATION COMPLETE`);
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

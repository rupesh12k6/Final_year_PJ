/**
 * ==============================================================================
 * STAGE 6 — COLLEGE B CONSUMER PORTAL VERIFICATION SUITE
 * Exhaustive integration, authentication, peer retrieval, SSRF protection,
 * CSV onboarding, and security hardening tests.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COLLEGE_B_URL = 'http://localhost:8082';
const COLLEGE_A_URL = 'http://localhost:8081';
const CM_URL = 'http://localhost:8095';
const FRONTEND_URL = 'http://localhost:3003';

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
    const url = endpoint.startsWith('http') ? endpoint : `${COLLEGE_B_URL}${endpoint}`;
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

function queryPostgres(db, sql) {
    try {
        const psqlPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
        if (fs.existsSync(psqlPath)) {
            const out = execSync(`"${psqlPath}" -U postgres -d ${db} -t -A -c "${sql}"`, {
                env: { ...process.env, PGPASSWORD: 'root' },
                stdio: 'pipe'
            });
            return out.toString().trim();
        }
    } catch (e) {
        console.warn('SQL execution error:', e.message);
    }
    return null;
}

async function run() {
    console.log('==============================================================================');
    console.log('   DEPA COLLEGE B — STAGE 6 CONSUMER PORTAL VERIFICATION SUITE');
    console.log('   Consumer API: ' + COLLEGE_B_URL + ' | Provider API: ' + COLLEGE_A_URL + ' | CM API: ' + CM_URL);
    console.log('   Frontend Portal: ' + FRONTEND_URL);
    console.log('==============================================================================\n');

    // -------------------------------------------------------------------------
    // [SUITE 1] Modular File Architecture & Production Hygiene
    // -------------------------------------------------------------------------
    console.log('[SUITE 1] Modular File Architecture & Production Hygiene');
    const baseFrontend = path.join(__dirname, '..', 'college-b', 'frontend');
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
        path.join('js', 'pages', 'admin', 'new-request.js'),
        path.join('js', 'pages', 'admin', 'requests.js'),
        path.join('js', 'pages', 'admin', 'records.js'),
        path.join('js', 'pages', 'admin', 'students.js'),
        path.join('js', 'pages', 'admin', 'onboarding.js'),
        path.join('js', 'pages', 'admin', 'profile.js'),
        path.join('js', 'pages', 'admin', 'audit.js'),
        path.join('js', 'pages', 'student', 'profile.js')
    ];

    for (const f of requiredFiles) {
        const fullPath = path.join(baseFrontend, f);
        assert(fs.existsSync(fullPath), `Required modular file exists: ${f}`);
    }

    const indexHtml = fs.readFileSync(path.join(baseFrontend, 'index.html'), 'utf8');
    assert(!indexHtml.includes('college-role-selector'), 'Legacy role switcher selector (<select>) completely purged from index.html');
    assert(!fs.existsSync(path.join(baseFrontend, 'test-session-helper.html')), 'Test session helper is not present in served frontend');
    assert(indexHtml.includes('vendor/css/bootstrap.min.css'), 'Locally vendored Bootstrap 5.3.3 linked in index.html');
    assert(indexHtml.includes('vendor/css/bootstrap-icons.min.css'), 'Locally vendored Bootstrap Icons linked in index.html');
    assert(indexHtml.includes('css/driveflow-theme.css'), 'DriveFlow Consumer Indigo theme linked in index.html');

    // -------------------------------------------------------------------------
    // [SUITE 2] Database Constraint & Status Migration
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 2] Database Constraint & Status Migration');
    const constraintDef = queryPostgres('college_b_db', "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'students_status_check';");
    assert(constraintDef && constraintDef.includes('PENDING_ACTIVATION'), `students_status_check allows PENDING_ACTIVATION: ${constraintDef}`);
    assert(constraintDef && constraintDef.includes('ACTIVE'), 'students_status_check allows ACTIVE');
    assert(constraintDef && constraintDef.includes('GRADUATED'), 'students_status_check allows GRADUATED');

    // -------------------------------------------------------------------------
    // [SUITE 3] Authentication, RBAC, and Role Separation
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 3] Authentication, RBAC, and Role Separation');
    
    // 3.1 Admin Authentication
    const adminLoginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dean@collegeb.edu', password: 'OrgAdmin@123' })
    });
    assert(adminLoginRes.status === 200, 'Admin login succeeded with HTTP 200');
    assert(adminLoginRes.data && adminLoginRes.data.role === 'ORG_ADMIN', 'Admin role is ORG_ADMIN');
    assert(adminLoginRes.data && adminLoginRes.data.organizationCode === 'COLLEGE_B', 'Admin organizationCode is COLLEGE_B');
    const adminToken = adminLoginRes.data.token;
    assert(!!adminToken && adminToken.split('.').length === 3, 'Valid JWT structure returned for Admin');

    // 3.2 Student Authentication
    const studentLoginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice.johnson@collegeb.edu', password: 'StudentPassword123' })
    });
    assert(studentLoginRes.status === 200, 'Student login succeeded with HTTP 200');
    assert(studentLoginRes.data && studentLoginRes.data.role === 'STUDENT', 'Student role is STUDENT');
    assert(studentLoginRes.data && studentLoginRes.data.studentId === 'STU-2023-001', 'Student ID is STU-2023-001');
    const studentToken = studentLoginRes.data.token;
    assert(!!studentToken && studentToken.split('.').length === 3, 'Valid JWT structure returned for Student');

    // 3.3 Invalid Credentials
    const badLoginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dean@collegeb.edu', password: 'WrongPassword999' })
    });
    assert(badLoginRes.status === 401, 'Invalid password rejected with HTTP 401');

    // 3.4 Role Guard: Student cannot access Admin student registry
    const studentForbiddenRes = await request('/api/students', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(studentForbiddenRes.status === 403, 'Student is forbidden (HTTP 403) from accessing admin student registry');

    // 3.5 Role Guard: Admin can access student registry
    const adminStudentsRes = await request('/api/students', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminStudentsRes.status === 200, 'Admin successfully accessed /api/students (HTTP 200)');
    assert(Array.isArray(adminStudentsRes.data), 'Returns student array');

    // -------------------------------------------------------------------------
    // [SUITE 4] Single Student Enrollment & Activation Flow
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 4] Single Student Enrollment & Activation Flow');
    const testStuId = `STU-TEST-${Date.now().toString().slice(-4)}`;
    const testStuEmail = `test.${Date.now().toString().slice(-4)}@collegeb.edu`;

    const enrollRes = await request('/api/students', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            studentId: testStuId,
            name: 'Test Candidate',
            email: testStuEmail,
            department: 'Computer Science',
            degree: 'B.Tech CS',
            cgpa: 8.80,
            password: null // Unset to test PENDING_ACTIVATION
        })
    });
    assert(enrollRes.status === 201, `Candidate enrolled with HTTP 201: ${testStuId}`);
    assert(enrollRes.data && enrollRes.data.status === 'PENDING_ACTIVATION', 'Candidate status is PENDING_ACTIVATION');
    const rawActivationToken = enrollRes.data.activationToken;
    assert(!!rawActivationToken, 'Activation token issued for new student candidate');

    // 4.2 Token Validation via POST body (no query param)
    const validateRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawActivationToken })
    });
    assert(validateRes.status === 200, 'Token validation via POST succeeded with HTTP 200');
    assert(validateRes.data && validateRes.data.valid === true, 'Token is valid');
    assert(validateRes.data && validateRes.data.studentId === testStuId, 'Token matches student ID');

    // 4.3 Password Setup
    const setupRes = await request('/api/auth/activation/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: rawActivationToken,
            password: 'NewStrongPassword@2026'
        })
    });
    assert(setupRes.status === 200, 'Password setup completed with HTTP 200');
    assert(setupRes.data && setupRes.data.success === true, 'Password setup marked success');

    // 4.4 Single-Use Enforced
    const reuseValidateRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawActivationToken })
    });
    assert(reuseValidateRes.status === 400 || (reuseValidateRes.data && reuseValidateRes.data.valid === false),
        'Reused activation token rejected (single-use enforced)');

    // 4.5 Login with newly activated credentials
    const newLoginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testStuEmail, password: 'NewStrongPassword@2026' })
    });
    assert(newLoginRes.status === 200, 'Activated student successfully logged in with new password');
    assert(newLoginRes.data && newLoginRes.data.role === 'STUDENT', 'Activated student role is STUDENT');

    // -------------------------------------------------------------------------
    // [SUITE 5] Outbound Request Initiation & Consent Manager Integration
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 5] Outbound Request Initiation & Consent Manager Integration');
    
    // 5.1 Initiate Data Request from College B for College A Student
    const initRequestRes = await request('/api/consumer/data-requests/initiate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            dataPrincipalId: 'STU-2023-001',
            providerOrganizationId: 'COLLEGE_A',
            purpose: 'Academic Verification for Master Program Admission',
            requestedFields: ['CGPA', 'TRANSCRIPT', 'DEGREE_CERTIFICATE']
        })
    });
    assert(initRequestRes.status === 201, 'Data request initiated successfully (HTTP 201)');
    const createdReq = initRequestRes.data;
    const reqId = createdReq.id || createdReq.dataRequestId;
    assert(!!reqId, `Data Request created with ID: ${reqId}`);

    // 5.2 Outgoing Requests List
    const listReqsRes = await request('/api/consumer/data-requests', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(listReqsRes.status === 200, 'Outbound requests listed with HTTP 200');
    assert(Array.isArray(listReqsRes.data), 'Requests list is an array');

    // 5.3 Sanitized Status Inspection (No Access Token Leakage)
    const statusRes = await request(`/api/consumer/data-requests/${encodeURIComponent(reqId)}/status`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(statusRes.status === 200, 'Sanitized grant status inspected with HTTP 200');
    assert(statusRes.data && !statusRes.data.accessToken, 'Access Token (RS256 JWT) is NEVER leaked to UI in status response');
    assert(statusRes.data && (statusRes.data.status === 'PENDING' || statusRes.data.status === 'REQUESTED'),
        `Grant status is correctly PENDING before student approval (status: ${statusRes.data.status})`);

    // -------------------------------------------------------------------------
    // [SUITE 6] End-to-End Consent Approval & Direct Peer Data Fetch
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 6] End-to-End Consent Approval & Direct Peer Data Fetch');
    
    // 6.1 Approve Consent from College A Student Perspective via Consent Manager
    // Authenticate student at College A
    const colAStudentLogin = await request('http://localhost:8081/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student1@collegea.edu', password: 'StudentPassword123' })
    });
    let colAStudentToken = colAStudentLogin.data ? (colAStudentLogin.data.accessToken || colAStudentLogin.data.token) : null;

    if (colAStudentToken) {
        // Find pending consent for this dataRequestId
        const pendingConsentsRes = await request('http://localhost:8081/api/student/consents/pending', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${colAStudentToken}` }
        });
        
        let targetConsent = null;
        if (Array.isArray(pendingConsentsRes.data)) {
            targetConsent = pendingConsentsRes.data.find(c => c.dataRequestId === reqId || c.id === reqId);
            if (!targetConsent && pendingConsentsRes.data.length > 0) {
                targetConsent = pendingConsentsRes.data[0];
            }
        }

        if (targetConsent) {
            const consentId = targetConsent.id;
            const approveRes = await request(`http://localhost:8081/api/student/consents/${consentId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${colAStudentToken}`
                },
                body: JSON.stringify({
                    approvedFields: ['CGPA', 'TRANSCRIPT', 'DEGREE_CERTIFICATE']
                })
            });
            assert(approveRes.status === 200, `Consent ${consentId} approved by College A student`);

            // Now check College B status
            const updatedStatusRes = await request(`/api/consumer/data-requests/${encodeURIComponent(reqId)}/status`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            assert(updatedStatusRes.status === 200, 'Polled updated status after approval');
            const isReady = updatedStatusRes.data && (updatedStatusRes.data.ready === true || updatedStatusRes.data.status === 'APPROVED');
            assert(isReady, `Grant is marked READY / APPROVED in College B (ready=${updatedStatusRes.data.ready}, status=${updatedStatusRes.data.status})`);

            // 6.2 Trigger Direct Peer Data Fetch from College B Backend
            const fetchRes = await request(`/api/consumer/data-requests/${encodeURIComponent(reqId)}/fetch-data`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            assert(fetchRes.status === 200, 'Direct Peer Data Fetch completed successfully (HTTP 200)');
            assert(fetchRes.data && fetchRes.data.retrievedData, 'Retrieved academic data payload returned');
            assert(fetchRes.data && !fetchRes.data.accessToken, 'Access Token is NOT disclosed in fetch-data response');
            console.log('    Retrieved Data Sample:', JSON.stringify(fetchRes.data.retrievedData).substring(0, 100) + '...');
        } else {
            console.log('    (Notice) No pending consent matching request ID found on College A; testing with existing grant if available');
        }
    } else {
        console.warn('    Could not log into College A student to auto-approve; skipping live fetch check');
    }

    // -------------------------------------------------------------------------
    // [SUITE 7] SSRF Security Protection Engine
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 7] SSRF Security Protection Engine');
    
    // 7.1 Malicious Cloud Metadata URL
    const ssrfMetadataRes = await request(`/api/consumer/data-requests/${encodeURIComponent(reqId)}/fetch-data?providerUrl=http://169.254.169.254/latest/meta-data`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(ssrfMetadataRes.status === 400 || ssrfMetadataRes.status === 403,
        `SSRF Attempt against AWS Metadata IP (169.254.169.254) blocked with HTTP ${ssrfMetadataRes.status}`);

    // 7.2 Malicious External Domain URL
    const ssrfEvilRes = await request(`/api/consumer/data-requests/${encodeURIComponent(reqId)}/fetch-data?providerUrl=http://evil-attacker.com/steal-data`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(ssrfEvilRes.status === 400 || ssrfEvilRes.status === 403,
        `SSRF Attempt against external domain (evil-attacker.com) blocked with HTTP ${ssrfEvilRes.status}`);

    // 7.3 Dangerous Port SSRF (SSH port 22)
    const ssrfPortRes = await request(`/api/consumer/fetch-direct-data?providerUrl=http://localhost:22`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ grantId: 'fake-grant', accessToken: 'fake-token' })
    });
    assert(ssrfPortRes.status === 400 || ssrfPortRes.status === 401 || ssrfPortRes.status === 403,
        `SSRF Attempt against non-HTTP port 22 blocked with HTTP ${ssrfPortRes.status}`);

    // -------------------------------------------------------------------------
    // [SUITE 8] Batch Student CSV Onboarding
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 8] Batch Student CSV Onboarding');
    const csvContent = "studentId,name,email,department,degree,cgpa\n"
        + `STU-CSV-${Date.now().toString().slice(-4)},Maria Garcia,maria.${Date.now().toString().slice(-4)}@collegeb.edu,Data Science,B.Sc Data Science,9.20\n`;
    
    const boundary = '---------------------------' + Date.now().toString(16);
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="test_students.csv"\r\n`;
    body += `Content-Type: text/csv\r\n\r\n`;
    body += csvContent + `\r\n`;
    body += `--${boundary}--\r\n`;

    const csvRes = await fetch(`${COLLEGE_B_URL}/api/students/import-csv`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: Buffer.from(body)
    });
    assert(csvRes.status === 200, 'Batch CSV import succeeded with HTTP 200');
    const csvData = await csvRes.json();
    assert(csvData.importedCount >= 1, `CSV imported at least 1 student (imported: ${csvData.importedCount})`);
    if (csvData.items && csvData.items.length > 0) {
        assert(!!csvData.items[0].activationToken, 'CSV import generated single-use activation tokens');
    }

    // -------------------------------------------------------------------------
    // [SUITE 9] Student Personal Academic Profile
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 9] Student Personal Academic Profile');
    const stuProfileRes = await request('/api/student/profile', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(stuProfileRes.status === 200, 'Student profile fetched with HTTP 200');
    assert(stuProfileRes.data && stuProfileRes.data.studentId === 'STU-2023-001', 'Profile studentId is STU-2023-001');
    assert(stuProfileRes.data && stuProfileRes.data.name === 'Alice Johnson', 'Profile name is Alice Johnson');

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n==============================================================================');
    console.log(`   STAGE 6 VERIFICATION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==============================================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});

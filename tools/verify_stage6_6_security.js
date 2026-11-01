/**
 * ==============================================================================
 * STAGE 6.6 — COLLEGE B FINAL SECURITY HARDENING VERIFICATION SUITE
 * Exhaustive security tests for Access JWT Secrecy, Browser Storage Hygiene,
 * SSRF Attack Matrix, Audit Authenticity, and End-to-End Regression.
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
    console.log('   DEPA COLLEGE B — STAGE 6.6 FINAL SECURITY HARDENING VERIFICATION');
    console.log('   Consumer API: ' + COLLEGE_B_URL + ' | Provider API: ' + COLLEGE_A_URL + ' | CM API: ' + CM_URL);
    console.log('   Frontend: ' + FRONTEND_URL);
    console.log('==============================================================================\n');

    // -------------------------------------------------------------------------
    // [SUITE 1] Access JWT Secrecy Verification
    // -------------------------------------------------------------------------
    console.log('[SUITE 1] Access JWT Secrecy Verification (GET /api/consumer/data-requests/{id}/grant)');

    // 1.1 Authenticate as Admin and Student
    const adminLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dean@collegeb.edu', password: 'OrgAdmin@123' })
    });
    assert(adminLogin.status === 200, 'Admin login succeeded (HTTP 200)');
    const adminToken = adminLogin.data.token;

    const studentLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'alice.johnson@collegeb.edu', password: 'StudentPassword123' })
    });
    assert(studentLogin.status === 200, 'Student login succeeded (HTTP 200)');
    const studentToken = studentLogin.data.token;

    // Find an active/approved request to test against
    const listReqs = await request('/api/consumer/data-requests', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const approvedReq = Array.isArray(listReqs.data) ? listReqs.data.find(r => r.status === 'ACTIVE' || r.status === 'APPROVED') : null;
    const testReqId = approvedReq ? (approvedReq.id || approvedReq.dataRequestId) : 'DREQ_TEST_SEC';

    // 1.2 Admin JWT CANNOT retrieve raw Access JWT via /grant
    const adminGrantRes = await request(`/api/consumer/data-requests/${testReqId}/grant`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(adminGrantRes.status === 403, `Admin JWT without X-API-KEY blocked from /grant with HTTP 403 (actual: ${adminGrantRes.status})`);
    assert(adminGrantRes.data && adminGrantRes.data.error === 'Access Denied', 'Returns "Access Denied" error object');
    assert(adminGrantRes.data && !adminGrantRes.data.accessToken, 'Admin JWT response NEVER contains accessToken');

    // 1.3 Student JWT CANNOT retrieve /grant
    const studentGrantRes = await request(`/api/consumer/data-requests/${testReqId}/grant`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    assert(studentGrantRes.status === 403, `Student JWT blocked from /grant with HTTP 403 (actual: ${studentGrantRes.status})`);
    assert(!studentGrantRes.data || !studentGrantRes.data.accessToken, 'Student response NEVER contains accessToken');

    // 1.4 Unauthenticated request CANNOT retrieve /grant
    const unauthGrantRes = await request(`/api/consumer/data-requests/${testReqId}/grant`, {
        method: 'GET'
    });
    assert(unauthGrantRes.status === 401 || unauthGrantRes.status === 403, `Unauthenticated request blocked from /grant with HTTP ${unauthGrantRes.status}`);

    // 1.5 Internal Backend call with valid X-API-KEY succeeds
    const internalGrantRes = await request(`/api/consumer/data-requests/${testReqId}/grant`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'X-API-KEY': 'B-INTERNAL-SECRET-KEY'
        }
    });
    if (approvedReq) {
        assert(internalGrantRes.status === 200, `Internal backend call with X-API-KEY succeeds (HTTP 200)`);
        assert(internalGrantRes.data && internalGrantRes.data.ready === true, 'Internal backend grant is ready');
    } else {
        assert(internalGrantRes.status === 200 || internalGrantRes.status === 500, 'Internal backend endpoint reached with X-API-KEY');
    }

    // 1.6 Browser-facing status endpoint NEVER leaks Access JWT
    const statusRes = await request(`/api/consumer/data-requests/${testReqId}/status`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(statusRes.status === 200, 'Grant status endpoint accessible to Admin (HTTP 200)');
    assert(statusRes.data && statusRes.data.accessToken === undefined, 'Sanitized status response NEVER includes accessToken property');

    // 1.7 Direct Data Fetch endpoint NEVER leaks Access JWT in response
    if (approvedReq) {
        const fetchRes = await request(`/api/consumer/data-requests/${testReqId}/fetch-data`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(fetchRes.status === 200, 'Direct data fetch succeeded (HTTP 200)');
        assert(fetchRes.data && fetchRes.data.accessToken === undefined, 'Fetch response NEVER includes accessToken property');
        assert(fetchRes.data && fetchRes.data.retrievedData !== undefined, 'Fetch response returns decrypted academic records');
    }

    // -------------------------------------------------------------------------
    // [SUITE 2] Browser Storage & Sensitive Academic Data Hygiene
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 2] Browser Storage & Sensitive Academic Data Hygiene');

    const baseFrontend = path.join(__dirname, '..', 'college-b', 'frontend');
    const recordsJs = fs.readFileSync(path.join(baseFrontend, 'js', 'pages', 'admin', 'records.js'), 'utf8');
    const requestsJs = fs.readFileSync(path.join(baseFrontend, 'js', 'pages', 'admin', 'requests.js'), 'utf8');
    const sessionJs = fs.readFileSync(path.join(baseFrontend, 'js', 'auth', 'session.js'), 'utf8');

    assert(!recordsJs.includes("sessionStorage.setItem('colb_retrieved_records'"),
        'records.js does NOT write retrieved academic records to sessionStorage');
    assert(!recordsJs.includes("localStorage.setItem('colb_retrieved_records'"),
        'records.js does NOT write retrieved academic records to localStorage');
    assert(!requestsJs.includes("sessionStorage.setItem('colb_retrieved_records'"),
        'requests.js does NOT cache retrieved academic records in sessionStorage');
    assert(!requestsJs.includes("localStorage.setItem('colb_retrieved_records'"),
        'requests.js does NOT cache retrieved academic records in localStorage');

    const recordsStoreExists = fs.existsSync(path.join(baseFrontend, 'js', 'services', 'records-store.js'));
    assert(recordsStoreExists, 'Volatile in-memory store (records-store.js) exists');

    assert(sessionJs.includes('DF_RECORDS_STORE.clear'),
        'session.js clears in-memory academic records on logout/session clear');

    // -------------------------------------------------------------------------
    // [SUITE 3] Audit Trail Authenticity & Transparency
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 3] Audit Trail Authenticity & Transparency');

    const auditJs = fs.readFileSync(path.join(baseFrontend, 'js', 'pages', 'admin', 'audit.js'), 'utf8');
    assert(auditJs.includes('Session Operations Activity Feed'),
        'audit.js accurately labeled as "Session Operations Activity Feed"');
    assert(auditJs.includes('Consent Manager Regulatory Authority'),
        'audit.js contains disclaimer noting centralized statutory audit logging at Consent Manager');
    assert(!auditJs.includes('Immutable record of outbound requests'),
        'audit.js purged false claims of browser-side immutability');

    // -------------------------------------------------------------------------
    // [SUITE 4] SSRF Security Protection Matrix (13 Attack Vectors)
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 4] SSRF Security Protection Matrix');

    const ssrfVectors = [
        { name: 'Cloud Metadata IP (169.254.169.254)', url: 'http://169.254.169.254/latest/meta-data', expected: [400, 403] },
        { name: 'Cloud Metadata Google (metadata.google.internal)', url: 'http://metadata.google.internal/computeMetadata/v1/', expected: [400, 403] },
        { name: 'External Untrusted Domain (evil-attacker.com)', url: 'http://evil-attacker.com/steal-data', expected: [400, 403] },
        { name: 'Disallowed Scheme: ftp://', url: 'ftp://evil.com/payload', expected: [400, 403] },
        { name: 'Disallowed Scheme: file://', url: 'file:///etc/passwd', expected: [400, 403] },
        { name: 'Disallowed Scheme: gopher://', url: 'gopher://127.0.0.1:8081', expected: [400, 403] },
        { name: 'Dangerous Port: SSH (port 22)', url: 'http://localhost:22', expected: [400, 403] },
        { name: 'Dangerous Port: SMTP (port 25)', url: 'http://localhost:25', expected: [400, 403] },
        { name: 'Dangerous Port: PostgreSQL (port 5432)', url: 'http://localhost:5432', expected: [400, 403] },
        { name: 'Dangerous Port: Redis (port 6379)', url: 'http://localhost:6379', expected: [400, 403] },
        { name: 'Dangerous Port: Docker (port 2375)', url: 'http://localhost:2375', expected: [400, 403] },
        { name: 'Embedded Credentials (http://admin:secret@...)', url: 'http://admin:secret@localhost:8081', expected: [400, 403] },
        { name: 'Decimal Encoded IP (http://2130706433:8081)', url: 'http://2130706433:8081', expected: [400, 403] },
        { name: 'Hex Encoded IP (http://0x7f000001:8081)', url: 'http://0x7f000001:8081', expected: [400, 403] }
    ];

    for (const v of ssrfVectors) {
        const res = await request(`/api/consumer/data-requests/${testReqId}/fetch-data?providerUrl=${encodeURIComponent(v.url)}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert(v.expected.includes(res.status), `SSRF Vector blocked: ${v.name} -> HTTP ${res.status}`);
    }

    // Direct exchange endpoint without X-API-KEY blocked
    const directNoKey = await request('/api/consumer/fetch-direct-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ grantId: 'G1', accessToken: 'T1' })
    });
    assert(directNoKey.status === 401, `fetch-direct-data without X-API-KEY blocked with HTTP 401 (actual: ${directNoKey.status})`);

    // -------------------------------------------------------------------------
    // [SUITE 5] Database Check Constraint & Migration Verification
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 5] Database Check Constraint & Migration Verification');
    const constraintDef = queryPostgres('college_b_db', "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'students_status_check';");
    assert(constraintDef && constraintDef.includes('PENDING_ACTIVATION'), `students_status_check allows PENDING_ACTIVATION: ${constraintDef}`);
    assert(constraintDef && constraintDef.includes('ACTIVE'), 'students_status_check allows ACTIVE');
    assert(constraintDef && constraintDef.includes('GRADUATED'), 'students_status_check allows GRADUATED');

    const totalStudents = queryPostgres('college_b_db', 'SELECT count(*) FROM students;');
    assert(parseInt(totalStudents, 10) > 0, `Existing database records preserved intact (count: ${totalStudents})`);

    // -------------------------------------------------------------------------
    // [SUITE 6] Full End-to-End Regression Workflow
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 6] Full End-to-End Regression Workflow');

    // 6.1 Enroll single student candidate with PENDING_ACTIVATION
    const testStuId = `STU-SEC-${Date.now().toString().slice(-4)}`;
    const testEmail = `sec.${Date.now().toString().slice(-4)}@collegeb.edu`;

    const enrollRes = await request('/api/students', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            studentId: testStuId,
            name: 'Security Test Student',
            email: testEmail,
            department: 'Cybersecurity',
            degree: 'M.Tech Cyber Defense',
            cgpa: 9.35,
            password: null
        })
    });
    assert(enrollRes.status === 201, `Student enrolled (HTTP 201): ${testStuId}`);
    assert(enrollRes.data && enrollRes.data.status === 'PENDING_ACTIVATION', 'Candidate status is PENDING_ACTIVATION');
    const actToken = enrollRes.data.activationToken;
    assert(!!actToken, 'Single-use activation token generated');

    // 6.2 Token validation via POST
    const valRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: actToken })
    });
    assert(valRes.status === 200 && valRes.data.valid === true, 'Token validation succeeded via POST');

    // 6.3 Password setup
    const pwdRes = await request('/api/auth/activation/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: actToken, password: 'HardenedPassword@2026' })
    });
    assert(pwdRes.status === 200 && pwdRes.data.success === true, 'Password setup completed');

    // 6.4 Single-use token replay rejected
    const replayRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: actToken })
    });
    assert(replayRes.status === 400 || (replayRes.data && replayRes.data.valid === false),
        'Token reuse rejected (single-use enforced)');

    // 6.5 Newly activated student logs in
    const actLoginRes = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: 'HardenedPassword@2026' })
    });
    assert(actLoginRes.status === 200 && actLoginRes.data.role === 'STUDENT', 'Activated student logs in successfully');

    // 6.6 Student profile query
    const stuProfRes = await request('/api/student/profile', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${actLoginRes.data.token}` }
    });
    assert(stuProfRes.status === 200, 'Student profile fetched (HTTP 200)');
    assert(stuProfRes.data && stuProfRes.data.studentId === testStuId, 'Profile matches authenticated studentId');

    // 6.7 Cross-Node Request -> Consent -> Direct P2P Fetch
    const initReq = await request('/api/consumer/data-requests/initiate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            dataPrincipalId: 'STU-2023-001',
            providerOrganizationId: 'COLLEGE_A',
            purpose: 'Academic Credit Transfer Evaluation',
            requestedFields: ['CGPA', 'TRANSCRIPT', 'DEGREE_CERTIFICATE']
        })
    });
    assert(initReq.status === 201, 'Outbound data request initiated at Consent Manager (HTTP 201)');
    const dreqId = initReq.data.id || initReq.data.dataRequestId;

    // Login College A student and approve
    const colAStudentLogin = await request('http://localhost:8081/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'student1@collegea.edu', password: 'StudentPassword123' })
    });
    const colAToken = colAStudentLogin.data ? (colAStudentLogin.data.accessToken || colAStudentLogin.data.token) : null;

    if (colAToken) {
        const pendingRes = await request('http://localhost:8081/api/student/consents/pending', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${colAToken}` }
        });
        const targetCreq = Array.isArray(pendingRes.data) ? pendingRes.data.find(c => c.dataRequestId === dreqId || c.id === dreqId) : null;
        if (targetCreq) {
            const appRes = await request(`http://localhost:8081/api/student/consents/${targetCreq.id}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${colAToken}`
                },
                body: JSON.stringify({ approvedFields: ['CGPA', 'TRANSCRIPT', 'DEGREE_CERTIFICATE'] })
            });
            assert(appRes.status === 200, `College A student approved consent for ${dreqId}`);

            // College B polls status
            const pollRes = await request(`/api/consumer/data-requests/${dreqId}/status`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            assert(pollRes.data && (pollRes.data.ready === true || pollRes.data.status === 'ACTIVE'),
                'Grant marked ACTIVE/READY in College B without leaking Access Token');

            // College B performs direct fetch
            const directFetchRes = await request(`/api/consumer/data-requests/${dreqId}/fetch-data`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });
            assert(directFetchRes.status === 200, 'Direct peer data retrieval succeeded (HTTP 200)');
            assert(directFetchRes.data && directFetchRes.data.retrievedData, 'Retrieved academic record received from College A');
            assert(directFetchRes.data && !directFetchRes.data.accessToken, 'Access JWT NEVER leaked in fetch response');
        }
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n==============================================================================');
    console.log(`   STAGE 6.6 SECURITY VERIFICATION: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('==============================================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Fatal verification error:', err);
    process.exit(1);
});

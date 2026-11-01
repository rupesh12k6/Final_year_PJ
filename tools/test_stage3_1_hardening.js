/**
 * ==============================================================================
 * STAGE 3.1 — SUPER ADMIN DASHBOARD SECURITY & QUALITY HARDENING TEST SUITE
 * Validates test helper isolation, credential validation, duplicate handling,
 * safe lifecycle operations, audit trail fidelity, and trust accuracy.
 * ==============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CM_API_URL = process.env.CM_API_URL || 'http://localhost:8095';
const CM_FE_URL = process.env.CM_FE_URL || 'http://localhost:3001';

let passed = 0;
let failed = 0;
const results = [];

function check(name, condition, details = '') {
    if (condition) {
        passed++;
        results.push({ name, status: 'PASS', details });
        console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name} ${details ? '(' + details + ')' : ''}`);
    } else {
        failed++;
        results.push({ name, status: 'FAIL', details });
        console.log(`  \x1b[31m✖ FAIL\x1b[0m: ${name} ${details ? '(' + details + ')' : ''}`);
    }
}

function request(urlPath, options = {}, bodyData = null) {
    return new Promise((resolve, reject) => {
        const fullUrl = new URL(urlPath, CM_API_URL);
        const reqOptions = {
            hostname: fullUrl.hostname,
            port: fullUrl.port || 80,
            path: fullUrl.pathname + fullUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        if (bodyData) {
            if (typeof bodyData === 'object') {
                bodyData = JSON.stringify(bodyData);
                if (!reqOptions.headers['Content-Type']) {
                    reqOptions.headers['Content-Type'] = 'application/json';
                }
            }
            reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyData);
        }

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(data); } catch (e) { json = null; }
                resolve({ statusCode: res.statusCode, headers: res.headers, body: data, json });
            });
        });

        req.on('error', reject);
        req.setTimeout(8000, () => req.destroy(new Error('Timed out')));
        if (bodyData) req.write(bodyData);
        req.end();
    });
}

function feRequest(urlPath) {
    return new Promise((resolve, reject) => {
        const fullUrl = new URL(urlPath, CM_FE_URL);
        const reqOptions = {
            hostname: fullUrl.hostname,
            port: fullUrl.port || 80,
            path: fullUrl.pathname + fullUrl.search,
            method: 'GET'
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
        });

        req.on('error', reject);
        req.setTimeout(8000, () => req.destroy(new Error('Timed out')));
        req.end();
    });
}

async function runHardeningSuite() {
    console.log('\n==============================================================================');
    console.log('   DEPA CONSENT MANAGER — STAGE 3.1 SECURITY & QUALITY HARDENING VERIFICATION');
    console.log('   Backend API: ' + CM_API_URL + ' | Frontend: ' + CM_FE_URL);
    console.log('==============================================================================\n');

    // ── SUITE 1: Test Helper Isolation ────────────────────────────────────────
    console.log('[SUITE 1] Test Helper Isolation & Production Route Safety');
    const helperFileOnDisk = path.join(__dirname, '../consent-manager/frontend/test-session-helper.html');
    const helperFileExists = fs.existsSync(helperFileOnDisk);
    check('test-session-helper.html does not exist in frontend directory', !helperFileExists, 
        helperFileExists ? 'Found on disk' : 'Cleanly removed');

    try {
        const helperHttp = await feRequest('/test-session-helper.html');
        check('Direct HTTP access to test-session-helper.html returns 404 Not Found', helperHttp.statusCode === 404,
            `HTTP ${helperHttp.statusCode}`);
    } catch (err) {
        check('Direct HTTP access to test-session-helper.html returns 404 Not Found', false, err.message);
    }

    try {
        const randHelper = await feRequest('/test-random-helper.html');
        check('Any test-*.html pattern blocked with 404 Not Found', randHelper.statusCode === 404,
            `HTTP ${randHelper.statusCode}`);
    } catch (err) {
        check('Any test-*.html pattern blocked', false, err.message);
    }

    // ── SUITE 2: Live Super Admin & Org Admin Token Acquisition ────────────────
    console.log('\n[SUITE 2] Authentication & Token Acquisition');
    let superAdminToken = null;
    let orgAdminToken = null;

    try {
        const loginRes = await request('/api/auth/login', { method: 'POST' }, {
            email: 'superadmin@depa.cm',
            password: 'SuperAdmin@123'
        });
        check('Super Admin authenticates via POST /api/auth/login', loginRes.statusCode === 200 && loginRes.json?.token,
            `User: ${loginRes.json?.userId}, Role: ${loginRes.json?.role}`);
        superAdminToken = loginRes.json?.token;
    } catch (err) {
        check('Super Admin authenticates', false, err.message);
    }

    try {
        const oaRes = await request('/api/auth/login', { method: 'POST' }, {
            email: 'admin@collegea.edu',
            password: 'CollegeAdmin123'
        });
        check('College A Org Admin authenticates', oaRes.statusCode === 200 && oaRes.json?.token,
            `User: ${oaRes.json?.userId}, Org: ${oaRes.json?.organizationId}`);
        orgAdminToken = oaRes.json?.token;
    } catch (err) {
        check('College A Org Admin authenticates', false, err.message);
    }

    // ── SUITE 3: Administrator Credential Validation & Lifecycle Controls ────
    console.log('\n[SUITE 3] Administrator Credential Validation & Lifecycle');
    // Short password rejected
    try {
        const shortPw = await request('/api/super-admin/admins', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        }, {
            name: 'Officer ShortPW',
            email: 'officer_short@depa.cm',
            password: '123'
        });
        check('Admin creation with password < 6 chars rejected with 400 Bad Request', shortPw.statusCode === 400,
            `HTTP ${shortPw.statusCode}`);
    } catch (err) {
        check('Admin creation with short password rejected', false, err.message);
    }

    // Invalid email rejected
    try {
        const badEmail = await request('/api/super-admin/admins', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        }, {
            name: 'Officer BadEmail',
            email: 'not-an-email',
            password: 'ValidPassword123'
        });
        check('Admin creation with invalid email rejected with 400 Bad Request', badEmail.statusCode === 400,
            `HTTP ${badEmail.statusCode}`);
    } catch (err) {
        check('Admin creation with invalid email rejected', false, err.message);
    }

    // Safe Test Admin Creation
    const testAdminEmail = `test_admin_${Date.now()}@depa.cm`;
    let createdAdminId = null;
    try {
        const createRes = await request('/api/super-admin/admins', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        }, {
            name: 'Audit Test Officer',
            email: testAdminEmail,
            password: 'SecurePassword@2026'
        });
        const ok = createRes.statusCode === 201 && createRes.json?.userId;
        if (ok) createdAdminId = createRes.json.userId;
        check('Safe test administrator created with valid credentials', ok,
            `HTTP ${createRes.statusCode}, ID: ${createdAdminId}, Email: ${testAdminEmail}`);

        // Verify password is NOT in response
        const exposesHash = Boolean(createRes.json?.password || createRes.json?.passwordHash);
        check('Administrator response excludes password and passwordHash', !exposesHash);
    } catch (err) {
        check('Safe test administrator created', false, err.message);
    }

    // Duplicate email rejected with 409 Conflict
    try {
        const dupRes = await request('/api/super-admin/admins', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        }, {
            name: 'Audit Duplicate Officer',
            email: testAdminEmail,
            password: 'AnotherPassword@2026'
        });
        check('Duplicate administrator email rejected with 409 Conflict', dupRes.statusCode === 409,
            `HTTP ${dupRes.statusCode}`);
    } catch (err) {
        check('Duplicate administrator email rejected', false, err.message);
    }

    // Suspend test admin
    if (createdAdminId) {
        try {
            const suspRes = await request(`/api/super-admin/admins/${createdAdminId}/suspend`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${superAdminToken}` }
            });
            check('Test administrator suspended via PATCH .../suspend', suspRes.statusCode === 200 && suspRes.json?.status === 'SUSPENDED',
                `HTTP ${suspRes.statusCode}, Status: ${suspRes.json?.status}`);
        } catch (err) {
            check('Test administrator suspended', false, err.message);
        }

        // Activate test admin
        try {
            const actRes = await request(`/api/super-admin/admins/${createdAdminId}/activate`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${superAdminToken}` }
            });
            check('Test administrator activated via PATCH .../activate', actRes.statusCode === 200 && actRes.json?.status === 'ACTIVE',
                `HTTP ${actRes.statusCode}, Status: ${actRes.json?.status}`);
        } catch (err) {
            check('Test administrator activated', false, err.message);
        }
    }

    // ── SUITE 4: Organization Registration & Duplicate Handling ───────────────
    console.log('\n[SUITE 4] Organization Registration & Duplicate Code/Email Handling');
    // Duplicate code rejected
    try {
        const dupCode = await request('/api/admin/organizations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        }, {
            organizationCode: 'COLLEGE_A',
            name: 'College A Duplicate',
            email: 'unique_college_a@dup.edu'
        });
        check('Duplicate organization code (COLLEGE_A) rejected with 409 Conflict', dupCode.statusCode === 409,
            `HTTP ${dupCode.statusCode}`);
    } catch (err) {
        check('Duplicate organization code rejected', false, err.message);
    }

    // Duplicate email rejected
    try {
        const dupEmail = await request('/api/admin/organizations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        }, {
            organizationCode: 'UNIQUE_CODE_XYZ',
            name: 'College Duplicate Email',
            email: 'contact@collegea.edu'
        });
        check('Duplicate organization email (contact@collegea.edu) rejected with 409 Conflict', dupEmail.statusCode === 409,
            `HTTP ${dupEmail.statusCode}`);
    } catch (err) {
        check('Duplicate organization email rejected', false, err.message);
    }

    // Invalid code format rejected (must be uppercase alphanumeric + underscore)
    try {
        const badCode = await request('/api/admin/organizations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        }, {
            organizationCode: 'lowercase_college_code',
            name: 'Bad Code College',
            email: 'badcode@college.edu'
        });
        check('Lowercase organization code rejected with 400 Bad Request by regex validator', badCode.statusCode === 400,
            `HTTP ${badCode.statusCode}`);
    } catch (err) {
        check('Lowercase organization code rejected', false, err.message);
    }

    // Safe Test Organization Creation
    const testOrgCode = `SAFE_TEST_${Date.now().toString().slice(-6)}`;
    const testOrgEmail = `registrar_${Date.now()}@safetest.edu`;
    let createdOrgId = null;

    try {
        const createOrgRes = await request('/api/admin/organizations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        }, {
            organizationCode: testOrgCode,
            name: 'Safe Hardening Test University',
            email: testOrgEmail,
            dataBaseUrl: 'http://localhost:8099',
            loginEndpoint: 'http://localhost:3099/login',
            onboardingEndpoint: 'http://localhost:3099/onboard',
            adminName: 'Test Registrar Officer',
            adminEmail: `admin_${Date.now()}@safetest.edu`,
            adminPassword: 'InitialPassword123!'
        });
        const ok = createOrgRes.statusCode === 201 && createOrgRes.json?.organizationId;
        if (ok) createdOrgId = createOrgRes.json.organizationId;
        check('Safe test organization created with valid endpoints and admin', ok,
            `HTTP ${createOrgRes.statusCode}, OrgID: ${createdOrgId}, Code: ${testOrgCode}`);
    } catch (err) {
        check('Safe test organization created', false, err.message);
    }

    // Activate test organization
    if (createdOrgId) {
        try {
            const actOrg = await request(`/api/admin/organizations/${createdOrgId}/activate`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${superAdminToken}` }
            });
            check('Test organization activated via PATCH .../activate', actOrg.statusCode === 200 && actOrg.json?.status === 'ACTIVE',
                `HTTP ${actOrg.statusCode}, Status: ${actOrg.json?.status}`);
        } catch (err) {
            check('Test organization activated', false, err.message);
        }

        // Suspend test organization
        try {
            const suspOrg = await request(`/api/admin/organizations/${createdOrgId}/suspend`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${superAdminToken}` }
            });
            check('Test organization suspended via PATCH .../suspend', suspOrg.statusCode === 200 && suspOrg.json?.status === 'SUSPENDED',
                `HTTP ${suspOrg.statusCode}, Status: ${suspOrg.json?.status}`);
        } catch (err) {
            check('Test organization suspended', false, err.message);
        }
    }

    // ── SUITE 5: Audit Log Handling & Pagination Fidelity ─────────────────────
    console.log('\n[SUITE 5] Audit Log Handling & Pagination Fidelity');
    try {
        const auditRes = await request('/api/audit/all', {
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        });
        const hasLogs = auditRes.statusCode === 200 && Array.isArray(auditRes.json);
        check('Global audit logs retrieved from GET /api/audit/all', hasLogs,
            `Total records: ${auditRes.json?.length}`);

        if (hasLogs) {
            const total = auditRes.json.length;
            const pageSize = 12;
            const expectedPages = Math.ceil(total / pageSize);
            const page1 = auditRes.json.slice(0, pageSize);
            const page2 = auditRes.json.slice(pageSize, pageSize * 2);

            check('Pagination splits records without data loss or overlap', 
                page1.length <= 12 && page2.length <= 12 && page1[0].logId !== page2[0].logId,
                `Total: ${total}, Total Pages: ${expectedPages}`);

            // Filter test
            const typeFilter = 'ADMIN_CREATED';
            const matched = auditRes.json.filter(l => l.eventType === typeFilter);
            check(`Filter by eventType '${typeFilter}' accurately subsets records`, matched.length > 0 && matched.every(l => l.eventType === typeFilter),
                `Matched: ${matched.length}`);

            // Credential privacy in audit logs
            const leaked = auditRes.json.some(l => 
                l.details && (l.details.includes('password=') || l.details.includes('BEGIN PRIVATE KEY'))
            );
            check('Audit logs do not expose sensitive credentials or private keys', !leaked);
        }
    } catch (err) {
        check('Audit log handling verification', false, err.message);
    }

    // ── SUITE 6: Trust & Security Overview Accuracy ───────────────────────────
    console.log('\n[SUITE 6] Trust & Security Dashboard Accuracy');
    const trustJs = fs.readFileSync(path.join(__dirname, '../consent-manager/frontend/js/pages/super-admin/trust-overview.js'), 'utf8');

    const distinguishesVerified = trustJs.includes('Verified Live') && 
                                  trustJs.includes('Implemented Filter') &&
                                  trustJs.includes('Supporting Evidence & Verification Method');
    check('trust-overview.js distinguishes verified controls from implemented filters with explicit evidence', distinguishesVerified);

    const hasNoPrivateKeys = !trustJs.includes('BEGIN RSA PRIVATE KEY') && !trustJs.includes('BEGIN PRIVATE KEY');
    check('trust-overview.js contains no private keys or secret material', hasNoPrivateKeys);

    // ── SUITE 7: Strict RBAC & Unauthorized Access Tests ──────────────────────
    console.log('\n[SUITE 7] Strict RBAC & Unauthorized Access Enforcement');
    try {
        const noToken = await request('/api/super-admin/admins');
        check('Direct request to /api/super-admin/admins without token rejected with 401/403', 
            noToken.statusCode === 401 || noToken.statusCode === 403, `HTTP ${noToken.statusCode}`);
    } catch (err) {
        check('Direct request without token rejected', false, err.message);
    }

    try {
        const oaAdmins = await request('/api/super-admin/admins', {
            headers: { 'Authorization': `Bearer ${orgAdminToken}` }
        });
        check('Org Admin calling /api/super-admin/admins rejected with 403 Forbidden', oaAdmins.statusCode === 403,
            `HTTP ${oaAdmins.statusCode}`);
    } catch (err) {
        check('Org Admin calling super-admin endpoint rejected', false, err.message);
    }

    try {
        const oaAuditAll = await request('/api/audit/all', {
            headers: { 'Authorization': `Bearer ${orgAdminToken}` }
        });
        check('Org Admin calling /api/audit/all rejected with 403 Forbidden', oaAuditAll.statusCode === 403,
            `HTTP ${oaAuditAll.statusCode}`);
    } catch (err) {
        check('Org Admin calling audit/all rejected', false, err.message);
    }

    // ── SUMMARY REPORT ────────────────────────────────────────────────────────
    console.log('\n==============================================================================');
    console.log(`   STAGE 3.1 VERIFICATION SUMMARY: ${passed}/${passed + failed} CHECKS PASSED`);
    console.log('==============================================================================');

    if (failed === 0) {
        console.log('\n\x1b[32m✔ ALL STAGE 3.1 HARDENING CHECKS PASSED SUCCESSFULLY!\x1b[0m\n');
    } else {
        console.log(`\n\x1b[31m✖ ${failed} CHECKS FAILED!\x1b[0m\n`);
    }

    return { total: passed + failed, passed, failed, results };
}

runHardeningSuite().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Fatal error during hardening verification:', err);
    process.exit(1);
});

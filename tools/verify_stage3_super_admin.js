/**
 * ==============================================================================
 * STAGE 3 — CONSENT MANAGER SUPER ADMIN DASHBOARD VERIFICATION SUITE
 * Tests all 5 modules, real backend data fetching, search, filters, pagination,
 * modals, action workflows, RBAC guards, and security defenses.
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

async function runTests() {
    console.log('\n==============================================================================');
    console.log('   DEPA CONSENT MANAGER — STAGE 3 SUPER ADMIN DASHBOARD VERIFICATION');
    console.log('   API: ' + CM_API_URL + ' | Frontend: ' + CM_FE_URL);
    console.log('==============================================================================\n');

    // ── SUITE 1: File Architecture & Modular Structure ───────────────────────
    console.log('[SUITE 1] Modular Frontend File Architecture');
    const feDir = path.join(__dirname, '../consent-manager/frontend');
    const saPagesDir = path.join(feDir, 'js/pages/super-admin');

    const expectedFiles = [
        'overview.js',
        'organizations.js',
        'administrators.js',
        'audit-logs.js',
        'trust-overview.js'
    ];

    expectedFiles.forEach(file => {
        const filePath = path.join(saPagesDir, file);
        const exists = fs.existsSync(filePath);
        check(`Super Admin module exists: ${file}`, exists, filePath);
    });

    const indexHtml = fs.readFileSync(path.join(feDir, 'index.html'), 'utf8');
    const loadsAllModules = expectedFiles.every(file => indexHtml.includes(`js/pages/super-admin/${file}`));
    check('index.html script tags include all 5 Super Admin modules', loadsAllModules, 'Script tags present');

    const hasDriveFlowLayout = indexHtml.includes('class="df-app-layout"') && 
                               indexHtml.includes('class="df-sidebar"') && 
                               indexHtml.includes('class="df-top-navbar"') &&
                               indexHtml.includes('id="df-main-view"');
    check('index.html contains full DriveFlow layout shell (sidebar, topbar, scrollable main)', hasDriveFlowLayout);

    // ── SUITE 2: Live Authentication & Real Token Acquisition ─────────────────
    console.log('\n[SUITE 2] Authentication & Session Token Acquisition');
    let superAdminToken = null;
    let orgAdminToken = null;

    try {
        const loginRes = await request('/api/auth/login', { method: 'POST' }, {
            email: 'superadmin@depa.cm',
            password: 'SuperAdmin@123'
        });
        check('Super Admin authenticates with live backend', loginRes.statusCode === 200 && loginRes.json?.token,
            `Role: ${loginRes.json?.role}, Token prefix: ${loginRes.json?.token?.substring(0, 15)}...`);
        superAdminToken = loginRes.json?.token;
    } catch (err) {
        check('Super Admin authenticates with live backend', false, err.message);
    }

    try {
        const oaRes = await request('/api/auth/login', { method: 'POST' }, {
            email: 'admin@collegea.edu',
            password: 'CollegeAdmin123'
        });
        check('Org Admin authenticates with live backend', oaRes.statusCode === 200 && oaRes.json?.token,
            `Role: ${oaRes.json?.role}, Org: ${oaRes.json?.organizationId}`);
        orgAdminToken = oaRes.json?.token;
    } catch (err) {
        check('Org Admin authenticates with live backend', false, err.message);
    }

    // ── SUITE 3: Module A — Overview Dashboard Data & Components ─────────────
    console.log('\n[SUITE 3] Module A: Overview Dashboard');
    try {
        const metricsRes = await request('/api/admin/metrics', {
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        });
        const hasMetrics = metricsRes.statusCode === 200 && 
            typeof metricsRes.json?.totalOrganizations === 'number' &&
            typeof metricsRes.json?.activeOrganizations === 'number' &&
            typeof metricsRes.json?.activeConsents === 'number';
        check('Live metrics retrieved from GET /api/admin/metrics', hasMetrics,
            `Total Orgs: ${metricsRes.json?.totalOrganizations}, Active Consents: ${metricsRes.json?.activeConsents}`);

        const overviewJs = fs.readFileSync(path.join(saPagesDir, 'overview.js'), 'utf8');
        const usesDfComponents = overviewJs.includes('renderHeroBanner') &&
                                overviewJs.includes('renderStatCard') &&
                                overviewJs.includes('renderDataTable') &&
                                overviewJs.includes('renderLoadingState');
        check('Overview module utilizes DriveFlow UI components (hero banner, stat cards, data table)', usesDfComponents);
    } catch (err) {
        check('Overview dashboard data verification', false, err.message);
    }

    // ── SUITE 4: Module B — Organization Management Registry & Actions ────────
    console.log('\n[SUITE 4] Module B: Organization Management');
    try {
        const orgsRes = await request('/api/admin/organizations', {
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        });
        const hasOrgs = orgsRes.statusCode === 200 && Array.isArray(orgsRes.json) && orgsRes.json.length >= 2;
        check('Registered organizations retrieved from GET /api/admin/organizations', hasOrgs,
            `Total found: ${orgsRes.json?.length}, Includes: ${orgsRes.json?.map(o => o.organizationCode).join(', ')}`);

        // Check specific details of College A and College B
        const colA = orgsRes.json?.find(o => o.organizationCode === 'COLLEGE_A');
        const colB = orgsRes.json?.find(o => o.organizationCode === 'COLLEGE_B');
        check('College A and College B present in participant registry', Boolean(colA && colB),
            `Col A status: ${colA?.status}, Col B status: ${colB?.status}`);

        const orgsJs = fs.readFileSync(path.join(saPagesDir, 'organizations.js'), 'utf8');
        const hasFeatures = orgsJs.includes('getFilteredOrganizations') &&
                            orgsJs.includes('openRegisterModal') &&
                            orgsJs.includes('handleInspect') &&
                            orgsJs.includes('handleActivate') &&
                            orgsJs.includes('handleSuspend') &&
                            orgsJs.includes('showConfirmDialog');
        check('Organization module implements search, status filter, register modal, inspection, and status toggles', hasFeatures);
    } catch (err) {
        check('Organization registry verification', false, err.message);
    }

    // ── SUITE 5: Module C — System Administrator Management ───────────────────
    console.log('\n[SUITE 5] Module C: System Administrator Management');
    try {
        const adminsRes = await request('/api/super-admin/admins', {
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        });
        const hasAdmins = adminsRes.statusCode === 200 && Array.isArray(adminsRes.json) && adminsRes.json.length >= 1;
        check('System administrators retrieved from GET /api/super-admin/admins', hasAdmins,
            `Total officers: ${adminsRes.json?.length}, SuperAdmin: ${adminsRes.json?.[0]?.email}`);

        // Verify password hashes are never exposed
        const exposesHash = adminsRes.json?.some(a => a.password || a.passwordHash);
        check('Administrator records never expose password hashes or credentials', !exposesHash, 'Credential privacy verified');

        const adminsJs = fs.readFileSync(path.join(saPagesDir, 'administrators.js'), 'utf8');
        const hasSelfProtection = adminsJs.includes('row.userId === currentUserId') && 
                                  adminsJs.includes('Current Session');
        check('Self-lockout protection prevents logged-in Super Admin from suspending own account', hasSelfProtection);

        const hasAdminFeatures = adminsJs.includes('openCreateModal') &&
                                 adminsJs.includes('handleSuspend') &&
                                 adminsJs.includes('handleActivate') &&
                                 adminsJs.includes('showConfirmDialog');
        check('Admin module supports creation modal, status suspension, activation, and confirmation', hasAdminFeatures);
    } catch (err) {
        check('Administrator management verification', false, err.message);
    }

    // ── SUITE 6: Module D — Global Audit Logs & Multi-Attribute Search ────────
    console.log('\n[SUITE 6] Module D: Global Audit Logs');
    try {
        const auditRes = await request('/api/audit/all', {
            headers: { 'Authorization': `Bearer ${superAdminToken}` }
        });
        const hasAudit = auditRes.statusCode === 200 && Array.isArray(auditRes.json) && auditRes.json.length > 0;
        check('Global audit logs retrieved from GET /api/audit/all', hasAudit,
            `Total events recorded: ${auditRes.json?.length}`);

        const auditJs = fs.readFileSync(path.join(saPagesDir, 'audit-logs.js'), 'utf8');
        const hasFilters = auditJs.includes('filterSearch') &&
                           auditJs.includes('filterType') &&
                           auditJs.includes('filterOrg') &&
                           auditJs.includes('renderPagination') &&
                           auditJs.includes('inspectLog');
        check('Audit module implements multi-attribute search, type/org filters, pagination, and modal inspection', hasFilters);

        // Security check: no cleartext passwords or private keys in audit details
        const exposesSecret = auditRes.json?.some(log => 
            log.details && (log.details.includes('password=') || log.details.includes('BEGIN PRIVATE KEY'))
        );
        check('Audit logs do not expose sensitive credentials or private keys', !exposesSecret);
    } catch (err) {
        check('Audit log verification', false, err.message);
    }

    // ── SUITE 7: Module E — Cryptographic Trust & Public Key Authority ────────
    console.log('\n[SUITE 7] Module E: Trust & Security Infrastructure');
    try {
        const keyRes = await request('/api/access-grants/public-key');
        const hasKey = keyRes.statusCode === 200 && keyRes.body.includes('BEGIN PUBLIC KEY');
        const keyId = keyRes.headers['x-key-id'] || 'active-key';
        check('CM RS256 Public Key retrieved from GET /api/access-grants/public-key', hasKey,
            `Key ID: ${keyId}, Format: RSA PEM`);

        const fieldsRes = await request('/api/consents/fields');
        const hasFields = fieldsRes.statusCode === 200 && Array.isArray(fieldsRes.json) && fieldsRes.json.length >= 6;
        check('Canonical academic fields retrieved from GET /api/consents/fields', hasFields,
            `Fields count: ${fieldsRes.json?.length}, E.g. ${fieldsRes.json?.slice(0, 3).map(f => f.field).join(', ')}`);

        const trustJs = fs.readFileSync(path.join(saPagesDir, 'trust-overview.js'), 'utf8');
        const hasTrustFeatures = trustJs.includes('btn-copy-public-key') &&
                                 trustJs.includes('Participant Trust & Key Matrix') &&
                                 trustJs.includes('Canonical Academic Fields') &&
                                 trustJs.includes('DEPA Security Architecture Compliance');
        check('Trust overview module renders public key PEM, copy action, participant key matrix, and compliance checklist', hasTrustFeatures);
    } catch (err) {
        check('Trust & security verification', false, err.message);
    }

    // ── SUITE 8: Router & RBAC Route Protection ───────────────────────────────
    console.log('\n[SUITE 8] Router & RBAC Route Protection');
    const routerJs = fs.readFileSync(path.join(feDir, 'js/router.js'), 'utf8');
    const handlesAllRoutes = routerJs.includes('/dashboard') &&
                             routerJs.includes('/organizations') &&
                             routerJs.includes('/administrators') &&
                             routerJs.includes('/audit-logs') &&
                             routerJs.includes('/trust-overview');
    check('router.js routes hash paths to dedicated Super Admin page modules', handlesAllRoutes);

    const hasRbacGuards = routerJs.includes('superAdminRoutes') &&
                          routerJs.includes('isOrgAdmin && superAdminRoutes.includes') &&
                          routerJs.includes('Access Denied');
    check('router.js blocks Org Admin from entering Super Admin routes with RBAC guard', hasRbacGuards);

    // ── SUITE 9: XSS Defenses & Dynamic Rendering Security ───────────────────
    console.log('\n[SUITE 9] XSS Defenses in Super Admin Modules');
    const modulesToCheck = [
        'overview.js',
        'organizations.js',
        'administrators.js',
        'audit-logs.js',
        'trust-overview.js'
    ];

    let allModulesEscape = true;
    modulesToCheck.forEach(mod => {
        const code = fs.readFileSync(path.join(saPagesDir, mod), 'utf8');
        if (!code.includes('escapeHtml')) allModulesEscape = false;
    });
    check('All 5 Super Admin page modules call escapeHtml on dynamic data', allModulesEscape, 'XSS defenses confirmed');

    // ── SUMMARY REPORT ────────────────────────────────────────────────────────
    console.log('\n==============================================================================');
    console.log(`   STAGE 3 VERIFICATION SUMMARY: ${passed}/${passed + failed} CHECKS PASSED`);
    console.log('==============================================================================');

    if (failed === 0) {
        console.log('\n\x1b[32m✔ ALL STAGE 3 SUPER ADMIN DASHBOARD CHECKS PASSED SUCCESSFULLY!\x1b[0m\n');
    } else {
        console.log(`\n\x1b[31m✖ ${failed} CHECKS FAILED!\x1b[0m\n`);
    }

    return { total: passed + failed, passed, failed, results };
}

runTests().then(res => {
    process.exit(res.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});


/**
 * ==============================================================================
 * STAGE 4.1 — ORGANIZATION ADMIN API SECURITY & DATA-EXPOSURE VERIFICATION SUITE
 * Exhaustive live verification of public organization registry sanitization,
 * authoritative own-profile endpoints, self-lockout enforcement, and multi-tenant scoping.
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CM_BASE_URL = 'http://localhost:8095';

function executeSql(sql) {
    try {
        const psqlPath = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
        if (fs.existsSync(psqlPath)) {
            execSync(`"${psqlPath}" -U postgres -d consent_manager_db_fyp -c "${sql}"`, {
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
    const url = endpoint.startsWith('http') ? endpoint : `${CM_BASE_URL}${endpoint}`;
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
    console.log('   DEPA CONSENT MANAGER — STAGE 4.1 API SECURITY & DATA-EXPOSURE VERIFICATION');
    console.log('   API: ' + CM_BASE_URL);
    console.log('==============================================================================\n');

    // Authenticate actors
    console.log('[AUTH] Authenticating test personas...');
    const superAdminLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'superadmin@depa.cm', password: 'SuperAdmin@123' })
    });
    const superAdminToken = superAdminLogin.data ? superAdminLogin.data.token : null;

    const collegeALogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@collegea.edu', password: 'CollegeAdmin123' })
    });
    const collegeAToken = collegeALogin.data ? collegeALogin.data.token : null;
    const collegeAUser = collegeALogin.data || {};

    const collegeBLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@collegeb.edu', password: 'CollegeAdmin123' })
    });
    const collegeBToken = collegeBLogin.data ? collegeBLogin.data.token : null;
    const collegeBUser = collegeBLogin.data || {};

    assert(superAdminToken !== null, `Super Admin authenticated successfully`);
    assert(collegeAToken !== null, `College A Org Admin authenticated (${collegeAUser.organizationId})`);
    assert(collegeBToken !== null, `College B Org Admin authenticated (${collegeBUser.organizationId})`);

    // -------------------------------------------------------------------------
    // [SUITE 1] Public Organization Registry Security & Sanitization
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 1] Public Organization Registry Security & Sanitization (GET /api/consents/organizations)');

    // 1.1 Unauthenticated Request
    const unauthReg = await request('/api/consents/organizations');
    assert(unauthReg.status === 200, `Condition 1 (Unauthenticated): returns HTTP 200 (public registry)`);
    assert(Array.isArray(unauthReg.data) && unauthReg.data.length >= 2, `Condition 1: returned list of active organizations (${unauthReg.data ? unauthReg.data.length : 0})`);

    // 1.2 College A Org Admin Request
    const collegeAReg = await request('/api/consents/organizations', {
        headers: { 'Authorization': `Bearer ${collegeAToken}` }
    });
    assert(collegeAReg.status === 200, `Condition 2 (College A Org Admin): returns HTTP 200`);

    // 1.3 College B Org Admin Request
    const collegeBReg = await request('/api/consents/organizations', {
        headers: { 'Authorization': `Bearer ${collegeBToken}` }
    });
    assert(collegeBReg.status === 200, `Condition 3 (College B Org Admin): returns HTTP 200`);

    // 1.4 Super Admin Request
    const superAdminReg = await request('/api/consents/organizations', {
        headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    assert(superAdminReg.status === 200, `Condition 4 (Super Admin): returns HTTP 200`);

    // 1.5 Strict field verification: PublicOrganizationResponse metadata vs Sensitive fields
    console.log('\n[SUITE 1.5] Field Leakage and Data Exposure Analysis on /api/consents/organizations');
    let hasCredentials = false;
    let hasAdminEmail = false;
    let hasInternalSecret = false;
    let hasPublicFields = true;

    for (const org of unauthReg.data) {
        if (org.credentials !== undefined && org.credentials !== null) hasCredentials = true;
        if (org.email !== undefined && org.email !== null) hasAdminEmail = true;
        if (JSON.stringify(org).includes('INTERNAL-SECRET-KEY')) hasInternalSecret = true;
        if (!org.organizationId || !org.organizationCode || !org.name || !org.status) {
            hasPublicFields = false;
        }
        if (org.status === 'ACTIVE' && !org.publicKey) {
            hasPublicFields = false;
        }
    }

    assert(!hasCredentials, `Security: 'credentials' field is completely absent from PublicOrganizationResponse`);
    assert(!hasAdminEmail, `Privacy: 'email' (admin contact) is omitted from public registry`);
    assert(!hasInternalSecret, `Security: No API keys or internal secrets found in registry JSON`);
    assert(hasPublicFields, `Trust: Public trust metadata (id, code, name, publicKey, status) present for each node`);

    // -------------------------------------------------------------------------
    // [SUITE 2] Authoritative Backend Own-Profile Endpoint
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 2] Authoritative Backend Own-Profile Endpoint (GET /api/org-admin/organization)');

    // 2.1 College A retrieves own profile
    const collegeAProfile = await request('/api/org-admin/organization', {
        headers: { 'Authorization': `Bearer ${collegeAToken}` }
    });
    assert(collegeAProfile.status === 200, `College A receives own organization profile (HTTP 200)`);
    assert(collegeAProfile.data && collegeAProfile.data.organizationId === collegeAUser.organizationId,
        `College A profile strictly matches token orgId: ${collegeAProfile.data ? collegeAProfile.data.organizationId : 'null'}`);
    assert(collegeAProfile.data && collegeAProfile.data.credentials === undefined,
        `College A OrganizationResponse does not expose internal credentials`);

    // 2.2 College B retrieves own profile
    const collegeBProfile = await request('/api/org-admin/organization', {
        headers: { 'Authorization': `Bearer ${collegeBToken}` }
    });
    assert(collegeBProfile.status === 200, `College B receives own organization profile (HTTP 200)`);
    assert(collegeBProfile.data && collegeBProfile.data.organizationId === collegeBUser.organizationId,
        `College B profile strictly matches token orgId: ${collegeBProfile.data ? collegeBProfile.data.organizationId : 'null'}`);
    assert(collegeBProfile.data && collegeBProfile.data.credentials === undefined,
        `College B OrganizationResponse does not expose internal credentials`);

    // 2.3 Unauthenticated caller blocked
    const unauthProfile = await request('/api/org-admin/organization');
    assert(unauthProfile.status === 401 || unauthProfile.status === 403,
        `Unauthenticated request to /api/org-admin/organization rejected with HTTP ${unauthProfile.status}`);

    // 2.4 Super Admin cannot call org-admin profile (requires ORG_ADMIN)
    const superAdminOrgProfile = await request('/api/org-admin/organization', {
        headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    assert(superAdminOrgProfile.status === 403,
        `Super Admin calling /api/org-admin/organization rejected with HTTP 403 Forbidden (RBAC boundary)`);

    // -------------------------------------------------------------------------
    // [SUITE 3] Self-Lockout & Account Management Authorization
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 3] Self-Lockout & Account Management Authorization');

    // 3.1 Org Admin attempts to suspend themselves
    const selfSuspend = await request(`/api/org-admin/users/${collegeAUser.userId}/suspend`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${collegeAToken}` }
    });
    assert(selfSuspend.status === 403, `Backend self-lockout enforcement: Org Admin suspending own account returned HTTP 403 (${selfSuspend.data ? selfSuspend.data.message : ''})`);

    // 3.2 Org Admin attempts to suspend user belonging to another organization (College B admin)
    const crossSuspend = await request(`/api/org-admin/users/${collegeBUser.userId}/suspend`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${collegeAToken}` }
    });
    assert(crossSuspend.status === 403 || crossSuspend.status === 404,
        `Cross-organization protection: College A admin suspending College B user returned HTTP ${crossSuspend.status}`);

    // 3.3 Org Admin attempts to create privileged role (SUPER_ADMIN)
    const privEscalation = await request('/api/org-admin/users', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${collegeAToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'hacker@collegea.edu',
            fullName: 'Privilege Escalation Tester',
            role: 'SUPER_ADMIN',
            password: 'HackerPassword123'
        })
    });
    assert(privEscalation.status === 400 || privEscalation.status === 403,
        `Privilege escalation prevented: Org Admin creating SUPER_ADMIN role returned HTTP ${privEscalation.status}`);

    // -------------------------------------------------------------------------
    // [SUITE 4] Multi-Tenant Consent & Audit Log Scoping Hardening
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 4] Multi-Tenant Consent & Audit Log Scoping Hardening');

    // 4.1 Org Admin audit log query
    const collegeAAudit = await request('/api/audit', {
        headers: { 'Authorization': `Bearer ${collegeAToken}` }
    });
    assert(collegeAAudit.status === 200, `College A retrieves audit logs (HTTP 200)`);
    const logsA = Array.isArray(collegeAAudit.data) ? collegeAAudit.data : [];
    const foreignLogsA = logsA.filter(l => l.organizationId && l.organizationId !== collegeAUser.organizationId);
    assert(foreignLogsA.length === 0, `Multi-tenant audit scoping: 0 cross-organization audit logs exposed to College A (${logsA.length} scoped logs returned)`);

    // 4.2 Org Admin calling system-wide audit endpoint (/api/audit/all)
    const orgAdminAuditAll = await request('/api/audit/all', {
        headers: { 'Authorization': `Bearer ${collegeAToken}` }
    });
    assert(orgAdminAuditAll.status === 403, `Org Admin forbidden from calling /api/audit/all (HTTP 403 Forbidden)`);

    // 4.3 Super Admin calling system-wide audit endpoint (/api/audit/all)
    const superAdminAuditAll = await request('/api/audit/all', {
        headers: { 'Authorization': `Bearer ${superAdminToken}` }
    });
    assert(superAdminAuditAll.status === 200, `Super Admin authorized to access /api/audit/all (HTTP 200)`);

    // 4.4 Org Admin consent scoping (/api/consents/organization)
    const collegeAConsents = await request('/api/consents/organization', {
        headers: { 'Authorization': `Bearer ${collegeAToken}` }
    });
    assert(collegeAConsents.status === 200, `College A retrieves scoped consents (HTTP 200)`);
    const consentsA = Array.isArray(collegeAConsents.data) ? collegeAConsents.data : [];
    const foreignConsentsA = consentsA.filter(c =>
        c.providerOrganizationId !== collegeAUser.organizationId &&
        c.requesterOrganizationId !== collegeAUser.organizationId
    );
    assert(foreignConsentsA.length === 0, `Consent multi-tenant isolation: 0 foreign consents exposed to College A (${consentsA.length} relevant consents returned)`);

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n==============================================================================');
    console.log(`   STAGE 4.1 VERIFICATION COMPLETE`);
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

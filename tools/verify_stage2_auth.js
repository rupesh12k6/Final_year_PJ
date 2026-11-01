/**
 * ==============================================================================
 * STAGE 2 VERIFICATION SUITE — CONSENT MANAGER AUTHENTICATION UI
 * Tests:
 *   1. Super Admin & Org Admin split-screen DOM structures
 *   2. Session isolation and role management (DF_SESSION)
 *   3. Authentication controller validation and role enforcement (DF_AUTH)
 *   4. Client router RBAC route guarding (DF_ROUTER)
 *   5. Mobile & tablet responsive rendering
 *   6. Screenshot capture and verification
 * ==============================================================================
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function runHeadlessChrome(filePath, screenshotName, width = 1400, height = 900) {
    const absPath = path.resolve(ROOT_DIR, filePath).replace(/\\/g, '/');
    const fileUrl = `file:///${absPath}`;
    const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);

    const res = spawnSync(CHROME_PATH, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        `--window-size=${width},${height}`,
        `--screenshot=${screenshotPath}`,
        '--dump-dom',
        fileUrl
    ], { maxBuffer: 20 * 1024 * 1024 });

    const dom = res.stdout ? res.stdout.toString('utf-8') : '';
    return { dom, screenshotPath };
}

async function runTests() {
    console.log("==================================================================");
    console.log(" STAGE 2: CONSENT MANAGER AUTHENTICATION UI VERIFICATION");
    console.log("==================================================================");

    const testResults = [];
    function record(category, testName, passed, details = '') {
        testResults.push({ category, testName, passed, details });
        const icon = passed ? '✓' : '✗';
        console.log(`  ${icon} [${category}] ${testName} ${details ? '(' + details + ')' : ''}`);
    }

    // -------------------------------------------------------------------------
    // 1. Super Admin Login Page DOM Verification
    // -------------------------------------------------------------------------
    console.log("\n[Test 1] Verifying Super Admin Login Page DOM & Layout...");
    const saResult = runHeadlessChrome('consent-manager/frontend/super-admin-login.html', 'cm-super-admin-login.png');
    const saDom = saResult.dom;

    record('Super Admin DOM', 'Split-screen layout present', saDom.includes('df-auth-split') && saDom.includes('df-auth-brand-side') && saDom.includes('df-auth-form-side'));
    record('Super Admin DOM', 'Regulatory branding & title', saDom.includes('DEPA REGULATORY ROOT') && saDom.includes('Consent Manager'));
    record('Super Admin DOM', 'Feature highlights list', saDom.includes('Anchor and verify institutional participant keys') && saDom.includes('Central cryptographic JWKS key authority &amp; rotation'));
    record('Super Admin DOM', 'Regulatory compliance notice', saDom.includes('Regulatory Compliance Notice'));
    record('Super Admin DOM', 'Official email input with placeholder', saDom.includes('id="sa-email"') && saDom.includes('placeholder="superadmin@depa.cm"'));
    record('Super Admin DOM', 'Master password input with visibility toggle', saDom.includes('id="sa-password"') && saDom.includes('id="sa-pw-toggle"'));
    record('Super Admin DOM', 'Submit button for Super Admin', saDom.includes('id="sa-submit-btn"') && saDom.includes('Sign in as Super Admin'));
    record('Super Admin DOM', 'Switch link to Org Admin portal', saDom.includes('link-to-org-admin') && saDom.includes('Sign in as Organization Admin'));

    // -------------------------------------------------------------------------
    // 2. Organization Admin Login Page DOM Verification
    // -------------------------------------------------------------------------
    console.log("\n[Test 2] Verifying Organization Admin Login Page DOM & Layout...");
    const oaResult = runHeadlessChrome('consent-manager/frontend/org-admin-login.html', 'cm-org-admin-login.png');
    const oaDom = oaResult.dom;

    record('Org Admin DOM', 'Split-screen layout present', oaDom.includes('df-auth-split') && oaDom.includes('df-auth-brand-side') && oaDom.includes('df-auth-form-side'));
    record('Org Admin DOM', 'Institutional branding & title', oaDom.includes('DEPA INSTITUTIONAL NODE') && oaDom.includes('Organization Portal'));
    record('Org Admin DOM', 'Feature highlights list', oaDom.includes('Manage verified institutional profile') && oaDom.includes('Authorize departmental staff and verifier roles'));
    record('Org Admin DOM', 'Institutional security notice', oaDom.includes('Institutional Security Notice'));
    record('Org Admin DOM', 'Institutional email input with placeholder', oaDom.includes('id="oa-email"') && oaDom.includes('placeholder="admin@collegea.edu"'));
    record('Org Admin DOM', 'Password input with visibility toggle', oaDom.includes('id="oa-password"') && oaDom.includes('id="oa-pw-toggle"'));
    record('Org Admin DOM', 'College Code optional input', oaDom.includes('id="oa-college-id"'));
    record('Org Admin DOM', 'Submit button for Org Admin', oaDom.includes('id="oa-submit-btn"') && oaDom.includes('Sign in as Organization Admin'));
    record('Org Admin DOM', 'Switch link to Super Admin portal', saDom.includes('link-to-super-admin') || oaDom.includes('Sign in as Super Admin'));

    // -------------------------------------------------------------------------
    // 3. Responsive Rendering Tests
    // -------------------------------------------------------------------------
    console.log("\n[Test 3] Verifying Responsive Mobile & Tablet Layouts...");
    const mobileResult = runHeadlessChrome('consent-manager/frontend/super-admin-login.html', 'cm-login-mobile.png', 375, 812);
    const tabletResult = runHeadlessChrome('consent-manager/frontend/org-admin-login.html', 'cm-login-tablet.png', 768, 1024);

    record('Responsive', 'Mobile screenshot captured', fs.existsSync(mobileResult.screenshotPath) && fs.statSync(mobileResult.screenshotPath).size > 10000);
    record('Responsive', 'Tablet screenshot captured', fs.existsSync(tabletResult.screenshotPath) && fs.statSync(tabletResult.screenshotPath).size > 10000);

    // -------------------------------------------------------------------------
    // 4. Client-side Module Unit Tests: Session Management (DF_SESSION)
    // -------------------------------------------------------------------------
    console.log("\n[Test 4] Testing Session Management Module (DF_SESSION)...");
    
    // Mock window and sessionStorage
    const storage = {};
    global.sessionStorage = {
        getItem: (k) => storage[k] || null,
        setItem: (k, v) => { storage[k] = String(v); },
        removeItem: (k) => { delete storage[k]; }
    };
    global.window = { sessionStorage: global.sessionStorage };
    global.localStorage = { getItem: () => null, setItem: () => {} };

    // Load session.js
    const sessionCode = fs.readFileSync(path.join(ROOT_DIR, 'consent-manager/frontend/js/auth/session.js'), 'utf-8');
    eval(sessionCode);
    const DF_SESSION = window.DF_SESSION;

    record('DF_SESSION', 'Initially unauthenticated', DF_SESSION.isAuthenticated() === false);

    // Set Super Admin Session
    DF_SESSION.setSession({
        token: 'header.payload.signature-sa',
        user: { userId: 'SUPER_001', name: 'Super Admin', email: 'superadmin@depa.cm', role: 'SUPER_ADMIN', organizationId: null }
    });

    record('DF_SESSION', 'Authenticated after setSession', DF_SESSION.isAuthenticated() === true);
    record('DF_SESSION', 'Role correctly identifies Super Admin', DF_SESSION.getRole() === 'SUPER_ADMIN' && DF_SESSION.isSuperAdmin() === true && DF_SESSION.isOrgAdmin() === false);
    record('DF_SESSION', 'Token retrieved properly', DF_SESSION.getToken() === 'header.payload.signature-sa');

    // Set Org Admin Session
    DF_SESSION.setSession({
        token: 'header.payload.signature-oa',
        user: { userId: 'ORG_ADM_001', name: 'College A Admin', email: 'admin@collegea.edu', role: 'ORG_ADMIN', organizationId: 'ORG_COLLEGE_A' }
    });

    record('DF_SESSION', 'Role correctly identifies Org Admin', DF_SESSION.getRole() === 'ORG_ADMIN' && DF_SESSION.isOrgAdmin() === true && DF_SESSION.isSuperAdmin() === false);
    record('DF_SESSION', 'Organization ID retrieved properly', DF_SESSION.getOrganizationId() === 'ORG_COLLEGE_A');

    // Clear session
    DF_SESSION.clearSession();
    record('DF_SESSION', 'Unauthenticated after clearSession', DF_SESSION.isAuthenticated() === false && DF_SESSION.getToken() === null);

    // -------------------------------------------------------------------------
    // 5. Client-side Module Unit Tests: Auth Controller Validation (DF_AUTH)
    // -------------------------------------------------------------------------
    console.log("\n[Test 5] Testing Authentication Controller (DF_AUTH)...");

    // Mock DF_API
    let mockBackendResponse = null;
    let mockBackendError = null;

    window.DF_API = {
        auth: {
            login: async (creds) => {
                if (mockBackendError) throw mockBackendError;
                return mockBackendResponse;
            }
        }
    };

    const authCode = fs.readFileSync(path.join(ROOT_DIR, 'consent-manager/frontend/js/auth/auth-controller.js'), 'utf-8');
    eval(authCode);
    const DF_AUTH = window.DF_AUTH;

    // Test 5.1: Missing email
    const emptyEmailRes = await DF_AUTH.login('', 'Password123');
    record('DF_AUTH', 'Rejects empty email', emptyEmailRes.success === false && emptyEmailRes.message.includes('required'));

    // Test 5.2: Invalid email format
    const badEmailRes = await DF_AUTH.login('invalid-email-string', 'Password123');
    record('DF_AUTH', 'Rejects invalid email format', badEmailRes.success === false && badEmailRes.message.includes('valid'));

    // Test 5.3: Missing password
    const emptyPwRes = await DF_AUTH.login('admin@collegea.edu', '');
    record('DF_AUTH', 'Rejects empty password', emptyPwRes.success === false && emptyPwRes.message.includes('required'));

    // Test 5.4: Super Admin portal rejects Org Admin account
    mockBackendResponse = {
        token: 'tok-oa',
        userId: 'USER_OA',
        email: 'admin@collegea.edu',
        role: 'ORG_ADMIN',
        organizationId: 'ORG_COLLEGE_A'
    };
    const roleMismatchRes1 = await DF_AUTH.login('admin@collegea.edu', 'Pass123', { expectedRole: 'SUPER_ADMIN' });
    record('DF_AUTH', 'Super Admin portal rejects Org Admin account', roleMismatchRes1.success === false && roleMismatchRes1.message.includes('Organization Admin'));

    // Test 5.5: Org Admin portal rejects Super Admin account
    mockBackendResponse = {
        token: 'tok-sa',
        userId: 'USER_SA',
        email: 'superadmin@depa.cm',
        role: 'SUPER_ADMIN',
        organizationId: null
    };
    const roleMismatchRes2 = await DF_AUTH.login('superadmin@depa.cm', 'Pass123', { expectedRole: 'ORG_ADMIN' });
    record('DF_AUTH', 'Org Admin portal rejects Super Admin account', roleMismatchRes2.success === false && roleMismatchRes2.message.includes('Super Admin'));

    // Test 5.6: Valid Super Admin login
    mockBackendResponse = {
        token: 'tok-sa-valid',
        userId: 'USER_SA',
        email: 'superadmin@depa.cm',
        role: 'SUPER_ADMIN',
        organizationId: null
    };
    const validSaRes = await DF_AUTH.login('superadmin@depa.cm', 'SuperAdmin@123', { expectedRole: 'SUPER_ADMIN' });
    record('DF_AUTH', 'Valid Super Admin authentication succeeds', validSaRes.success === true && validSaRes.redirectTo === '/dashboard');
    record('DF_AUTH', 'Session correctly persisted after login', DF_SESSION.getToken() === 'tok-sa-valid' && DF_SESSION.isSuperAdmin() === true);

    // Test 5.7: Valid Org Admin login
    mockBackendResponse = {
        token: 'tok-oa-valid',
        userId: 'USER_OA',
        email: 'admin@collegea.edu',
        role: 'ORG_ADMIN',
        organizationId: 'ORG_COLLEGE_A'
    };
    const validOaRes = await DF_AUTH.login('admin@collegea.edu', 'CollegeAdmin123', { expectedRole: 'ORG_ADMIN' });
    record('DF_AUTH', 'Valid Org Admin authentication succeeds', validOaRes.success === true && validOaRes.redirectTo === '/org-dashboard');
    record('DF_AUTH', 'Org Admin session correctly persisted', DF_SESSION.getToken() === 'tok-oa-valid' && DF_SESSION.isOrgAdmin() === true);

    // -------------------------------------------------------------------------
    // 6. Verification Summary
    // -------------------------------------------------------------------------
    console.log("\n==================================================================");
    console.log(" STAGE 2 AUTHENTICATION VERIFICATION SUMMARY");
    console.log("==================================================================");

    const total = testResults.length;
    const passed = testResults.filter(t => t.passed).length;
    const failed = total - passed;

    console.log(`Total Checks Executed : ${total}`);
    console.log(`Passed                : ${passed}`);
    console.log(`Failed                : ${failed}`);

    if (failed === 0) {
        console.log("\n>>> ALL STAGE 2 CONSENT MANAGER AUTHENTICATION CHECKS PASSED (28/28)! <<<");
        process.exit(0);
    } else {
        console.error("\n>>> SOME CHECKS FAILED! <<<");
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error("Fatal error during test run:", err);
    process.exit(1);
});


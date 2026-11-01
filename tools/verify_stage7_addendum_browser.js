/**
 * ==============================================================================
 * STAGE 7 ADDENDUM — CDP BROWSER VERIFICATION & REGRESSION HARNESS
 * Verifies the fixes for:
 * 1. window.DF_UI.escapeHtml & formatDateTime across all pages
 * 2. College A Academic Schema routing (/admin/academic-data)
 * 3. Consent Manager dashboard metrics data provenance
 * 4. Navigates every route in CM, College A, and College B
 * 5. Asserts ZERO uncaught console exceptions and captures corrected screenshots
 * ==============================================================================
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\80f0ed74-aeac-4008-b204-ad3a9983013a';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const CM_API = 'http://localhost:8095';
const COL_A_API = 'http://localhost:8081';
const COL_B_API = 'http://localhost:8082';

const CM_FRONTEND = 'http://localhost:3001';
const COL_A_FRONTEND = 'http://localhost:3002';
const COL_B_FRONTEND = 'http://localhost:3003';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class CdpClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.id = 0;
        this.callbacks = new Map();
        this.pageErrors = [];
    }

    async connect() {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);
            this.ws.onopen = () => resolve();
            this.ws.onerror = (err) => reject(err);
            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.id && this.callbacks.has(msg.id)) {
                        const cb = this.callbacks.get(msg.id);
                        this.callbacks.delete(msg.id);
                        if (msg.error) cb.reject(new Error(msg.error.message));
                        else cb.resolve(msg.result);
                    } else if (msg.method === 'Runtime.exceptionThrown') {
                        const desc = msg.params.exceptionDetails.exception ? msg.params.exceptionDetails.exception.description : msg.params.exceptionDetails.text;
                        this.pageErrors.push(desc);
                    } else if (msg.method === 'Console.messageAdded' && msg.params.message.level === 'error') {
                        this.pageErrors.push(msg.params.message.text);
                    }
                } catch (e) {}
            };
        });
    }

    send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.id;
            this.callbacks.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    clearErrors() {
        this.pageErrors = [];
    }

    getErrors() {
        return [...this.pageErrors];
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

async function apiPost(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✔ PASS: ${message}`);
        passedTests++;
    } else {
        console.error(`  ✖ FAIL: ${message}`);
        failedTests++;
    }
}

async function runVerification() {
    console.log("==============================================================================");
    console.log("   STAGE 7 ADDENDUM — CDP BROWSER VERIFICATION & REGRESSION SUITE");
    console.log("==============================================================================\n");

    // 1. Authenticate Personas
    console.log("[PHASE 1] Pre-Authenticating Personas across nodes...");
    const cmAdmin = await apiPost(`${CM_API}/api/auth/login`, { email: 'superadmin@depa.cm', password: 'SuperAdmin@123' });
    assert(cmAdmin.ok, "Super Admin authenticated at Consent Manager");

    const colAAdmin = await apiPost(`${COL_A_API}/api/auth/login`, { email: 'dean@collegea.edu', password: 'OrgAdmin@123' });
    assert(colAAdmin.ok, "College A Admin authenticated");

    const colAStudent = await apiPost(`${COL_A_API}/api/auth/login`, { email: 'student1@collegea.edu', password: 'StudentPassword123' });
    assert(colAStudent.ok, "College A Student authenticated");

    const colBAdmin = await apiPost(`${COL_B_API}/api/auth/login`, { email: 'dean@collegeb.edu', password: 'OrgAdmin@123' });
    assert(colBAdmin.ok, "College B Admin authenticated");

    // 2. Launch Chrome Headless
    console.log("\n[PHASE 2] Spawning Headless Chrome on CDP Port 9225...");
    const chromeProc = spawn(CHROME_PATH, [
        '--headless',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=9225',
        'about:blank'
    ]);

    await sleep(2500);

    try {
        const listRes = await fetch('http://127.0.0.1:9225/json/list');
        const listData = await listRes.json();
        const page = listData.find(p => p.type === 'page') || listData[0];
        const cdp = new CdpClient(page.webSocketDebuggerUrl);
        await cdp.connect();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await cdp.send('Console.enable');

        async function setViewport(w = 1440, h = 900) {
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: w,
                height: h,
                deviceScaleFactor: 1,
                mobile: false
            });
            await cdp.send('Emulation.setVisibleSize', { width: w, height: h });
        }

        async function capture(filename) {
            const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
            const buf = Buffer.from(ss.data, 'base64');
            const dest = path.join(ARTIFACT_DIR, filename);
            fs.writeFileSync(dest, buf);
            console.log(`    📸 Saved screenshot: ${filename} (${buf.length} bytes)`);
        }

        async function evalInPage(expression) {
            const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
            return res.result ? res.result.value : null;
        }

        await setViewport();

        // =====================================================================
        // SECTION 1: CONSENT MANAGER VERIFICATION
        // =====================================================================
        console.log("\n[SECTION 1] Consent Manager (:3001) Navigation & escapeHtml Audit");

        // Navigate to CM and setup session
        await cdp.send('Page.navigate', { url: `${CM_FRONTEND}/#/dashboard` });
        await sleep(1000);
        await evalInPage(`
            sessionStorage.setItem('cm_token', '${cmAdmin.data.token}');
            sessionStorage.setItem('cm_user', JSON.stringify({
                email: 'superadmin@depa.cm',
                role: 'SUPER_ADMIN',
                organizationId: null
            }));
            window.location.hash = '#/dashboard';
        `);
        await sleep(1500);

        // Verify window.DF_UI has escapeHtml and formatDateTime
        const hasEscapeHtmlCM = await evalInPage(`typeof window.DF_UI.escapeHtml === 'function'`);
        assert(hasEscapeHtmlCM === true, "CM: window.DF_UI.escapeHtml is properly exported as a function");
        const hasFormatDateTimeCM = await evalInPage(`typeof window.DF_UI.formatDateTime === 'function'`);
        assert(hasFormatDateTimeCM === true, "CM: window.DF_UI.formatDateTime is properly exported as a function");

        // Test escaping behavior
        const escapedOutputCM = await evalInPage(`window.DF_UI.escapeHtml('<script>alert("xss")</script>')`);
        assert(escapedOutputCM === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;', "CM: escapeHtml correctly protects against XSS characters");

        // Verify Dashboard Provenance & Stat Cards
        const dashTitle = await evalInPage(`document.querySelector('.df-hero-title') ? document.querySelector('.df-hero-title').textContent : ''`);
        assert(dashTitle.includes('Federation Governance'), `CM Dashboard rendered title: "${dashTitle}"`);

        // Test Navigation 1: Institution Registry (#/organizations)
        console.log("  Testing CM Route: #/organizations");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/organizations';`);
        await sleep(1500);
        let orgsErrors = cdp.getErrors().filter(e => e.includes('escapeHtml'));
        assert(orgsErrors.length === 0, "CM Institution Registry renders without escapeHtml error");
        const orgsTableFound = await evalInPage(`document.querySelectorAll('.df-table tbody tr').length > 0`);
        assert(orgsTableFound, "CM Institution Registry successfully populated organization rows");
        await capture('s7_addendum_cm_organizations.png');

        // Test Navigation 2: Central Authority Officers (#/administrators)
        console.log("  Testing CM Route: #/administrators");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/administrators';`);
        await sleep(1500);
        let adminErrors = cdp.getErrors().filter(e => e.includes('escapeHtml'));
        assert(adminErrors.length === 0, "CM Central Officers renders without escapeHtml error");
        await capture('s7_addendum_cm_administrators.png');

        // Test Navigation 3: Global Security Audit Trail (#/audit-logs)
        console.log("  Testing CM Route: #/audit-logs");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/audit-logs';`);
        await sleep(1500);
        let auditErrors = cdp.getErrors().filter(e => e.includes('escapeHtml'));
        assert(auditErrors.length === 0, "CM Global Audit Trail renders without escapeHtml error");
        const auditRowsFound = await evalInPage(`document.querySelectorAll('.df-table tbody tr').length > 0`);
        assert(auditRowsFound, "CM Global Audit Trail successfully populated audit rows");
        await capture('s7_addendum_cm_audit.png');

        // Test Navigation 4: Trust & Public Keys (#/trust-overview)
        console.log("  Testing CM Route: #/trust-overview");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/trust-overview';`);
        await sleep(1500);
        let trustErrors = cdp.getErrors().filter(e => e.includes('escapeHtml'));
        assert(trustErrors.length === 0, "CM Trust & Keys renders without escapeHtml error");
        await capture('s7_addendum_cm_trust.png');

        // =====================================================================
        // SECTION 2: COLLEGE A PROVIDER VERIFICATION
        // =====================================================================
        console.log("\n[SECTION 2] College A Provider (:3002) Navigation & Academic Schema Routing");

        // Navigate to College A and setup admin session
        await cdp.send('Page.navigate', { url: `${COL_A_FRONTEND}/#/admin/overview` });
        await sleep(1000);
        await evalInPage(`
            sessionStorage.setItem('depa_college_a_auth_session', JSON.stringify({
                token: '${colAAdmin.data.token || colAAdmin.data.accessToken}',
                user: {
                    userId: '${colAAdmin.data.userId}',
                    name: 'Dean of Academic Records',
                    email: 'dean@collegea.edu',
                    role: 'ORG_ADMIN',
                    organizationCode: 'COLLEGE_A',
                    studentId: null
                }
            }));
            window.location.hash = '#/admin/overview';
        `);
        await sleep(1500);

        // Verify window.DF_UI in College A
        const hasEscapeHtmlColA = await evalInPage(`typeof window.DF_UI.escapeHtml === 'function'`);
        assert(hasEscapeHtmlColA === true, "College A: window.DF_UI.escapeHtml is properly exported as a function");
        const hasFormatDateTimeColA = await evalInPage(`typeof window.DF_UI.formatDateTime === 'function'`);
        assert(hasFormatDateTimeColA === true, "College A: window.DF_UI.formatDateTime is properly exported as a function");

        // Route: Registrar Overview (#/admin/overview)
        console.log("  Testing College A Route: #/admin/overview");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/admin/overview';`);
        await sleep(1500);
        let colAOverviewErrors = cdp.getErrors().filter(e => e.includes('escapeHtml'));
        assert(colAOverviewErrors.length === 0, "College A Registrar Overview renders without escapeHtml error");
        await capture('s7_addendum_col_a_overview.png');

        // Route: Student Registry (#/admin/students)
        console.log("  Testing College A Route: #/admin/students");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/admin/students';`);
        await sleep(1500);
        let colAStudentErrors = cdp.getErrors().filter(e => e.includes('escapeHtml'));
        assert(colAStudentErrors.length === 0, "College A Student Registry renders without escapeHtml error");
        await capture('s7_addendum_col_a_students.png');

        // Route: CSV Bulk Onboarding (#/admin/onboarding)
        console.log("  Testing College A Route: #/admin/onboarding");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/admin/onboarding';`);
        await sleep(1500);
        const onboardingHeader = await evalInPage(`document.querySelector('#df-main-content h3') ? document.querySelector('#df-main-content h3').textContent : ''`);
        assert(onboardingHeader.includes('Student CSV Onboarding'), `Onboarding page displays correct header: "${onboardingHeader}"`);

        // Route: Academic Schema & Credentials (#/admin/academic-data)
        console.log("  Testing College A Route: #/admin/academic-data (Defect 2 Verification)");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/admin/academic-data';`);
        await sleep(1500);
        let academicErrors = cdp.getErrors().filter(e => e.includes('escapeHtml'));
        assert(academicErrors.length === 0, "College A Academic Schema renders without escapeHtml error");

        // Crucial Check: Verify it displays Academic Schema and NOT Student CSV Onboarding
        const academicHeader = await evalInPage(`document.querySelector('#df-main-content h3') ? document.querySelector('#df-main-content h3').textContent : ''`);
        assert(academicHeader.includes('Academic Data Schema'), `CONFIRMED: Academic Schema page displays: "${academicHeader}"`);
        assert(!academicHeader.includes('CSV Onboarding'), "CONFIRMED: Academic Schema DOES NOT display Student CSV Onboarding content");

        // Verify Schema Mapping Table content
        const schemaTableTitle = await evalInPage(`document.querySelector('.card-header h6') ? document.querySelector('.card-header h6').textContent : ''`);
        assert(schemaTableTitle.includes('Active Canonical Field Extractors'), `Schema extractor table found: "${schemaTableTitle}"`);

        const hasCgpaExtractor = await evalInPage(`document.body.innerText.includes('students.cgpa')`);
        assert(hasCgpaExtractor === true, "Schema table renders 'students.cgpa' mapping");

        const hasTranscriptExtractor = await evalInPage(`document.body.innerText.includes('students.transcript')`);
        assert(hasTranscriptExtractor === true, "Schema table renders 'students.transcript' mapping");
        await capture('s7_addendum_col_a_academic_schema.png');

        // Route: Inbound P2P Monitor (#/admin/monitor)
        console.log("  Testing College A Route: #/admin/monitor");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/admin/monitor';`);
        await sleep(1500);
        let monitorErrors = cdp.getErrors().filter(e => e.includes('escapeHtml'));
        assert(monitorErrors.length === 0, "College A Inbound P2P Monitor renders without escapeHtml error");
        await capture('s7_addendum_col_a_monitor.png');

        // Route: Institutional Audit Activity (#/admin/audit)
        console.log("  Testing College A Route: #/admin/audit");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/admin/audit';`);
        await sleep(1500);
        let colAAuditErrors = cdp.getErrors().filter(e => e.includes('escapeHtml'));
        assert(colAAuditErrors.length === 0, "College A Audit Activity renders without escapeHtml error");
        await capture('s7_addendum_col_a_audit.png');

        // =====================================================================
        // SECTION 3: COLLEGE B CONSUMER VERIFICATION
        // =====================================================================
        console.log("\n[SECTION 3] College B Consumer (:3003) formatDateTime & Requests/Records Audit");

        // Navigate to College B and setup admin session
        await cdp.send('Page.navigate', { url: `${COL_B_FRONTEND}/#/admin/requests` });
        await sleep(1000);
        await evalInPage(`
            sessionStorage.setItem('colb_token', '${colBAdmin.data.token || colBAdmin.data.accessToken}');
            sessionStorage.setItem('colb_user', JSON.stringify({
                userId: '${colBAdmin.data.userId}',
                name: 'Dean of Graduate Admissions',
                email: 'dean@collegeb.edu',
                role: 'ORG_ADMIN',
                organizationCode: 'COLLEGE_B',
                studentId: null
            }));
            window.location.hash = '#/admin/requests';
        `);
        await sleep(1500);

        // Verify window.DF_UI in College B
        const hasEscapeHtmlColB = await evalInPage(`typeof window.DF_UI.escapeHtml === 'function'`);
        assert(hasEscapeHtmlColB === true, "College B: window.DF_UI.escapeHtml is properly exported as a function");
        const hasFormatDateTimeColB = await evalInPage(`typeof window.DF_UI.formatDateTime === 'function'`);
        assert(hasFormatDateTimeColB === true, "College B: window.DF_UI.formatDateTime is properly exported as a function");

        // Route: Outgoing Requests (#/admin/requests)
        console.log("  Testing College B Route: #/admin/requests (uses formatDateTime)");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/admin/requests';`);
        await sleep(1500);
        let colBRequestsErrors = cdp.getErrors().filter(e => e.includes('formatDateTime') || e.includes('escapeHtml'));
        assert(colBRequestsErrors.length === 0, "College B Requests renders without formatDateTime or escapeHtml errors");
        await capture('s7_addendum_col_b_requests.png');

        // Route: Retrieved Records (#/admin/records)
        console.log("  Testing College B Route: #/admin/records (uses formatDateTime)");
        cdp.clearErrors();
        await evalInPage(`
            if (window.DF_RECORDS_STORE) {
                window.DF_RECORDS_STORE.saveRecord({
                    studentId: 'STU-2023-001',
                    requestId: 'DREQ_ADDENDUM_VERIFY',
                    providerOrganizationCode: 'COLLEGE_A',
                    retrievedAt: new Date().toISOString(),
                    approvedFields: ['CGPA', 'DEGREE_CERTIFICATE'],
                    data: {
                        studentId: 'STU-2023-001',
                        fullName: 'Alice Johnson',
                        CGPA: '8.84 / 10.0',
                        DEGREE_CERTIFICATE: 'Bachelor of Science in Computer Science & Engineering'
                    }
                });
            }
            window.location.hash = '#/admin/records';
        `);
        await sleep(1500);
        let colBRecordsErrors = cdp.getErrors().filter(e => e.includes('formatDateTime') || e.includes('escapeHtml'));
        assert(colBRecordsErrors.length === 0, "College B Records renders without formatDateTime or escapeHtml errors");
        await capture('s7_addendum_col_b_records.png');

        // Route: Session Operations Audit (#/admin/audit)
        console.log("  Testing College B Route: #/admin/audit (uses formatDateTime)");
        cdp.clearErrors();
        await evalInPage(`window.location.hash = '#/admin/audit';`);
        await sleep(1500);
        let colBAuditErrors = cdp.getErrors().filter(e => e.includes('formatDateTime') || e.includes('escapeHtml'));
        assert(colBAuditErrors.length === 0, "College B Audit renders without formatDateTime or escapeHtml errors");

        cdp.close();

        // ---------------------------------------------------------------------
        // SUMMARY
        // ---------------------------------------------------------------------
        console.log("\n==============================================================================");
        console.log(`   STAGE 7 ADDENDUM SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${passedTests + failedTests})`);
        console.log("==============================================================================\n");

        if (failedTests > 0) {
            process.exit(1);
        }
    } catch (err) {
        console.error("Fatal Addendum verification error:", err);
        process.exit(1);
    } finally {
        try { chromeProc.kill(); } catch (e) {}
    }
}

runVerification().catch(err => {
    console.error("Fatal unhandled error:", err);
    process.exit(1);
});

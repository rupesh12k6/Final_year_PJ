/**
 * ==============================================================================
 * STAGE 7 — COMPREHENSIVE MULTI-APPLICATION SCREENSHOT HARNESS VIA CHROME CDP
 * Captures clean, high-resolution screenshots for:
 * 1. Consent Manager (:3001) - Super Admin Dashboard, Organizations, Audit Logs
 * 2. College A Provider (:3002) - Student Pending Consent (Granular Toggles),
 *    Student Active/History, Admin Student Records, Student Login
 * 3. College B Consumer (:3003) - Admin Login, New Request, Requests Table,
 *    Retrieved Records, Mobile and Tablet Responsive Views
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

    close() {
        if (this.ws) this.ws.close();
    }
}

async function apiPost(url, body, token = null, extraHeaders = {}) {
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

async function runHarness() {
    console.log("=== STAGE 7 MULTI-APPLICATION SCREENSHOT CAPTURE ===");

    // Step 1: Pre-authenticate services
    console.log("\n1. Pre-authenticating personas across nodes...");
    
    // CM Super Admin
    const cmAdminAuth = await apiPost(`${CM_API}/api/auth/login`, {
        email: 'superadmin@depa.cm',
        password: 'SuperAdmin@123'
    });
    console.log("  ✔ CM Super Admin:", cmAdminAuth.ok ? "Authenticated" : "Failed");

    // College A Admin
    const colAAdminAuth = await apiPost(`${COL_A_API}/api/auth/login`, {
        email: 'dean@collegea.edu',
        password: 'OrgAdmin@123'
    });
    console.log("  ✔ College A Admin:", colAAdminAuth.ok ? "Authenticated" : "Failed");

    // College A Student
    const colAStudentAuth = await apiPost(`${COL_A_API}/api/auth/login`, {
        email: 'student1@collegea.edu',
        password: 'StudentPassword123'
    });
    console.log("  ✔ College A Student:", colAStudentAuth.ok ? "Authenticated" : "Failed");

    // College B Admin
    const colBAdminAuth = await apiPost(`${COL_B_API}/api/auth/login`, {
        email: 'dean@collegeb.edu',
        password: 'OrgAdmin@123'
    });
    console.log("  ✔ College B Admin:", colBAdminAuth.ok ? "Authenticated" : "Failed");

    const cmToken = cmAdminAuth.data ? (cmAdminAuth.data.token || cmAdminAuth.data.accessToken) : '';
    const colAToken = colAAdminAuth.data ? (colAAdminAuth.data.token || colAAdminAuth.data.accessToken) : '';
    const colAStudentToken = colAStudentAuth.data ? (colAStudentAuth.data.token || colAStudentAuth.data.accessToken) : '';
    const colBToken = colBAdminAuth.data ? (colBAdminAuth.data.token || colBAdminAuth.data.accessToken) : '';

    // Step 2: Seed a fresh pending Data Request for College A Student view
    console.log("\n2. Creating an illustrative DataRequest for granular consent UI...");
    const reqRes = await apiPost(`${COL_B_API}/api/consumer/data-requests/initiate`, {
        dataPrincipalId: 'STU-2023-001',
        providerOrganizationId: 'COLLEGE_A',
        purpose: 'Academic Verification for Master of Science in Data Systems',
        requestedFields: ['CGPA', 'TRANSCRIPT', 'DEGREE_CERTIFICATE']
    }, colBToken);
    console.log("  ✔ Illustrative DataRequest:", reqRes.ok ? (reqRes.data.id || reqRes.data.dataRequestId) : "Failed");

    // Step 3: Spawn Headless Chrome with CDP
    console.log("\n3. Spawning Headless Chrome...");
    const chromeProc = spawn(CHROME_PATH, [
        '--headless',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=9224',
        'about:blank'
    ]);

    await sleep(2500);

    try {
        const listRes = await fetch('http://127.0.0.1:9224/json/list');
        const listData = await listRes.json();
        const page = listData.find(p => p.type === 'page') || listData[0];
        const cdp = new CdpClient(page.webSocketDebuggerUrl);
        await cdp.connect();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');

        async function setViewport(w, h, isMobile = false) {
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: w,
                height: h,
                deviceScaleFactor: 1,
                mobile: isMobile
            });
            await cdp.send('Emulation.setVisibleSize', { width: w, height: h });
        }

        async function capture(filename) {
            await sleep(1000);
            const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
            const buf = Buffer.from(ss.data, 'base64');
            const dest = path.join(ARTIFACT_DIR, filename);
            fs.writeFileSync(dest, buf);
            console.log(`  📸 Saved ${filename} (${buf.length} bytes)`);
        }

        // ---------------------------------------------------------------------
        // PART A: CONSENT MANAGER (:3001)
        // ---------------------------------------------------------------------
        console.log("\n--- Part A: Capturing Consent Manager (:3001) ---");
        await setViewport(1440, 900);

        // A1. CM Login Page
        await cdp.send('Page.navigate', { url: `${CM_FRONTEND}/#/login/super-admin` });
        await cdp.send('Runtime.evaluate', { expression: `sessionStorage.clear();` });
        await sleep(1000);
        await capture('s7_cm_login.png');

        // A2. CM Super Admin Dashboard
        await cdp.send('Page.navigate', { url: `${CM_FRONTEND}/#/dashboard` });
        await cdp.send('Runtime.evaluate', {
            expression: `
                sessionStorage.setItem('cm_token', '${cmToken}');
                sessionStorage.setItem('cm_user', JSON.stringify({
                    email: 'superadmin@depa.cm',
                    role: 'SUPER_ADMIN',
                    organizationId: null
                }));
                window.location.hash = '#/dashboard';
            `
        });
        await sleep(1500);
        await capture('s7_cm_dashboard.png');

        // A3. CM Organizations Registry
        await cdp.send('Runtime.evaluate', { expression: `window.location.hash = '#/organizations';` });
        await sleep(1500);
        await capture('s7_cm_organizations.png');

        // A4. CM Central Audit Logs
        await cdp.send('Runtime.evaluate', { expression: `window.location.hash = '#/audit-logs';` });
        await sleep(1500);
        await capture('s7_cm_audit_logs.png');

        // ---------------------------------------------------------------------
        // PART B: COLLEGE A PROVIDER (:3002)
        // ---------------------------------------------------------------------
        console.log("\n--- Part B: Capturing College A Provider (:3002) ---");

        // B1. Student Login Page
        await cdp.send('Page.navigate', { url: `${COL_A_FRONTEND}/#/login-student` });
        await cdp.send('Runtime.evaluate', { expression: `sessionStorage.clear();` });
        await sleep(1000);
        await capture('s7_col_a_student_login.png');

        // B2. Student Pending Consent Requests (with Granular Toggles)
        await cdp.send('Page.navigate', { url: `${COL_A_FRONTEND}/#/student/pending` });
        await cdp.send('Runtime.evaluate', {
            expression: `
                sessionStorage.setItem('depa_college_a_auth_session', JSON.stringify({
                    token: '${colAStudentToken}',
                    user: {
                        userId: '${colAStudentAuth.data ? colAStudentAuth.data.userId : "STU-2023-001"}',
                        name: 'Alice Johnson',
                        email: 'student1@collegea.edu',
                        role: 'STUDENT',
                        organizationCode: 'COLLEGE_A',
                        studentId: 'STU-2023-001'
                    }
                }));
                window.location.hash = '#/student/pending';
            `
        });
        await sleep(2000);
        await capture('s7_col_a_pending_consent.png');

        // B3. Student Active Consents / History
        await cdp.send('Runtime.evaluate', { expression: `window.location.hash = '#/student/history';` });
        await sleep(1500);
        await capture('s7_col_a_active_consents.png');

        // B4. College A Admin - Student Registry
        await cdp.send('Page.navigate', { url: `${COL_A_FRONTEND}/#/admin/students` });
        await cdp.send('Runtime.evaluate', {
            expression: `
                sessionStorage.setItem('depa_college_a_auth_session', JSON.stringify({
                    token: '${colAToken}',
                    user: {
                        userId: '${colAAdminAuth.data ? colAAdminAuth.data.userId : "ADMIN-A"}',
                        name: 'Dean of Academic Records',
                        email: 'dean@collegea.edu',
                        role: 'ORG_ADMIN',
                        organizationCode: 'COLLEGE_A',
                        studentId: null
                    }
                }));
                window.location.hash = '#/admin/students';
            `
        });
        await sleep(1500);
        await capture('s7_col_a_admin_students.png');

        // ---------------------------------------------------------------------
        // PART C: COLLEGE B CONSUMER (:3003)
        // ---------------------------------------------------------------------
        console.log("\n--- Part C: Capturing College B Consumer (:3003) ---");

        // C1. Admin Login
        await cdp.send('Page.navigate', { url: `${COL_B_FRONTEND}/#/login-admin` });
        await cdp.send('Runtime.evaluate', { expression: `sessionStorage.clear();` });
        await sleep(1000);
        await capture('s7_col_b_admin_login.png');

        // Setup College B Admin session
        const colBUserObj = {
            userId: colBAdminAuth.data ? colBAdminAuth.data.userId : 'ADMIN-B',
            name: 'Dean of Graduate Admissions',
            email: 'dean@collegeb.edu',
            role: 'ORG_ADMIN',
            organizationCode: 'COLLEGE_B',
            studentId: null
        };

        // C2. New Data Request Form
        await cdp.send('Page.navigate', { url: `${COL_B_FRONTEND}/#/admin/new-request` });
        await cdp.send('Runtime.evaluate', {
            expression: `
                sessionStorage.setItem('colb_token', '${colBToken}');
                sessionStorage.setItem('colb_user', JSON.stringify(${JSON.stringify(colBUserObj)}));
                window.location.hash = '#/admin/new-request';
            `
        });
        await sleep(1500);
        await capture('s7_col_b_new_request.png');

        // C3. Outgoing Data Requests Status Table
        await cdp.send('Runtime.evaluate', { expression: `window.location.hash = '#/admin/requests';` });
        await sleep(1500);
        await capture('s7_col_b_requests.png');

        // C4. Retrieved Academic Records View (with in-memory record populated)
        await cdp.send('Runtime.evaluate', {
            expression: `
                if (window.DF_RECORDS_STORE) {
                    window.DF_RECORDS_STORE.saveRecord({
                        studentId: 'STU-2023-001',
                        requestId: 'DREQ_S7_DEMO',
                        providerOrganizationCode: 'COLLEGE_A',
                        retrievedAt: new Date().toISOString(),
                        approvedFields: ['CGPA', 'DEGREE_CERTIFICATE'],
                        data: {
                            studentId: 'STU-2023-001',
                            fullName: 'Alice Johnson',
                            CGPA: '8.84 / 10.0',
                            DEGREE_CERTIFICATE: 'Bachelor of Science in Computer Science & Engineering (First Class with Distinction)'
                        }
                    });
                }
                window.location.hash = '#/admin/records';
            `
        });
        await sleep(1500);
        await capture('s7_col_b_records.png');

        // C5. Responsive Tablet (768x1024)
        console.log("  Capturing responsive tablet view...");
        await setViewport(768, 1024);
        await cdp.send('Runtime.evaluate', { expression: `window.location.hash = '#/admin/overview';` });
        await sleep(1500);
        await capture('s7_col_b_responsive_tablet.png');

        // C6. Responsive Mobile (375x812)
        console.log("  Capturing responsive mobile view...");
        await setViewport(375, 812, true);
        await cdp.send('Runtime.evaluate', { expression: `window.location.hash = '#/admin/overview';` });
        await sleep(1500);
        await capture('s7_col_b_responsive_mobile.png');

        cdp.close();
        console.log("\n=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Screenshot capture error:", err);
    } finally {
        try { chromeProc.kill(); } catch (e) {}
    }
}

runHarness().catch(console.error);

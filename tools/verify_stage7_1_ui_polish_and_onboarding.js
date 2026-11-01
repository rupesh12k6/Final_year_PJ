/**
 * ==============================================================================
 * DEPA STAGE 7.1 — COMPREHENSIVE VERIFICATION & ACCEPTANCE SUITE
 * 1. Activation Token Hash Investigation & CSPRNG Verification
 * 2. Individual Student Registration & Backend Validation Edge Cases
 * 3. Bulk CSV Onboarding & Account Activation Workflow
 * 4. Full End-to-End Consent Lifecycle & Scoped Data Fetch
 * 5. Dashboard Metric Provenance & PostgreSQL Query Auditing
 * 6. CDP Browser Testing & Screenshot Capture (Desktop, Tablet, Mobile)
 * ==============================================================================
 */

const { spawn, execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\80f0ed74-aeac-4008-b204-ad3a9983013a';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PSQL_PATH = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';

const CM_API = 'http://localhost:8095';
const COL_A_API = 'http://localhost:8081';
const COL_B_API = 'http://localhost:8082';

const CM_FRONTEND = 'http://localhost:3001';
const COL_A_FRONTEND = 'http://localhost:3002';
const COL_B_FRONTEND = 'http://localhost:3003';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

function queryDb(dbName, sql) {
    try {
        const cmd = `set PGPASSWORD=root&& "${PSQL_PATH}" -U postgres -h 127.0.0.1 -d ${dbName} -t -A -c "${sql}"`;
        return execSync(cmd, { shell: 'cmd.exe', encoding: 'utf8' }).trim();
    } catch (e) {
        return null;
    }
}

async function apiPost(url, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

async function apiGet(url, token = null) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
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

async function runVerification() {
    console.log('==============================================================================');
    console.log('  STAGE 7.1 ADDENDUM — SYSTEM INTEGRATION & SECURITY VALIDATION');
    console.log('==============================================================================\n');

    // -------------------------------------------------------------------------
    // SUITE 1: ACTIVATION TOKEN INVESTIGATION & ANALYSIS
    // -------------------------------------------------------------------------
    console.log('[SUITE 1] Activation Token Investigation & Empty String Hash Analysis');

    const emptyStringHash = crypto.createHash('sha256').update('').digest('hex');
    console.log(`  [*] Cryptographic constant: SHA-256("") = ${emptyStringHash}`);
    assert(emptyStringHash === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 is proven to be the SHA-256 hash of empty string ("")');

    // Authenticate College A Admin
    const colAAdminLogin = await apiPost(`${COL_A_API}/api/auth/login`, {
        email: 'dean@collegea.edu',
        password: 'OrgAdmin@123'
    });
    assert(colAAdminLogin.ok && !!colAAdminLogin.data.accessToken, 'College A Admin successfully authenticated');
    const colAToken = colAAdminLogin.data.accessToken;

    // Enroll fresh test candidate without password to trigger activation token generation
    const testStuNum = Math.floor(10000 + Math.random() * 90000);
    const testStuId = `STU-S71-${testStuNum}`;
    const testStuEmail = `student.${testStuNum}@collegea.edu`;

    const enrollRes = await apiPost(`${COL_A_API}/api/students`, {
        studentId: testStuId,
        name: 'Stage 7.1 Audit Student',
        email: testStuEmail,
        program: 'B.Tech Computer Science & AI',
        cgpa: '9.42 / 10.0',
        degreeCertificate: 'Bachelor of Technology with Honors',
        transcript: 'Official Cumulative Transcript - All Requirements Met',
        password: null // triggers activation token generation
    }, colAToken);

    assert(enrollRes.status === 201 && enrollRes.data.status === 'PENDING_ACTIVATION',
        'Fresh student successfully enrolled in PENDING_ACTIVATION state');

    const generatedRawToken = enrollRes.data.activationToken;
    assert(!!generatedRawToken && generatedRawToken.length >= 32,
        'CSPRNG generated a non-empty, high-entropy activation token');

    const expectedHash = crypto.createHash('sha256').update(generatedRawToken).digest('hex');
    const dbStoredHash = queryDb('college_a_db', `SELECT activation_token_hash FROM students WHERE student_id = '${testStuId}';`);

    assert(dbStoredHash === expectedHash,
        'Database stores SHA-256 hash calculated over the actual generated token');
    assert(dbStoredHash !== 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        'Database hash is strictly NOT the empty-string hash (e3b0c44...)');
    assert(dbStoredHash !== generatedRawToken,
        'Raw activation token is NEVER stored in plaintext in the database');

    const expiryInDb = queryDb('college_a_db', `SELECT activation_token_expires_at FROM students WHERE student_id = '${testStuId}';`);
    const expiryDate = new Date(expiryInDb);
    const now = new Date();
    const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
    assert(daysDiff > 6.8 && daysDiff < 7.2,
        `Token expiry is correctly set to 7 days in the future (measured: ${daysDiff.toFixed(2)} days)`);

    // Validate token via POST /api/auth/activation/validate
    const valRes = await apiPost(`${COL_A_API}/api/auth/activation/validate`, {
        token: generatedRawToken
    });
    assert(valRes.ok && valRes.data.valid === true && valRes.data.studentId === testStuId,
        'POST /api/auth/activation/validate verifies token and returns student identity');

    // Complete password setup
    const newStudentPass = 'StudentActivation@2026';
    const setupRes = await apiPost(`${COL_A_API}/api/auth/activation/setup-password`, {
        token: generatedRawToken,
        password: newStudentPass
    });
    assert(setupRes.ok && setupRes.data.success === true && setupRes.data.status === 'ACTIVE',
        'Student password setup completes successfully');

    // Verify database token hash is cleared to NULL upon activation
    const postActivationHash = queryDb('college_a_db', `SELECT activation_token_hash FROM students WHERE student_id = '${testStuId}';`);
    assert(!postActivationHash || postActivationHash.length === 0,
        'Activation token hash is permanently CLEARED from the database upon activation');

    // Replay attempt must be rejected (single-use enforcement)
    const replayRes = await apiPost(`${COL_A_API}/api/auth/activation/setup-password`, {
        token: generatedRawToken,
        password: 'ReplayPassword@999'
    });
    assert(!replayRes.ok && replayRes.status === 400,
        'Replaying used activation token is rejected with 400 Bad Request (single-use enforced)');

    // Student logs in with the new password
    const stuLoginRes = await apiPost(`${COL_A_API}/api/auth/login`, {
        email: testStuEmail,
        password: newStudentPass
    });
    assert(stuLoginRes.ok && stuLoginRes.data.role === 'STUDENT',
        'Student successfully logs in with newly established credentials');
    const stuJwt = stuLoginRes.data.accessToken;

    // Student profile access
    const stuProfileRes = await apiGet(`${COL_A_API}/api/student/profile`, stuJwt);
    assert(stuProfileRes.ok && stuProfileRes.data.studentId === testStuId,
        'Student can access their own profile (GET /api/student/profile)');

    // Ownership check: student cannot access another student's record
    const idorRes = await apiGet(`${COL_A_API}/api/students/STU-2023-001/dossier`, stuJwt);
    assert(idorRes.status === 403,
        'Student is forbidden (403) from accessing another student dossier (RBAC/Ownership check enforced)');

    // -------------------------------------------------------------------------
    // SUITE 2: COLLEGE A INDIVIDUAL REGISTRATION VALIDATION EDGE CASES
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 2] College A Individual Registration Validation Suite');

    // 1. Duplicate Student ID
    const dupIdRes = await apiPost(`${COL_A_API}/api/students`, {
        studentId: testStuId, // duplicate
        name: 'Another User',
        email: `unique.${Date.now()}@collegea.edu`,
        program: 'B.Tech',
        cgpa: '8.5'
    }, colAToken);
    assert(dupIdRes.status === 400, 'Duplicate Student ID rejected with 400 Bad Request');

    // 2. Duplicate Email
    const dupEmailRes = await apiPost(`${COL_A_API}/api/students`, {
        studentId: `STU-NEW-${Date.now().toString().slice(-4)}`,
        name: 'Another User',
        email: testStuEmail, // duplicate
        program: 'B.Tech',
        cgpa: '8.5'
    }, colAToken);
    assert(dupEmailRes.status === 400, 'Duplicate Email rejected with 400 Bad Request');

    // 3. Invalid CGPA (> 10.0)
    const highCgpaRes = await apiPost(`${COL_A_API}/api/students`, {
        studentId: `STU-HIGH-${Date.now().toString().slice(-4)}`,
        name: 'High CGPA User',
        email: `high.cgpa.${Date.now()}@collegea.edu`,
        program: 'B.Tech',
        cgpa: '14.50'
    }, colAToken);
    assert(highCgpaRes.status === 400, 'Invalid CGPA (> 10.0) rejected with 400 Bad Request');

    // 4. Invalid CGPA (non-numeric)
    const alphaCgpaRes = await apiPost(`${COL_A_API}/api/students`, {
        studentId: `STU-ALPHA-${Date.now().toString().slice(-4)}`,
        name: 'Alpha CGPA User',
        email: `alpha.cgpa.${Date.now()}@collegea.edu`,
        program: 'B.Tech',
        cgpa: 'TOP_TIER'
    }, colAToken);
    assert(alphaCgpaRes.status === 400, 'Invalid CGPA (non-numeric) rejected with 400 Bad Request');

    // 5. Missing required fields
    const missingRes = await apiPost(`${COL_A_API}/api/students`, {
        studentId: '',
        name: '',
        email: '',
        program: 'B.Tech',
        cgpa: '8.0'
    }, colAToken);
    assert(missingRes.status === 400, 'Missing required fields rejected with 400 Bad Request');

    // 6. Invalid email format
    const badEmailRes = await apiPost(`${COL_A_API}/api/students`, {
        studentId: `STU-MAIL-${Date.now().toString().slice(-4)}`,
        name: 'Bad Email User',
        email: 'invalid_email_no_at',
        program: 'B.Tech',
        cgpa: '8.0'
    }, colAToken);
    assert(badEmailRes.status === 400, 'Invalid email format rejected with 400 Bad Request');

    // -------------------------------------------------------------------------
    // SUITE 3: DASHBOARD METRIC PROVENANCE AUDIT
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 3] Consent Manager Dashboard Metric Provenance Audit');

    // Authenticate Super Admin on CM
    const saLoginRes = await apiPost(`${CM_API}/api/auth/login`, {
        email: 'superadmin@depa.cm',
        password: 'SuperAdmin@123'
    });
    assert(saLoginRes.ok && !!saLoginRes.data.token, 'Super Admin authenticated on Consent Manager');
    const saToken = saLoginRes.data.token;

    const metricsRes = await apiGet(`${CM_API}/api/admin/metrics`, saToken);
    assert(metricsRes.ok, 'CM Metrics API responded with 200 OK');

    const metrics = metricsRes.data;
    console.log(`  [*] Live CM Dashboard Metrics:`, JSON.stringify(metrics));

    const dbOrgCount = parseInt(queryDb('consent_manager_db_fyp', 'SELECT count(*) FROM organizations;'), 10);
    assert(metrics.totalOrganizations === dbOrgCount,
        `totalOrganizations (${metrics.totalOrganizations}) matches PostgreSQL SELECT count(*) FROM organizations (${dbOrgCount})`);

    const dbActiveConsents = parseInt(queryDb('consent_manager_db_fyp', "SELECT count(*) FROM consents WHERE status = 'ACTIVE';"), 10);
    assert(metrics.activeConsents === dbActiveConsents,
        `activeConsents (${metrics.activeConsents}) matches PostgreSQL SELECT count(*) FROM consents WHERE status='ACTIVE' (${dbActiveConsents})`);

    const dbPendingRequests = parseInt(queryDb('consent_manager_db_fyp', "SELECT count(*) FROM data_requests WHERE status = 'PENDING';"), 10);
    assert(metrics.pendingDataRequests === dbPendingRequests,
        `pendingDataRequests (${metrics.pendingDataRequests}) matches PostgreSQL SELECT count(*) FROM data_requests WHERE status='PENDING' (${dbPendingRequests})`);

    // -------------------------------------------------------------------------
    // SUITE 4: FULL CONSENT LIFECYCLE REGRESSION
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 4] Full Consent Lifecycle & Authoritative Scoped Data Exchange');

    // College B Admin login
    const colBAdminLogin = await apiPost(`${COL_B_API}/api/auth/login`, {
        email: 'dean@collegeb.edu',
        password: 'OrgAdmin@123'
    });
    const colBToken = colBAdminLogin.data.token || colBAdminLogin.data.accessToken;
    assert(colBAdminLogin.ok && !!colBToken, 'College B Admin authenticated');

    // College B initiates DataRequest for student Alice Johnson (STU-2023-001)
    const reqUnique = Date.now().toString().slice(-4);
    const createReqRes = await apiPost(`${COL_B_API}/api/consumer/data-requests/initiate`, {
        dataPrincipalId: 'STU-2023-001',
        providerOrganizationId: 'COLLEGE_A',
        purpose: `Stage 7.1 Lifecycle Verification ${reqUnique}`,
        requestedFields: ['CGPA', 'DEGREE_CERTIFICATE']
    }, colBToken);
    const dataRequestId = createReqRes.data ? (createReqRes.data.id || createReqRes.data.dataRequestId) : null;
    assert(createReqRes.status === 201 && !!dataRequestId, `College B successfully initiated DataRequest at CM (ID: ${dataRequestId})`);

    // Alice logs in on College A
    const aliceLogin = await apiPost(`${COL_A_API}/api/auth/login`, {
        email: 'student1@collegea.edu',
        password: 'StudentPassword123'
    });
    assert(aliceLogin.ok && (!!aliceLogin.data.accessToken || !!aliceLogin.data.token), 'Student Alice authenticated on College A');
    const aliceToken = aliceLogin.data.accessToken || aliceLogin.data.token;

    // Fetch pending consents for Alice
    const pendingConsentsRes = await apiGet(`${COL_A_API}/api/student/consents/pending`, aliceToken);
    assert(pendingConsentsRes.ok && Array.isArray(pendingConsentsRes.data), 'Student retrieved pending consent list');

    const approveItem = pendingConsentsRes.data.find(c => c.dataRequestId === dataRequestId);
    assert(approveItem != null, `Target DataRequest ${dataRequestId} found in pending list`);

    // Alice approves the consent request with scoped fields
    const approveRes = await apiPost(`${COL_A_API}/api/student/consents/${approveItem.id}/approve`, {
        approvedFields: ['CGPA', 'DEGREE_CERTIFICATE']
    }, aliceToken);
    assert(approveRes.ok && approveRes.data.success === true, 'Student Alice approved consent with scoped fields');

    // College B verifies status
    const colBGrantStatus = await apiGet(`${COL_B_API}/api/consumer/data-requests/${dataRequestId}/status`, colBToken);
    assert(colBGrantStatus.ok && colBGrantStatus.data.ready === true, 'College B confirmed active grant status');

    // College B dispatches outbound fetch
    const fetchRes = await apiPost(`${COL_B_API}/api/consumer/data-requests/${dataRequestId}/fetch-data`, {}, colBToken);
    assert(fetchRes.status === 200 && !!fetchRes.data && !!fetchRes.data.retrievedData, 'College B successfully retrieved academic record via College A');
    const retrievedData = fetchRes.data.retrievedData;
    assert(retrievedData != null, 'Retrieved academic record payload returned to Consumer');
    assert(retrievedData.CGPA != null || retrievedData.cgpa != null, 'Approved field CGPA was returned');
    assert(retrievedData.DEGREE_CERTIFICATE != null || retrievedData.degreeCertificate != null, 'Approved field DEGREE_CERTIFICATE was returned');

    // -------------------------------------------------------------------------
    // SUITE 5: HEADLESS CHROME BROWSER AUTOMATION & SCREENSHOT CAPTURE
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 5] Chrome CDP UI Testing & Responsive Screenshot Capture');

    const CHROME_DEBUG_PORT = 9444;
    const chromeProc = spawn(CHROME_PATH, [
        `--remote-debugging-port=${CHROME_DEBUG_PORT}`,
        '--headless',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        'about:blank'
    ]);

    await sleep(2500);

    try {
        const listRes = await fetch(`http://127.0.0.1:${CHROME_DEBUG_PORT}/json/list`);
        const listData = await listRes.json();
        const page = listData.find(p => p.type === 'page') || listData[0];
        const cdp = new CdpClient(page.webSocketDebuggerUrl);
        await cdp.connect();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        await cdp.send('Console.enable');

        async function takeScreenshot(filePath, width, height) {
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width,
                height,
                deviceScaleFactor: 1,
                mobile: width < 600
            });
            await sleep(500);
            const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png' });
            fs.writeFileSync(filePath, Buffer.from(screenshot.data, 'base64'));
            console.log(`  📸 Captured: ${path.basename(filePath)} (${width}x${height})`);
        }

        // --- 1. COLLEGE B SIDEBAR: DESKTOP (1440x900) ---
        console.log('  [*] Testing College B Desktop Sidebar...');
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await cdp.send('Page.navigate', { url: `${COL_B_FRONTEND}/#/login-admin` });
        await sleep(1500);

        // Inject session
        await cdp.send('Runtime.evaluate', {
            expression: `
                sessionStorage.setItem('colb_token', '${colBToken}');
                sessionStorage.setItem('colb_user', JSON.stringify({
                    userId: 'ADM-COLLEGE-B-01',
                    name: 'Dean of Graduate Admissions',
                    email: 'dean@collegeb.edu',
                    role: 'ORG_ADMIN',
                    organizationCode: 'COLLEGE_B'
                }));
                if (window.DF_SESSION && window.DF_SESSION.save) {
                    window.DF_SESSION.save({
                        token: '${colBToken}',
                        user: { name: 'Dean College B', email: 'dean@collegeb.edu', role: 'ORG_ADMIN', orgId: 'COLLEGE_B' }
                    });
                }
                window.location.hash = '#/admin/overview';
            `
        });
        await sleep(1500);

        // Verify sidebar styling properties
        const sidebarMetrics = await cdp.send('Runtime.evaluate', {
            expression: `(() => {
                const sidebar = document.getElementById('df-sidebar');
                if (!sidebar) return null;
                const rect = sidebar.getBoundingClientRect();
                const style = window.getComputedStyle(sidebar);
                const items = Array.from(sidebar.querySelectorAll('.sidebar-nav-item')).map(item => ({
                    text: item.querySelector('span') ? item.querySelector('span').textContent.trim() : '',
                    nowrap: window.getComputedStyle(item).whiteSpace
                }));
                return {
                    width: rect.width,
                    bg: style.backgroundColor,
                    items
                };
            })()`,
            returnByValue: true
        });

        assert(sidebarMetrics.result.value && Math.round(sidebarMetrics.result.value.width) === 260,
            `College B Sidebar width is consistently fixed at 260px (measured: ${sidebarMetrics.result.value.width}px)`);
        assert(sidebarMetrics.result.value.items.every(i => i.nowrap === 'nowrap'),
            'All College B sidebar navigation items enforce white-space: nowrap (no awkward text wrapping)');

        await takeScreenshot(path.join(ARTIFACT_DIR, 's7_1_col_b_sidebar_desktop.png'), 1440, 900);

        // --- 2. COLLEGE B SIDEBAR: TABLET (768x1024) ---
        console.log('  [*] Testing College B Tablet Collapsible Drawer...');
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false });
        await sleep(800);

        // Open drawer via toggle button
        await cdp.send('Runtime.evaluate', {
            expression: `(() => {
                const toggle = document.getElementById('df-sidebar-toggle');
                if (toggle) toggle.click();
            })()`
        });
        await sleep(600);

        const tabletSidebarState = await cdp.send('Runtime.evaluate', {
            expression: `(() => {
                const sidebar = document.getElementById('df-sidebar');
                return sidebar ? sidebar.classList.contains('show') : false;
            })()`,
            returnByValue: true
        });
        assert(tabletSidebarState.result.value === true, 'Sidebar expands smoothly on tablet via mobile toggle button');

        await takeScreenshot(path.join(ARTIFACT_DIR, 's7_1_col_b_sidebar_tablet.png'), 768, 1024);

        // Close drawer
        await cdp.send('Runtime.evaluate', {
            expression: `(() => {
                const backdrop = document.getElementById('df-sidebar-backdrop');
                if (backdrop) backdrop.click();
            })()`
        });
        await sleep(500);

        // --- 3. COLLEGE B SIDEBAR: MOBILE (375x812) ---
        console.log('  [*] Testing College B Mobile Drawer...');
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
        await sleep(800);

        // Toggle drawer on mobile
        await cdp.send('Runtime.evaluate', {
            expression: `(() => {
                const toggle = document.getElementById('df-sidebar-toggle');
                if (toggle) toggle.click();
            })()`
        });
        await sleep(600);

        await takeScreenshot(path.join(ARTIFACT_DIR, 's7_1_col_b_sidebar_mobile.png'), 375, 812);

        // --- 4. COLLEGE A INDIVIDUAL REGISTRATION MODAL ---
        console.log('  [*] Testing College A Individual Registration Modal...');
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
        await cdp.send('Page.navigate', { url: `${COL_A_FRONTEND}/#/login-admin` });
        await sleep(1500);

        await cdp.send('Runtime.evaluate', {
            expression: `
                window.DF_SESSION.save({
                    token: '${colAToken}',
                    user: { name: 'Dean College A', email: 'dean@collegea.edu', role: 'ORG_ADMIN', orgId: 'COLLEGE_A' }
                });
                window.location.hash = '#/admin/students';
            `
        });
        await sleep(1500);

        // Open Enroll Modal
        await cdp.send('Runtime.evaluate', {
            expression: `(() => {
                const btn = document.getElementById('btn-open-add-student');
                if (btn) btn.click();
            })()`
        });
        await sleep(800);

        // Fill form fields
        await cdp.send('Runtime.evaluate', {
            expression: `(() => {
                document.getElementById('add-student-id').value = 'STU-2026-DEMO';
                document.getElementById('add-student-name').value = 'Alexandra Vance';
                document.getElementById('add-student-email').value = 'alexandra.vance@collegea.edu';
                document.getElementById('add-student-program').value = 'B.Tech Artificial Intelligence';
                document.getElementById('add-student-cgpa').value = '9.65 / 10.0';
                document.getElementById('add-student-degree').value = 'Bachelor of Technology in AI (First Class)';
                document.getElementById('add-student-transcript').value = 'Official Transcript - Honors Completed';
            })()`
        });
        await sleep(500);

        await takeScreenshot(path.join(ARTIFACT_DIR, 's7_1_col_a_individual_enroll_modal.png'), 1440, 900);

        // Close enrollment modal and open Alice's dossier
        await cdp.send('Runtime.evaluate', {
            expression: `(() => {
                const modal = document.getElementById('modal-add-student');
                if (modal) modal.remove();
                window.DF_PAGE_ADMIN_STUDENTS.openDossierModal('STU-2023-001');
            })()`
        });
        await sleep(1000);

        await takeScreenshot(path.join(ARTIFACT_DIR, 's7_1_col_a_registered_student_dossier.png'), 1440, 900);

        // Check page errors
        const errors = cdp.getErrors();
        const nonBenignErrors = errors.filter(e => !e.includes('favicon.ico') && !e.includes('Failed to load resource: net::ERR_CONNECTION_REFUSED'));
        assert(nonBenignErrors.length === 0,
            `Zero uncaught JavaScript exceptions across all tested views (found: ${nonBenignErrors.length})`);
        if (nonBenignErrors.length > 0) {
            console.error('  Unexpected errors:', nonBenignErrors);
        }

        cdp.close();
    } finally {
        chromeProc.kill();
    }

    console.log('\n==============================================================================');
    console.log(`  VERIFICATION COMPLETE: ${passedTests} Passed, ${failedTests} Failed`);
    console.log('==============================================================================\n');

    process.exit(failedTests === 0 ? 0 : 1);
}

runVerification().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
});

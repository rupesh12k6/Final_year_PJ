/**
 * ==============================================================================
 * STAGE 6 — SCREENSHOT CAPTURE HARNESS VIA CHROME DEVTOOLS PROTOCOL (CDP)
 * Captures clean, authenticated screenshots of College B Consumer Portal:
 * Admin Login, Student Login, Activation, Admin views, Student views, and Responsive.
 * ==============================================================================
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\80f0ed74-aeac-4008-b204-ad3a9983013a';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const COL_B_API = 'http://localhost:8082';
const FRONTEND_URL = 'http://localhost:3003';

async function login(email, password) {
    const res = await fetch(`${COL_B_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) throw new Error(`Auth failed with status ${res.status}`);
    return await res.json();
}

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

async function run() {
    console.log('Authenticating College B Admin and Student against port 8082...');
    const adminAuth = await login('dean@collegeb.edu', 'OrgAdmin@123');
    console.log('Admin Authenticated:', adminAuth.email, adminAuth.role);

    const studentAuth = await login('alice.johnson@collegeb.edu', 'StudentPassword123');
    console.log('Student Authenticated:', studentAuth.email, studentAuth.role, studentAuth.studentId);

    const adminUser = {
        userId: adminAuth.userId,
        name: adminAuth.name || 'Consumer Officer',
        email: adminAuth.email,
        role: adminAuth.role,
        organizationCode: adminAuth.organizationCode || 'COLLEGE_B',
        studentId: null
    };

    const studentUser = {
        userId: studentAuth.userId,
        name: studentAuth.name || 'Alice Johnson',
        email: studentAuth.email,
        role: studentAuth.role,
        organizationCode: studentAuth.organizationCode || 'COLLEGE_B',
        studentId: studentAuth.studentId || 'STU-2023-001'
    };

    console.log('Spawning headless Chrome...');
    const chromeProc = spawn(CHROME_PATH, [
        '--headless',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=9223',
        'about:blank'
    ]);

    await sleep(2000);

    try {
        const vRes = await fetch('http://127.0.0.1:9223/json/version');
        const vData = await vRes.json();
        console.log('CDP connected to', vData.Browser);

        const listRes = await fetch('http://127.0.0.1:9223/json/list');
        const listData = await listRes.json();
        const page = listData.find(p => p.type === 'page') || listData[0];

        const cdp = new CdpClient(page.webSocketDebuggerUrl);
        await cdp.connect();
        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');

        // Helper to set viewport
        async function setViewport(w, h, isMobile = false) {
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: w,
                height: h,
                deviceScaleFactor: 1,
                mobile: isMobile
            });
            await cdp.send('Emulation.setVisibleSize', { width: w, height: h });
        }

        // Helper to take screenshot
        async function capture(filename) {
            const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
            const buf = Buffer.from(ss.data, 'base64');
            const dest = path.join(ARTIFACT_DIR, filename);
            fs.writeFileSync(dest, buf);
            console.log(`  ✔ Saved ${filename} (${buf.length} bytes)`);
        }

        // Helper to set session
        async function setAuth(token, user) {
            if (!token) {
                await cdp.send('Runtime.evaluate', {
                    expression: `sessionStorage.removeItem('colb_token'); sessionStorage.removeItem('colb_user');`
                });
            } else {
                await cdp.send('Runtime.evaluate', {
                    expression: `sessionStorage.setItem('colb_token', '${token}'); sessionStorage.setItem('colb_user', JSON.stringify(${JSON.stringify(user)}));`
                });
            }
        }

        console.log('\n--- 1. Capturing Public / Auth Pages ---');
        await setViewport(1440, 900);
        await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/#/login-admin` });
        await setAuth(null, null);
        await sleep(1500);
        await capture('col-b-admin-login.png');

        await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/#/login-student` });
        await sleep(1500);
        await capture('col-b-student-login.png');

        await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/#/activate#token=sample_demo_activation_token_123` });
        await sleep(1500);
        await capture('col-b-activate.png');

        console.log('\n--- 2. Capturing Consumer Officer Admin Views ---');
        await setAuth(adminAuth.token, adminUser);

        // Pre-populate a retrieved record in volatile in-memory store so records view is populated
        await cdp.send('Runtime.evaluate', {
            expression: `
                if (window.DF_RECORDS_STORE) {
                    window.DF_RECORDS_STORE.addRecord({
                        dataRequestId: 'DREQ_SAMPLE_01',
                        grantId: 'GRNT_VERIFIED_7741',
                        fetchedAt: new Date().toISOString(),
                        studentId: 'STU-2023-001',
                        name: 'Alice Johnson',
                        department: 'Computer Science',
                        cgpa: '8.84 / 10.0',
                        degree: 'Bachelor of Technology',
                        data: {
                            studentId: 'STU-2023-001',
                            name: 'Alice Johnson',
                            department: 'Computer Science',
                            cgpa: '8.84 / 10.0',
                            degree: 'Bachelor of Technology in Computer Science',
                            transcript: 'Official Transcript - All Semesters'
                        }
                    });
                }
            `
        });

        const adminTargets = [
            { file: 'col-b-admin-overview.png', hash: '#/admin/overview' },
            { file: 'col-b-admin-new-request.png', hash: '#/admin/new-request' },
            { file: 'col-b-admin-requests.png', hash: '#/admin/requests' },
            { file: 'col-b-admin-records.png', hash: '#/admin/records' },
            { file: 'col-b-admin-students.png', hash: '#/admin/students' },
            { file: 'col-b-admin-onboarding.png', hash: '#/admin/onboarding' },
            { file: 'col-b-admin-profile.png', hash: '#/admin/profile' },
            { file: 'col-b-admin-audit.png', hash: '#/admin/audit' }
        ];

        for (const t of adminTargets) {
            await cdp.send('Runtime.evaluate', {
                expression: `
                    window.location.hash = '${t.hash}';
                    if (window.DF_ROUTER) window.DF_ROUTER.handleRoute();
                `
            });
            await sleep(2000);
            await capture(t.file);
        }

        console.log('\n--- 3. Capturing Student Views ---');
        await setAuth(studentAuth.token, studentUser);
        await cdp.send('Runtime.evaluate', {
            expression: `
                window.location.hash = '#/student/profile';
                if (window.DF_ROUTER) window.DF_ROUTER.handleRoute();
            `
        });
        await sleep(2000);
        await capture('col-b-student-profile.png');

        console.log('\n--- 4. Capturing Responsive Viewports ---');
        // Tablet View (768x1024)
        await setViewport(768, 1024, false);
        await setAuth(adminAuth.token, adminUser);
        await cdp.send('Runtime.evaluate', {
            expression: `
                window.location.hash = '#/admin/overview';
                if (window.DF_ROUTER) window.DF_ROUTER.handleRoute();
            `
        });
        await sleep(2000);
        await capture('col-b-tablet.png');

        // Mobile View (375x812)
        await setViewport(375, 812, true);
        await cdp.send('Runtime.evaluate', {
            expression: `
                window.location.hash = '#/admin/overview';
                if (window.DF_ROUTER) window.DF_ROUTER.handleRoute();
            `
        });
        await sleep(2000);
        await capture('col-b-mobile.png');

        console.log('\nScreenshot capture complete!');
        cdp.close();
    } catch (err) {
        console.error('Error during CDP capture:', err);
    } finally {
        chromeProc.kill();
    }
}

run().catch(err => {
    console.error('Fatal screenshot error:', err);
    process.exit(1);
});

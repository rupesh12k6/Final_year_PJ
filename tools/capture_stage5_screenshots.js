/**
 * ==============================================================================
 * STAGE 5 — SCREENSHOT CAPTURE HARNESS VIA CHROME DEVTOOLS PROTOCOL (CDP)
 * Captures clean, authenticated screenshots of College A Provider Portal:
 * Admin Login, Student Login, Activation, Admin views, Student views, and Responsive.
 * ==============================================================================
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\80f0ed74-aeac-4008-b204-ad3a9983013a';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const COL_A_API = 'http://localhost:8081';
const FRONTEND_URL = 'http://localhost:3002';

async function login(email, password) {
    const res = await fetch(`${COL_A_API}/api/auth/login`, {
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
    console.log('Authenticating College Admin and Student against port 8081...');
    const adminAuth = await login('dean@collegea.edu', 'OrgAdmin@123');
    console.log('Admin Authenticated:', adminAuth.email, adminAuth.role);

    const studentAuth = await login('student1@collegea.edu', 'StudentPassword123');
    console.log('Student Authenticated:', studentAuth.email, studentAuth.role, studentAuth.studentId);

    const adminSession = {
        token: adminAuth.accessToken || adminAuth.token,
        user: {
            userId: adminAuth.userId,
            name: adminAuth.name,
            email: adminAuth.email,
            role: adminAuth.role,
            organizationId: adminAuth.organizationId || 'COLLEGE_A',
            studentId: null
        }
    };

    const studentSession = {
        token: studentAuth.accessToken || studentAuth.token,
        user: {
            userId: studentAuth.userId,
            name: studentAuth.name,
            email: studentAuth.email,
            role: studentAuth.role,
            organizationId: studentAuth.organizationId || 'COLLEGE_A',
            studentId: studentAuth.studentId || 'STU-2023-001'
        }
    };

    console.log('Spawning headless Chrome...');
    const chromeProc = spawn(CHROME_PATH, [
        '--headless',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=9222',
        'about:blank'
    ]);

    await sleep(2000);

    try {
        const vRes = await fetch('http://127.0.0.1:9222/json/version');
        const vData = await vRes.json();
        console.log('CDP connected to', vData.Browser);

        const listRes = await fetch('http://127.0.0.1:9222/json/list');
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
        async function setAuth(sessionObj) {
            if (!sessionObj) {
                await cdp.send('Runtime.evaluate', {
                    expression: `sessionStorage.removeItem('depa_college_a_auth_session');`
                });
            } else {
                await cdp.send('Runtime.evaluate', {
                    expression: `sessionStorage.setItem('depa_college_a_auth_session', JSON.stringify(${JSON.stringify(sessionObj)}));`
                });
            }
        }

        console.log('\n--- 1. Capturing Public / Auth Pages ---');
        await setViewport(1440, 900);
        await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/#/login/admin` });
        await setAuth(null);
        await sleep(1500);
        await capture('col-a-admin-login.png');

        await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/#/login/student` });
        await sleep(1500);
        await capture('col-a-student-login.png');

        await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/#/activate#token=act_live_demo_token_12345` });
        await sleep(1500);
        await capture('col-a-activate.png');

        console.log('\n--- 2. Capturing College Admin Views ---');
        await setAuth(adminSession);

        const adminTargets = [
            { file: 'col-a-admin-overview.png', hash: '#/admin/overview' },
            { file: 'col-a-admin-students.png', hash: '#/admin/students' },
            { file: 'col-a-admin-onboarding.png', hash: '#/admin/onboarding' },
            { file: 'col-a-admin-academic.png', hash: '#/admin/academic-data' },
            { file: 'col-a-admin-monitor.png', hash: '#/admin/monitor' },
            { file: 'col-a-admin-audit.png', hash: '#/admin/audit' }
        ];

        for (const t of adminTargets) {
            await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/${t.hash}` });
            await sleep(2000);
            await capture(t.file);
        }

        console.log('\n--- 3. Capturing Student Views ---');
        await setAuth(studentSession);

        const studentTargets = [
            { file: 'col-a-student-overview.png', hash: '#/student/overview' },
            { file: 'col-a-student-profile.png', hash: '#/student/profile' },
            { file: 'col-a-student-pending.png', hash: '#/student/pending' },
            { file: 'col-a-student-history.png', hash: '#/student/history' }
        ];

        for (const t of studentTargets) {
            await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/${t.hash}` });
            await sleep(2000);
            await capture(t.file);
        }

        console.log('\n--- 4. Capturing Responsive Views ---');
        // Tablet (768 x 1024) - College Admin Overview
        await setViewport(768, 1024);
        await setAuth(adminSession);
        await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/#/admin/overview` });
        await sleep(2000);
        await capture('col-a-tablet.png');

        // Mobile (375 x 812) - Student Overview
        await setViewport(375, 812, true);
        await setAuth(studentSession);
        await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/#/student/overview` });
        await sleep(2000);
        await capture('col-a-mobile.png');

        console.log('\nAll 15 screenshots captured successfully!');
        cdp.close();
    } finally {
        chromeProc.kill('SIGKILL');
    }
}

run().catch(err => {
    console.error('Fatal error during screenshot capture:', err);
    process.exit(1);
});


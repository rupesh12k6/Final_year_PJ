/**
 * Phase 0 Additional Defects - Accurate Chrome CDP Screenshot Capture
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\80f0ed74-aeac-4008-b204-ad3a9983013a';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const COL_A_API = 'http://localhost:8081';
const COL_B_API = 'http://localhost:8082';
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

    async close() {
        if (this.ws) {
            this.ws.close();
        }
    }
}

async function apiPost(url, body) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}

async function run() {
    console.log('--- Step 1: Pre-authenticating Admin accounts ---');
    const colAAuth = await apiPost(`${COL_A_API}/api/auth/login`, {
        email: 'dean@collegea.edu',
        password: 'OrgAdmin@123'
    });
    const colBAuth = await apiPost(`${COL_B_API}/api/auth/login`, {
        email: 'dean@collegeb.edu',
        password: 'OrgAdmin@123'
    });

    const colAToken = colAAuth.accessToken || colAAuth.token;
    const colBToken = colBAuth.token || colBAuth.accessToken;

    console.log('College A token:', !!colAToken);
    console.log('College B token:', !!colBToken);

    console.log('\n--- Step 2: Spawning Headless Chrome ---');
    const chromeProc = spawn(CHROME_PATH, [
        '--headless',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=9226',
        'about:blank'
    ]);

    await sleep(2500);

    try {
        const listRes = await fetch('http://127.0.0.1:9226/json/list');
        const listData = await listRes.json();
        const page = listData.find(p => p.type === 'page') || listData[0];
        const cdp = new CdpClient(page.webSocketDebuggerUrl);
        await cdp.connect();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');

        async function setViewport(w, h) {
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: w,
                height: h,
                deviceScaleFactor: 1,
                mobile: false
            });
            await cdp.send('Emulation.setVisibleSize', { width: w, height: h });
        }

        async function captureScreenshot(filename) {
            await sleep(1500);
            const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
            const buf = Buffer.from(ss.data, 'base64');
            const dest = path.join(ARTIFACT_DIR, filename);
            fs.writeFileSync(dest, buf);
            console.log(`  📸 Saved ${filename} (${buf.length} bytes)`);
        }

        await setViewport(1440, 900);

        // -------------------------------------------------------------
        // Setup College A Session
        // -------------------------------------------------------------
        console.log('\n--- Injecting College A Session (:3002) ---');
        await cdp.send('Page.navigate', { url: `${COL_A_FRONTEND}/` });
        await sleep(1000);
        await cdp.send('Runtime.evaluate', {
            expression: `
                sessionStorage.setItem('depa_college_a_auth_session', JSON.stringify({
                    token: '${colAToken}',
                    user: {
                        userId: 'COLLEGE_A_ADM_001',
                        name: 'Dean College A',
                        email: 'dean@collegea.edu',
                        role: 'ORG_ADMIN',
                        organizationCode: 'COLLEGE_A'
                    }
                }));
            `
        });

        // 1. College A: Initiate Academic Request (Issue 1)
        console.log('Capturing College A Initiate Academic Request...');
        await cdp.send('Page.navigate', { url: `${COL_A_FRONTEND}/#/admin/new-request` });
        await sleep(2500);
        await captureScreenshot('phase0_col_a_new_request.png');

        // 2. College A: Outbound Request Tracker (Issue 2)
        console.log('Capturing College A Outbound Request Tracker...');
        await cdp.send('Page.navigate', { url: `${COL_A_FRONTEND}/#/admin/requests` });
        await sleep(2500);
        await captureScreenshot('phase0_col_a_requests_tracker.png');

        // 3. College A: Student Registry (Issue 3)
        console.log('Capturing College A Student Registry...');
        await cdp.send('Page.navigate', { url: `${COL_A_FRONTEND}/#/admin/students` });
        await sleep(2500);
        await captureScreenshot('phase0_col_a_students_registry.png');

        // -------------------------------------------------------------
        // Setup College B Session
        // -------------------------------------------------------------
        console.log('\n--- Injecting College B Session (:3003) ---');
        await cdp.send('Page.navigate', { url: `${COL_B_FRONTEND}/` });
        await sleep(1000);
        await cdp.send('Runtime.evaluate', {
            expression: `
                sessionStorage.setItem('colb_token', '${colBToken}');
                sessionStorage.setItem('colb_user', JSON.stringify({
                    userId: 'COLLEGE_B_ADM_001',
                    name: 'Dean College B',
                    email: 'dean@collegeb.edu',
                    role: 'ORG_ADMIN',
                    organizationCode: 'COLLEGE_B'
                }));
            `
        });

        // 4. College B: Initiate Academic Request (Issue 1 & 4)
        console.log('Capturing College B Initiate Academic Request...');
        await cdp.send('Page.navigate', { url: `${COL_B_FRONTEND}/#/admin/new-request` });
        await sleep(2500);
        await captureScreenshot('phase0_col_b_new_request.png');

        // 5. College B: Outbound Request Tracker (Issue 4 & 5)
        console.log('Capturing College B Outbound Request Tracker...');
        await cdp.send('Page.navigate', { url: `${COL_B_FRONTEND}/#/admin/requests` });
        await sleep(2500);
        await captureScreenshot('phase0_col_b_requests_tracker.png');

        // 6. College B: Student Registry (Issue 6 & 7)
        console.log('Capturing College B Student Registry...');
        await cdp.send('Page.navigate', { url: `${COL_B_FRONTEND}/#/admin/students` });
        await sleep(2500);
        await captureScreenshot('phase0_col_b_students_registry.png');

        await cdp.close();
        chromeProc.kill();
        console.log('\n--- All Phase 0 screenshots captured successfully! ---');

    } catch (err) {
        console.error('Screenshot capture failed:', err);
        chromeProc.kill();
        process.exit(1);
    }
}

run();

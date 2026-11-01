const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\80f0ed74-aeac-4008-b204-ad3a9983013a';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const COL_B_API = 'http://localhost:8082';
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
    async close() { if (this.ws) this.ws.close(); }
}

async function run() {
    const loginRes = await fetch(`${COL_B_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dean@collegeb.edu', password: 'OrgAdmin@123' })
    });
    const authData = await loginRes.json();
    const colBToken = authData.token || authData.accessToken;

    const chromeProc = spawn(CHROME_PATH, [
        '--headless',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--remote-debugging-port=9227',
        'about:blank'
    ]);
    await sleep(2500);

    const listRes = await fetch('http://127.0.0.1:9227/json/list');
    const listData = await listRes.json();
    const page = listData.find(p => p.type === 'page') || listData[0];
    const cdp = new CdpClient(page.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
    });
    await cdp.send('Emulation.setVisibleSize', { width: 1440, height: 900 });

    async function captureScreenshot(filename) {
        await sleep(1500);
        const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
        const buf = Buffer.from(ss.data, 'base64');
        const dest = path.join(ARTIFACT_DIR, filename);
        fs.writeFileSync(dest, buf);
        console.log(`  📸 Saved ${filename} (${buf.length} bytes)`);
    }

    // Navigate to College B Students
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
            window.location.hash = '#/admin/students';
        `
    });
    await sleep(2000);

    // Open Enroll Student modal
    console.log('Opening College B Enroll Modal...');
    await cdp.send('Runtime.evaluate', {
        expression: `
            document.querySelector('#btn-open-enroll-modal').click();
        `
    });
    await sleep(1500);
    await captureScreenshot('phase0_col_b_enroll_modal.png');

    // Submit an enrollment to trigger the Activation Token Modal
    console.log('Submitting enrollment to trigger Activation Modal...');
    const sid = 'STU-B-SCREEN-' + Date.now().toString().slice(-4);
    await cdp.send('Runtime.evaluate', {
        expression: `
            document.querySelector('#enroll-student-id').value = '${sid}';
            document.querySelector('#enroll-name').value = 'Alexander Stone';
            document.querySelector('#enroll-email').value = 'alex.${Date.now().toString().slice(-4)}@collegeb.edu';
            document.querySelector('#enroll-dept').value = 'Artificial Intelligence & Robotics';
            document.querySelector('#enroll-degree').value = 'B.Tech AI & Data Science';
            document.querySelector('#enroll-cgpa').value = '9.15';
            document.querySelector('#btn-submit-enroll').click();
        `
    });
    await sleep(3000);
    await captureScreenshot('phase0_col_b_activation_modal.png');

    await cdp.close();
    chromeProc.kill();
    console.log('--- Modals captured successfully! ---');
}

run().catch(e => {
    console.error(e);
    process.exit(1);
});


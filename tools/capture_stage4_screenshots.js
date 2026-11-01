/**
 * ==============================================================================
 * STAGE 4 — SCREENSHOT CAPTURE HARNESS VIA CHROME DEVTOOLS PROTOCOL (CDP)
 * Captures clean, authenticated screenshots of all Organization Admin modules
 * without requiring any test helper in the served frontend tree.
 * ==============================================================================
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\80f0ed74-aeac-4008-b204-ad3a9983013a';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CM_API_URL = 'http://localhost:8095';
const FRONTEND_URL = 'http://localhost:3001';

async function getOrgAdminAuth() {
    const res = await fetch(`${CM_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@collegea.edu', password: 'CollegeAdmin123' })
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
    console.log('Authenticating College A Org Admin...');
    const authData = await getOrgAdminAuth();
    console.log('Authenticated:', authData.email, authData.organizationId);

    const token = authData.token;
    const userObj = {
        userId: authData.userId,
        name: authData.name,
        email: authData.email,
        organizationId: authData.organizationId,
        role: authData.role
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

        // Navigate to frontend base URL
        console.log('Navigating to frontend root...');
        await cdp.send('Page.navigate', { url: FRONTEND_URL });
        await sleep(1500);

        // Inject authenticated session directly into origin sessionStorage
        console.log('Injecting session tokens...');
        const injectScript = `
            sessionStorage.setItem('cm_auth_token', '${token}');
            sessionStorage.setItem('cm_auth_user', JSON.stringify(${JSON.stringify(userObj)}));
            sessionStorage.setItem('cm_token', '${token}');
            sessionStorage.setItem('cm_user', JSON.stringify(${JSON.stringify(userObj)}));
        `;
        await cdp.send('Runtime.evaluate', { expression: injectScript });

        const targets = [
            {
                name: 'cm-oa-overview.png',
                hash: '#/org-dashboard',
                width: 1440,
                height: 900,
                waitMs: 2500,
                title: 'Institutional Overview'
            },
            {
                name: 'cm-oa-profile.png',
                hash: '#/org-profile',
                width: 1440,
                height: 900,
                waitMs: 1500,
                title: 'Institution Profile & Assertion Key'
            },
            {
                name: 'cm-oa-staff.png',
                hash: '#/org-users',
                width: 1440,
                height: 900,
                waitMs: 1500,
                title: 'Staff & Student Roster'
            },
            {
                name: 'cm-oa-consents.png',
                hash: '#/org-consents',
                width: 1440,
                height: 900,
                waitMs: 1500,
                title: 'Data Exchange & Consents'
            },
            {
                name: 'cm-oa-audit.png',
                hash: '#/org-audit',
                width: 1440,
                height: 900,
                waitMs: 1500,
                title: 'Institutional Audit Trail'
            },
            {
                name: 'cm-oa-keys.png',
                hash: '#/org-keys',
                width: 1440,
                height: 900,
                waitMs: 1500,
                title: 'Cryptographic Key Infrastructure'
            },
            {
                name: 'cm-oa-tablet.png',
                hash: '#/org-dashboard',
                width: 768,
                height: 1024,
                waitMs: 1500,
                title: 'Tablet Responsive View'
            },
            {
                name: 'cm-oa-mobile.png',
                hash: '#/org-dashboard',
                width: 375,
                height: 812,
                waitMs: 1500,
                title: 'Mobile Responsive View'
            }
        ];

        for (const t of targets) {
            console.log(`Setting viewport: ${t.width}x${t.height}...`);
            await cdp.send('Emulation.setDeviceMetricsOverride', {
                width: t.width,
                height: t.height,
                deviceScaleFactor: 1,
                mobile: t.width < 500
            });

            console.log(`Navigating to ${t.hash} (${t.title})...`);
            await cdp.send('Runtime.evaluate', { expression: `window.location.hash = '${t.hash}';` });
            await sleep(t.waitMs);

            console.log(`Capturing screenshot for ${t.name}...`);
            const screenshotRes = await cdp.send('Page.captureScreenshot', { format: 'png' });
            const buffer = Buffer.from(screenshotRes.data, 'base64');
            const dest = path.join(ARTIFACT_DIR, t.name);
            fs.writeFileSync(dest, buffer);
            console.log(`Saved screenshot (${(buffer.length / 1024).toFixed(1)} KB): ${dest}`);
        }

        cdp.close();
        console.log('\nAll 8 screenshots captured successfully!');
    } finally {
        chromeProc.kill();
    }
}

run().catch(err => {
    console.error('Fatal capture error:', err);
    process.exit(1);
});


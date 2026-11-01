/**
 * ==============================================================================
 * STAGE 3 — SCREENSHOT CAPTURE HARNESS
 * Captures live headless Chrome screenshots of all 5 Super Admin modules,
 * as well as tablet and mobile responsive layouts.
 * ==============================================================================
 */

const http = require('http');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\80f0ed74-aeac-4008-b204-ad3a9983013a';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function getSuperAdminToken() {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            email: 'superadmin@depa.cm',
            password: 'SuperAdmin@123'
        });

        const req = http.request({
            hostname: 'localhost',
            port: 8095,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.token);
                } catch (e) {
                    reject(new Error('Failed to parse token response: ' + data));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

async function capture() {
    console.log('Obtaining live Super Admin token...');
    const token = await getSuperAdminToken();
    console.log('Token acquired: ' + token.substring(0, 20) + '...');

    const targets = [
        {
            name: 'cm-sa-overview.png',
            url: `http://localhost:3001/test-session-helper.html?token=${encodeURIComponent(token)}&target=/dashboard`,
            size: '1440,900'
        },
        {
            name: 'cm-sa-organizations.png',
            url: `http://localhost:3001/test-session-helper.html?token=${encodeURIComponent(token)}&target=/organizations`,
            size: '1440,900'
        },
        {
            name: 'cm-sa-administrators.png',
            url: `http://localhost:3001/test-session-helper.html?token=${encodeURIComponent(token)}&target=/administrators`,
            size: '1440,900'
        },
        {
            name: 'cm-sa-audit-logs.png',
            url: `http://localhost:3001/test-session-helper.html?token=${encodeURIComponent(token)}&target=/audit-logs`,
            size: '1440,900'
        },
        {
            name: 'cm-sa-trust-overview.png',
            url: `http://localhost:3001/test-session-helper.html?token=${encodeURIComponent(token)}&target=/trust-overview`,
            size: '1440,900'
        },
        {
            name: 'cm-sa-tablet.png',
            url: `http://localhost:3001/test-session-helper.html?token=${encodeURIComponent(token)}&target=/dashboard`,
            size: '768,1024'
        },
        {
            name: 'cm-sa-mobile.png',
            url: `http://localhost:3001/test-session-helper.html?token=${encodeURIComponent(token)}&target=/dashboard`,
            size: '375,812'
        }
    ];

    for (const t of targets) {
        const dest = path.join(ARTIFACT_DIR, t.name);
        console.log(`Capturing ${t.name} (${t.size})...`);
        const cmd = `"${CHROME_PATH}" --headless --disable-gpu --virtual-time-budget=3500 --window-size=${t.size} --screenshot="${dest}" "${t.url}"`;
        try {
            execSync(cmd, { stdio: 'ignore', timeout: 15000 });
            if (fs.existsSync(dest)) {
                const stats = fs.statSync(dest);
                console.log(`  ✔ Saved ${t.name} (${stats.size} bytes)`);
            } else {
                console.warn(`  ⚠ Warning: ${t.name} not found after command`);
            }
        } catch (e) {
            console.error(`  ✖ Failed to capture ${t.name}:`, e.message);
        }
    }

    console.log('\nAll screenshot captures completed.');
}

capture().catch(err => {
    console.error('Capture failed:', err);
    process.exit(1);
});


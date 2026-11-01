/**
 * ==============================================================================
 * STAGE 6.7 — BROWSER STORAGE & TOKEN LEAKAGE AUDIT VIA CHROME DEVTOOLS PROTOCOL
 * Inspects real running browser environment (Chrome) on port 3003:
 * - Evaluates localStorage, sessionStorage, cookies, IndexedDB, CacheStorage.
 * - Confirms academic records are NOT persisted to browser disks/storage.
 * - Confirms raw Access JWT (RS256) is never placed in client storage.
 * - Confirms in-memory store is wiped on logout.
 * ==============================================================================
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const COL_B_API = 'http://localhost:8082';
const FRONTEND_URL = 'http://localhost:3003';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✔ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ✖ FAIL: ${message}`);
    }
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

    async evaluate(expression) {
        const res = await this.send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (res.exceptionDetails) {
            throw new Error(res.exceptionDetails.text || 'Evaluation failed');
        }
        return res.result ? res.result.value : undefined;
    }

    close() {
        if (this.ws) this.ws.close();
    }
}

async function runBrowserAudit() {
    console.log('==============================================================================');
    console.log('   DEPA COLLEGE B — STAGE 6.7 BROWSER STORAGE & CLIENT DATA AUDIT');
    console.log('   Target: ' + FRONTEND_URL + ' | Chrome Headless with CDP');
    console.log('==============================================================================\n');

    // 1. Launch Headless Chrome
    const remoteDebuggingPort = 9444;
    const chromeProc = spawn(CHROME_PATH, [
        '--headless=new',
        `--remote-debugging-port=${remoteDebuggingPort}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu',
        '--user-data-dir=' + path.join(__dirname, '..', '.tmp_chrome_audit')
    ]);

    await new Promise(r => setTimeout(r, 2000));

    try {
        const listRes = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json/list`);
        const listData = await listRes.json();
        const page = listData.find(p => p.type === 'page') || listData[0];
        const cdp = new CdpClient(page.webSocketDebuggerUrl);
        await cdp.connect();

        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');

        // Navigate to College B Frontend
        await cdp.send('Page.navigate', { url: `${FRONTEND_URL}/#/login-admin` });
        await new Promise(r => setTimeout(r, 1500));

        console.log('[SECTION 1] Unauthenticated Storage Baseline');
        const initialLocalStorage = await cdp.evaluate('JSON.stringify(Object.keys(localStorage))');
        const initialSessionStorage = await cdp.evaluate('JSON.stringify(Object.keys(sessionStorage))');
        const initialCookies = await cdp.evaluate('document.cookie');
        
        assert(initialLocalStorage === '[]', 'localStorage is completely empty on initial unauthenticated visit');
        assert(initialSessionStorage === '[]', 'sessionStorage is completely empty on initial unauthenticated visit');
        assert(initialCookies === '', 'No unauthenticated tracking cookies set');

        console.log('\n[SECTION 2] Authenticated Admin Session Inspection');
        // Perform login via UI or session injection
        const authData = await cdp.evaluate(`
            (async () => {
                const res = await window.DF_API.auth.login('dean@collegeb.edu', 'OrgAdmin@123');
                window.DF_SESSION.setSession(res.token, {
                    adminId: res.adminId,
                    email: res.email,
                    fullName: res.fullName,
                    role: res.role,
                    organizationCode: res.organizationCode
                });
                return res;
            })()
        `);

        assert(Boolean(authData.token), 'Admin login successful and JWT received');
        assert(authData.role === 'ORG_ADMIN', 'Authenticated role is ORG_ADMIN');

        // Check sessionStorage keys
        const sessionKeys = JSON.parse(await cdp.evaluate('JSON.stringify(Object.keys(sessionStorage))'));
        assert(sessionKeys.includes('colb_token'), 'sessionStorage contains colb_token');
        assert(sessionKeys.includes('colb_user'), 'sessionStorage contains colb_user');
        assert(!sessionKeys.includes('colb_retrieved_records'), 'sessionStorage DOES NOT contain colb_retrieved_records');
        assert(!sessionKeys.includes('accessToken'), 'sessionStorage DOES NOT contain raw CM accessToken');

        const localKeys = JSON.parse(await cdp.evaluate('JSON.stringify(Object.keys(localStorage))'));
        assert(localKeys.length === 0, 'localStorage remains completely empty during authenticated session');

        console.log('\n[SECTION 3] Volatile In-Memory Academic Record Handling');
        // Add a mock retrieved record into in-memory store
        const memoryStoreTest = await cdp.evaluate(`
            (() => {
                if (!window.DF_RECORDS_STORE) return { exists: false };
                window.DF_RECORDS_STORE.addRecord({
                    dataRequestId: 'DREQ_AUDIT_01',
                    grantId: 'GRNT_AUDIT_01',
                    studentId: 'STU-AUDIT-001',
                    name: 'Test Dossier',
                    cgpa: '9.50',
                    degree: 'B.Tech CS'
                });
                return {
                    exists: true,
                    count: window.DF_RECORDS_STORE.getRecords().length,
                    record: window.DF_RECORDS_STORE.getRecords()[0]
                };
            })()
        `);

        assert(memoryStoreTest.exists === true, 'window.DF_RECORDS_STORE is active in window scope');
        assert(memoryStoreTest.count === 1, 'In-memory store successfully held 1 academic dossier in runtime RAM');
        assert(memoryStoreTest.record.studentId === 'STU-AUDIT-001', 'In-memory dossier correctly matches injected studentId');

        // Re-check browser persistence after adding record to memory store
        const postRecordSessionStorage = await cdp.evaluate('sessionStorage.getItem("colb_retrieved_records")');
        const postRecordLocalStorage = await cdp.evaluate('localStorage.getItem("colb_retrieved_records")');
        assert(postRecordSessionStorage === null, 'sessionStorage.getItem("colb_retrieved_records") is strictly null');
        assert(postRecordLocalStorage === null, 'localStorage.getItem("colb_retrieved_records") is strictly null');

        // Check IndexedDB and CacheStorage
        const idbDatabases = await cdp.evaluate(`
            (async () => {
                if (window.indexedDB && window.indexedDB.databases) {
                    const dbs = await window.indexedDB.databases();
                    return dbs.map(d => d.name);
                }
                return [];
            })()
        `);
        assert(Array.isArray(idbDatabases) && idbDatabases.length === 0, 'No IndexedDB databases created for academic storage');

        const cacheKeys = await cdp.evaluate(`
            (async () => {
                if (window.caches && window.caches.keys) {
                    return await window.caches.keys();
                }
                return [];
            })()
        `);
        assert(Array.isArray(cacheKeys) && cacheKeys.length === 0, 'No Service Worker CacheStorage entries holding academic records');

        console.log('\n[SECTION 4] Logout and Session Invalidation Teardown');
        const logoutResult = await cdp.evaluate(`
            (() => {
                window.DF_SESSION.clearSession();
                return {
                    tokenAfter: window.DF_SESSION.getToken(),
                    userAfter: window.DF_SESSION.getUser(),
                    inMemoryCount: window.DF_RECORDS_STORE.getRecords().length,
                    sessionStorageLen: sessionStorage.length,
                    localStorageLen: localStorage.length
                };
            })()
        `);

        assert(logoutResult.tokenAfter === null, 'colb_token is purged from sessionStorage upon clearSession()');
        assert(logoutResult.userAfter === null, 'colb_user is purged from sessionStorage upon clearSession()');
        assert(logoutResult.inMemoryCount === 0, 'window.DF_RECORDS_STORE memory buffer is fully wiped upon clearSession()');
        assert(logoutResult.sessionStorageLen === 0, 'sessionStorage is completely empty after logout');
        assert(logoutResult.localStorageLen === 0, 'localStorage is completely empty after logout');

        cdp.close();

    } finally {
        chromeProc.kill();
        try {
            fs.rmSync(path.join(__dirname, '..', '.tmp_chrome_audit'), { recursive: true, force: true });
        } catch (e) {}
    }

    console.log('\n==============================================================================');
    console.log(`   STAGE 6.7 BROWSER AUDIT: ${passedTests} PASSED, ${failedTests} FAILED (TOTAL: ${totalTests})`);
    console.log('==============================================================================');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runBrowserAudit().catch(err => {
    console.error('Fatal error during browser audit:', err);
    process.exit(1);
});

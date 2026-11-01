const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOT_DIR = path.join(ROOT_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function runHeadlessChrome(filePath, screenshotName) {
    const absPath = path.resolve(ROOT_DIR, filePath).replace(/\\/g, '/');
    const fileUrl = `file:///${absPath}`;
    const screenshotPath = path.join(SCREENSHOT_DIR, screenshotName);

    const res = spawnSync(CHROME_PATH, [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        '--window-size=1400,900',
        `--screenshot=${screenshotPath}`,
        '--dump-dom',
        fileUrl
    ], { maxBuffer: 20 * 1024 * 1024 });

    const dom = res.stdout ? res.stdout.toString('utf-8') : '';
    return { dom, screenshotPath };
}

function verify() {
    console.log("==================================================================");
    console.log(" STAGE 1 DRIVEFLOW UI FOUNDATION: HEADLESS CHROME VERIFICATION");
    console.log("==================================================================");

    const results = [];

    // 1. Consent Manager Test
    console.log("\n[1/3] Verifying Consent Manager UI Foundation (Port 3001)...");
    const cm = runHeadlessChrome('consent-manager/frontend/component-test.html', 'cm-foundation.png');
    const cmSize = fs.existsSync(cm.screenshotPath) ? fs.statSync(cm.screenshotPath).size : 0;
    console.log(`  ✓ Screenshot: ${cm.screenshotPath} (${cmSize} bytes)`);

    const cmChecks = [
        { name: 'Sidebar Brand & Role Card', passed: cm.dom.includes('Consent Manager') && cm.dom.includes('DEPA FIDUCIARY ROOT') && cm.dom.includes('Super Administrator') },
        { name: 'Hero Greeting Banner', passed: cm.dom.includes('Regulatory Trust &amp; Governance Authority') && cm.dom.includes('CONSENT ARCHITECTURE ROOT') },
        { name: 'Hero Metric Chips', passed: cm.dom.includes('Active Orgs') && cm.dom.includes('1,420') && cm.dom.includes('99.99%') },
        { name: 'StatCards (4-Card Responsive Grid)', passed: cm.dom.includes('REGISTERED INSTITUTIONS') && cm.dom.includes('ACTIVE CONSENTS') && cm.dom.includes('PENDING AUTHORIZATIONS') && cm.dom.includes('REVOKED CONSENTS') },
        { name: 'Animated Conic Shine Button', passed: cm.dom.includes('df-btn-shine-primary') && cm.dom.includes('New Policy Rule') },
        { name: 'DataTable with Gradient Header', passed: cm.dom.includes('df-card-table') && cm.dom.includes('CON-2026-001') && cm.dom.includes('Alice Johnson') },
        { name: 'Status Badges (DEPA statuses)', passed: cm.dom.includes('df-badge-emerald') && cm.dom.includes('df-badge-amber') && cm.dom.includes('df-badge-rose') },
        { name: 'Pagination Widget', passed: cm.dom.includes('df-pagination') && cm.dom.includes('df-page-btn') },
        { name: 'State Boxes (Loading/Empty/Error)', passed: cm.dom.includes('df-state-box') && cm.dom.includes('Syncing blockchain ledger...') && cm.dom.includes('No Pending Policies') }
    ];
    results.push({ portal: 'Consent Manager (Fiduciary Blue Theme)', checks: cmChecks, screenshot: cm.screenshotPath });

    // 2. College A Provider Test
    console.log("\n[2/3] Verifying College A Provider UI Foundation (Port 3002)...");
    const colA = runHeadlessChrome('college-a/frontend/component-test.html', 'col-a-foundation.png');
    const colASize = fs.existsSync(colA.screenshotPath) ? fs.statSync(colA.screenshotPath).size : 0;
    console.log(`  ✓ Screenshot: ${colA.screenshotPath} (${colASize} bytes)`);

    const colAChecks = [
        { name: 'Sidebar Brand & Role Card', passed: colA.dom.includes('College A') && colA.dom.includes('ACADEMIC PROVIDER') && colA.dom.includes('Registrar Officer') },
        { name: 'Hero Greeting Banner', passed: colA.dom.includes('Registrar Command Center') && colA.dom.includes('ACADEMIC CREDENTIAL PROVIDER') },
        { name: 'Hero Metric Chips', passed: colA.dom.includes('1,250') && colA.dom.includes('3,400') && colA.dom.includes('100%') },
        { name: 'StatCards (4-Card Responsive Grid)', passed: colA.dom.includes('REGISTERED STUDENTS') && colA.dom.includes('VERIFIED TRANSCRIPTS') && colA.dom.includes('PENDING ACTIVATIONS') && colA.dom.includes('DISCLOSURE REQUESTS') },
        { name: 'Emerald Conic Shine Button', passed: colA.dom.includes('df-btn-shine-emerald') && colA.dom.includes('Issue Signed Dossier') },
        { name: 'DataTable with Gradient Header', passed: colA.dom.includes('df-card-table') && colA.dom.includes('CS2026-001') && colA.dom.includes('Alice Johnson') },
        { name: 'Status Badges (DEPA statuses)', passed: colA.dom.includes('df-badge-emerald') && colA.dom.includes('df-badge-amber') },
        { name: 'Pagination Widget', passed: colA.dom.includes('df-pagination') },
        { name: 'State Boxes (Loading/Empty/Error)', passed: colA.dom.includes('df-state-box') && colA.dom.includes('Validating cryptographic assertion keys...') }
    ];
    results.push({ portal: 'College A Provider (Academic Emerald Theme)', checks: colAChecks, screenshot: colA.screenshotPath });

    // 3. College B Consumer Test
    console.log("\n[3/3] Verifying College B Consumer UI Foundation (Port 3003)...");
    const colB = runHeadlessChrome('college-b/frontend/component-test.html', 'col-b-foundation.png');
    const colBSize = fs.existsSync(colB.screenshotPath) ? fs.statSync(colB.screenshotPath).size : 0;
    console.log(`  ✓ Screenshot: ${colB.screenshotPath} (${colBSize} bytes)`);

    const colBChecks = [
        { name: 'Sidebar Brand & Role Card', passed: colB.dom.includes('College B') && colB.dom.includes('DATA CONSUMER') && colB.dom.includes('Consumer Verification Officer') },
        { name: 'Hero Greeting Banner', passed: colB.dom.includes('Verification &amp; Admissions Operations') && colB.dom.includes('DATA CONSUMER PORTAL') },
        { name: 'Hero Metric Chips', passed: colB.dom.includes('320') && colB.dom.includes('98.4%') && colB.dom.includes('Active Streams') },
        { name: 'StatCards (4-Card Responsive Grid)', passed: colB.dom.includes('INBOUND REQUESTS') && colB.dom.includes('FULFILLED &amp; VERIFIED') && colB.dom.includes('PENDING CONSENT') && colB.dom.includes('REJECTED / REVOKED') },
        { name: 'Indigo Conic Shine Button', passed: colB.dom.includes('df-btn-shine-indigo') && colB.dom.includes('New Data Request') },
        { name: 'DataTable with Gradient Header', passed: colB.dom.includes('df-card-table') && colB.dom.includes('REQ-2026-101') && colB.dom.includes('Alice Johnson') },
        { name: 'Status Badges (DEPA statuses)', passed: colB.dom.includes('df-badge-emerald') && colB.dom.includes('df-badge-rose') },
        { name: 'Pagination Widget', passed: colB.dom.includes('df-pagination') },
        { name: 'State Boxes (Loading/Empty/Error)', passed: colB.dom.includes('df-state-box') && colB.dom.includes('Validating Consent Manager token signature...') }
    ];
    results.push({ portal: 'College B Consumer (Consumer Indigo Theme)', checks: colBChecks, screenshot: colB.screenshotPath });

    console.log("\n==================================================================");
    console.log(" STAGE 1 UI FOUNDATION VERIFICATION SUMMARY");
    console.log("==================================================================");

    let allPassed = true;
    for (const res of results) {
        console.log(`\nPortal: ${res.portal}`);
        for (const chk of res.checks) {
            if (chk.passed) {
                console.log(`  ✓ ${chk.name}`);
            } else {
                console.log(`  ✗ ${chk.name}`);
                allPassed = false;
            }
        }
    }

    if (allPassed) {
        console.log("\n>>> ALL STAGE 1 DRIVEFLOW UI FOUNDATION CHECKS PASSED (27/27)! <<<");
        process.exit(0);
    } else {
        console.error("\n>>> SOME CHECKS FAILED! <<<");
        process.exit(1);
    }
}

verify();

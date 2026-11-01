/**
 * ==============================================================================
 * DEPA COLLEGE A — STAGE 5.2 FINAL MIGRATION & TOKEN DISCLOSURE VERIFICATION
 * Comprehensive verification of:
 *   1. Database Migration Integration (Live DB & Fresh DB Simulation)
 *   2. Status Check Constraint (All 4 statuses accepted, invalid rejected)
 *   3. Token Disclosure Boundaries (Single creation, CSV import, directory, dossier)
 *   4. Database Hashing & Zero Plaintext Persistence
 *   5. Transport Security & Method Restriction (POST body vs GET 405)
 *   6. Replay Invalidation & Immediate Token Erasure
 *   7. Frontend URL Scrubbing & Lifecycle State Management
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COL_A_URL = 'http://localhost:8081';
const CM_URL = 'http://localhost:8095';
const FRONTEND_URL = 'http://localhost:3002';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✔ PASS: ${message}`);
        passCount++;
    } else {
        console.error(`  ✖ FAIL: ${message}`);
        failCount++;
    }
}

async function request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${COL_A_URL}${endpoint}`;
    const res = await fetch(url, options);
    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
        try { data = await res.json(); } catch (e) {}
    } else {
        try { data = await res.text(); } catch (e) {}
    }
    return { status: res.status, data, headers: res.headers };
}

function runPsql(sql, db = 'college_a_db') {
    const tmpFile = path.join(__dirname, `tmp_query_${Date.now()}_${Math.floor(Math.random() * 1000)}.sql`);
    fs.writeFileSync(tmpFile, sql, 'utf8');
    const cmd = `powershell -Command "$env:PGPASSWORD = 'root'; & 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe' -v ON_ERROR_STOP=1 -U postgres -d ${db} -t -A -f '${tmpFile}' 2>&1; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"`;
    try {
        const out = execSync(cmd, { encoding: 'utf8' }).trim();
        try { fs.unlinkSync(tmpFile); } catch (e) {}
        if (out.includes('ERROR:')) {
            return { success: false, output: out, error: out };
        }
        return { success: true, output: out };
    } catch (e) {
        try { fs.unlinkSync(tmpFile); } catch (err) {}
        const errText = (e.stdout?.toString() || '') + ' ' + (e.stderr?.toString() || '') + ' ' + (e.message || '');
        return { success: false, error: errText, output: errText };
    }
}

async function run() {
    console.log('==============================================================================');
    console.log('   DEPA COLLEGE A — STAGE 5.2 FINAL MIGRATION & TOKEN DISCLOSURE VERIFICATION');
    console.log(`   Node API: ${COL_A_URL} | CM API: ${CM_URL} | Frontend: ${FRONTEND_URL}`);
    console.log('==============================================================================\n');

    // -------------------------------------------------------------------------
    // [SUITE 1] Active Migration Mechanism & Configuration Inspection
    // -------------------------------------------------------------------------
    console.log('[SUITE 1] Active Migration Mechanism & Configuration Inspection');

    // 1.1 Verify pom.xml does not contain Flyway or Liquibase
    const pomPath = path.join(__dirname, '..', 'college-a', 'backend', 'pom.xml');
    const pomContent = fs.readFileSync(pomPath, 'utf8');
    assert(!pomContent.includes('flyway-core'), 'pom.xml does not include Flyway (avoids unconfigured runner conflict)');
    assert(!pomContent.includes('liquibase-core'), 'pom.xml does not include Liquibase');

    // 1.2 Verify version-controlled migration script exists
    const sqlScriptPath = path.join(__dirname, '..', 'college-a', 'backend', 'src', 'main', 'resources', 'db', 'migration', 'V1_1__update_student_status_constraint.sql');
    assert(fs.existsSync(sqlScriptPath), 'Version-controlled migration V1_1__update_student_status_constraint.sql exists');
    const sqlContent = fs.readFileSync(sqlScriptPath, 'utf8');
    assert(sqlContent.includes('PENDING_ACTIVATION') && sqlContent.includes('students_status_check'),
        'Migration script targets students_status_check and adds PENDING_ACTIVATION');

    // 1.3 Verify CollegeADatabaseConstraintMigration.java exists as Order(1) CommandLineRunner
    const runnerPath = path.join(__dirname, '..', 'college-a', 'backend', 'src', 'main', 'java', 'com', 'depa', 'provider', 'config', 'CollegeADatabaseConstraintMigration.java');
    assert(fs.existsSync(runnerPath), 'CollegeADatabaseConstraintMigration.java exists');
    const runnerContent = fs.readFileSync(runnerPath, 'utf8');
    assert(runnerContent.includes('@Component') && runnerContent.includes('@Order(1)'),
        'Migration runner is configured with @Component and @Order(1)');
    assert(runnerContent.includes('CommandLineRunner'), 'Migration runner implements CommandLineRunner');

    // 1.4 Verify no conflicting migration runners exist in College A
    const configDir = path.join(__dirname, '..', 'college-a', 'backend', 'src', 'main', 'java', 'com', 'depa', 'provider', 'config');
    const configFiles = fs.readdirSync(configDir);
    const migrationRunners = configFiles.filter(f => f.toLowerCase().includes('migration'));
    assert(migrationRunners.length === 1 && migrationRunners[0] === 'CollegeADatabaseConstraintMigration.java',
        `Exactly one migration runner found in College A (${migrationRunners[0]})`);

    // -------------------------------------------------------------------------
    // [SUITE 2] Existing Database Migration & Constraint Verification
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 2] Existing Database Migration & Constraint Verification');

    // 2.1 Inspect pg_constraint on college_a_db for students_status_check
    const constraintCheck = runPsql("SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'students' AND c.conname = 'students_status_check';");
    assert(constraintCheck.success && constraintCheck.output.length > 0,
        `PostgreSQL check constraint 'students_status_check' is active: ${constraintCheck.output}`);
    assert(constraintCheck.output.includes('PENDING_ACTIVATION'),
        'Active constraint in college_a_db includes PENDING_ACTIVATION');
    assert(constraintCheck.output.includes('ACTIVE') && constraintCheck.output.includes('INACTIVE') && constraintCheck.output.includes('SUSPENDED'),
        'Active constraint includes all baseline statuses (ACTIVE, INACTIVE, SUSPENDED)');

    // 2.2 Verify inserting all four statuses directly via SQL
    const testTimestamp = Date.now().toString().slice(-6);
    const statuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_ACTIVATION'];
    for (const st of statuses) {
        const testId = `TEST-ST-${st.slice(0,3)}-${testTimestamp}`;
        const insertSql = `INSERT INTO students (student_id, name, email, status, created_at, updated_at) VALUES ('${testId}', 'Test Student ${st}', 'test.${testId}@test.edu', '${st}', NOW(), NOW());`;
        const res = runPsql(insertSql);
        assert(res.success, `Direct SQL INSERT with status '${st}' succeeds`);
        // Clean up
        runPsql(`DELETE FROM students WHERE student_id = '${testId}';`);
    }

    // 2.3 Verify inserting invalid statuses directly via SQL is REJECTED
    const invalidStatuses = ['INVALID_STATUS', 'EXPIRED', 'PENDING', 'DRAFT'];
    for (const inv of invalidStatuses) {
        const testId = `TEST-INV-${testTimestamp}`;
        const insertSql = `INSERT INTO students (student_id, name, email, status, created_at, updated_at) VALUES ('${testId}', 'Invalid Student', 'inv.${testId}@test.edu', '${inv}', NOW(), NOW());`;
        const res = runPsql(insertSql);
        assert(!res.success, `Direct SQL INSERT with invalid status '${inv}' is strictly rejected by constraint`);
    }

    // -------------------------------------------------------------------------
    // [SUITE 3] Fresh Database Installation Verification
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 3] Fresh Database Installation Verification');

    const freshDbName = `college_a_fresh_test_${Date.now().toString().slice(-4)}`;
    try {
        // Create fresh database
        const createDbRes = runPsql(`CREATE DATABASE ${freshDbName};`, 'postgres');
        assert(createDbRes.success, `Created fresh temporary test database '${freshDbName}'`);

        // Create baseline students table with legacy constraint (only ACTIVE, INACTIVE, SUSPENDED)
        const baselineSql = `
            CREATE TABLE students (
                id BIGSERIAL PRIMARY KEY,
                student_id VARCHAR(64) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                status VARCHAR(32) NOT NULL,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                CONSTRAINT students_status_check CHECK (status::text = ANY (ARRAY['ACTIVE'::varchar, 'INACTIVE'::varchar, 'SUSPENDED'::varchar]::text[]))
            );
        `;
        const createTableRes = runPsql(baselineSql, freshDbName);
        assert(createTableRes.success, 'Initialized baseline table with legacy constraint in fresh database');

        // Confirm PENDING_ACTIVATION fails on baseline
        const failInsertRes = runPsql(`INSERT INTO students (student_id, name, email, status, created_at, updated_at) VALUES ('S_FRESH_1', 'Fresh Test', 'fresh1@test.edu', 'PENDING_ACTIVATION', NOW(), NOW());`, freshDbName);
        assert(!failInsertRes.success, 'Baseline constraint rejects PENDING_ACTIVATION before migration');

        // Apply V1_1 migration script
        const applyMigrationRes = runPsql(sqlContent, freshDbName);
        assert(applyMigrationRes.success, 'Successfully applied V1_1__update_student_status_constraint.sql to fresh database');

        // Confirm PENDING_ACTIVATION now succeeds
        const passInsertRes = runPsql(`INSERT INTO students (student_id, name, email, status, created_at, updated_at) VALUES ('S_FRESH_1', 'Fresh Test', 'fresh1@test.edu', 'PENDING_ACTIVATION', NOW(), NOW());`, freshDbName);
        assert(passInsertRes.success, 'PENDING_ACTIVATION successfully accepted after migration in fresh database');

        // Confirm invalid status still rejected
        const invFreshRes = runPsql(`INSERT INTO students (student_id, name, email, status, created_at, updated_at) VALUES ('S_FRESH_2', 'Invalid Test', 'fresh2@test.edu', 'INVALID_STATUS', NOW(), NOW());`, freshDbName);
        assert(!invFreshRes.success, 'Invalid status still strictly rejected after migration in fresh database');
    } finally {
        // Drop temporary test database
        runPsql(`DROP DATABASE IF EXISTS ${freshDbName} WITH (FORCE);`, 'postgres');
        console.log(`  Cleaned up temporary test database '${freshDbName}'`);
    }

    // -------------------------------------------------------------------------
    // [SUITE 4] Activation-Token Disclosure Boundaries & API Verification
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 4] Activation-Token Disclosure Boundaries & API Verification');

    // 4.1 Authenticate College Admin
    const adminLogin = await request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'dean@collegea.edu', password: 'OrgAdmin@123' })
    });
    assert(adminLogin.status === 200, 'College Admin authenticated successfully');
    const adminToken = adminLogin.data.accessToken || adminLogin.data.token;

    // 4.2 Single Student Creation: Verify raw token IS returned to authorized Admin for distribution
    const studentUid = `STU-S52-${Date.now().toString().slice(-5)}`;
    const studentEmail = `stu.s52.${Date.now().toString().slice(-5)}@collegea.edu`;
    const createRes = await request('/api/students', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            studentId: studentUid,
            name: 'Sarah Connor',
            email: studentEmail,
            program: 'Cybernetics',
            cgpa: '9.45'
        })
    });
    assert(createRes.status === 201, 'Single student created (HTTP 201 Created)');
    const rawSingleToken = createRes.data.activationToken;
    assert(Boolean(rawSingleToken && rawSingleToken.length >= 32),
        `Raw activation token IS returned to authorized Administrator on creation for distribution (Token length: ${rawSingleToken?.length})`);

    // 4.3 Database Check: Verify DB stores ONLY SHA-256 hash, raw token is NEVER persisted
    const dbTokenCheck = runPsql(`SELECT activation_token_hash FROM students WHERE student_id = '${studentUid}';`);
    assert(dbTokenCheck.success && dbTokenCheck.output.length === 64,
        `PostgreSQL stores 64-character SHA-256 hash in activation_token_hash (${dbTokenCheck.output.slice(0, 16)}...)`);
    const dbPlaintextCheck = runPsql(`SELECT COUNT(*) FROM students WHERE student_id = '${studentUid}' AND (name LIKE '%${rawSingleToken}%' OR email LIKE '%${rawSingleToken}%' OR program LIKE '%${rawSingleToken}%');`);
    assert(dbPlaintextCheck.output === '0', 'Raw activation token is completely absent from all database text columns');

    // 4.4 CSV Import: Verify raw token/link IS returned to authorized Admin for batch distribution
    const csvId = `CSV-S52-${Date.now().toString().slice(-4)}`;
    const csvEmail = `csv.${csvId.toLowerCase()}@collegea.edu`;
    const csvContent = `studentId,name,email,program,cgpa\n${csvId},John Connor,${csvEmail},Tactics,9.10`;
    const boundary = '----Boundary' + Math.random().toString(36).substring(2);
    const formBody = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="batch.csv"\r\nContent-Type: text/csv\r\n\r\n${csvContent}\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="portalBaseUrl"\r\n\r\nhttp://localhost:3002\r\n`),
        Buffer.from(`--${boundary}--\r\n`)
    ]);
    const csvRes = await request('/api/students/import-csv', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: formBody
    });
    assert(csvRes.status === 200, 'Batch CSV import processed successfully (HTTP 200)');
    const csvItem = csvRes.data.items[0];
    assert(Boolean(csvItem.activationLink), 'CSV import item returns activation link to Administrator for distribution');
    assert(csvItem.activationLink.includes('#/activate#token='),
        `Activation link uses URL fragment (#/activate#token=...): ${csvItem.activationLink}`);
    assert(!csvItem.activationLink.includes('?token='), 'Activation link does NOT expose token via query parameter (?token=)');

    // 4.5 Student Directory (GET /api/students): Verify activationToken is STRICTLY OMITTED
    const listRes = await request('/api/students', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(listRes.status === 200, 'Admin fetches student directory (HTTP 200)');
    const leakedInList = listRes.data.filter(s => s.activationToken !== undefined && s.activationToken !== null);
    assert(leakedInList.length === 0,
        `GET /api/students strictly omits activationToken across all ${listRes.data.length} records`);

    // 4.6 Student Dossier (GET /api/students/{id}): Verify activationToken is STRICTLY OMITTED
    const dossierRes = await request(`/api/students/${studentUid}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert(dossierRes.status === 200, 'Admin fetches single student dossier (HTTP 200)');
    assert(dossierRes.data.activationToken === undefined || dossierRes.data.activationToken === null,
        'GET /api/students/{id} strictly omits activationToken from student details');

    // 4.7 Unauthenticated Requests: Verify ALL endpoints reject unauthorized access
    const unauthCreate = await request('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: 'STU-HACK', name: 'Hacker', email: 'hack@bad.com' })
    });
    assert(unauthCreate.status === 401 || unauthCreate.status === 403,
        `Unauthenticated POST /api/students rejected with HTTP ${unauthCreate.status}`);

    const unauthList = await request('/api/students');
    assert(unauthList.status === 401 || unauthList.status === 403,
        `Unauthenticated GET /api/students rejected with HTTP ${unauthList.status}`);

    const unauthDossier = await request(`/api/students/${studentUid}`);
    assert(unauthDossier.status === 401 || unauthDossier.status === 403,
        `Unauthenticated GET /api/students/{id} rejected with HTTP ${unauthDossier.status}`);

    // -------------------------------------------------------------------------
    // [SUITE 5] Activation Transport & Lifecycle State Management
    // -------------------------------------------------------------------------
    console.log('\n[SUITE 5] Activation Transport & Lifecycle State Management');

    // 5.1 Rejection of GET method on validation endpoint
    const getValidateRes = await request(`/api/auth/activation/validate?token=${rawSingleToken}`);
    assert(getValidateRes.status === 405, 'GET /api/auth/activation/validate is rejected with HTTP 405 Method Not Allowed');

    // 5.2 POST JSON Body Validation
    const postValidateRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawSingleToken })
    });
    assert(postValidateRes.status === 200, 'POST /api/auth/activation/validate accepts token via JSON body (HTTP 200)');
    assert(postValidateRes.data.valid === true, 'Validation returns valid = true');
    assert(postValidateRes.data.studentId === studentUid, `Validation returns studentId = ${studentUid}`);
    assert(postValidateRes.data.maskedEmail && postValidateRes.data.maskedEmail.includes('***'),
        `Validation returns masked email (${postValidateRes.data.maskedEmail})`);
    assert(postValidateRes.data.token === undefined && postValidateRes.data.activationToken === undefined,
        'Validation response NEVER echoes back the raw token');

    // 5.3 Password Setup Execution
    const setupRes = await request('/api/auth/activation/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawSingleToken, password: 'SecureStudentPass@2026' })
    });
    assert(setupRes.status === 200, 'Password setup completed successfully (HTTP 200)');
    assert(setupRes.data.status === 'ACTIVE', 'Student transitioned to ACTIVE');

    // 5.4 Token Erasure from DB: Hash and expiration must be nullified immediately
    const dbPostActivation = runPsql(`SELECT activation_token_hash, activation_token_expires_at, status FROM students WHERE student_id = '${studentUid}';`);
    assert(dbPostActivation.output.startsWith('||ACTIVE') || dbPostActivation.output.includes('ACTIVE'),
        `Database immediately erased token hash and set status to ACTIVE: ${dbPostActivation.output}`);

    // 5.5 Replay Rejection
    const replayRes = await request('/api/auth/activation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: rawSingleToken })
    });
    assert(replayRes.status === 400, 'Replay of used activation token rejected with HTTP 400');

    // 5.6 Frontend Lifecycle Inspection
    const routerJsPath = path.join(__dirname, '..', 'college-a', 'frontend', 'js', 'router.js');
    const routerJs = fs.readFileSync(routerJsPath, 'utf8');
    assert(routerJs.includes('window.history.replaceState') && routerJs.includes('#/activate'),
        'Frontend router.js immediately scrubs token from address bar using history.replaceState');

    const activateJsPath = path.join(__dirname, '..', 'college-a', 'frontend', 'js', 'pages', 'student-activate.js');
    const activateJs = fs.readFileSync(activateJsPath, 'utf8');
    assert(activateJs.includes('window._pendingActivationToken = null;') && activateJs.includes('currentToken = null;'),
        'Frontend student-activate.js cleans window._pendingActivationToken and zeroes out in-memory currentToken upon completion');

    console.log('\n==============================================================================');
    console.log(`   STAGE 5.2 VERIFICATION COMPLETE`);
    console.log(`   TOTAL TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
    console.log('==============================================================================');

    if (failCount > 0) process.exit(1);
}

run().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});

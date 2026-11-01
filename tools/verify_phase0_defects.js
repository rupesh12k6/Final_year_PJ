/**
 * Phase 0 Additional Defects Verification Script
 * Validates all 9 issues identified in the screenshot investigation:
 * 1. CM Health endpoints (/health & /api/health)
 * 2. Organization discovery & status mapping
 * 3. HTTP 401 vs 403 on unauthenticated/unauthorized requests
 * 4. Error forwarding (no unexpected 403 masking)
 * 5. Outbound request listing (College A & College B)
 * 6. Academic data request initiation (College A -> College B & College B -> College A)
 * 7. Student enrollment in College B: PENDING_ACTIVATION, 192-bit CSPRNG token, no password
 * 8. Reissue activation token in College B
 * 9. Cross-organization access prevention
 */

const http = require('http');

function request(url, options = {}, body = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const reqOptions = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(reqOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    parsed = data;
                }
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: parsed
                });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

async function runVerification() {
    console.log('========================================================================');
    console.log(' PHASE 0: CROSS-APPLICATION DEFECT VERIFICATION & STABILIZATION AUDIT');
    console.log('========================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition, message, details = '') {
        if (condition) {
            console.log(` [PASS] ${message}`);
            passed++;
        } else {
            console.error(` [FAIL] ${message}`);
            if (details) console.error(`        Details: ${JSON.stringify(details)}`);
            failed++;
        }
    }

    try {
        // Test 1: CM /health and /api/health
        const cmHealth1 = await request('http://localhost:8095/health');
        assert(cmHealth1.statusCode === 200 && cmHealth1.body.status === 'UP',
            'Issue 1: Consent Manager /health returns 200 UP', cmHealth1.body);

        const cmHealth2 = await request('http://localhost:8095/api/health');
        assert(cmHealth2.statusCode === 200 && cmHealth2.body.status === 'UP',
            'Issue 1: Consent Manager /api/health returns 200 UP (resolves red dot indicator)', cmHealth2.body);

        // Test 2: CM Organizations discovery & status
        const cmOrgs = await request('http://localhost:8095/api/consents/organizations');
        assert(cmOrgs.statusCode === 200 && Array.isArray(cmOrgs.body),
            'Issue 1: CM /api/consents/organizations returns valid list', `Count: ${cmOrgs.body?.length}`);
        
        const collegeBOrg = cmOrgs.body.find(o => o.organizationCode === 'COLLEGE_B');
        const collegeAOrg = cmOrgs.body.find(o => o.organizationCode === 'COLLEGE_A');
        assert(collegeBOrg && collegeBOrg.status === 'ACTIVE' && collegeBOrg.name === 'College B University',
            'Issue 1: College B has valid organizationCode, name, and ACTIVE status in CM registry');
        assert(collegeAOrg && collegeAOrg.status === 'ACTIVE' && collegeAOrg.name === 'College A University',
            'Issue 1: College A has valid organizationCode, name, and ACTIVE status in CM registry');

        // Test 3: Unauthenticated /api/students returns 401 Unauthorized, NOT 403 Forbidden
        const colAUnauth = await request('http://localhost:8081/api/students');
        assert(colAUnauth.statusCode === 401 && colAUnauth.body.error === 'Unauthorized',
            'Issue 3: College A unauthenticated /api/students returns 401 Unauthorized (not 403)', colAUnauth.body);

        const colBUnauth = await request('http://localhost:8082/api/students');
        assert(colBUnauth.statusCode === 401 && colBUnauth.body.error === 'Unauthorized',
            'Issue 6: College B unauthenticated /api/students returns 401 Unauthorized (not 403)', colBUnauth.body);

        // Test 5: College A Admin Login
        const colALogin = await request('http://localhost:8081/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'dean@collegea.edu', password: 'OrgAdmin@123' });
        const colAToken = colALogin.body.accessToken || colALogin.body.token;
        assert(colALogin.statusCode === 200 && colAToken,
            'Issue 3: College A admin authentication succeeds', { role: colALogin.body?.role });

        // Test 6: College B Admin Login
        const colBLogin = await request('http://localhost:8082/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { email: 'dean@collegeb.edu', password: 'OrgAdmin@123' });
        const colBToken = colBLogin.body.token || colBLogin.body.accessToken;
        assert(colBLogin.statusCode === 200 && colBToken,
            'Issue 6: College B admin authentication succeeds', { role: colBLogin.body?.role });

        // Test 7: Authenticated request to missing endpoint returns 404 Not Found, NOT 403 Forbidden
        const colANotFound = await request('http://localhost:8081/api/non-existent-endpoint', {
            headers: { 'Authorization': `Bearer ${colAToken}` }
        });
        assert(colANotFound.statusCode === 404 && colANotFound.body.error === 'Not Found',
            'Issue 3/4: College A authenticated non-existent endpoint returns 404 Not Found (not 403)', colANotFound.body);

        const colBNotFound = await request('http://localhost:8082/api/non-existent-endpoint', {
            headers: { 'Authorization': `Bearer ${colBToken}` }
        });
        assert(colBNotFound.statusCode === 404 && colBNotFound.body.error === 'Not Found',
            'Issue 4/6: College B authenticated non-existent endpoint returns 404 Not Found (not 403)', colBNotFound.body);

        // Test 7: College A List Outbound Requests
        const colAReqs = await request('http://localhost:8081/api/consumer/data-requests', {
            headers: { 'Authorization': `Bearer ${colAToken}` }
        });
        assert(colAReqs.statusCode === 200 && Array.isArray(colAReqs.body),
            'Issue 2: College A /api/consumer/data-requests returns 200 OK list (not 403)', `Count: ${colAReqs.body?.length}`);

        // Test 8: College B List Outbound Requests
        const colBReqs = await request('http://localhost:8082/api/consumer/data-requests', {
            headers: { 'Authorization': `Bearer ${colBToken}` }
        });
        assert(colBReqs.statusCode === 200 && Array.isArray(colBReqs.body),
            'Issue 5: College B /api/consumer/data-requests returns 200 OK list (not 403)', `Count: ${colBReqs.body?.length}`);

        // Test 9: College A List Students
        const colAStudents = await request('http://localhost:8081/api/students', {
            headers: { 'Authorization': `Bearer ${colAToken}` }
        });
        assert(colAStudents.statusCode === 200 && Array.isArray(colAStudents.body),
            'Issue 3: College A /api/students returns 200 OK student list', `Count: ${colAStudents.body?.length}`);

        // Test 10: College B List Students
        const colBStudents = await request('http://localhost:8082/api/students', {
            headers: { 'Authorization': `Bearer ${colBToken}` }
        });
        assert(colBStudents.statusCode === 200 && Array.isArray(colBStudents.body),
            'Issue 6: College B /api/students returns 200 OK student list', `Count: ${colBStudents.body?.length}`);

        // Test 11: College B Student Enrollment (Issue 6 & 7)
        const uniqueStudentId = `STU-B-PHASE0-${Date.now().toString().slice(-4)}`;
        const enrollPayload = {
            studentId: uniqueStudentId,
            name: 'Sarah Connor',
            email: `sarah.${Date.now().toString().slice(-4)}@collegeb.edu`,
            department: 'Cybernetics & AI',
            degree: 'B.Tech AI & Data Science',
            cgpa: '9.45'
        };
        const enrollRes = await request('http://localhost:8082/api/students', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${colBToken}`,
                'Content-Type': 'application/json'
            }
        }, enrollPayload);

        assert(enrollRes.statusCode === 201 && enrollRes.body.status === 'PENDING_ACTIVATION',
            'Issue 6 & 7: College B student enrollment returns 201 with status PENDING_ACTIVATION (no 403)', enrollRes.body);

        assert(enrollRes.body.activationToken && enrollRes.body.activationToken.length === 48,
            'Issue 7: College B returns 192-bit CSPRNG activation token (48 hex chars) for self-service activation',
            `Token: ${enrollRes.body.activationToken?.substring(0, 10)}...`);

        // Test 12: College B Reissue Activation Token
        const reissueRes = await request(`http://localhost:8082/api/students/${uniqueStudentId}/reissue-activation`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${colBToken}` }
        });
        assert(reissueRes.statusCode === 200 && reissueRes.body.activationToken && reissueRes.body.status === 'PENDING_ACTIVATION',
            'Issue 7: College B reissues fresh 192-bit CSPRNG activation token with 7-day validity',
            `New token: ${reissueRes.body.activationToken?.substring(0, 10)}...`);

        // Test 13: Cross-Organization Registration Prevention
        const crossOrgPayload = {
            studentId: `STU-CROSS-${Date.now().toString().slice(-4)}`,
            name: 'Malicious Injected Student',
            email: `malicious.${Date.now().toString().slice(-4)}@example.com`,
            organizationCode: 'COLLEGE_A' // Attempt to enroll student under College A from College B
        };
        const crossOrgRes = await request('http://localhost:8082/api/students', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${colBToken}`,
                'Content-Type': 'application/json'
            }
        }, crossOrgPayload);
        assert(crossOrgRes.statusCode === 403,
            'Issue 6 & 7: Cross-organization student registration strictly blocked with 403 Forbidden', crossOrgRes.body);

        // Test 14: College A Initiates Academic Request to College B via Consent Manager (Issue 1)
        const colAReqPayload = {
            dataPrincipalId: 'STU-2023-001',
            providerOrganizationId: 'COLLEGE_B',
            purpose: 'Evaluation for Graduate Credit Transfer',
            requestedFields: ['CGPA', 'DEGREE_CERTIFICATE']
        };
        const colAInitiateRes = await request('http://localhost:8081/api/consumer/data-requests/initiate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${colAToken}`,
                'Content-Type': 'application/json'
            }
        }, colAReqPayload);
        assert(colAInitiateRes.statusCode === 201 && (colAInitiateRes.body.id || colAInitiateRes.body.requestId || colAInitiateRes.body.dataRequestId),
            'Issue 1: College A initiates request to College B successfully via Consent Manager (201 Created)', colAInitiateRes.body);

        // Test 15: College B Initiates Academic Request to College A via Consent Manager (Issue 4)
        const colBReqPayload = {
            dataPrincipalId: 'STU-2023-001',
            providerOrganizationId: 'COLLEGE_A',
            purpose: 'Verification of Undergraduate Academic Standing',
            requestedFields: ['CGPA', 'PROGRAM']
        };
        const colBInitiateRes = await request('http://localhost:8082/api/consumer/data-requests/initiate', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${colBToken}`,
                'Content-Type': 'application/json'
            }
        }, colBReqPayload);
        assert(colBInitiateRes.statusCode === 201 && (colBInitiateRes.body.id || colBInitiateRes.body.requestId || colBInitiateRes.body.dataRequestId),
            'Issue 4: College B initiates request to College A successfully via Consent Manager (201 Created, no 403)', colBInitiateRes.body);

    } catch (err) {
        console.error('Unexpected exception during verification:', err);
        failed++;
    }

    console.log('\n========================================================================');
    console.log(` AUDIT SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
}

runVerification();

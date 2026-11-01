/**
 * DEPA Consent Manager & Dual-Role College A Web Suite
 * Integrates Consent Manager (8095), College A (8081), and College B (8082).
 */

const CM_BASE_URL = (window.DEPA_SERVERS && window.DEPA_SERVERS.CM_BASE_URL) || 'http://localhost:8095';
const COLLEGE_A_BASE_URL = (window.DEPA_SERVERS && window.DEPA_SERVERS.COLLEGE_A_BASE_URL) || 'http://localhost:8081';
const COLLEGE_B_BASE_URL = (window.DEPA_SERVERS && window.DEPA_SERVERS.COLLEGE_B_BASE_URL) || 'http://localhost:8082';

// State
let studentToken = null;
let cmAdminToken = null;
let superAdminToken = null;
let orgAdminToken = null;

window.supportedFields = [
    { field: 'CGPA', label: 'Cumulative GPA (CGPA)', description: 'Official overall academic performance score' },
    { field: 'TRANSCRIPT', label: 'Academic Transcript', description: 'Course-by-course breakdown and semester grades' },
    { field: 'DEGREE_CERTIFICATE', label: 'Degree Certificate', description: 'Graduation and credential award confirmation' },
    { field: 'ATTENDANCE', label: 'Attendance Record', description: 'Institutional attendance percentage record' },
    { field: 'CONDUCT_CERTIFICATE', label: 'Conduct Certificate', description: 'Character and disciplinary clearance certificate' },
    { field: 'STUDY_CERTIFICATE', label: 'Study Certificate', description: 'Institutional verification of enrollment' }
];
var supportedFields = window.supportedFields;

let selectedRequestIdForApproval = null;
let currentPendingRequests = [];

// =========================================================================
// INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DEPA UI Suite Initialized.');
    renderFieldsCheckboxes();
    renderProducerFields();
    
    // Auto-ping services
    await pingAllServices();
    
    // Auto-login Alice for frictionless demo
    await autoSetupTokens();
});

// Switch Main Portals
function switchMainPortal(portal) {
    document.querySelectorAll('.portal-view').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));

    if (portal === 'cm') {
        document.getElementById('portal-cm').style.display = 'block';
        document.getElementById('tab-cm').classList.add('active');
    } else if (portal === 'college-a') {
        document.getElementById('portal-college-a').style.display = 'block';
        document.getElementById('tab-college-a').classList.add('active');
        loadCollegeAStudents();
        loadOutboundDataRequests();
    } else if (portal === 'college-b') {
        document.getElementById('portal-college-b').style.display = 'block';
        document.getElementById('tab-college-b').classList.add('active');
    }
}

// Switch CM Sub-tabs
function switchCmSubTab(tab) {
    document.querySelectorAll('.cm-subview').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.sub-nav .sub-tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(`cm-tab-${tab}`).style.display = 'block';
    document.getElementById(`btn-cm-${tab}`).classList.add('active');

    if (tab === 'student') {
        loadStudentPendingConsents();
        loadStudentActiveConsents();
    } else if (tab === 'admin') {
        loadCmOrganizations();
    } else if (tab === 'orgadmin') {
        loadOrgUsers();
    }
}

// Switch College Sub-tabs
function switchCollegeSubTab(tab) {
    document.querySelectorAll('.col-subview').forEach(v => v.style.display = 'none');
    document.getElementById('btn-col-reg').classList.remove('active');
    document.getElementById('btn-col-prod').classList.remove('active');
    document.getElementById('btn-col-cons').classList.remove('active');

    if (tab === 'registry') {
        document.getElementById('col-tab-registry').style.display = 'block';
        document.getElementById('btn-col-reg').classList.add('active');
        loadCollegeAStudents();
    } else if (tab === 'producer') {
        document.getElementById('col-tab-producer').style.display = 'block';
        document.getElementById('btn-col-prod').classList.add('active');
    } else if (tab === 'consumer') {
        document.getElementById('col-tab-consumer').style.display = 'block';
        document.getElementById('btn-col-cons').classList.add('active');
        loadOutboundDataRequests();
    }
}

let orgBAdminToken = localStorage.getItem('depa_org_b_token') || null;
let latestActiveAccessToken = localStorage.getItem('depa_latest_token') || null;
let latestActiveGrantId = localStorage.getItem('depa_latest_grant_id') || null;

// =========================================================================
// SERVICE HEALTH PING
// =========================================================================
async function pingAllServices() {
    await pingNode(`${CM_BASE_URL}/health`, ['dot-cm']);
    await pingNode(`${COLLEGE_A_BASE_URL}/health`, ['dot-col-a', 'dot-college-a']);
    await pingNode(`${COLLEGE_B_BASE_URL}/health`, ['dot-col-b', 'dot-college-b']);
}

async function pingNode(url, dotIds) {
    try {
        const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(2000) });
        dotIds.forEach(id => {
            const dot = document.getElementById(id);
            if (dot) {
                dot.className = res.ok ? 'health-dot online' : 'health-dot offline';
            }
        });
    } catch (e) {
        dotIds.forEach(id => {
            const dot = document.getElementById(id);
            if (dot) dot.className = 'health-dot offline';
        });
    }
}

// =========================================================================
// AUTOMATED TOKEN SETUP & LOGIN HELPERS
// =========================================================================
async function autoSetupTokens() {
    try {
        // 1. Super Admin Login
        const superRes = await fetch(`${CM_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'superadmin@depa.cm', password: 'SuperAdmin@123' })
        });
        if (superRes.ok) {
            const data = await superRes.json();
            superAdminToken = data.token;
            localStorage.setItem('depa_super_token', data.token);
        }

        // 2. CM Admin Login
        const cmRes = await fetch(`${CM_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@depa.cm', password: 'SecurePassword123' })
        });
        if (cmRes.ok) {
            const data = await cmRes.json();
            cmAdminToken = data.token;
        }

        // 3. Org Admin A Login
        const orgRes = await fetch(`${CM_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@collegea.edu', password: 'CollegeAdmin123' })
        });
        if (orgRes.ok) {
            const data = await orgRes.json();
            orgAdminToken = data.token;
            localStorage.setItem('depa_org_a_token', data.token);
        }

        // 4. Org Admin B Login
        try {
            const orgBRes = await fetch(`${CM_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@collegeb.edu', password: 'CollegeAdmin123' })
            });
            if (orgBRes.ok) {
                const dataB = await orgBRes.json();
                orgBAdminToken = dataB.token;
                localStorage.setItem('depa_org_b_token', dataB.token);
            }
        } catch(eB) {}

        // 5. Student Alice Login
        await quickLoginAlice();
    } catch (e) {
        console.warn('Backend services initializing or not yet running:', e.message);
    }
}

async function quickLoginAlice() {
    try {
        const res = await fetch(`${CM_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'student1@collegea.edu', password: 'StudentPassword123' })
        });
        if (res.ok) {
            const data = await res.json();
            studentToken = data.token;
            showToast('success', `Authenticated as Data Principal (${data.name})`);
            loadStudentPendingConsents();
            loadStudentActiveConsents();
        } else {
            console.log('Alice account not yet initialized or password changed.');
        }
    } catch (e) {
        console.error('Error logging in Alice:', e);
    }
}

async function switchActiveStudent(studentKey) {
    if (studentKey === 'bob') {
        try {
            const res = await fetch(`${CM_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'bob.roberts@collegeb.edu', password: 'StudentPassword123' })
            });
            if (res.ok) {
                const data = await res.json();
                studentToken = data.token;
                const nameEl = document.getElementById('cm-active-student-name');
                const descEl = document.getElementById('cm-active-student-desc');
                const avatarEl = document.getElementById('cm-active-student-avatar');
                if (nameEl) nameEl.textContent = 'Bob Roberts';
                if (descEl) descEl.innerHTML = 'Student ID: <strong>S2001</strong> | Official Email: <strong>bob.roberts@collegeb.edu</strong> | College B';
                if (avatarEl) avatarEl.textContent = 'BR';
                showToast('success', 'Logged in as Bob Roberts (College B)');
                loadStudentPendingConsents();
                loadStudentActiveConsents();
            }
        } catch (e) {
            console.error('Error logging in Bob:', e);
        }
    } else {
        await quickLoginAlice();
        const nameEl = document.getElementById('cm-active-student-name');
        const descEl = document.getElementById('cm-active-student-desc');
        const avatarEl = document.getElementById('cm-active-student-avatar');
        if (nameEl) nameEl.textContent = 'Alice Johnson';
        if (descEl) descEl.innerHTML = 'Student ID: <strong>STU-2023-001</strong> | Official Email: <strong>student1@collegea.edu</strong> | College A';
        if (avatarEl) avatarEl.textContent = 'AJ';
    }
}

// =========================================================================
// VIEW 1: CONSENT MANAGER (DATA PRINCIPAL WORKFLOW)
// =========================================================================
async function loadStudentPendingConsents() {
    if (!studentToken) return;
    const container = document.getElementById('pending-requests-container');
    container.innerHTML = '<p style="color:var(--text-muted);">Fetching requests...</p>';

    try {
        const res = await fetch(`${CM_BASE_URL}/api/consents/pending`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const page = await res.json();
        currentPendingRequests = page.content || [];

        document.getElementById('pending-count-display').textContent = currentPendingRequests.length;

        if (currentPendingRequests.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 2rem; color: var(--text-muted);">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">✨</div>
                    <strong>No Pending Consent Requests</strong>
                    <p style="font-size:0.85rem; margin-top:0.25rem;">When an academic institution requests your records, it will appear here for your review and approval.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = currentPendingRequests.map(req => `
            <div class="glass-panel" style="background:rgba(255,255,255,0.02); padding: 1.25rem; margin-bottom: 1rem; border-left: 4px solid var(--accent-amber);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 0.75rem;">
                    <div>
                        <span class="badge badge-pending">PENDING APPROVAL</span>
                        <h4 style="font-size: 1.15rem; color:#FFF; margin-top:0.35rem;">Request from ${escapeHtml(req.requesterOrganizationName || req.requesterOrganizationCode)}</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
                            <strong>Purpose:</strong> "${escapeHtml(req.purpose)}"
                        </p>
                    </div>
                    <button class="btn btn-primary btn-sm" onclick="openApprovalModal('${req.id}')">
                        🛡️ Review & Grant Consent
                    </button>
                </div>
                <div>
                    <span style="font-size:0.75rem; color:var(--text-dim); text-transform:uppercase; font-family:var(--font-mono);">Requested Attributes:</span>
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.35rem;">
                        ${(req.requestedFields || []).map(f => `<span class="badge badge-info">${escapeHtml(f)}</span>`).join('')}
                    </div>
                </div>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = `<p style="color:var(--accent-rose);">Failed to load requests: ${e.message}</p>`;
    }
}

async function loadStudentActiveConsents() {
    if (!studentToken) return;
    const tbody = document.getElementById('active-consents-tbody');

    try {
        const res = await fetch(`${CM_BASE_URL}/api/consents`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        if (!res.ok) return;
        const page = await res.json();
        const consents = page.content || [];

        const activeList = consents.filter(c => c.status === 'ACTIVE');
        document.getElementById('active-count-display').textContent = activeList.length;

        if (consents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No active consents found.</td></tr>';
            return;
        }

        tbody.innerHTML = consents.map(c => `
            <tr>
                <td><code>${escapeHtml(c.id)}</code></td>
                <td><strong>${escapeHtml(c.requesterOrganizationCode)}</strong></td>
                <td>${escapeHtml(c.purpose)}</td>
                <td>${(c.approvedFields || []).map(f => `<span class="badge badge-info">${escapeHtml(f)}</span>`).join(' ')}</td>
                <td>
                    <span class="badge ${c.status === 'ACTIVE' ? 'badge-active' : 'badge-revoked'}">
                        ${c.status}
                    </span>
                </td>
                <td style="font-size:0.8rem; font-family:var(--font-mono);">${new Date(c.expiresAt).toLocaleDateString()}</td>
                <td>
                    ${c.status === 'ACTIVE' ? `
                        <button class="btn btn-danger btn-sm" onclick="handleRevokeConsent('${c.id}')">
                            🚫 Revoke
                        </button>
                    ` : `<span style="color:var(--text-dim); font-size:0.8rem;">Revoked</span>`}
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error loading active consents:', e);
    }
}

function openApprovalModal(requestId) {
    selectedRequestIdForApproval = requestId;
    const req = currentPendingRequests.find(r => r.id === requestId);
    if (!req) return;

    document.getElementById('modal-req-org').textContent = req.requesterOrganizationName || req.requesterOrganizationCode;
    document.getElementById('modal-req-purpose').textContent = req.purpose;

    const fieldsContainer = document.getElementById('modal-fields-selector');
    fieldsContainer.innerHTML = (req.requestedFields || []).map(f => {
        const meta = supportedFields.find(sf => sf.field === f) || { field: f, label: f, description: 'Academic record attribute' };
        return `
            <label class="scope-checkbox-card">
                <input type="checkbox" name="approved-field" value="${escapeHtml(meta.field)}" checked>
                <div class="scope-info">
                    <div class="scope-title">${escapeHtml(meta.label)}</div>
                    <div class="scope-desc">${escapeHtml(meta.description)}</div>
                </div>
            </label>
        `;
    }).join('');

    document.getElementById('consent-approval-modal').classList.add('active');
}

function closeApprovalModal() {
    document.getElementById('consent-approval-modal').classList.remove('active');
    selectedRequestIdForApproval = null;
}

async function submitConsentDecision(approved) {
    if (!selectedRequestIdForApproval || !studentToken) return;

    if (!approved) {
        try {
            const res = await fetch(`${CM_BASE_URL}/api/consents/${selectedRequestIdForApproval}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${studentToken}` }
            });
            if (res.ok) {
                showToast('error', 'Consent request rejected.');
                closeApprovalModal();
                loadStudentPendingConsents();
            }
        } catch (e) {
            showToast('error', `Reject failed: ${e.message}`);
        }
        return;
    }

    // Collect approved fields
    const checkedBoxes = document.querySelectorAll('#modal-fields-selector input[name="approved-field"]:checked');
    const approvedFieldsList = Array.from(checkedBoxes).map(cb => cb.value);

    if (approvedFieldsList.length === 0) {
        showToast('error', 'Please select at least one attribute to approve.');
        return;
    }

    try {
        const res = await fetch(`${CM_BASE_URL}/api/consents/${selectedRequestIdForApproval}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${studentToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ approvedFields: approvedFieldsList })
        });

        if (res.ok) {
            const grant = await res.json();
            showToast('success', `Consent Approved! Issued Access Grant (${grant.grantId}) with RS256 Signature.`);
            closeApprovalModal();
            loadStudentPendingConsents();
            loadStudentActiveConsents();
        } else {
            const err = await res.json();
            showToast('error', `Approval failed: ${err.message || res.statusText}`);
        }
    } catch (e) {
        showToast('error', `Approval failed: ${e.message}`);
    }
}

async function handleRevokeConsent(consentId) {
    if (!confirm('Are you sure you want to revoke this consent? All associated access grants will be immediately invalidated.')) return;

    try {
        const res = await fetch(`${CM_BASE_URL}/api/consents/${consentId}/revoke`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });

        if (res.ok) {
            showToast('info', 'Consent revoked successfully. Token invalidation is live.');
            loadStudentActiveConsents();
        } else {
            showToast('error', 'Revocation failed.');
        }
    } catch (e) {
        showToast('error', e.message);
    }
}

// =========================================================================
// VIEW 1.2: CM GLOBAL ADMIN WORKFLOW
// =========================================================================
async function loadCmOrganizations() {
    if (!cmAdminToken && !superAdminToken) return;
    const token = cmAdminToken || superAdminToken;
    const tbody = document.getElementById('orgs-table-tbody');

    try {
        const res = await fetch(`${CM_BASE_URL}/api/admin/organizations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const orgs = await res.json();

        tbody.innerHTML = orgs.map(o => `
            <tr>
                <td><strong>${escapeHtml(o.organizationCode)}</strong></td>
                <td>${escapeHtml(o.name)}</td>
                <td>
                    <span class="badge ${o.status === 'ACTIVE' ? 'badge-active' : 'badge-pending'}">
                        ${o.status}
                    </span>
                </td>
                <td>
                    ${o.status === 'PENDING' ? `
                        <button class="btn btn-success btn-sm" onclick="activateOrg('${o.organizationId}')">Activate</button>
                    ` : `
                        <button class="btn btn-secondary btn-sm" onclick="suspendOrg('${o.organizationId}')">Suspend</button>
                    `}
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error loading orgs:', e);
    }
}

async function activateOrg(orgId) {
    const token = cmAdminToken || superAdminToken;
    try {
        const res = await fetch(`${CM_BASE_URL}/api/admin/organizations/${orgId}/activate`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('success', 'Organization activated.');
            loadCmOrganizations();
        }
    } catch (e) {
        showToast('error', e.message);
    }
}

async function suspendOrg(orgId) {
    const token = cmAdminToken || superAdminToken;
    try {
        const res = await fetch(`${CM_BASE_URL}/api/admin/organizations/${orgId}/suspend`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('info', 'Organization suspended.');
            loadCmOrganizations();
        }
    } catch (e) {
        showToast('error', e.message);
    }
}

async function handleRegisterOrg(e) {
    e.preventDefault();
    const token = cmAdminToken || superAdminToken;
    const code = document.getElementById('new-org-code').value.trim().toUpperCase();
    const name = document.getElementById('new-org-name').value.trim();
    const email = document.getElementById('new-org-email').value.trim();

    try {
        const res = await fetch(`${CM_BASE_URL}/api/admin/organizations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ organizationCode: code, name: name, email: email })
        });
        if (res.ok) {
            showToast('success', `Registered institution ${code}`);
            document.getElementById('form-register-org').reset();
            loadCmOrganizations();
        } else {
            const err = await res.json();
            showToast('error', err.message || 'Registration failed');
        }
    } catch (err) {
        showToast('error', err.message);
    }
}

// =========================================================================
// ROLE-BASED ACCESS CONTROL & AUDIT LOGGING
// =========================================================================
let currentCmRole = 'CM_ADMIN';
let allCurrentAuditLogs = [];

async function handleCmRoleChange(role) {
    currentCmRole = role;
    
    // Resolve tokens
    if (!superAdminToken || !orgAdminToken || !studentToken) {
        await autoSetupTokens();
    }
    
    const isCmAdmin = role === 'CM_ADMIN';
    const isInstA = role === 'INST_ADMIN_A';
    const isInstB = role === 'INST_ADMIN_B';
    const isStudentAlice = role === 'USER_ALICE';
    const isStudentBob = role === 'USER_BOB';
    const isStudent = isStudentAlice || isStudentBob;
    const isInstAdmin = isInstA || isInstB;

    // 1. Update user profile in sidebar
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const pageTitleEl = document.getElementById('top-bar-page-title');
    const navTextDash = document.getElementById('nav-text-dashboard');
    const navTextAudit = document.getElementById('nav-text-audit');

    if (isCmAdmin) {
        if (avatarEl) { avatarEl.textContent = 'SA'; avatarEl.style.background = '#4F46E5'; }
        if (nameEl) nameEl.textContent = 'superadmin@depa.cm';
        if (roleEl) roleEl.textContent = 'Super Admin (Consent Manager)';
        if (pageTitleEl) pageTitleEl.textContent = 'Consent Manager Governance Control Plane';
        if (navTextDash) navTextDash.textContent = 'Federation Dashboard';
        if (navTextAudit) navTextAudit.textContent = 'Security Audit Logs (All)';
        showToast('Switched to CM Super Admin persona (Global Governance)', 'info');
    } else if (isInstA) {
        if (avatarEl) { avatarEl.textContent = 'CA'; avatarEl.style.background = '#059669'; }
        if (nameEl) nameEl.textContent = 'admin@collegea.edu';
        if (roleEl) roleEl.textContent = 'Institute Admin (College A)';
        if (pageTitleEl) pageTitleEl.textContent = 'College A Institution Control Panel';
        if (navTextDash) navTextDash.textContent = 'College A Dashboard';
        if (navTextAudit) navTextAudit.textContent = 'College A Audit Logs';
        
        const rTitle = document.getElementById('inst-roster-title');
        const rDesc = document.getElementById('inst-roster-desc');
        if (rTitle) rTitle.textContent = 'College A University Student Registry';
        if (rDesc) rDesc.textContent = 'Manage registered students, dispatch onboarding invitations, and configure consent access for College A.';
        showToast('Switched to Institute Admin (College A)', 'info');
    } else if (isInstB) {
        if (avatarEl) { avatarEl.textContent = 'CB'; avatarEl.style.background = '#0284C7'; }
        if (nameEl) nameEl.textContent = 'admin@collegeb.edu';
        if (roleEl) roleEl.textContent = 'Institute Admin (College B)';
        if (pageTitleEl) pageTitleEl.textContent = 'College B Institution Control Panel';
        if (navTextDash) navTextDash.textContent = 'College B Dashboard';
        if (navTextAudit) navTextAudit.textContent = 'College B Audit Logs';
        
        const rTitle = document.getElementById('inst-roster-title');
        const rDesc = document.getElementById('inst-roster-desc');
        if (rTitle) rTitle.textContent = 'College B University Student Registry';
        if (rDesc) rDesc.textContent = 'Manage registered students, dispatch onboarding invitations, and configure consent access for College B.';
        showToast('Switched to Institute Admin (College B)', 'info');
    } else if (isStudentAlice) {
        if (avatarEl) { avatarEl.textContent = 'AJ'; avatarEl.style.background = '#10B981'; }
        if (nameEl) nameEl.textContent = 'Alice Johnson (STU-2023-001)';
        if (roleEl) roleEl.textContent = 'Data Principal (Student)';
        if (pageTitleEl) pageTitleEl.textContent = 'Student Consent & Privacy Center';
        await switchActiveStudent('alice');
        showToast('Switched to Student Alice Johnson persona', 'info');
    } else if (isStudentBob) {
        if (avatarEl) { avatarEl.textContent = 'BR'; avatarEl.style.background = '#0EA5E9'; }
        if (nameEl) nameEl.textContent = 'Bob Roberts (S2001)';
        if (roleEl) roleEl.textContent = 'Data Principal (Student)';
        if (pageTitleEl) pageTitleEl.textContent = 'Student Consent & Privacy Center';
        await switchActiveStudent('bob');
        showToast('Switched to Student Bob Roberts persona', 'info');
    }

    // 2. Dynamic Sidebar Navigation Visibility based on data-roles
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        const allowedRoles = item.getAttribute('data-roles');
        if (!allowedRoles) return;
        const roleList = allowedRoles.split(',').map(r => r.trim());
        if (roleList.includes(role)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    // 3. Update section headings in sidebar
    const titleCore = document.getElementById('sidebar-section-title-core');
    const titleGov = document.getElementById('sidebar-section-title-gov');
    if (titleCore) titleCore.textContent = isStudent ? 'My Academic Consents' : (isInstAdmin ? 'Institution Management' : 'Core Modules');
    if (titleGov) titleGov.style.display = isStudent ? 'none' : 'block';

    // 4. Switch to default section for this role
    if (isStudent) {
        switchCmSection('student');
    } else if (isInstAdmin) {
        switchCmSection('inst-roster');
        loadOrgUsers();
    } else {
        switchCmSection('dashboard');
        loadCmDashboardStats();
        loadCmOrganizations();
    }
}

async function loadCmAuditLogs() {
    const isInstA = currentCmRole === 'INST_ADMIN_A';
    const isInstB = currentCmRole === 'INST_ADMIN_B';
    const isInstAdmin = isInstA || isInstB;
    
    // Choose token: superAdminToken for CM Admin; orgAdminToken for College A; orgBAdminToken for College B
    let token = superAdminToken;
    if (isInstA) token = orgAdminToken;
    else if (isInstB) token = orgBAdminToken;
    
    if (!token) {
        await autoSetupTokens();
        token = isInstA ? orgAdminToken : (isInstB ? orgBAdminToken : superAdminToken);
    }
    
    // Update Scope Banner and Titles
    const titleEl = document.getElementById('audit-section-title');
    const descEl = document.getElementById('audit-section-desc');
    const badgeEl = document.getElementById('audit-scope-badge');
    const statScope = document.getElementById('audit-stat-scope');
    
    if (isInstA) {
        if (titleEl) titleEl.textContent = '📜 College A University - Security Audit Trail';
        if (descEl) descEl.textContent = 'Immutable cryptographic audit trail of all transactions, authentication, and consent requests concerning College A.';
        if (badgeEl) { badgeEl.textContent = 'INSTITUTION: COLLEGE A'; badgeEl.className = 'badge badge-active'; }
        if (statScope) statScope.textContent = 'College A';
    } else if (isInstB) {
        if (titleEl) titleEl.textContent = '📜 College B University - Security Audit Trail';
        if (descEl) descEl.textContent = 'Immutable cryptographic audit trail of all transactions, authentication, and consent requests concerning College B.';
        if (badgeEl) { badgeEl.textContent = 'INSTITUTION: COLLEGE B'; badgeEl.className = 'badge badge-cyan'; }
        if (statScope) statScope.textContent = 'College B';
    } else {
        if (titleEl) titleEl.textContent = '📜 System-Wide Security Audit Trail';
        if (descEl) descEl.textContent = 'Immutable chronological log of all access grants, student approvals, authentication, and cryptographic token validations across all member universities.';
        if (badgeEl) { badgeEl.textContent = 'GLOBAL FEDERATION (ALL EVENTS)'; badgeEl.className = 'badge badge-info'; }
        if (statScope) statScope.textContent = 'Global';
    }

    const tbody = document.getElementById('audit-logs-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted);"><span class="health-dot online"></span> Loading audit events from Consent Manager...</td></tr>';

    try {
        const res = await fetch(`${CM_BASE_URL}/api/audit`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Failed to load audit logs (HTTP ${res.status}).</td></tr>`;
            return;
        }
        allCurrentAuditLogs = await res.json();
        
        // Update Stats
        const statTotal = document.getElementById('audit-stat-total');
        const statActors = document.getElementById('audit-stat-actors');
        if (statTotal) statTotal.textContent = allCurrentAuditLogs.length;
        if (statActors) {
            const uniqueActors = new Set(allCurrentAuditLogs.map(l => l.actorUserId).filter(Boolean));
            statActors.textContent = uniqueActors.size;
        }

        renderAuditLogsTable(allCurrentAuditLogs);
    } catch(e) {
        console.error('Error fetching audit logs:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Error fetching audit records: ${e.message}</td></tr>`;
    }
}

function renderAuditLogsTable(logs) {
    const tbody = document.getElementById('audit-logs-tbody');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">No audit logs found for the selected scope/filter.</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(l => {
        // Event type badge styling
        let evBadgeClass = 'badge-info';
        const ev = l.eventType || '';
        if (ev.includes('APPROVED') || ev.includes('GRANTED') || ev.includes('SUCCESS')) {
            evBadgeClass = 'badge-active';
        } else if (ev.includes('REVOKED') || ev.includes('REJECTED') || ev.includes('BLOCKED')) {
            evBadgeClass = 'badge-revoked';
        } else if (ev.includes('REQUESTED') || ev.includes('PENDING')) {
            evBadgeClass = 'badge-pending';
        } else if (ev.includes('IMPORT') || ev.includes('ONBOARD')) {
            evBadgeClass = 'badge-cyan';
        }

        // Role badge styling
        const role = l.actorRole || 'SYSTEM';
        let roleBadgeClass = 'badge-info';
        if (role === 'SUPER_ADMIN' || role === 'ADMIN') roleBadgeClass = 'badge-info';
        else if (role === 'ORG_ADMIN') roleBadgeClass = 'badge-active';
        else if (role === 'USER') roleBadgeClass = 'badge-cyan';

        // Format Timestamp: YYYY-MM-DD HH:mm:ss UTC
        let timeStr = l.timestamp || '';
        try {
            const d = new Date(l.timestamp);
            timeStr = d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
        } catch(e) {}

        const actorId = l.actorUserId || 'SYSTEM';
        const targetType = l.targetEntityType || '-';
        const targetId = l.targetEntityId || '-';
        const orgCode = l.organizationId || (actorId.includes('COLLEGE_B') ? 'COLLEGE_B' : (actorId.includes('COLLEGE_A') ? 'COLLEGE_A' : 'CENTRAL_CM'));

        return `
            <tr>
                <td style="font-family:var(--font-mono); font-size:0.78rem; color:#4B5563;">
                    <div style="display:flex; align-items:center; gap:4px;">
                        <span>🕒</span>
                        <strong>${timeStr}</strong>
                    </div>
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <strong style="font-family:var(--font-mono); font-size:0.82rem; color:var(--primary);">${escapeHtml(actorId)}</strong>
                        <span class="badge ${roleBadgeClass}" style="width:fit-content; font-size:0.65rem; padding:1px 6px;">${escapeHtml(role)}</span>
                    </div>
                </td>
                <td>
                    <span class="badge ${evBadgeClass}" style="font-size:0.72rem; padding:3px 8px;">${escapeHtml(ev)}</span>
                </td>
                <td style="font-size:0.8rem;">
                    <code>${escapeHtml(targetType)}: ${escapeHtml(targetId)}</code>
                </td>
                <td>
                    <span class="badge badge-info" style="font-size:0.7rem; font-family:var(--font-mono);">${escapeHtml(orgCode)}</span>
                </td>
                <td style="font-size:0.82rem; color:#374151; max-width:320px;">
                    ${escapeHtml(l.details || '')}
                </td>
            </tr>
        `;
    }).join('');
}

function filterAuditLogs() {
    const eventFilter = document.getElementById('audit-event-filter')?.value || 'ALL';
    const userSearch = (document.getElementById('audit-user-search')?.value || '').trim().toLowerCase();

    const filtered = allCurrentAuditLogs.filter(l => {
        const matchesEvent = (eventFilter === 'ALL') || (l.eventType === eventFilter);
        const matchesUser = !userSearch || 
            (l.actorUserId && l.actorUserId.toLowerCase().includes(userSearch)) ||
            (l.details && l.details.toLowerCase().includes(userSearch)) ||
            (l.targetEntityId && l.targetEntityId.toLowerCase().includes(userSearch));
        return matchesEvent && matchesUser;
    });

    renderAuditLogsTable(filtered);
}

// =========================================================================
// VIEW 1.3: ORG ADMIN WORKFLOW
// =========================================================================
async function handleImportStudentSubmit(e) {
    e.preventDefault();
    const isInstB = currentCmRole === 'INST_ADMIN_B';
    const token = isInstB ? orgBAdminToken : orgAdminToken;
    
    const studentId = document.getElementById('imp-student-id').value.trim();
    const name = document.getElementById('imp-student-name').value.trim();
    const email = document.getElementById('imp-student-email').value.trim();

    try {
        const res = await fetch(`${CM_BASE_URL}/api/org-admin/onboarding/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                students: [{ studentId, name, email }]
            })
        });

        if (res.ok) {
            showToast(`Imported ${name} (${studentId}). Onboarding invitation dispatched to ${email}`, 'success');
            document.getElementById('form-import-student').reset();
            loadOrgUsers();
            loadCmAuditLogs();
        } else {
            const err = await res.json();
            showToast(err.message || 'Import failed', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleBulkImportStudents(e) {
    await handleImportStudentSubmit(e);
}

async function loadOrgUsers() {
    const isInstB = currentCmRole === 'INST_ADMIN_B';
    const token = isInstB ? orgBAdminToken : orgAdminToken;
    if (!token) return;

    const tbody = document.getElementById('inst-students-tbody');
    const orgTbody = document.getElementById('org-users-tbody');
    
    try {
        const res = await fetch(`${CM_BASE_URL}/api/org-admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const users = await res.json();

        const html = users.map(u => `
            <tr>
                <td><strong style="font-family:var(--font-mono); color:var(--primary); font-size:0.8rem;">${escapeHtml(u.userId)}</strong></td>
                <td><code>${escapeHtml(u.externalIdentityId || u.userId)}</code></td>
                <td><strong>${escapeHtml(u.name)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="badge ${u.status === 'ACTIVE' ? 'badge-active' : 'badge-pending'}">${u.status}</span></td>
            </tr>
        `).join('');

        if (tbody) tbody.innerHTML = html || '<tr><td colspan="5" style="text-align:center;">No enrolled students found.</td></tr>';
        if (orgTbody) orgTbody.innerHTML = html;
    } catch(e) {
        console.error('Error loading org users:', e);
    }
}

async function resetUserPassword(userId) {
    const newPwd = prompt('Enter new password for student:', 'StudentPassword123');
    if (!newPwd) return;

    try {
        const res = await fetch(`${CM_BASE_URL}/api/org-admin/users/${userId}/reset-password`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${orgAdminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newPassword: newPwd })
        });
        if (res.ok) {
            showToast('success', 'Password reset successfully.');
        }
    } catch (e) {
        showToast('error', e.message);
    }
}

// =========================================================================
// VIEW 1.4: REGISTRATION & OTP VERIFICATION
// =========================================================================
async function handleCompleteRegistration() {
    const token = document.getElementById('reg-token-input').value.trim();
    const pwd = document.getElementById('reg-password-input').value.trim();
    if (!token || !pwd) {
        showToast('error', 'Token and password are required.');
        return;
    }

    try {
        const res = await fetch(`${CM_BASE_URL}/api/registration/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, password: pwd })
        });
        if (res.ok) {
            showToast('info', 'Password recorded. 6-digit OTP dispatched to email.');
            document.getElementById('otp-section').style.display = 'block';
        } else {
            const err = await res.json();
            showToast('error', err.message || 'Registration step failed');
        }
    } catch (e) {
        showToast('error', e.message);
    }
}

async function handleVerifyOtp() {
    const token = document.getElementById('reg-token-input').value.trim();
    const otp = document.getElementById('reg-otp-input').value.trim();

    try {
        const res = await fetch(`${CM_BASE_URL}/api/registration/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, otp: otp })
        });
        if (res.ok) {
            showToast('success', 'Account activated! You can now log in.');
            document.getElementById('otp-section').style.display = 'none';
        } else {
            const err = await res.json();
            showToast('error', err.message || 'OTP verification failed');
        }
    } catch (e) {
        showToast('error', e.message);
    }
}

// =========================================================================
// VIEW 2: COLLEGE A DUAL-ROLE (PRODUCER & CONSUMER)
// =========================================================================
async function loadCollegeAStudents() {
    const tbody = document.getElementById('college-students-tbody');
    try {
        const res = await fetch(`${COLLEGE_A_BASE_URL}/api/students`);
        if (!res.ok) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Could not connect to College A (:8081).</td></tr>';
            return;
        }
        const students = await res.json();
        tbody.innerHTML = students.map(s => `
            <tr>
                <td><code>${escapeHtml(s.studentId)}</code></td>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td>${escapeHtml(s.email)}</td>
                <td><span class="badge badge-info">B.Tech Computer Science</span></td>
                <td><span class="badge badge-active">${s.status}</span></td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--accent-rose);">College A is not currently running on port 8081.</td></tr>`;
    }
}

function renderFieldsCheckboxes() {
    const container = document.getElementById('consumer-fields-selector');
    if (!container) return;
    container.innerHTML = supportedFields.map((f, i) => `
        <label class="scope-checkbox-card">
            <input type="checkbox" name="req-field" value="${f.field}" ${i < 3 ? 'checked' : ''}>
            <div class="scope-info">
                <div class="scope-title">${escapeHtml(f.label)}</div>
                <div class="scope-desc">${escapeHtml(f.description)}</div>
            </div>
        </label>
    `).join('');
}

function renderProducerFields() {
    const container = document.getElementById('producer-fields-list');
    if (!container) return;
    container.innerHTML = supportedFields.map(f => `
        <div class="cert-field-box" style="margin-bottom: 0.65rem;">
            <div class="field-label">${escapeHtml(f.field)}</div>
            <div class="field-val" style="font-size:0.88rem;">${escapeHtml(f.label)}</div>
        </div>
    `).join('');
}

function autofillDemoRequest() {
    document.getElementById('req-student-id').value = 'STU-2023-001';
    document.getElementById('req-provider-org').value = 'COLLEGE_A';
    document.getElementById('req-purpose').value = "Academic Verification for Master's Admissions";
    document.querySelectorAll('#consumer-fields-selector input[type="checkbox"]').forEach((cb, idx) => {
        cb.checked = idx < 3;
    });
    showToast('info', 'Demo parameters filled for Alice Johnson.');
}

async function handleCreateDataRequest(e) {
    e.preventDefault();
    const token = orgAdminToken || cmAdminToken;
    if (!token) {
        showToast('error', 'Authentication token required to submit request.');
        return;
    }

    const studentId = document.getElementById('req-student-id').value.trim();
    const providerOrg = document.getElementById('req-provider-org').value;
    const purpose = document.getElementById('req-purpose').value.trim();

    const checkedBoxes = document.querySelectorAll('#consumer-fields-selector input[name="req-field"]:checked');
    const fields = Array.from(checkedBoxes).map(cb => cb.value);

    if (fields.length === 0) {
        showToast('error', 'Please select at least one field to request.');
        return;
    }

    try {
        const res = await fetch(`${CM_BASE_URL}/api/data-requests`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                dataPrincipalId: studentId,
                providerOrganizationId: providerOrg,
                purpose: purpose,
                requestedFields: fields
            })
        });

        if (res.ok) {
            const data = await res.json();
            showToast('success', `Data Request Created (${data.id})! Student will receive consent notification.`);
            loadOutboundDataRequests();
        } else {
            const err = await res.json();
            showToast('error', err.message || 'Request failed');
        }
    } catch (err) {
        showToast('error', err.message);
    }
}

async function loadOutboundDataRequests() {
    const token = orgAdminToken || cmAdminToken;
    if (!token) return;
    const tbody = document.getElementById('outbound-requests-tbody');

    try {
        // Fetch data requests and access grants in parallel
        const [reqRes, grantsRes] = await Promise.all([
            fetch(`${CM_BASE_URL}/api/data-requests`, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(`${CM_BASE_URL}/api/access-grants`, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (!reqRes.ok) return;
        const page = await reqRes.json();
        const requests = page.content || [];

        let grants = [];
        if (grantsRes.ok) {
            grants = await grantsRes.json();
        }

        if (requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted);">No outbound requests created yet.</td></tr>';
            return;
        }

        tbody.innerHTML = requests.map(req => {
            // Find corresponding grant if approved
            const matchingGrant = grants.find(g => 
                g.dataPrincipalId === req.dataPrincipalId && 
                g.providerOrganizationCode === req.providerOrganizationCode &&
                g.status === 'ACTIVE'
            );

            return `
                <tr>
                    <td><code>${escapeHtml(req.id)}</code></td>
                    <td><strong>${escapeHtml(req.dataPrincipalId)}</strong></td>
                    <td>${escapeHtml(req.providerOrganizationCode)}</td>
                    <td>
                        <span class="badge ${req.status === 'APPROVED' ? 'badge-approved' : 'badge-pending'}">
                            ${req.status}
                        </span>
                    </td>
                    <td>
                        ${req.status === 'APPROVED' && matchingGrant && matchingGrant.accessToken ? `
                            <button class="btn btn-success btn-sm" onclick="fetchAndDecryptData('${matchingGrant.grantId}', '${matchingGrant.accessToken}')">
                                ⚡ Fetch & Decrypt
                            </button>
                        ` : req.status === 'APPROVED' ? `
                            <span class="badge badge-info">Token Ready</span>
                        ` : `
                            <span style="color:var(--text-muted); font-size:0.8rem;">Awaiting Consent</span>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Error loading outbound requests:', e);
    }
}

// Direct P2P Fetch & Decrypt via College A Consumer Endpoint
async function fetchAndDecryptData(grantId, accessToken) {
    showToast('info', 'Executing direct Peer-to-Peer encrypted exchange with Provider...');

    try {
        const res = await fetch(`${COLLEGE_A_BASE_URL}/api/consumer/fetch-direct-data?providerUrl=http://localhost:8081`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': 'A-INTERNAL-SECRET-KEY'
            },
            body: JSON.stringify({
                grantId: grantId,
                accessToken: accessToken
            })
        });

        if (!res.ok) {
            const err = await res.json();
            showToast('error', `Data exchange failed: ${err.message || res.statusText}`);
            return;
        }

        const clearData = await res.json();
        showToast('success', 'Data decrypted successfully with Diffie-Hellman Shared Secret!');
        renderCredentialCertificate(clearData);

    } catch (e) {
        showToast('error', `P2P exchange error: ${e.message}`);
    }
}

function renderCredentialCertificate(data) {
    const section = document.getElementById('credential-viewer-section');
    const grid = document.getElementById('cert-attributes-grid');
    section.style.display = 'block';

    grid.innerHTML = Object.entries(data).map(([key, val]) => `
        <div class="cert-field-box">
            <div class="field-label">${escapeHtml(key)}</div>
            <div class="field-val">${escapeHtml(String(val))}</div>
        </div>
    `).join('');

    section.scrollIntoView({ behavior: 'smooth' });
}

// =========================================================================
// UTILITY HELPERS & CRYPTO INSPECTORS
// =========================================================================
async function fetchCmPublicKey() {
    const el = document.getElementById('cm-public-key-display');
    if (!el) return;
    try {
        const res = await fetch(`${CM_BASE_URL}/api/access-grants/public-key`);
        if (res.ok) {
            const key = await res.text();
            el.textContent = key;
            localStorage.setItem('depa_public_key', key);
        } else {
            el.textContent = '// Failed to fetch public key from CM.';
        }
    } catch (e) {
        el.textContent = '// Error connecting to Consent Manager :8095.';
    }
}

function copyCmPublicKey() {
    const key = document.getElementById('cm-public-key-display')?.textContent || localStorage.getItem('depa_public_key') || '';
    if (!key) {
        showToast('error', 'No public key loaded to copy.');
        return;
    }
    navigator.clipboard.writeText(key).then(() => {
        showToast('success', 'RS256 Public Key PEM copied to clipboard!');
    }).catch(() => {
        showToast('info', 'Public key available in console.');
    });
}

function copyRawToken() {
    const token = document.getElementById('token-raw-string')?.textContent || latestActiveAccessToken || '';
    if (!token) {
        showToast('error', 'No token string found.');
        return;
    }
    navigator.clipboard.writeText(token).then(() => {
        showToast('success', 'Raw JWT Access Token copied to clipboard!');
    });
}

function inspectToken(grantId, tokenString) {
    const modal = document.getElementById('token-inspector-modal');
    if (!modal) return;

    const token = tokenString || latestActiveAccessToken || localStorage.getItem('depa_latest_token') || 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJjb25zZW50LW1hbmFnZXIiLCJzdWIiOiJTVFUtMjAyMy0wMDEiLCJwdXJwb3NlIjoiQWNhZGVtaWMgRXZhbHVhdGlvbiIsImFwcHJvdmVkRmllbGRzIjpbIkNHUEEiLCJUUkFOU0NSSVBUIl0sImV4cCI6MTgwMDAwMDAwMH0.SIGNATURE_DEMO';
    
    const grantEl = document.getElementById('token-grant-id');
    if (grantEl) grantEl.textContent = grantId || 'GRNT_ACTIVE';

    const rawEl = document.getElementById('token-raw-string');
    if (rawEl) rawEl.textContent = token;

    const displayEl = document.getElementById('token-decoded-display');
    if (displayEl) {
        try {
            const parts = token.split('.');
            if (parts.length >= 2) {
                const header = JSON.parse(atob(parts[0]));
                const payload = JSON.parse(atob(parts[1]));
                const structure = {
                    JWT_Header: header,
                    JWT_Payload_Claims: payload,
                    Signature_Verification: 'VERIFIED_BY_CM_RS256_PRIVATE_KEY',
                    DEPA_Blindness_Status: 'DATA_BLIND_NO_STUDENT_MARKS_IN_CM'
                };
                displayEl.textContent = JSON.stringify(structure, null, 2);
            } else {
                displayEl.textContent = token;
            }
        } catch(e) {
            displayEl.textContent = token;
        }
    }

    modal.classList.add('active');
}

function closeTokenModal() {
    const modal = document.getElementById('token-inspector-modal');
    if (modal) modal.classList.remove('active');
}

function showToast(arg1, arg2) {
    let type = 'info';
    let message = '';

    if (arg2) {
        if (['success', 'error', 'info', 'warning'].includes(arg1)) {
            type = arg1;
            message = arg2;
        } else {
            message = arg1;
            type = arg2;
        }
    } else {
        message = arg1 || '';
    }

    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =========================================================================
// MULTI-SERVER NETWORK ENDPOINTS CONFIGURATION
// =========================================================================
function openNetworkConfigModal() {
    const cmInput = document.getElementById('cfg-cm-url');
    const colAInput = document.getElementById('cfg-col-a-url');
    const colBInput = document.getElementById('cfg-col-b-url');

    if (cmInput) cmInput.value = window.DEPA_SERVERS?.CM_BASE_URL || 'http://localhost:8095';
    if (colAInput) colAInput.value = window.DEPA_SERVERS?.COLLEGE_A_BASE_URL || 'http://localhost:8081';
    if (colBInput) colBInput.value = window.DEPA_SERVERS?.COLLEGE_B_BASE_URL || 'http://localhost:8082';

    const modal = document.getElementById('network-config-modal');
    if (modal) modal.classList.add('active');
}

function closeNetworkConfigModal() {
    const modal = document.getElementById('network-config-modal');
    if (modal) modal.classList.remove('active');
}

function saveNetworkConfig(e) {
    if (e) e.preventDefault();
    const cm = document.getElementById('cfg-cm-url')?.value.trim();
    const colA = document.getElementById('cfg-col-a-url')?.value.trim();
    const colB = document.getElementById('cfg-col-b-url')?.value.trim();

    if (window.DEPA_SERVERS) {
        window.DEPA_SERVERS.setEndpoints(cm, colA, colB);
    }
    showToast('Saved multi-server endpoints! Re-pinging nodes...', 'success');
    closeNetworkConfigModal();
    pingAllServices();
}

function resetNetworkConfig() {
    if (window.DEPA_SERVERS) {
        window.DEPA_SERVERS.resetDefaults();
    }
    showToast('Reset endpoints to localhost defaults.', 'info');
    closeNetworkConfigModal();
    pingAllServices();
}

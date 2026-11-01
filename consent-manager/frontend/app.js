/**
 * DEPA Consent Manager Governance Portal Frontend (Port 3001)
 * India Data Empowerment & Protection Architecture
 * Strictly scoped to Super Admin and Organization Admin governance workflows.
 */

const CM_BASE_URL = (window.DEPA_SERVERS && window.DEPA_SERVERS.CM_BASE_URL) || 'http://localhost:8095';
const COLLEGE_A_BASE_URL = (window.DEPA_SERVERS && window.DEPA_SERVERS.COLLEGE_A_BASE_URL) || 'http://localhost:8081';
const COLLEGE_B_BASE_URL = (window.DEPA_SERVERS && window.DEPA_SERVERS.COLLEGE_B_BASE_URL) || 'http://localhost:8082';

// Read active session from DF_SESSION module
function getCurrentUser() { return window.DF_SESSION ? window.DF_SESSION.getUser() : null; }
function getCurrentToken() { return window.DF_SESSION ? window.DF_SESSION.getToken() : null; }
function getCurrentRole() { return window.DF_SESSION ? window.DF_SESSION.getRole() : null; }

let currentUser = getCurrentUser();
let currentToken = getCurrentToken();
let currentRole = getCurrentRole();
let rawAuditLogs = [];
let cachedOrganizations = [];

// =========================================================================
// INITIALIZATION
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Consent Manager Portal Initialized on Port 3001.');
    await pingAllServices();

    // Start Live Clock
    startClock();

    // Setup Mobile Sidebar Toggle
    setupMobileSidebar();

    // Initialize Client-Side Router & Role Guards
    if (window.DF_ROUTER) {
        window.DF_ROUTER.init();
    }

    if (window.DF_SESSION && window.DF_SESSION.isAuthenticated()) {
        updateSessionUI();
        fetchCmPublicKey();
    }
});

function startClock() {
    function tick() {
        const clockEl = document.getElementById('topbar-clock');
        if (clockEl) {
            const now = new Date();
            clockEl.textContent = now.toLocaleTimeString() + ' IST';
        }
    }
    tick();
    setInterval(tick, 1000);
}

function setupMobileSidebar() {
    const toggleBtn = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.getElementById('df-sidebar');
    const backdrop = document.getElementById('df-sidebar-backdrop');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('df-sidebar-open');
            if (backdrop) backdrop.classList.toggle('d-none');
        });
    }

    if (backdrop && sidebar) {
        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('df-sidebar-open');
            backdrop.classList.add('d-none');
        });
    }
}

// =========================================================================
// SESSION DISPLAY & LOGOUT
// =========================================================================
function updateSessionUI() {
    currentUser = getCurrentUser();
    currentToken = getCurrentToken();
    currentRole = getCurrentRole();

    const isSuperAdmin = (currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN');
    const isOrgAdmin = (currentRole === 'ORG_ADMIN');

    // Update avatar and labels in sidebar
    const avatar = document.getElementById('sidebar-user-avatar');
    if (avatar) {
        avatar.textContent = isSuperAdmin ? 'SA' : 'OA';
        avatar.style.background = isSuperAdmin ? '#2563EB' : '#0284C7';
    }

    const topbarAvatar = document.getElementById('topbar-user-avatar');
    if (topbarAvatar) {
        topbarAvatar.textContent = isSuperAdmin ? 'SA' : 'OA';
        topbarAvatar.style.background = isSuperAdmin ? '#2563EB' : '#0284C7';
    }

    const userName = document.getElementById('sidebar-user-name');
    if (userName) userName.textContent = currentUser ? (currentUser.name || currentUser.email) : 'Unauthenticated';

    const topbarEmail = document.getElementById('topbar-user-email');
    if (topbarEmail) topbarEmail.textContent = currentUser ? currentUser.email : 'Unauthenticated';

    const userRole = document.getElementById('sidebar-user-role');
    if (userRole) {
        if (isSuperAdmin) {
            userRole.textContent = 'Regulatory Super Admin';
        } else if (currentUser && currentUser.organizationId) {
            userRole.textContent = `Org Admin (${currentUser.organizationId})`;
        } else {
            userRole.textContent = 'Organization Administrator';
        }
    }

    const brandTag = document.getElementById('sidebar-brand-tag');
    if (brandTag) {
        brandTag.textContent = isOrgAdmin ? 'DEPA PARTICIPANT NODE' : 'INDIA DEPA FIDUCIARY';
    }

    const brandTitle = document.getElementById('sidebar-brand-title');
    if (brandTitle) {
        brandTitle.textContent = isOrgAdmin ? 'Organization Portal' : 'Consent Manager';
    }

    // Render Dynamic Navigation Links in Sidebar
    renderSidebarNavigation(isSuperAdmin, isOrgAdmin);
}

function renderSidebarNavigation(isSuperAdmin, isOrgAdmin) {
    const navEl = document.getElementById('df-sidebar-nav');
    if (!navEl) return;

    if (isSuperAdmin) {
        navEl.innerHTML = `
            <p class="df-nav-section-title">Central Governance</p>
            <a href="#/dashboard" class="df-nav-link" id="nav-sa-overview">
                <i class="bi bi-speedometer2"></i>
                <span>Federation Overview</span>
            </a>
            <a href="#/organizations" class="df-nav-link" id="nav-sa-orgs">
                <i class="bi bi-building"></i>
                <span>Institution Registry</span>
            </a>
            <a href="#/administrators" class="df-nav-link" id="nav-sa-admins">
                <i class="bi bi-person-badge-fill"></i>
                <span>Central Officers</span>
            </a>
            <p class="df-nav-section-title mt-2">Trust & Audit Trail</p>
            <a href="#/audit-logs" class="df-nav-link" id="nav-sa-audit">
                <i class="bi bi-journal-text"></i>
                <span>Global Audit Trail</span>
            </a>
            <a href="#/trust-overview" class="df-nav-link" id="nav-sa-trust">
                <i class="bi bi-shield-check"></i>
                <span>Trust & Public Keys</span>
            </a>
        `;
    } else if (isOrgAdmin) {
        navEl.innerHTML = `
            <p class="df-nav-section-title">Institutional Governance</p>
            <a href="#/org-dashboard" class="df-nav-link" id="nav-oa-overview">
                <i class="bi bi-speedometer2"></i>
                <span>Institutional Overview</span>
            </a>
            <a href="#/org-profile" class="df-nav-link" id="nav-oa-profile">
                <i class="bi bi-building"></i>
                <span>Institution Profile</span>
            </a>
            <a href="#/org-users" class="df-nav-link" id="nav-oa-users">
                <i class="bi bi-people-fill"></i>
                <span>Staff & Students</span>
            </a>
            <p class="df-nav-section-title mt-2">Data Exchange & Trust</p>
            <a href="#/org-consents" class="df-nav-link" id="nav-oa-consents">
                <i class="bi bi-arrow-left-right"></i>
                <span>Consents & Requests</span>
            </a>
            <a href="#/org-audit" class="df-nav-link" id="nav-oa-audit">
                <i class="bi bi-journal-text"></i>
                <span>Institutional Audit</span>
            </a>
            <a href="#/org-keys" class="df-nav-link" id="nav-oa-keys">
                <i class="bi bi-key-fill"></i>
                <span>Cryptographic Keys</span>
            </a>
        `;
    }
}

function handleLogout() {
    if (window.DF_UI && window.DF_UI.showConfirmDialog) {
        window.DF_UI.showConfirmDialog({
            title: 'Sign Out of Central Session?',
            message: 'You are terminating your active session with the Consent Manager. Unsaved modifications will be discarded.',
            confirmText: 'Sign Out',
            confirmVariant: 'danger',
            onConfirm: () => {
                if (window.DF_SESSION) {
                    window.DF_SESSION.logout();
                } else {
                    sessionStorage.removeItem('cm_token');
                    sessionStorage.removeItem('cm_user');
                    window.location.hash = '#/login/super-admin';
                }
                if (window.DF_UI && window.DF_UI.showToast) {
                    window.DF_UI.showToast('Logged out of Consent Manager session.', 'info');
                }
            }
        });
    } else {
        if (window.DF_SESSION) {
            window.DF_SESSION.logout();
        } else {
            sessionStorage.removeItem('cm_token');
            sessionStorage.removeItem('cm_user');
            window.location.hash = '#/login/super-admin';
        }
    }
}

window.DF_APP = {
    syncSessionDisplay: updateSessionUI,
    handleLogout: handleLogout
};

// =========================================================================
// SUPER ADMIN DASHBOARD & METRICS
// =========================================================================
async function loadCmMetrics() {
    try {
        const response = await fetch(`${CM_BASE_URL}/api/admin/metrics`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('stat-orgs-count').textContent = data.totalOrganizations ?? 2;
            document.getElementById('stat-pending-count').textContent = data.pendingDataRequests ?? 0;
            document.getElementById('stat-active-count').textContent = data.activeConsents ?? 0;
            document.getElementById('stat-revoked-count').textContent = data.revokedConsents ?? 0;

            document.getElementById('banner-active-institutions').textContent = data.activeOrganizations ?? 2;
            document.getElementById('banner-active-grants').textContent = data.activeConsents ?? 0;
        } else {
            // Fallback if metrics endpoint returns non-200
            fallbackComputeMetrics();
        }
    } catch (e) {
        fallbackComputeMetrics();
    }
}

async function fallbackComputeMetrics() {
    try {
        const orgRes = await fetch(`${CM_BASE_URL}/api/admin/organizations`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (orgRes.ok) {
            const orgs = await orgRes.json();
            const activeOrgs = orgs.filter(o => o.status === 'ACTIVE').length;
            document.getElementById('stat-orgs-count').textContent = orgs.length;
            document.getElementById('banner-active-institutions').textContent = activeOrgs;
        }
    } catch (e) {}
}

// =========================================================================
// SUPER ADMIN: ORGANIZATIONS & ADMIN MANAGEMENT
// =========================================================================
async function loadCmOrganizations() {
    const tbody = document.getElementById('cm-orgs-tbody');
    const adminTbody = document.getElementById('cm-org-admins-tbody');

    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading institutions...</td></tr>';
    if (adminTbody) adminTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading administrators...</td></tr>';

    try {
        const response = await fetch(`${CM_BASE_URL}/api/admin/organizations`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        cachedOrganizations = await response.json();

        // Render Organizations Table
        if (tbody) {
            if (cachedOrganizations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No institutions registered.</td></tr>';
            } else {
                tbody.innerHTML = cachedOrganizations.map(org => {
                    const isActive = org.status === 'ACTIVE';
                    const statusBadge = isActive
                        ? `<span class="badge badge-active">ACTIVE</span>`
                        : `<span class="badge badge-revoked">SUSPENDED</span>`;
                    
                    const toggleAction = isActive
                        ? `<button class="btn btn-danger btn-sm" onclick="suspendOrg('${org.organizationId}', '${org.organizationCode}')">Suspend</button>`
                        : `<button class="btn btn-primary btn-sm" onclick="activateOrg('${org.organizationId}', '${org.organizationCode}')">Activate</button>`;
                    
                    const addAdminBtn = `<button class="btn btn-secondary btn-sm" onclick="openCreateOrgAdminModal('${org.organizationId}', '${org.organizationCode}')">+ Admin</button>`;

                    const overlapExpiry = org.previousKeyExpiresAt
                        ? `<span style="font-size:0.75rem; color:#D97706;">Rotated (TTL active)</span>`
                        : `<span style="font-size:0.75rem; color:#6B7280;">Normal</span>`;

                    return `
                        <tr>
                            <td><strong>${escapeHtml(org.organizationCode)}</strong></td>
                            <td>${escapeHtml(org.name || 'Unnamed Institution')}</td>
                            <td><span class="badge badge-info">${escapeHtml(org.type || 'DUAL_ROLE')}</span></td>
                            <td>${statusBadge}</td>
                            <td><code style="font-size:0.75rem;">${escapeHtml(org.keyId || 'default-rsa-key')}</code></td>
                            <td>${overlapExpiry}</td>
                            <td style="display:flex; gap:0.4rem;">
                                ${toggleAction}
                                ${addAdminBtn}
                            </td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Render Organization Administrators Table
        if (adminTbody) {
            adminTbody.innerHTML = cachedOrganizations.map(org => {
                return `
                    <tr>
                        <td><strong>${escapeHtml(org.organizationCode)}</strong> (${escapeHtml(org.name)})</td>
                        <td>${escapeHtml(org.email || `admin@${org.organizationCode.toLowerCase()}.edu`)}</td>
                        <td><span class="badge badge-info">ORG_ADMIN</span></td>
                        <td><span class="badge badge-active">${escapeHtml(org.status)}</span></td>
                        <td>
                            <button class="btn btn-secondary btn-sm" onclick="openCreateOrgAdminModal('${org.organizationId}', '${org.organizationCode}')">Manage</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

    } catch (err) {
        console.error('Failed to load organizations:', err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="color:var(--rose-text); text-align:center;">Failed to load: ${err.message}</td></tr>`;
    }
}

async function activateOrg(orgId, code) {
    if (!confirm(`Are you sure you want to ACTIVATE organization ${code}?`)) return;

    try {
        const response = await fetch(`${CM_BASE_URL}/api/admin/organizations/${orgId}/activate`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            showToast(`Organization ${code} has been activated.`, 'success');
            loadCmOrganizations();
            loadCmMetrics();
        } else {
            const err = await response.json();
            showToast(`Failed to activate: ${err.message || 'Error'}`, 'error');
        }
    } catch (e) {
        showToast(`Request failed: ${e.message}`, 'error');
    }
}

async function suspendOrg(orgId, code) {
    if (!confirm(`Are you sure you want to SUSPEND organization ${code}? Access will be temporarily denied.`)) return;

    try {
        const response = await fetch(`${CM_BASE_URL}/api/admin/organizations/${orgId}/suspend`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            showToast(`Organization ${code} has been SUSPENDED.`, 'warning');
            loadCmOrganizations();
            loadCmMetrics();
        } else {
            const err = await response.json();
            showToast(`Failed to suspend: ${err.message || 'Error'}`, 'error');
        }
    } catch (e) {
        showToast(`Request failed: ${e.message}`, 'error');
    }
}

function openRegisterOrgModal() {
    openModal('modal-register-org');
}

async function handleRegisterOrgSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-register-org');
    if (btn) btn.disabled = true;

    const code = document.getElementById('reg-org-code').value.trim().toUpperCase();
    const name = document.getElementById('reg-org-name').value.trim();
    const email = document.getElementById('reg-org-email').value.trim().toLowerCase();
    const type = document.getElementById('reg-org-type').value;
    const url = document.getElementById('reg-org-url').value.trim();

    try {
        const response = await fetch(`${CM_BASE_URL}/api/admin/organizations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                organizationCode: code,
                name: name,
                email: email,
                type: type,
                endpointUrl: url
            })
        });

        if (response.ok) {
            showToast(`Organization ${code} registered successfully!`, 'success');
            closeModal('modal-register-org');
            document.getElementById('form-register-org').reset();
            loadCmOrganizations();
            loadCmMetrics();
        } else {
            const err = await response.json();
            showToast(`Registration failed: ${err.message || 'Validation error'}`, 'error');
        }
    } catch (e) {
        showToast(`Request failed: ${e.message}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function openCreateOrgAdminModal(orgId, orgCode) {
    document.getElementById('admin-target-org-id').value = orgId;
    document.getElementById('create-admin-modal-title').textContent = `Provision Admin for ${orgCode}`;
    openModal('modal-create-org-admin');
}

async function handleCreateOrgAdminSubmit(e) {
    e.preventDefault();
    const orgId = document.getElementById('admin-target-org-id').value;
    const email = document.getElementById('admin-email').value.trim();
    const fullName = document.getElementById('admin-fullname').value.trim();
    const password = document.getElementById('admin-password').value;

    try {
        const response = await fetch(`${CM_BASE_URL}/api/admin/organizations/${orgId}/org-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ email, fullName, password })
        });

        if (response.ok) {
            showToast(`Organization admin ${email} created successfully!`, 'success');
            closeModal('modal-create-org-admin');
            document.getElementById('form-create-org-admin').reset();
            loadCmOrganizations();
        } else {
            const err = await response.json();
            showToast(`Failed to create admin: ${err.message || 'Error'}`, 'error');
        }
    } catch (e) {
        showToast(`Request failed: ${e.message}`, 'error');
    }
}

// =========================================================================
// ORG ADMIN: PROFILE, STAFF USERS & CONSENTS
// =========================================================================
async function loadCurrentOrgProfile() {
    try {
        const response = await fetch(`${CM_BASE_URL}/api/admin/organizations`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            const orgs = await response.json();
            const myOrg = orgs.find(o => o.organizationId === currentUser.organizationId || o.email === currentUser.email) || orgs[0];
            if (myOrg) {
                document.getElementById('profile-org-code').textContent = myOrg.organizationCode;
                document.getElementById('profile-org-name').textContent = myOrg.name;
                document.getElementById('profile-org-status').innerHTML = `<span class="badge badge-active">${myOrg.status}</span>`;
                document.getElementById('profile-org-email').textContent = myOrg.email || 'N/A';
                document.getElementById('profile-org-key-id').textContent = myOrg.keyId || 'COLLEGE_A_ASSERTION_KEY_V1';
            }
        }
    } catch (e) {
        console.error('Failed to load org profile:', e);
    }
}

async function loadOrgUsers() {
    const tbody = document.getElementById('org-users-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading staff users...</td></tr>';

    try {
        const response = await fetch(`${CM_BASE_URL}/api/org-admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const users = await response.json();

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No staff accounts configured.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => {
            const isActive = user.status === 'ACTIVE';
            const statusBadge = isActive
                ? `<span class="badge badge-active">ACTIVE</span>`
                : `<span class="badge badge-revoked">SUSPENDED</span>`;

            const toggleAction = isActive
                ? `<button class="btn btn-danger btn-sm" onclick="suspendStaffUser('${user.id}')">Suspend</button>`
                : `<button class="btn btn-primary btn-sm" onclick="activateStaffUser('${user.id}')">Activate</button>`;

            const resetBtn = `<button class="btn btn-secondary btn-sm" onclick="openResetPasswordModal('${user.id}', '${user.email}')">Reset Password</button>`;

            return `
                <tr>
                    <td><strong>${escapeHtml(user.fullName || 'User')}</strong></td>
                    <td>${escapeHtml(user.email)}</td>
                    <td><span class="badge badge-info">${escapeHtml(user.role)}</span></td>
                    <td>${statusBadge}</td>
                    <td style="display:flex; gap:0.4rem;">
                        ${toggleAction}
                        ${resetBtn}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="color:var(--rose-text); text-align:center;">Failed to load users: ${e.message}</td></tr>`;
    }
}

function openAddStaffUserModal() {
    openModal('modal-add-staff-user');
}

async function handleAddStaffUserSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('staff-email').value.trim();
    const fullName = document.getElementById('staff-name').value.trim();
    const password = document.getElementById('staff-password').value;

    try {
        const response = await fetch(`${CM_BASE_URL}/api/org-admin/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ email, fullName, password, role: 'ORG_USER' })
        });

        if (response.ok) {
            showToast(`Staff user ${email} added successfully!`, 'success');
            closeModal('modal-add-staff-user');
            document.getElementById('form-add-staff-user').reset();
            loadOrgUsers();
        } else {
            const err = await response.json();
            showToast(`Failed to add user: ${err.message || 'Error'}`, 'error');
        }
    } catch (e) {
        showToast(`Request failed: ${e.message}`, 'error');
    }
}

async function suspendStaffUser(userId) {
    try {
        const res = await fetch(`${CM_BASE_URL}/api/org-admin/users/${userId}/suspend`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            showToast('User suspended.', 'warning');
            loadOrgUsers();
        } else {
            showToast('Failed to suspend user.', 'error');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function activateStaffUser(userId) {
    try {
        const res = await fetch(`${CM_BASE_URL}/api/org-admin/users/${userId}/activate`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (res.ok) {
            showToast('User activated.', 'success');
            loadOrgUsers();
        } else {
            showToast('Failed to activate user.', 'error');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

function openResetPasswordModal(userId, email) {
    document.getElementById('reset-password-user-id').value = userId;
    document.getElementById('reset-password-user-label').textContent = `Reset password for ${email}`;
    openModal('modal-reset-password');
}

async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    const userId = document.getElementById('reset-password-user-id').value;
    const newPassword = document.getElementById('reset-new-password').value;

    try {
        const response = await fetch(`${CM_BASE_URL}/api/org-admin/users/${userId}/reset-password`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ newPassword })
        });

        if (response.ok) {
            showToast('Password updated successfully!', 'success');
            closeModal('modal-reset-password');
            document.getElementById('form-reset-password').reset();
        } else {
            showToast('Failed to update password.', 'error');
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

async function loadOrgConsents() {
    const tbody = document.getElementById('org-consents-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading institutional consents...</td></tr>';

    try {
        const response = await fetch(`${CM_BASE_URL}/api/consents/organization`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const consents = await response.json();

        if (consents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No consent records registered for this institution yet.</td></tr>';
            return;
        }

        tbody.innerHTML = consents.map(c => {
            const isAct = c.status === 'ACTIVE';
            const statusBadge = isAct
                ? `<span class="badge badge-active">ACTIVE</span>`
                : (c.status === 'REVOKED'
                    ? `<span class="badge badge-revoked">REVOKED</span>`
                    : `<span class="badge badge-info">${escapeHtml(c.status)}</span>`);

            const scopeBadges = (c.approvedFields || []).map(f => `<span class="badge badge-info" style="font-size:0.68rem;">${escapeHtml(f)}</span>`).join(' ');

            return `
                <tr>
                    <td><code style="font-size:0.75rem;">${escapeHtml(c.id ? c.id.substring(0, 8) + '...' : 'N/A')}</code></td>
                    <td><strong>${escapeHtml(c.dataPrincipalId)}</strong></td>
                    <td>${escapeHtml(c.requesterOrganizationCode || 'COLLEGE_B')}</td>
                    <td>${scopeBadges || '<span style="color:#9CA3AF;">None</span>'}</td>
                    <td>${statusBadge}</td>
                    <td>${formatTimestamp(c.createdAt)}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="color:var(--rose-text); text-align:center;">Failed to load consents: ${e.message}</td></tr>`;
    }
}

// =========================================================================
// SECURITY AUDIT LOGS
// =========================================================================
async function loadCmAuditLogs() {
    const tbody = document.getElementById('cm-audit-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Loading tamper-evident audit logs...</td></tr>';

    try {
        const response = await fetch(`${CM_BASE_URL}/api/audit`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        rawAuditLogs = await response.json();
        renderAuditLogsTable(rawAuditLogs);
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="7" style="color:var(--rose-text); text-align:center;">Failed to load audit trail: ${e.message}</td></tr>`;
    }
}

function renderAuditLogsTable(logs) {
    const tbody = document.getElementById('cm-audit-tbody');
    if (!tbody) return;

    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No audit events recorded.</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(l => {
        const eventCategory = l.eventType || l.action || 'EVENT';
        let badgeClass = 'badge-info';
        if (eventCategory.includes('APPROVED') || eventCategory.includes('SUCCESS') || eventCategory.includes('ACTIVE')) {
            badgeClass = 'badge-active';
        } else if (eventCategory.includes('REVOKED') || eventCategory.includes('FAILED') || eventCategory.includes('SUSPENDED')) {
            badgeClass = 'badge-revoked';
        } else if (eventCategory.includes('PENDING') || eventCategory.includes('REQUEST')) {
            badgeClass = 'badge-pending';
        }

        return `
            <tr>
                <td style="font-size:0.75rem; white-space:nowrap;">${formatTimestamp(l.timestamp || l.createdAt)}</td>
                <td><span class="badge ${badgeClass}" style="font-size:0.7rem;">${escapeHtml(eventCategory)}</span></td>
                <td><code style="font-size:0.75rem;">${escapeHtml(l.actorId || l.actor || 'SYSTEM')}</code></td>
                <td>${escapeHtml(l.actorRole || 'SYSTEM')}</td>
                <td><code style="font-size:0.75rem;">${escapeHtml(l.resourceId || 'N/A')}</code></td>
                <td><strong>${escapeHtml(l.organizationId || 'CM')}</strong></td>
                <td style="font-size:0.8rem; color:#4B5563;">${escapeHtml(l.details || l.description || '')}</td>
            </tr>
        `;
    }).join('');
}

function filterAuditLogs() {
    const filter = document.getElementById('audit-filter-action').value;
    if (filter === 'ALL') {
        renderAuditLogsTable(rawAuditLogs);
    } else {
        const filtered = rawAuditLogs.filter(l => {
            const ev = (l.eventType || l.action || '').toUpperCase();
            return ev.includes(filter);
        });
        renderAuditLogsTable(filtered);
    }
}

// =========================================================================
// RS256 TRUST CENTER
// =========================================================================
async function fetchCmPublicKey() {
    const pre = document.getElementById('cm-public-key-pem');
    if (!pre) return;

    try {
        const res = await fetch(`${CM_BASE_URL}/api/access-grants/public-key`);
        if (res.ok) {
            const pem = await res.text();
            pre.textContent = pem;
        } else {
            pre.textContent = '// Failed to fetch Consent Manager public key';
        }
    } catch (e) {
        pre.textContent = `// Error fetching public key: ${e.message}`;
    }
}

function copyCmPublicKey() {
    const pre = document.getElementById('cm-public-key-pem');
    if (pre && pre.textContent) {
        navigator.clipboard.writeText(pre.textContent.trim());
        showToast('RS256 Public Key copied to clipboard!', 'info');
    }
}

// =========================================================================
// SERVICE HEALTH PING
// =========================================================================
async function pingAllServices() {
    await pingNode(`${CM_BASE_URL}/api/health`, 'dot-cm');
    await pingNode(`${COLLEGE_A_BASE_URL}/api/health`, 'dot-col-a');
    await pingNode(`${COLLEGE_B_BASE_URL}/api/health`, 'dot-col-b');
}

async function pingNode(url, dotId) {
    const dot = document.getElementById(dotId);
    if (!dot) return;

    try {
        const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            dot.className = 'health-dot online';
        } else {
            dot.className = 'health-dot offline';
        }
    } catch (e) {
        dot.className = 'health-dot offline';
    }
}

// =========================================================================
// UTILITIES: TOASTS & MODALS
// =========================================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}</span>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
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

function formatTimestamp(isoString) {
    if (!isoString) return '--';
    try {
        const d = new Date(isoString);
        return d.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        return isoString;
    }
}

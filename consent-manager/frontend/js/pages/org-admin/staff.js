/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — ORGANIZATION ADMIN: STAFF & STUDENT MANAGEMENT
 * Authorize staff users, manage account lifecycle, reset passwords,
 * and bulk import student onboarding rosters.
 * Strictly scoped to the authenticated organization.
 * ==============================================================================
 */

window.DF_PAGE_OA_STAFF = (function () {
    'use strict';

    let allUsers = [];
    let filteredUsers = [];
    let currentSearch = '';
    let currentRoleFilter = 'ALL';
    let currentStatusFilter = 'ALL';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Authorized Users & Staff Roster...')}
            </div>
        `;

        try {
            allUsers = await window.DF_API.orgAdmin.getUsers();
            if (!Array.isArray(allUsers)) allUsers = [];
            filteredUsers = [...allUsers];

            renderMainView(container);
        } catch (err) {
            console.error('Failed to load org users:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Users & Staff',
                        message: err.message || 'An error occurred while fetching organization users.',
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    function renderMainView(container) {
        const user = window.DF_SESSION.getUser() || {};
        const total = allUsers.length;
        const active = allUsers.filter(u => u.status === 'ACTIVE').length;
        const suspended = allUsers.filter(u => u.status === 'SUSPENDED').length;
        const orgAdmins = allUsers.filter(u => u.role === 'ORG_ADMIN').length;
        const students = allUsers.filter(u => u.role === 'USER').length;

        const html = `
        <!-- Page Header -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-1">Staff & Student Identity Management</h3>
                <p class="text-muted small mb-0">Manage authorized institutional officers, departmental staff, and onboarded student identities.</p>
            </div>
            <div class="d-flex flex-wrap align-items-center gap-2">
                <button type="button" class="btn btn-outline-info rounded-pill px-3 d-inline-flex align-items-center gap-1 shadow-sm" id="btn-open-import-modal">
                    <i class="bi bi-file-earmark-arrow-up-fill"></i>
                    <span>Import Student Roster</span>
                </button>
                <button type="button" class="btn btn-primary rounded-pill px-3 d-inline-flex align-items-center gap-1 shadow-sm" id="btn-open-create-user-modal">
                    <i class="bi bi-person-plus-fill"></i>
                    <span>Authorize Staff User</span>
                </button>
            </div>
        </div>

        <!-- Metric Stat Cards -->
        <div class="row g-3 mb-4">
            <div class="col-sm-6 col-xl-3">
                ${window.DF_UI.renderStatCard({
                    label: 'Total Accounts',
                    value: total,
                    icon: 'bi-people-fill',
                    color: 'blue',
                    trend: null
                })}
            </div>
            <div class="col-sm-6 col-xl-3">
                ${window.DF_UI.renderStatCard({
                    label: 'Active Accounts',
                    value: active,
                    icon: 'bi-check-circle-fill',
                    color: 'emerald',
                    trend: { direction: 'up', text: `${active} Operational` }
                })}
            </div>
            <div class="col-sm-6 col-xl-3">
                ${window.DF_UI.renderStatCard({
                    label: 'Suspended Accounts',
                    value: suspended,
                    icon: 'bi-pause-circle-fill',
                    color: 'rose',
                    trend: suspended > 0 ? { direction: 'down', text: 'Access Disabled' } : null
                })}
            </div>
            <div class="col-sm-6 col-xl-3">
                ${window.DF_UI.renderStatCard({
                    label: 'Admins / Students',
                    value: `${orgAdmins} / ${students}`,
                    icon: 'bi-mortarboard-fill',
                    color: 'indigo',
                    trend: null
                })}
            </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
            <div class="card-body p-3">
                <div class="row g-3 align-items-center">
                    <div class="col-md-5">
                        <div class="input-group">
                            <span class="input-group-text bg-white border-end-0 text-muted">
                                <i class="bi bi-search"></i>
                            </span>
                            <input 
                                type="text" 
                                id="oa-user-search-input" 
                                class="form-control border-start-0 ps-0" 
                                placeholder="Search by name, email, or user ID..."
                                value="${window.DF_UI.escapeHtml(currentSearch)}"
                            />
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-3">
                        <select class="form-select" id="oa-user-role-filter">
                            <option value="ALL" ${currentRoleFilter === 'ALL' ? 'selected' : ''}>All Roles</option>
                            <option value="ORG_ADMIN" ${currentRoleFilter === 'ORG_ADMIN' ? 'selected' : ''}>Organization Admins</option>
                            <option value="USER" ${currentRoleFilter === 'USER' ? 'selected' : ''}>Students / Users</option>
                        </select>
                    </div>
                    <div class="col-sm-6 col-md-3">
                        <select class="form-select" id="oa-user-status-filter">
                            <option value="ALL" ${currentStatusFilter === 'ALL' ? 'selected' : ''}>All Account Statuses</option>
                            <option value="ACTIVE" ${currentStatusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
                            <option value="SUSPENDED" ${currentStatusFilter === 'SUSPENDED' ? 'selected' : ''}>Suspended</option>
                        </select>
                    </div>
                    <div class="col-md-1 text-end">
                        <button type="button" class="btn btn-outline-secondary btn-sm w-100" id="btn-reset-filters" title="Reset Filters">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Users Table Card -->
        <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-shield-person text-primary fs-5"></i>
                    <h6 class="mb-0 fw-bold text-dark">Institutional Roster</h6>
                </div>
                <span class="badge bg-light text-dark border font-monospace small" id="oa-users-count-badge">
                    Showing ${filteredUsers.length} of ${total}
                </span>
            </div>
            <div class="table-responsive">
                <table class="table df-table align-middle mb-0" id="oa-users-table">
                    <thead>
                        <tr>
                            <th>User Name & Email</th>
                            <th>User ID</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th class="text-end pe-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="oa-users-tbody">
                        ${renderTableRows(filteredUsers, user)}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Modals Container -->
        <div id="oa-modals-mount"></div>
        `;

        container.innerHTML = html;
        bindEvents(container);
    }

    function renderTableRows(users, currentUser) {
        if (!users || users.length === 0) {
            return `
            <tr>
                <td colspan="6" class="text-center py-5">
                    ${window.DF_UI.renderEmptyState({
                        title: 'No Matching Users Found',
                        message: 'No institutional users match your active filter criteria. Try adjusting your query or filters.',
                        icon: 'bi-people'
                    })}
                </td>
            </tr>
            `;
        }

        return users.map(u => {
            const isSelf = currentUser && (u.userId === currentUser.userId || u.email === currentUser.email);
            const isSuspended = u.status === 'SUSPENDED';
            const createdStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A';
            const avatarInitials = u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US';
            const roleBadgeClass = u.role === 'ORG_ADMIN' ? 'bg-primary-subtle text-primary border-primary' : 'bg-info-subtle text-info border-info';

            return `
            <tr data-user-id="${window.DF_UI.escapeHtml(u.userId)}">
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <div class="df-user-avatar" style="width: 36px; height: 36px; font-size: 0.85rem; background: ${u.role === 'ORG_ADMIN' ? '#0284C7' : '#64748B'};">
                            ${window.DF_UI.escapeHtml(avatarInitials)}
                        </div>
                        <div>
                            <span class="fw-bold text-dark d-block">${window.DF_UI.escapeHtml(u.name || 'Unnamed User')}</span>
                            <span class="font-monospace text-muted small">${window.DF_UI.escapeHtml(u.email)}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark border font-monospace small">${window.DF_UI.escapeHtml(u.userId)}</span>
                </td>
                <td>
                    <span class="badge ${roleBadgeClass} border rounded-pill px-2 py-1 small">
                        ${window.DF_UI.escapeHtml(u.role)}
                    </span>
                </td>
                <td>
                    ${window.DF_UI.renderStatusBadge(u.status)}
                </td>
                <td class="small text-muted font-monospace">
                    ${window.DF_UI.escapeHtml(createdStr)}
                </td>
                <td class="text-end pe-3">
                    ${isSelf ? `
                        <span class="badge bg-light text-muted border rounded-pill small py-1 px-2" title="Active session officer cannot be modified or suspended">
                            <i class="bi bi-shield-lock-fill me-1"></i> Current User
                        </span>
                    ` : `
                        <div class="d-inline-flex align-items-center gap-1">
                            <button 
                                type="button" 
                                class="btn btn-sm btn-outline-secondary rounded-pill px-2 btn-reset-pw"
                                data-user-id="${window.DF_UI.escapeHtml(u.userId)}"
                                data-user-email="${window.DF_UI.escapeHtml(u.email)}"
                                data-user-name="${window.DF_UI.escapeHtml(u.name)}"
                                title="Force Reset Password"
                            >
                                <i class="bi bi-key"></i>
                            </button>

                            ${isSuspended ? `
                                <button 
                                    type="button" 
                                    class="btn btn-sm btn-outline-success rounded-pill px-2 btn-activate-user"
                                    data-user-id="${window.DF_UI.escapeHtml(u.userId)}"
                                    data-user-name="${window.DF_UI.escapeHtml(u.name)}"
                                    title="Activate User"
                                >
                                    <i class="bi bi-play-circle-fill"></i>
                                </button>
                            ` : `
                                <button 
                                    type="button" 
                                    class="btn btn-sm btn-outline-danger rounded-pill px-2 btn-suspend-user"
                                    data-user-id="${window.DF_UI.escapeHtml(u.userId)}"
                                    data-user-name="${window.DF_UI.escapeHtml(u.name)}"
                                    title="Suspend User"
                                >
                                    <i class="bi bi-pause-circle-fill"></i>
                                </button>
                            `}
                        </div>
                    `}
                </td>
            </tr>
            `;
        }).join('');
    }

    function applyFilters() {
        const query = currentSearch.toLowerCase().trim();
        filteredUsers = allUsers.filter(u => {
            const matchesSearch = !query || 
                (u.name && u.name.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.userId && u.userId.toLowerCase().includes(query));

            const matchesRole = currentRoleFilter === 'ALL' || u.role === currentRoleFilter;
            const matchesStatus = currentStatusFilter === 'ALL' || u.status === currentStatusFilter;

            return matchesSearch && matchesRole && matchesStatus;
        });

        const tbody = document.getElementById('oa-users-tbody');
        const badge = document.getElementById('oa-users-count-badge');
        const user = window.DF_SESSION.getUser() || {};

        if (tbody) tbody.innerHTML = renderTableRows(filteredUsers, user);
        if (badge) badge.textContent = `Showing ${filteredUsers.length} of ${allUsers.length}`;
    }

    function bindEvents(container) {
        // Search input
        const searchInput = document.getElementById('oa-user-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value;
                applyFilters();
            });
        }

        // Role filter
        const roleFilter = document.getElementById('oa-user-role-filter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                currentRoleFilter = e.target.value;
                applyFilters();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('oa-user-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                currentStatusFilter = e.target.value;
                applyFilters();
            });
        }

        // Reset filters button
        const resetBtn = document.getElementById('btn-reset-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                currentSearch = '';
                currentRoleFilter = 'ALL';
                currentStatusFilter = 'ALL';
                if (searchInput) searchInput.value = '';
                if (roleFilter) roleFilter.value = 'ALL';
                if (statusFilter) statusFilter.value = 'ALL';
                applyFilters();
            });
        }

        // Action delegation
        container.addEventListener('click', (e) => {
            // Suspend button
            const suspendBtn = e.target.closest('.btn-suspend-user');
            if (suspendBtn) {
                const userId = suspendBtn.getAttribute('data-user-id');
                const userName = suspendBtn.getAttribute('data-user-name') || userId;
                handleSuspendUser(userId, userName, container);
                return;
            }

            // Activate button
            const activateBtn = e.target.closest('.btn-activate-user');
            if (activateBtn) {
                const userId = activateBtn.getAttribute('data-user-id');
                const userName = activateBtn.getAttribute('data-user-name') || userId;
                handleActivateUser(userId, userName, container);
                return;
            }

            // Reset password button
            const resetPwBtn = e.target.closest('.btn-reset-pw');
            if (resetPwBtn) {
                const userId = resetPwBtn.getAttribute('data-user-id');
                const userEmail = resetPwBtn.getAttribute('data-user-email');
                const userName = resetPwBtn.getAttribute('data-user-name');
                openResetPasswordModal(userId, userEmail, userName, container);
                return;
            }
        });

        // Open create user modal
        const openCreateBtn = document.getElementById('btn-open-create-user-modal');
        if (openCreateBtn) {
            openCreateBtn.addEventListener('click', () => openCreateUserModal(container));
        }

        // Open import student modal
        const openImportBtn = document.getElementById('btn-open-import-modal');
        if (openImportBtn) {
            openImportBtn.addEventListener('click', () => openImportModal(container));
        }
    }

    // ── Suspend User Flow ────────────────────────────────────────────────────
    function handleSuspendUser(userId, userName, container) {
        window.DF_UI.showConfirmDialog({
            title: `Suspend Account: ${userName}?`,
            message: `Suspending this user will immediately revoke their access to institutional systems and prevent authentication until re-activated.`,
            confirmText: 'Suspend Account',
            confirmVariant: 'danger',
            onConfirm: async () => {
                try {
                    await window.DF_API.orgAdmin.suspendUser(userId);
                    window.DF_UI.showToast(`User ${userName} has been suspended.`, 'warning');
                    await render(container);
                } catch (err) {
                    window.DF_UI.showToast(`Failed to suspend user: ${err.message}`, 'error');
                }
            }
        });
    }

    // ── Activate User Flow ───────────────────────────────────────────────────
    function handleActivateUser(userId, userName, container) {
        window.DF_UI.showConfirmDialog({
            title: `Re-activate Account: ${userName}?`,
            message: `This will restore full access and permissions for this user account.`,
            confirmText: 'Activate Account',
            confirmVariant: 'success',
            onConfirm: async () => {
                try {
                    await window.DF_API.orgAdmin.activateUser(userId);
                    window.DF_UI.showToast(`User ${userName} has been activated.`, 'success');
                    await render(container);
                } catch (err) {
                    window.DF_UI.showToast(`Failed to activate user: ${err.message}`, 'error');
                }
            }
        });
    }

    // ── Create User Modal ────────────────────────────────────────────────────
    function openCreateUserModal(container) {
        const mount = document.getElementById('oa-modals-mount');
        if (!mount) return;

        mount.innerHTML = `
        <div class="modal fade" id="modal-oa-create-user" tabindex="-1" aria-labelledby="modalCreateUserTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: var(--df-radius-lg);">
                    <div class="modal-header border-bottom p-3">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-person-plus-fill text-primary fs-5"></i>
                            <h5 class="modal-title fw-bold text-dark" id="modalCreateUserTitle">Authorize New Staff User</h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="oa-create-user-form" novalidate>
                        <div class="modal-body p-4">
                            <div id="oa-create-user-error" class="alert alert-danger d-none py-2 small" role="alert"></div>

                            <div class="mb-3">
                                <label class="form-label text-muted small fw-bold text-uppercase" for="oa-new-user-name">Full Name</label>
                                <input 
                                    type="text" 
                                    id="oa-new-user-name" 
                                    class="form-control" 
                                    placeholder="e.g. Dr. Robert Vance" 
                                    required 
                                    minlength="2" 
                                    maxlength="255"
                                />
                            </div>

                            <div class="mb-3">
                                <label class="form-label text-muted small fw-bold text-uppercase" for="oa-new-user-email">Institutional Email</label>
                                <input 
                                    type="email" 
                                    id="oa-new-user-email" 
                                    class="form-control" 
                                    placeholder="user@college.edu" 
                                    required 
                                />
                                <div class="form-text">Must be a unique valid email address.</div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label text-muted small fw-bold text-uppercase" for="oa-new-user-password">Initial Password</label>
                                <input 
                                    type="password" 
                                    id="oa-new-user-password" 
                                    class="form-control" 
                                    placeholder="Minimum 6 characters" 
                                    required 
                                    minlength="6" 
                                    maxlength="64"
                                />
                                <div class="form-text">Must be at least 6 characters long. Encoded with BCrypt upon receipt.</div>
                            </div>

                            <div class="p-3 bg-light rounded border text-muted small">
                                <i class="bi bi-info-circle me-1 text-primary"></i>
                                New staff users are provisioned with status <code>ACTIVE</code> and bound to your institution.
                            </div>
                        </div>
                        <div class="modal-footer border-top p-3 bg-light">
                            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary rounded-pill px-4" id="oa-btn-submit-create-user">
                                <i class="bi bi-check-lg me-1"></i> Authorize User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;

        const modalEl = document.getElementById('modal-oa-create-user');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const form = document.getElementById('oa-create-user-form');
        const errorAlert = document.getElementById('oa-create-user-error');
        const submitBtn = document.getElementById('oa-btn-submit-create-user');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorAlert.classList.add('d-none');
            errorAlert.textContent = '';

            const name = document.getElementById('oa-new-user-name').value.trim();
            const email = document.getElementById('oa-new-user-email').value.trim();
            const password = document.getElementById('oa-new-user-password').value;

            if (!name || name.length < 2) {
                errorAlert.textContent = 'Name must be at least 2 characters long.';
                errorAlert.classList.remove('d-none');
                return;
            }
            if (!email || !email.includes('@')) {
                errorAlert.textContent = 'Please enter a valid institutional email address.';
                errorAlert.classList.remove('d-none');
                return;
            }
            if (!password || password.length < 6) {
                errorAlert.textContent = 'Password must be at least 6 characters long.';
                errorAlert.classList.remove('d-none');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Authorizing...';

            try {
                await window.DF_API.orgAdmin.createUser({ name, email, password });
                
                // Clear password input immediately for security
                document.getElementById('oa-new-user-password').value = '';
                
                modal.hide();
                window.DF_UI.showToast(`User ${name} provisioned successfully!`, 'success');
                await render(container);
            } catch (err) {
                errorAlert.textContent = err.message || 'Failed to create user.';
                errorAlert.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Authorize User';
            }
        });
    }

    // ── Force Reset Password Modal ───────────────────────────────────────────
    function openResetPasswordModal(userId, userEmail, userName, container) {
        const mount = document.getElementById('oa-modals-mount');
        if (!mount) return;

        mount.innerHTML = `
        <div class="modal fade" id="modal-oa-reset-pw" tabindex="-1" aria-labelledby="modalResetPwTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg" style="border-radius: var(--df-radius-lg);">
                    <div class="modal-header border-bottom p-3">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-key-fill text-warning fs-5"></i>
                            <h5 class="modal-title fw-bold text-dark" id="modalResetPwTitle">Force Password Reset</h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="oa-reset-pw-form" novalidate>
                        <div class="modal-body p-4">
                            <div id="oa-reset-pw-error" class="alert alert-danger d-none py-2 small" role="alert"></div>

                            <div class="p-3 bg-light rounded border mb-3">
                                <div class="small text-muted text-uppercase fw-bold mb-1">Target Account</div>
                                <div class="fw-bold text-dark">${window.DF_UI.escapeHtml(userName || 'User')}</div>
                                <div class="font-monospace text-secondary small">${window.DF_UI.escapeHtml(userEmail)} (${window.DF_UI.escapeHtml(userId)})</div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label text-muted small fw-bold text-uppercase" for="oa-reset-new-password">New Password</label>
                                <input 
                                    type="password" 
                                    id="oa-reset-new-password" 
                                    class="form-control" 
                                    placeholder="Minimum 6 characters" 
                                    required 
                                    minlength="6" 
                                    maxlength="64"
                                />
                                <div class="form-text">Must be at least 6 characters long.</div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label text-muted small fw-bold text-uppercase" for="oa-reset-confirm-password">Confirm New Password</label>
                                <input 
                                    type="password" 
                                    id="oa-reset-confirm-password" 
                                    class="form-control" 
                                    placeholder="Re-enter password" 
                                    required 
                                    minlength="6" 
                                    maxlength="64"
                                />
                            </div>
                        </div>
                        <div class="modal-footer border-top p-3 bg-light">
                            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-warning rounded-pill px-4 text-dark" id="oa-btn-submit-reset-pw">
                                <i class="bi bi-check-lg me-1"></i> Update Password
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;

        const modalEl = document.getElementById('modal-oa-reset-pw');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const form = document.getElementById('oa-reset-pw-form');
        const errorAlert = document.getElementById('oa-reset-pw-error');
        const submitBtn = document.getElementById('oa-btn-submit-reset-pw');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorAlert.classList.add('d-none');
            errorAlert.textContent = '';

            const newPw = document.getElementById('oa-reset-new-password').value;
            const confirmPw = document.getElementById('oa-reset-confirm-password').value;

            if (!newPw || newPw.length < 6) {
                errorAlert.textContent = 'Password must be at least 6 characters long.';
                errorAlert.classList.remove('d-none');
                return;
            }
            if (newPw !== confirmPw) {
                errorAlert.textContent = 'Passwords do not match. Please verify.';
                errorAlert.classList.remove('d-none');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

            try {
                await window.DF_API.orgAdmin.resetPassword(userId, newPw);
                
                // Clear password fields immediately
                document.getElementById('oa-reset-new-password').value = '';
                document.getElementById('oa-reset-confirm-password').value = '';

                modal.hide();
                window.DF_UI.showToast(`Password updated successfully for ${userName || userEmail}`, 'success');
            } catch (err) {
                errorAlert.textContent = err.message || 'Failed to reset password.';
                errorAlert.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Update Password';
            }
        });
    }

    // ── Bulk Student Onboarding Modal ────────────────────────────────────────
    function openImportModal(container) {
        const mount = document.getElementById('oa-modals-mount');
        if (!mount) return;

        mount.innerHTML = `
        <div class="modal fade" id="modal-oa-import-students" tabindex="-1" aria-labelledby="modalImportTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg" style="border-radius: var(--df-radius-lg);">
                    <div class="modal-header border-bottom p-3">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-file-earmark-arrow-up-fill text-info fs-5"></i>
                            <h5 class="modal-title fw-bold text-dark" id="modalImportTitle">Import Student Onboarding Roster</h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="oa-import-form" novalidate>
                        <div class="modal-body p-4">
                            <div id="oa-import-error" class="alert alert-danger d-none py-2 small" role="alert"></div>
                            <div id="oa-import-success" class="alert alert-success d-none py-3" role="alert"></div>

                            <p class="text-secondary small mb-3">
                                Onboard eligible students into Consent Manager. Students can be provided as a JSON array or comma-separated lines (<code>StudentID, Email, Full Name</code>).
                            </p>

                            <div class="mb-3">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <label class="form-label text-muted small fw-bold text-uppercase mb-0" for="oa-import-textarea">Student Data Payload</label>
                                    <button type="button" class="btn btn-sm btn-link text-decoration-none p-0" id="btn-load-sample-import">
                                        <i class="bi bi-code-square me-1"></i> Load Sample Roster
                                    </button>
                                </div>
                                <textarea 
                                    id="oa-import-textarea" 
                                    class="form-control font-monospace small" 
                                    rows="9" 
                                    placeholder='[&#10;  {"studentId": "STU-2026-001", "email": "student1@college.edu", "name": "John Doe"}&#10;]'
                                    required
                                ></textarea>
                                <div class="form-text">Supported formats: JSON array of objects with <code>studentId</code> and <code>email</code>.</div>
                            </div>
                        </div>
                        <div class="modal-footer border-top p-3 bg-light">
                            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                            <button type="submit" class="btn btn-info text-white rounded-pill px-4" id="oa-btn-submit-import">
                                <i class="bi bi-upload me-1"></i> Process Onboarding Import
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        `;

        const modalEl = document.getElementById('modal-oa-import-students');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const form = document.getElementById('oa-import-form');
        const textarea = document.getElementById('oa-import-textarea');
        const sampleBtn = document.getElementById('btn-load-sample-import');
        const errorAlert = document.getElementById('oa-import-error');
        const successAlert = document.getElementById('oa-import-success');
        const submitBtn = document.getElementById('oa-btn-submit-import');

        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => {
                textarea.value = JSON.stringify([
                    { studentId: "STU-2026-010", email: "stu10@college.edu", name: "David Miller" },
                    { studentId: "STU-2026-011", email: "stu11@college.edu", name: "Elena Rostova" }
                ], null, 2);
            });
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorAlert.classList.add('d-none');
            successAlert.classList.add('d-none');

            const raw = textarea.value.trim();
            if (!raw) {
                errorAlert.textContent = 'Please paste student data before submitting.';
                errorAlert.classList.remove('d-none');
                return;
            }

            let students = [];
            try {
                if (raw.startsWith('[') || raw.startsWith('{')) {
                    const parsed = JSON.parse(raw);
                    students = Array.isArray(parsed) ? parsed : (parsed.students || parsed.items || [parsed]);
                } else {
                    // Parse CSV lines
                    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                    students = lines.map(line => {
                        const parts = line.split(',').map(p => p.trim());
                        return {
                            studentId: parts[0] || '',
                            email: parts[1] || '',
                            name: parts[2] || parts[0]
                        };
                    });
                }
            } catch (parseErr) {
                errorAlert.textContent = 'Invalid format. Please supply a valid JSON array or CSV lines: ' + parseErr.message;
                errorAlert.classList.remove('d-none');
                return;
            }

            if (!students || students.length === 0) {
                errorAlert.textContent = 'No valid student records detected in payload.';
                errorAlert.classList.remove('d-none');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing Import...';

            try {
                const response = await window.DF_API.orgAdmin.importStudents({ students });
                
                successAlert.innerHTML = `
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <i class="bi bi-check-circle-fill text-success fs-5"></i>
                        <strong class="text-dark">Onboarding Import Completed!</strong>
                    </div>
                    <div class="small">
                        <div>Total Processed: <strong>${response.total || students.length}</strong></div>
                        <div>New Invitations: <strong class="text-success">${response.newInvitations || 0}</strong></div>
                        <div>Already Active: <strong class="text-primary">${response.alreadyActive || 0}</strong></div>
                        <div>Already Pending: <strong class="text-warning">${response.alreadyPending || 0}</strong></div>
                        ${response.failed > 0 ? `<div>Failed: <strong class="text-danger">${response.failed}</strong></div>` : ''}
                    </div>
                `;
                successAlert.classList.remove('d-none');
                window.DF_UI.showToast('Student onboarding roster processed successfully!', 'success');
                await render(container);
            } catch (err) {
                errorAlert.textContent = err.message || 'Failed to import student roster.';
                errorAlert.classList.remove('d-none');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-upload me-1"></i> Process Onboarding Import';
            }
        });
    }

    return {
        render: render
    };
})();


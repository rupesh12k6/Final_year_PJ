/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — SUPER ADMIN: ADMINISTRATOR MANAGEMENT MODULE
 * Central authority officer management, role assignment, and lifecycle controls.
 * ==============================================================================
 */

window.DF_PAGE_SA_ADMINS = (function () {
    'use strict';

    let allAdmins = [];
    let filterSearch = '';

    async function loadData() {
        allAdmins = await window.DF_API.superAdmin.getAdmins();
        return allAdmins;
    }

    function getFilteredAdmins() {
        return allAdmins.filter(adm => {
            if (!filterSearch) return true;
            const term = filterSearch.toLowerCase();
            return (adm.name && adm.name.toLowerCase().includes(term)) ||
                   (adm.email && adm.email.toLowerCase().includes(term)) ||
                   (adm.userId && adm.userId.toLowerCase().includes(term));
        });
    }

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading System Administrators...')}
            </div>
        `;

        try {
            await loadData();
            renderView(container);

            if (window.location.hash.includes('action=create')) {
                openCreateModal(container);
            }
        } catch (err) {
            console.error('[SA_ADMINS] Failed to load admins:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Administrators',
                        message: err.message || 'Error communicating with Consent Manager authority.'
                    })}
                    <div class="text-center mt-3">
                        <button class="btn btn-primary rounded-pill px-4" onclick="window.DF_PAGE_SA_ADMINS.render(document.getElementById('df-main-view'))">
                            <i class="bi bi-arrow-clockwise me-1"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    function renderView(container) {
        const filtered = getFilteredAdmins();
        const currentSession = window.DF_SESSION.getUser() || {};
        const currentUserId = currentSession.userId || '';

        const tableColumns = [
            {
                key: 'userId',
                label: 'Admin ID',
                width: '180px',
                render: (val, row) => `
                    <div>
                        <span class="badge bg-secondary-subtle text-dark font-monospace">${window.DF_UI.escapeHtml(val || '—')}</span>
                        ${val === currentUserId ? '<span class="badge bg-success ms-1 small">You</span>' : ''}
                    </div>
                `
            },
            {
                key: 'name',
                label: 'Officer Name',
                render: (val, row) => `
                    <div>
                        <div class="fw-bold text-dark">${window.DF_UI.escapeHtml(val || '—')}</div>
                        <div class="text-muted small"><i class="bi bi-envelope me-1"></i>${window.DF_UI.escapeHtml(row.email || '—')}</div>
                    </div>
                `
            },
            {
                key: 'role',
                label: 'Assigned Role',
                width: '160px',
                render: (val) => {
                    const r = String(val || '').toUpperCase();
                    if (r === 'SUPER_ADMIN') {
                        return '<span class="df-badge df-badge-indigo"><i class="bi bi-shield-lock-fill"></i><span>Super Admin</span></span>';
                    }
                    return '<span class="df-badge df-badge-blue"><i class="bi bi-person-gear"></i><span>Admin</span></span>';
                }
            },
            {
                key: 'status',
                label: 'Account Status',
                width: '140px',
                render: (val) => window.DF_UI.renderStatusBadge(val || 'ACTIVE')
            },
            {
                key: 'createdAt',
                label: 'Granted On',
                width: '160px',
                render: (val) => {
                    if (!val) return '—';
                    try {
                        return `<span class="small text-muted">${new Date(val).toLocaleDateString()}</span>`;
                    } catch (e) {
                        return String(val);
                    }
                }
            },
            {
                key: 'actions',
                label: 'Status Action',
                width: '140px',
                render: (_, row) => {
                    // Prevent self-lockout
                    if (row.userId === currentUserId || row.email === currentSession.email) {
                        return '<span class="text-muted small fst-italic">Current Session</span>';
                    }

                    const isSuspended = row.status === 'SUSPENDED';
                    if (isSuspended) {
                        return `
                            <button class="btn btn-sm btn-outline-success rounded-pill px-3 py-0" onclick="window.DF_PAGE_SA_ADMINS.handleActivate('${row.userId}', '${window.DF_UI.escapeHtml(row.name)}')">
                                <i class="bi bi-check-circle me-1"></i>Activate
                            </button>
                        `;
                    } else {
                        return `
                            <button class="btn btn-sm btn-outline-danger rounded-pill px-3 py-0" onclick="window.DF_PAGE_SA_ADMINS.handleSuspend('${row.userId}', '${window.DF_UI.escapeHtml(row.name)}')">
                                <i class="bi bi-pause-circle me-1"></i>Suspend
                            </button>
                        `;
                    }
                }
            }
        ];

        const dataTableHtml = window.DF_UI.renderDataTable({
            id: 'sa-admins-table',
            columns: tableColumns,
            data: filtered,
            emptyMsg: filterSearch ? 'No administrators match your search query.' : 'No system administrators registered.'
        });

        container.innerHTML = `
            <!-- Page Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h2 class="fw-bold text-dark fs-4 mb-1">Central Authority Officers</h2>
                    <p class="text-muted small mb-0">
                        Authorized Super Admins and System Administrators with cryptographic governance privileges.
                    </p>
                </div>
                <div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" id="btn-open-create-admin">
                        <i class="bi bi-person-plus-fill me-1"></i> Create Administrator
                    </button>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="card df-card border-0 mb-4 shadow-sm" style="border-radius: var(--df-radius-md);">
                <div class="card-body p-3">
                    <div class="row g-2 align-items-center">
                        <div class="col-md-9">
                            <div class="input-group">
                                <span class="input-group-text bg-white border-end-0 text-muted">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input 
                                    type="text" 
                                    class="form-control border-start-0" 
                                    id="sa-admin-search-input" 
                                    placeholder="Search by officer name, email, or Admin ID..."
                                    value="${window.DF_UI.escapeHtml(filterSearch)}"
                                />
                            </div>
                        </div>
                        <div class="col-md-3 text-end">
                            <button class="btn btn-outline-secondary w-100" id="sa-admin-refresh-btn">
                                <i class="bi bi-arrow-clockwise me-1"></i> Refresh Officers
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Admins Table Container -->
            <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                    <div class="fw-bold text-dark">
                        System Administrators
                        <span class="badge bg-secondary-subtle text-secondary rounded-pill ms-2 font-monospace">${filtered.length} total</span>
                    </div>
                    <div class="small text-muted">
                        Authority Level: <strong>ROOT FIDUCIARY</strong>
                    </div>
                </div>
                <div class="card-body p-0">
                    ${dataTableHtml}
                </div>
            </div>
        `;

        bindEvents(container);
    }

    function bindEvents(container) {
        const searchInput = container.querySelector('#sa-admin-search-input');
        const refreshBtn = container.querySelector('#sa-admin-refresh-btn');
        const createBtn = container.querySelector('#btn-open-create-admin');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterSearch = e.target.value.trim();
                renderView(container);
            });
        }

        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Refreshing...';
                await loadData();
                renderView(container);
                if (window.DF_UI && window.DF_UI.showToast) {
                    window.DF_UI.showToast('Administrator registry refreshed.', 'info');
                }
            });
        }

        if (createBtn) {
            createBtn.addEventListener('click', () => openCreateModal(container));
        }
    }

    function openCreateModal(container) {
        const contentHtml = `
            <form id="sa-create-admin-form" novalidate>
                <div class="row g-3">
                    <div class="col-md-12">
                        <label class="form-label fw-semibold small text-muted">Officer Full Name *</label>
                        <input type="text" class="form-control" id="adm-create-name" placeholder="e.g. Fiduciary Officer John" required>
                    </div>
                    <div class="col-md-12">
                        <label class="form-label fw-semibold small text-muted">Official Regulatory Email *</label>
                        <input type="email" class="form-control" id="adm-create-email" placeholder="e.g. officer@depa.cm" required>
                    </div>
                    <div class="col-md-12">
                        <label class="form-label fw-semibold small text-muted">Account Password *</label>
                        <input type="password" class="form-control" id="adm-create-password" placeholder="Minimum 6 characters" required>
                        <div class="form-text small" style="font-size:0.75rem;">Must be at least 6 characters long with strong entropy.</div>
                    </div>
                </div>
            </form>
        `;

        const footerHtml = `
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary rounded-pill px-4" id="btn-submit-create-admin">
                <i class="bi bi-person-check me-1"></i> Create Administrator
            </button>
        `;

        const modal = window.DF_UI.showModal({
            id: 'modal-create-admin',
            title: 'Create Regulatory System Administrator',
            contentHtml: contentHtml,
            footerHtml: footerHtml,
            size: 'md'
        });

        const submitBtn = document.getElementById('btn-submit-create-admin');
        if (submitBtn) {
            submitBtn.onclick = async () => {
                const name = document.getElementById('adm-create-name').value.trim();
                const email = document.getElementById('adm-create-email').value.trim();
                const password = document.getElementById('adm-create-password').value;

                if (!name || !email || !password) {
                    window.DF_UI.showToast('Name, Email, and Password are all required.', 'warning');
                    return;
                }

                if (password.length < 6) {
                    window.DF_UI.showToast('Password must be at least 6 characters long.', 'warning');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';

                try {
                    const res = await window.DF_API.superAdmin.createAdmin({
                        name,
                        email,
                        password
                    });

                    window.DF_UI.showToast(`Administrator ${res.name || res.email} created successfully.`, 'success');
                    
                    // Securely clear sensitive input
                    const pwInput = document.getElementById('adm-create-password');
                    if (pwInput) pwInput.value = '';

                    modal.hide();
                    await loadData();
                    renderView(container);
                } catch (err) {
                    window.DF_UI.showToast(err.message || 'Failed to create administrator.', 'error');
                } finally {
                    const pwInput = document.getElementById('adm-create-password');
                    if (pwInput) pwInput.value = '';
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-person-check me-1"></i> Create Administrator';
                }
            };
        }
    }

    function handleSuspend(adminId, adminName) {
        window.DF_UI.showConfirmDialog({
            title: 'Suspend Administrator?',
            message: `Are you sure you want to suspend administrator "${adminName}"? They will lose access to all central regulatory endpoints immediately.`,
            confirmText: 'Suspend Account',
            confirmVariant: 'danger',
            onConfirm: async () => {
                await window.DF_API.superAdmin.suspendAdmin(adminId);
                window.DF_UI.showToast(`Administrator ${adminName} suspended.`, 'warning');
                const container = document.getElementById('df-main-view');
                await loadData();
                renderView(container);
            }
        });
    }

    function handleActivate(adminId, adminName) {
        window.DF_UI.showConfirmDialog({
            title: 'Activate Administrator?',
            message: `Are you sure you want to activate administrator "${adminName}"? Central authority privileges will be restored.`,
            confirmText: 'Activate Account',
            confirmVariant: 'primary',
            onConfirm: async () => {
                await window.DF_API.superAdmin.activateAdmin(adminId);
                window.DF_UI.showToast(`Administrator ${adminName} activated successfully.`, 'success');
                const container = document.getElementById('df-main-view');
                await loadData();
                renderView(container);
            }
        });
    }

    return {
        render,
        handleSuspend,
        handleActivate
    };
})();


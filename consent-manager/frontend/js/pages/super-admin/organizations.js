/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — SUPER ADMIN: ORGANIZATION MANAGEMENT MODULE
 * Institution registry, registration modal, detail inspection, and status control.
 * ==============================================================================
 */

window.DF_PAGE_SA_ORGANIZATIONS = (function () {
    'use strict';

    let allOrganizations = [];
    let filterSearch = '';
    let filterStatus = 'ALL';

    async function loadData() {
        allOrganizations = await window.DF_API.admin.getOrganizations();
        return allOrganizations;
    }

    function getFilteredOrganizations() {
        return allOrganizations.filter(org => {
            const matchesSearch = !filterSearch || 
                (org.name && org.name.toLowerCase().includes(filterSearch.toLowerCase())) ||
                (org.organizationCode && org.organizationCode.toLowerCase().includes(filterSearch.toLowerCase())) ||
                (org.email && org.email.toLowerCase().includes(filterSearch.toLowerCase())) ||
                (org.organizationId && org.organizationId.toLowerCase().includes(filterSearch.toLowerCase()));

            const matchesStatus = filterStatus === 'ALL' || org.status === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Institutional Participants Registry...')}
            </div>
        `;

        try {
            await loadData();
            renderView(container);

            // Handle URL action trigger (e.g. #/organizations?action=register)
            if (window.location.hash.includes('action=register')) {
                openRegisterModal(container);
            }
        } catch (err) {
            console.error('[SA_ORGANIZATIONS] Failed to load organizations:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Institutional Registry',
                        message: err.message || 'Error communicating with Consent Manager authority.'
                    })}
                    <div class="text-center mt-3">
                        <button class="btn btn-primary rounded-pill px-4" onclick="window.DF_PAGE_SA_ORGANIZATIONS.render(document.getElementById('df-main-view'))">
                            <i class="bi bi-arrow-clockwise me-1"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    function renderView(container) {
        const filtered = getFilteredOrganizations();

        const tableColumns = [
            {
                key: 'organizationCode',
                label: 'Code / ID',
                width: '180px',
                render: (val, row) => `
                    <div>
                        <span class="badge bg-primary-subtle text-primary fw-bold font-monospace">${window.DF_UI.escapeHtml ? window.DF_UI.escapeHtml(val || '—') : val}</span>
                        <div class="text-muted small mt-1 font-monospace" style="font-size: 0.72rem;">${row.organizationId || ''}</div>
                    </div>
                `
            },
            {
                key: 'name',
                label: 'Institution Name',
                render: (val, row) => `
                    <div>
                        <div class="fw-bold text-dark">${window.DF_UI.escapeHtml ? window.DF_UI.escapeHtml(val || '—') : val}</div>
                        <div class="text-muted small"><i class="bi bi-envelope me-1"></i>${row.email || '—'}</div>
                    </div>
                `
            },
            {
                key: 'dataBaseUrl',
                label: 'Endpoints & Services',
                render: (val, row) => `
                    <div class="small">
                        <div class="text-truncate" style="max-width: 240px;" title="${val || ''}">
                            <span class="text-muted">Data:</span> <code class="text-secondary">${val || '—'}</code>
                        </div>
                        <div class="text-truncate text-muted" style="max-width: 240px; font-size: 0.75rem;" title="${row.loginEndpoint || ''}">
                            Login: ${row.loginEndpoint || '—'}
                        </div>
                    </div>
                `
            },
            {
                key: 'status',
                label: 'Status',
                width: '140px',
                render: (val) => window.DF_UI.renderStatusBadge(val || 'PENDING')
            },
            {
                key: 'createdAt',
                label: 'Registered On',
                width: '140px',
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
                label: 'Actions',
                width: '180px',
                render: (_, row) => {
                    const isSuspended = row.status === 'SUSPENDED';
                    const toggleBtn = isSuspended
                        ? `<button class="btn btn-sm btn-outline-success rounded-pill px-2 py-0" onclick="window.DF_PAGE_SA_ORGANIZATIONS.handleActivate('${row.organizationId}', '${window.DF_UI.escapeHtml(row.name)}')">
                               <i class="bi bi-check-circle me-1"></i>Activate
                           </button>`
                        : `<button class="btn btn-sm btn-outline-danger rounded-pill px-2 py-0" onclick="window.DF_PAGE_SA_ORGANIZATIONS.handleSuspend('${row.organizationId}', '${window.DF_UI.escapeHtml(row.name)}')">
                               <i class="bi bi-pause-circle me-1"></i>Suspend
                           </button>`;

                    return `
                        <div class="d-flex align-items-center gap-1">
                            <button class="btn btn-sm btn-outline-primary rounded-pill px-2 py-0" onclick="window.DF_PAGE_SA_ORGANIZATIONS.handleInspect('${row.organizationId}')">
                                <i class="bi bi-eye me-1"></i>Details
                            </button>
                            ${toggleBtn}
                        </div>
                    `;
                }
            }
        ];

        const dataTableHtml = window.DF_UI.renderDataTable({
            id: 'sa-organizations-table',
            columns: tableColumns,
            data: filtered,
            emptyMsg: filterSearch || filterStatus !== 'ALL' 
                ? 'No institutions match the active search filters.' 
                : 'No institutional participants registered yet.'
        });

        container.innerHTML = `
            <!-- Page Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h2 class="fw-bold text-dark fs-4 mb-1">Institutional Participant Registry</h2>
                    <p class="text-muted small mb-0">
                        Manage accredited universities, colleges, and evaluating institutions enrolled in the India DEPA Network.
                    </p>
                </div>
                <div>
                    <button class="btn btn-primary rounded-pill px-4 shadow-sm" id="btn-open-register-org">
                        <i class="bi bi-building-add me-1"></i> Register New Institution
                    </button>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="card df-card border-0 mb-4 shadow-sm" style="border-radius: var(--df-radius-md);">
                <div class="card-body p-3">
                    <div class="row g-2 align-items-center">
                        <div class="col-md-7">
                            <div class="input-group">
                                <span class="input-group-text bg-white border-end-0 text-muted">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input 
                                    type="text" 
                                    class="form-control border-start-0" 
                                    id="sa-org-search-input" 
                                    placeholder="Search by institution name, code, ID or email..."
                                    value="${window.DF_UI.escapeHtml(filterSearch)}"
                                />
                            </div>
                        </div>
                        <div class="col-md-3">
                            <select class="form-select" id="sa-org-status-select">
                                <option value="ALL" ${filterStatus === 'ALL' ? 'selected' : ''}>All Statuses (${allOrganizations.length})</option>
                                <option value="ACTIVE" ${filterStatus === 'ACTIVE' ? 'selected' : ''}>Active Nodes</option>
                                <option value="PENDING_ACTIVATION" ${filterStatus === 'PENDING_ACTIVATION' ? 'selected' : ''}>Pending Activation</option>
                                <option value="SUSPENDED" ${filterStatus === 'SUSPENDED' ? 'selected' : ''}>Suspended Nodes</option>
                            </select>
                        </div>
                        <div class="col-md-2 text-end">
                            <button class="btn btn-outline-secondary w-100" id="sa-org-refresh-btn">
                                <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Registry Table Container -->
            <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                    <div class="fw-bold text-dark">
                        Registered Institutions
                        <span class="badge bg-secondary-subtle text-secondary rounded-pill ms-2 font-monospace">${filtered.length} found</span>
                    </div>
                    <div class="small text-muted">
                        Total enrolled nodes: <strong>${allOrganizations.length}</strong>
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
        const searchInput = container.querySelector('#sa-org-search-input');
        const statusSelect = container.querySelector('#sa-org-status-select');
        const refreshBtn = container.querySelector('#sa-org-refresh-btn');
        const registerBtn = container.querySelector('#btn-open-register-org');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterSearch = e.target.value.trim();
                renderView(container);
            });
        }

        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                filterStatus = e.target.value;
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
                    window.DF_UI.showToast('Institutional registry refreshed.', 'info');
                }
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', () => openRegisterModal(container));
        }
    }

    function openRegisterModal(container) {
        const contentHtml = `
            <form id="sa-register-org-form" novalidate>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label fw-semibold small text-muted">Organization Code *</label>
                        <input type="text" class="form-control font-monospace text-uppercase" id="org-reg-code" placeholder="e.g. COLLEGE_C" required>
                        <div class="form-text small" style="font-size:0.75rem;">Uppercase letters, digits, and underscores only.</div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold small text-muted">Official Institution Name *</label>
                        <input type="text" class="form-control" id="org-reg-name" placeholder="e.g. National Institute of Technology" required>
                    </div>
                    <div class="col-md-12">
                        <label class="form-label fw-semibold small text-muted">Institutional Contact Email *</label>
                        <input type="email" class="form-control" id="org-reg-email" placeholder="e.g. contact@collegec.edu" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold small text-muted">Data Base URL</label>
                        <input type="url" class="form-control" id="org-reg-data-url" placeholder="http://localhost:8083">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label fw-semibold small text-muted">Login Endpoint</label>
                        <input type="url" class="form-control" id="org-reg-login-url" placeholder="http://localhost:3004">
                    </div>
                    <div class="col-md-12">
                        <label class="form-label fw-semibold small text-muted">Onboarding Endpoint</label>
                        <input type="url" class="form-control" id="org-reg-onboarding-url" placeholder="http://localhost:3004/onboarding">
                    </div>

                    <div class="col-md-12">
                        <hr class="my-2">
                        <h6 class="fw-bold text-dark small mb-2"><i class="bi bi-person-badge me-1"></i>Initial Organization Admin (Optional)</h6>
                    </div>
                    <div class="col-md-4">
                        <label class="form-label fw-semibold small text-muted">Admin Full Name</label>
                        <input type="text" class="form-control" id="org-reg-admin-name" placeholder="Dr. Administrator">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label fw-semibold small text-muted">Admin Email</label>
                        <input type="email" class="form-control" id="org-reg-admin-email" placeholder="admin@collegec.edu">
                    </div>
                    <div class="col-md-4">
                        <label class="form-label fw-semibold small text-muted">Initial Password</label>
                        <input type="password" class="form-control" id="org-reg-admin-pw" placeholder="Minimum 6 characters">
                    </div>

                    <div class="col-md-12">
                        <label class="form-label fw-semibold small text-muted">Public Key (Optional PEM)</label>
                        <textarea class="form-control font-monospace small" id="org-reg-pubkey" rows="2" placeholder="-----BEGIN PUBLIC KEY----- ..."></textarea>
                    </div>
                </div>
            </form>
        `;

        const footerHtml = `
            <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary rounded-pill px-4" id="btn-submit-register-org">
                <i class="bi bi-check-lg me-1"></i> Register Institution
            </button>
        `;

        const modal = window.DF_UI.showModal({
            id: 'modal-register-org',
            title: 'Register Institutional Participant',
            contentHtml: contentHtml,
            footerHtml: footerHtml,
            size: 'lg'
        });

        const submitBtn = document.getElementById('btn-submit-register-org');
        if (submitBtn) {
            submitBtn.onclick = async () => {
                const code = document.getElementById('org-reg-code').value.trim().toUpperCase();
                const name = document.getElementById('org-reg-name').value.trim();
                const email = document.getElementById('org-reg-email').value.trim();
                const dataBaseUrl = document.getElementById('org-reg-data-url').value.trim() || null;
                const loginEndpoint = document.getElementById('org-reg-login-url').value.trim() || null;
                const onboardingEndpoint = document.getElementById('org-reg-onboarding-url').value.trim() || null;
                const publicKey = document.getElementById('org-reg-pubkey').value.trim() || null;

                const adminName = document.getElementById('org-reg-admin-name').value.trim() || null;
                const adminEmail = document.getElementById('org-reg-admin-email').value.trim() || null;
                const adminPassword = document.getElementById('org-reg-admin-pw').value || null;

                if (!code || !name || !email) {
                    window.DF_UI.showToast('Please fill all required fields: Code, Name, and Email.', 'warning');
                    return;
                }

                const codeRegex = /^[A-Z0-9_]+$/;
                if (!codeRegex.test(code)) {
                    window.DF_UI.showToast('Organization code must contain only uppercase letters, numbers, and underscores.', 'warning');
                    return;
                }

                if (adminPassword && adminPassword.length < 6) {
                    window.DF_UI.showToast('Initial Admin password must be at least 6 characters long.', 'warning');
                    return;
                }

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Registering...';

                try {
                    const payload = {
                        organizationCode: code,
                        name: name,
                        email: email,
                        dataBaseUrl: dataBaseUrl,
                        loginEndpoint: loginEndpoint,
                        onboardingEndpoint: onboardingEndpoint,
                        publicKey: publicKey
                    };

                    if (adminName && adminEmail && adminPassword) {
                        payload.adminName = adminName;
                        payload.adminEmail = adminEmail;
                        payload.adminPassword = adminPassword;
                    }

                    const res = await window.DF_API.admin.createOrganization(payload);
                    window.DF_UI.showToast(`Institution ${res.name || code} registered successfully!`, 'success');
                    
                    // Securely clear credential inputs
                    const pwInput = document.getElementById('org-reg-admin-pw');
                    if (pwInput) pwInput.value = '';

                    modal.hide();
                    await loadData();
                    renderView(container);
                } catch (err) {
                    window.DF_UI.showToast(err.message || 'Failed to register institution.', 'error');
                } finally {
                    const pwInput = document.getElementById('org-reg-admin-pw');
                    if (pwInput) pwInput.value = '';
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Register Institution';
                }
            };
        }
    }

    function handleInspect(orgId) {
        const org = allOrganizations.find(o => o.organizationId === orgId);
        if (!org) return;

        const contentHtml = `
            <div class="p-2">
                <div class="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
                    <div>
                        <h4 class="fw-bold mb-1">${window.DF_UI.escapeHtml(org.name)}</h4>
                        <span class="badge bg-primary-subtle text-primary font-monospace">${window.DF_UI.escapeHtml(org.organizationCode)}</span>
                        <span class="text-muted small ms-2 font-monospace">ID: ${window.DF_UI.escapeHtml(org.organizationId)}</span>
                    </div>
                    <div>
                        ${window.DF_UI.renderStatusBadge(org.status)}
                    </div>
                </div>

                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Official Contact Email</label>
                        <p class="fw-medium text-dark">${window.DF_UI.escapeHtml(org.email || '—')}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Data Base URL</label>
                        <p class="fw-medium font-monospace text-dark text-truncate">${window.DF_UI.escapeHtml(org.dataBaseUrl || '—')}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Login Endpoint</label>
                        <p class="fw-medium font-monospace text-dark text-truncate">${window.DF_UI.escapeHtml(org.loginEndpoint || '—')}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Onboarding Endpoint</label>
                        <p class="fw-medium font-monospace text-dark text-truncate">${window.DF_UI.escapeHtml(org.onboardingEndpoint || '—')}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Registration Date</label>
                        <p class="text-muted small">${org.createdAt ? new Date(org.createdAt).toLocaleString() : '—'}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Last Updated</label>
                        <p class="text-muted small">${org.updatedAt ? new Date(org.updatedAt).toLocaleString() : '—'}</p>
                    </div>
                    <div class="col-md-12">
                        <label class="text-muted small fw-semibold">Registered Public Key</label>
                        <div class="p-2 bg-light rounded border font-monospace small" style="max-height: 120px; overflow-y: auto;">
                            ${org.publicKey ? window.DF_UI.escapeHtml(org.publicKey) : '<span class="text-muted fst-italic">No RSA Public Key registered for this node.</span>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        window.DF_UI.showModal({
            id: 'modal-inspect-org',
            title: `Institution Details: ${org.organizationCode}`,
            contentHtml: contentHtml,
            size: 'lg'
        });
    }

    function handleActivate(orgId, orgName) {
        window.DF_UI.showConfirmDialog({
            title: 'Activate Institution?',
            message: `Are you sure you want to activate ${orgName}? The institution will be authorized to participate in data consent transactions.`,
            confirmText: 'Activate Institution',
            confirmVariant: 'primary',
            onConfirm: async () => {
                await window.DF_API.admin.activateOrganization(orgId);
                window.DF_UI.showToast(`Institution ${orgName} activated successfully.`, 'success');
                const container = document.getElementById('df-main-view');
                await loadData();
                renderView(container);
            }
        });
    }

    function handleSuspend(orgId, orgName) {
        window.DF_UI.showConfirmDialog({
            title: 'Suspend Institution?',
            message: `Are you sure you want to suspend ${orgName}? Active consent flows and data verification for this node will be halted.`,
            confirmText: 'Suspend Institution',
            confirmVariant: 'danger',
            onConfirm: async () => {
                await window.DF_API.admin.suspendOrganization(orgId);
                window.DF_UI.showToast(`Institution ${orgName} suspended.`, 'warning');
                const container = document.getElementById('df-main-view');
                await loadData();
                renderView(container);
            }
        });
    }

    return {
        render,
        handleInspect,
        handleActivate,
        handleSuspend
    };
})();


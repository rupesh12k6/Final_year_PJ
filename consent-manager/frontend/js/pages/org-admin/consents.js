/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — ORGANIZATION ADMIN: DATA EXCHANGE & CONSENTS
 * Track incoming student credential disclosures (Provider) and outgoing data
 * requests (Consumer) with granular field visibility.
 * Strictly scoped to the authenticated organization.
 * ==============================================================================
 */

window.DF_PAGE_OA_CONSENTS = (function () {
    'use strict';

    let allConsents = [];
    let allDataRequests = [];
    let currentTab = 'provider'; // 'provider' | 'consumer' | 'all'
    let currentSearch = '';
    let currentStatusFilter = 'ALL';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Institutional Consents & Data Exchange Activity...')}
            </div>
        `;

        try {
            const [consentsRes, dataRequestsRes] = await Promise.all([
                window.DF_API.orgAdmin.getConsents().catch(() => []),
                window.DF_API.orgAdmin.getDataRequests().catch(() => ({ content: [] }))
            ]);

            allConsents = Array.isArray(consentsRes) ? consentsRes : [];
            allDataRequests = (dataRequestsRes && Array.isArray(dataRequestsRes.content))
                ? dataRequestsRes.content
                : (Array.isArray(dataRequestsRes) ? dataRequestsRes : []);

            renderMainView(container);
        } catch (err) {
            console.error('Failed to load consents/requests:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Data Exchange Activity',
                        message: err.message || 'An error occurred while fetching institutional consents.',
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    function renderMainView(container) {
        const user = window.DF_SESSION.getUser() || {};
        const orgId = user.organizationId || '';

        const providerConsents = allConsents.filter(c => c.providerOrganizationId === orgId);
        const consumerConsents = allConsents.filter(c => c.requesterOrganizationId === orgId);
        const activeConsents = allConsents.filter(c => c.status === 'ACTIVE').length;
        const revokedConsents = allConsents.filter(c => c.status === 'REVOKED').length;

        const html = `
        <!-- Page Header -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-1">Data Exchange & Institutional Consents</h3>
                <p class="text-muted small mb-0">Monitor verified student credential disclosures and institutional evaluation requests.</p>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="badge bg-light text-dark border px-3 py-2 rounded-pill font-monospace small">
                    <i class="bi bi-arrow-left-right me-1 text-primary"></i> DEPA Fiduciary Channel
                </span>
            </div>
        </div>

        <!-- Metric Stat Cards -->
        <div class="row g-3 mb-4">
            <div class="col-sm-6 col-xl-3">
                ${window.DF_UI.renderStatCard({
                    label: 'Provider Disclosures',
                    value: providerConsents.length,
                    icon: 'bi-mortarboard-fill',
                    color: 'blue',
                    trend: { direction: 'up', text: 'Student Transcripts' }
                })}
            </div>
            <div class="col-sm-6 col-xl-3">
                ${window.DF_UI.renderStatCard({
                    label: 'Consumer Data Requests',
                    value: allDataRequests.length,
                    icon: 'bi-send-check-fill',
                    color: 'indigo',
                    trend: null
                })}
            </div>
            <div class="col-sm-6 col-xl-3">
                ${window.DF_UI.renderStatCard({
                    label: 'Active Granted Consents',
                    value: activeConsents,
                    icon: 'bi-shield-check',
                    color: 'emerald',
                    trend: { direction: 'up', text: 'Valid Grants' }
                })}
            </div>
            <div class="col-sm-6 col-xl-3">
                ${window.DF_UI.renderStatCard({
                    label: 'Revoked Disclosures',
                    value: revokedConsents,
                    icon: 'bi-slash-circle-fill',
                    color: 'rose',
                    trend: null
                })}
            </div>
        </div>

        <!-- Role Tabs & Filter Toolbar -->
        <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
            <div class="card-header bg-transparent border-bottom p-3">
                <ul class="nav nav-pills card-header-pills" id="oa-consent-tabs">
                    <li class="nav-item">
                        <button class="nav-link ${currentTab === 'provider' ? 'active' : ''} rounded-pill px-3 fw-semibold small" data-tab="provider">
                            <i class="bi bi-box-arrow-in-down-right me-1"></i> Incoming Disclosures (Provider: ${providerConsents.length})
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link ${currentTab === 'consumer' ? 'active' : ''} rounded-pill px-3 fw-semibold small" data-tab="consumer">
                            <i class="bi bi-box-arrow-up-right me-1"></i> Outgoing Requests (Consumer: ${allDataRequests.length})
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link ${currentTab === 'all' ? 'active' : ''} rounded-pill px-3 fw-semibold small" data-tab="all">
                            <i class="bi bi-collection-fill me-1"></i> All Institutional Consents (${allConsents.length})
                        </button>
                    </li>
                </ul>
            </div>
            <div class="card-body p-3">
                <div class="row g-3 align-items-center">
                    <div class="col-md-7">
                        <div class="input-group">
                            <span class="input-group-text bg-white border-end-0 text-muted">
                                <i class="bi bi-search"></i>
                            </span>
                            <input 
                                type="text" 
                                id="oa-consent-search" 
                                class="form-control border-start-0 ps-0" 
                                placeholder="Search by student ID, institution code, or purpose..."
                                value="${window.DF_UI.escapeHtml(currentSearch)}"
                            />
                        </div>
                    </div>
                    <div class="col-sm-8 col-md-4">
                        <select class="form-select" id="oa-consent-status-filter">
                            <option value="ALL" ${currentStatusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
                            <option value="ACTIVE" ${currentStatusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
                            <option value="APPROVED" ${currentStatusFilter === 'APPROVED' ? 'selected' : ''}>Approved</option>
                            <option value="PENDING" ${currentStatusFilter === 'PENDING' ? 'selected' : ''}>Pending</option>
                            <option value="REVOKED" ${currentStatusFilter === 'REVOKED' ? 'selected' : ''}>Revoked</option>
                            <option value="REJECTED" ${currentStatusFilter === 'REJECTED' ? 'selected' : ''}>Rejected</option>
                        </select>
                    </div>
                    <div class="col-sm-4 col-md-1 text-end">
                        <button type="button" class="btn btn-outline-secondary btn-sm w-100" id="btn-reset-consent-filters" title="Reset Filters">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Table Display Card -->
        <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-table text-primary fs-5"></i>
                    <h6 class="mb-0 fw-bold text-dark" id="oa-consent-table-title">Incoming Disclosures</h6>
                </div>
                <span class="badge bg-light text-dark border font-monospace small" id="oa-consent-count-badge">
                    Active Records
                </span>
            </div>
            <div class="table-responsive">
                <div id="oa-consent-table-container">
                    ${renderActiveTable()}
                </div>
            </div>
        </div>

        <!-- Inspection Modal Mount -->
        <div id="oa-consent-inspect-mount"></div>
        `;

        container.innerHTML = html;
        bindEvents(container);
    }

    function renderActiveTable() {
        const user = window.DF_SESSION.getUser() || {};
        const orgId = user.organizationId || '';
        const search = currentSearch.toLowerCase().trim();

        if (currentTab === 'consumer') {
            // Render Outgoing Data Requests
            let items = allDataRequests.filter(req => {
                const matchesSearch = !search ||
                    (req.id && req.id.toLowerCase().includes(search)) ||
                    (req.dataPrincipalId && req.dataPrincipalId.toLowerCase().includes(search)) ||
                    (req.providerOrganizationCode && req.providerOrganizationCode.toLowerCase().includes(search)) ||
                    (req.purpose && req.purpose.toLowerCase().includes(search));

                const matchesStatus = currentStatusFilter === 'ALL' || req.status === currentStatusFilter;
                return matchesSearch && matchesStatus;
            });

            if (items.length === 0) {
                return `
                <div class="py-5">
                    ${window.DF_UI.renderEmptyState({
                        title: 'No Data Requests Found',
                        message: 'No outgoing data requests match your active criteria.',
                        icon: 'bi-send-dash'
                    })}
                </div>
                `;
            }

            return `
            <table class="table df-table align-middle mb-0">
                <thead>
                    <tr>
                        <th>Request ID</th>
                        <th>Target Student ID</th>
                        <th>Provider Institution</th>
                        <th>Purpose</th>
                        <th>Requested Fields</th>
                        <th>Status</th>
                        <th>Requested Date</th>
                        <th class="text-end pe-3">Inspect</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(req => {
                        const dateStr = req.requestedAt ? new Date(req.requestedAt).toLocaleDateString() : 'N/A';
                        const fields = Array.isArray(req.requestedFields) ? req.requestedFields : [];
                        return `
                        <tr>
                            <td>
                                <span class="badge bg-light text-dark border font-monospace small">${window.DF_UI.escapeHtml(req.id)}</span>
                            </td>
                            <td>
                                <strong class="text-dark font-monospace">${window.DF_UI.escapeHtml(req.dataPrincipalId || '—')}</strong>
                            </td>
                            <td>
                                <span class="badge bg-secondary-subtle text-secondary border font-monospace small">
                                    ${window.DF_UI.escapeHtml(req.providerOrganizationCode || req.providerOrganizationId || 'PROVIDER')}
                                </span>
                            </td>
                            <td class="small text-secondary" style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${window.DF_UI.escapeHtml(req.purpose || '—')}
                            </td>
                            <td>
                                <div class="d-flex flex-wrap gap-1">
                                    ${fields.map(f => `<span class="badge bg-info-subtle text-info border rounded-pill" style="font-size: 0.7rem;">${window.DF_UI.escapeHtml(f)}</span>`).join('')}
                                </div>
                            </td>
                            <td>
                                ${window.DF_UI.renderStatusBadge(req.status)}
                            </td>
                            <td class="small text-muted font-monospace">${window.DF_UI.escapeHtml(dateStr)}</td>
                            <td class="text-end pe-3">
                                <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-2 btn-inspect-request" data-req-id="${window.DF_UI.escapeHtml(req.id)}" title="Inspect Request">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            `;
        }

        // Render Consents (Provider or All)
        let dataset = allConsents;
        if (currentTab === 'provider') {
            dataset = allConsents.filter(c => c.providerOrganizationId === orgId);
        }

        let items = dataset.filter(c => {
            const matchesSearch = !search ||
                (c.id && c.id.toLowerCase().includes(search)) ||
                (c.dataPrincipalId && c.dataPrincipalId.toLowerCase().includes(search)) ||
                (c.requesterOrganizationCode && c.requesterOrganizationCode.toLowerCase().includes(search)) ||
                (c.providerOrganizationCode && c.providerOrganizationCode.toLowerCase().includes(search)) ||
                (c.purpose && c.purpose.toLowerCase().includes(search));

            const matchesStatus = currentStatusFilter === 'ALL' || c.status === currentStatusFilter;
            return matchesSearch && matchesStatus;
        });

        if (items.length === 0) {
            return `
            <div class="py-5">
                ${window.DF_UI.renderEmptyState({
                    title: 'No Consent Records Found',
                    message: 'No institutional consent disclosures match your active filter criteria.',
                    icon: 'bi-shield-slash'
                })}
            </div>
            `;
        }

        return `
        <table class="table df-table align-middle mb-0">
            <thead>
                <tr>
                    <th>Consent ID</th>
                    <th>Data Principal</th>
                    <th>Requester Node</th>
                    <th>Provider Node</th>
                    <th>Approved Fields</th>
                    <th>Status</th>
                    <th>Granted Date</th>
                    <th class="text-end pe-3">Inspect</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(c => {
                    const dateStr = c.grantedAt ? new Date(c.grantedAt).toLocaleDateString() : 'N/A';
                    const fields = Array.isArray(c.approvedFields) ? c.approvedFields : [];
                    return `
                    <tr>
                        <td>
                            <span class="badge bg-light text-dark border font-monospace small">${window.DF_UI.escapeHtml(c.id)}</span>
                        </td>
                        <td>
                            <strong class="text-dark font-monospace">${window.DF_UI.escapeHtml(c.dataPrincipalId || '—')}</strong>
                        </td>
                        <td>
                            <span class="badge bg-primary-subtle text-primary border font-monospace small">
                                ${window.DF_UI.escapeHtml(c.requesterOrganizationCode || c.requesterOrganizationId || 'REQUESTER')}
                            </span>
                        </td>
                        <td>
                            <span class="badge bg-secondary-subtle text-secondary border font-monospace small">
                                ${window.DF_UI.escapeHtml(c.providerOrganizationCode || c.providerOrganizationId || 'PROVIDER')}
                            </span>
                        </td>
                        <td>
                            <div class="d-flex flex-wrap gap-1">
                                ${fields.map(f => `<span class="badge bg-emerald-subtle text-success border rounded-pill" style="font-size: 0.7rem;">${window.DF_UI.escapeHtml(f)}</span>`).join('')}
                            </div>
                        </td>
                        <td>
                            ${window.DF_UI.renderStatusBadge(c.status)}
                        </td>
                        <td class="small text-muted font-monospace">${window.DF_UI.escapeHtml(dateStr)}</td>
                        <td class="text-end pe-3">
                            <button type="button" class="btn btn-sm btn-outline-primary rounded-pill px-2 btn-inspect-consent" data-consent-id="${window.DF_UI.escapeHtml(c.id)}" title="Inspect Consent">
                                <i class="bi bi-eye"></i>
                            </button>
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        `;
    }

    function updateTableView() {
        const container = document.getElementById('oa-consent-table-container');
        const titleEl = document.getElementById('oa-consent-table-title');
        if (container) container.innerHTML = renderActiveTable();

        if (titleEl) {
            if (currentTab === 'provider') titleEl.textContent = 'Incoming Student Disclosures (Provider)';
            else if (currentTab === 'consumer') titleEl.textContent = 'Outgoing Data Requests (Consumer)';
            else titleEl.textContent = 'All Institutional Consents (Combined Matrix)';
        }
    }

    function bindEvents(container) {
        // Tab switching
        const tabBtns = container.querySelectorAll('#oa-consent-tabs button');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tabBtns.forEach(b => b.classList.remove('active'));
                const target = e.currentTarget;
                target.classList.add('active');
                currentTab = target.getAttribute('data-tab');
                updateTableView();
            });
        });

        // Search input
        const searchInput = document.getElementById('oa-consent-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value;
                updateTableView();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('oa-consent-status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                currentStatusFilter = e.target.value;
                updateTableView();
            });
        }

        // Reset filter
        const resetBtn = document.getElementById('btn-reset-consent-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                currentSearch = '';
                currentStatusFilter = 'ALL';
                if (searchInput) searchInput.value = '';
                if (statusFilter) statusFilter.value = 'ALL';
                updateTableView();
            });
        }

        // Action delegation: inspect
        container.addEventListener('click', (e) => {
            const consentBtn = e.target.closest('.btn-inspect-consent');
            if (consentBtn) {
                const id = consentBtn.getAttribute('data-consent-id');
                const consent = allConsents.find(c => c.id === id);
                if (consent) openConsentInspectionModal(consent);
                return;
            }

            const reqBtn = e.target.closest('.btn-inspect-request');
            if (reqBtn) {
                const id = reqBtn.getAttribute('data-req-id');
                const req = allDataRequests.find(r => r.id === id);
                if (req) openRequestInspectionModal(req);
                return;
            }
        });
    }

    function openConsentInspectionModal(c) {
        const mount = document.getElementById('oa-consent-inspect-mount');
        if (!mount) return;

        const grantedStr = c.grantedAt ? new Date(c.grantedAt).toLocaleString() : 'N/A';
        const expiresStr = c.expiresAt ? new Date(c.expiresAt).toLocaleString() : 'N/A';
        const revokedStr = c.revokedAt ? new Date(c.revokedAt).toLocaleString() : null;
        const fields = Array.isArray(c.approvedFields) ? c.approvedFields : [];

        mount.innerHTML = `
        <div class="modal fade" id="modal-oa-inspect-consent" tabindex="-1" aria-labelledby="modalInspectConsentTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg" style="border-radius: var(--df-radius-lg);">
                    <div class="modal-header border-bottom p-3">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-shield-check text-primary fs-5"></i>
                            <h5 class="modal-title fw-bold text-dark" id="modalInspectConsentTitle">Institutional Consent Record: ${window.DF_UI.escapeHtml(c.id)}</h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row g-3 mb-4">
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Consent Status</label>
                                <div>${window.DF_UI.renderStatusBadge(c.status)}</div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Data Principal (Student ID)</label>
                                <div class="font-monospace fw-bold text-dark">${window.DF_UI.escapeHtml(c.dataPrincipalId || '—')}</div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Provider Organization</label>
                                <div class="p-2 bg-light rounded border font-monospace small">
                                    ${window.DF_UI.escapeHtml(c.providerOrganizationCode || c.providerOrganizationId)}
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Requester / Consumer Organization</label>
                                <div class="p-2 bg-light rounded border font-monospace small">
                                    ${window.DF_UI.escapeHtml(c.requesterOrganizationCode || c.requesterOrganizationId)}
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="text-muted small fw-bold text-uppercase">Intended Purpose</label>
                                <div class="p-2 bg-light rounded border small text-dark">
                                    ${window.DF_UI.escapeHtml(c.purpose || 'Academic evaluation and verification')}
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="text-muted small fw-bold text-uppercase">Approved Academic Scopes</label>
                                <div class="p-2 bg-light rounded border d-flex flex-wrap gap-2">
                                    ${fields.map(f => `<span class="badge bg-primary-subtle text-primary border px-2 py-1">${window.DF_UI.escapeHtml(f)}</span>`).join('')}
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Granted Timestamp</label>
                                <div class="font-monospace small text-muted">${window.DF_UI.escapeHtml(grantedStr)}</div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Expiration Timestamp</label>
                                <div class="font-monospace small text-muted">${window.DF_UI.escapeHtml(expiresStr)}</div>
                            </div>
                            ${revokedStr ? `
                            <div class="col-12">
                                <label class="text-muted small fw-bold text-uppercase text-danger">Revocation Timestamp</label>
                                <div class="font-monospace small text-danger">${window.DF_UI.escapeHtml(revokedStr)}</div>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="modal-footer border-top p-3 bg-light">
                        <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        const modalEl = document.getElementById('modal-oa-inspect-consent');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    function openRequestInspectionModal(req) {
        const mount = document.getElementById('oa-consent-inspect-mount');
        if (!mount) return;

        const reqDateStr = req.requestedAt ? new Date(req.requestedAt).toLocaleString() : 'N/A';
        const expDateStr = req.expiresAt ? new Date(req.expiresAt).toLocaleString() : 'N/A';
        const fields = Array.isArray(req.requestedFields) ? req.requestedFields : [];

        mount.innerHTML = `
        <div class="modal fade" id="modal-oa-inspect-request" tabindex="-1" aria-labelledby="modalInspectReqTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg" style="border-radius: var(--df-radius-lg);">
                    <div class="modal-header border-bottom p-3">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-send-check text-indigo fs-5"></i>
                            <h5 class="modal-title fw-bold text-dark" id="modalInspectReqTitle">Outgoing Data Request: ${window.DF_UI.escapeHtml(req.id)}</h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row g-3">
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Request Status</label>
                                <div>${window.DF_UI.renderStatusBadge(req.status)}</div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Target Student ID</label>
                                <div class="font-monospace fw-bold text-dark">${window.DF_UI.escapeHtml(req.dataPrincipalId || '—')}</div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Provider Institution</label>
                                <div class="p-2 bg-light rounded border font-monospace small">
                                    ${window.DF_UI.escapeHtml(req.providerOrganizationCode || req.providerOrganizationId)}
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Requester User ID</label>
                                <div class="p-2 bg-light rounded border font-monospace small">
                                    ${window.DF_UI.escapeHtml(req.requesterUserId || 'N/A')}
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="text-muted small fw-bold text-uppercase">Purpose</label>
                                <div class="p-2 bg-light rounded border small text-dark">
                                    ${window.DF_UI.escapeHtml(req.purpose || '—')}
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="text-muted small fw-bold text-uppercase">Requested Fields</label>
                                <div class="p-2 bg-light rounded border d-flex flex-wrap gap-2">
                                    ${fields.map(f => `<span class="badge bg-indigo-subtle text-indigo border px-2 py-1">${window.DF_UI.escapeHtml(f)}</span>`).join('')}
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Requested At</label>
                                <div class="font-monospace small text-muted">${window.DF_UI.escapeHtml(reqDateStr)}</div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Expires At</label>
                                <div class="font-monospace small text-muted">${window.DF_UI.escapeHtml(expDateStr)}</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-top p-3 bg-light">
                        <button type="button" class="btn btn-outline-secondary rounded-pill px-4" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        const modalEl = document.getElementById('modal-oa-inspect-request');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    return {
        render: render
    };
})();


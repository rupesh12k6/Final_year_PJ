/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — SUPER ADMIN: GLOBAL AUDIT LOGS MODULE
 * Centralized cryptographic audit trail, multi-attribute filtering, and pagination.
 * ==============================================================================
 */

window.DF_PAGE_SA_AUDIT = (function () {
    'use strict';

    let allLogs = [];
    let filterSearch = '';
    let filterType = 'ALL';
    let filterOrg = 'ALL';
    let currentPage = 1;
    const pageSize = 12;

    async function loadData() {
        allLogs = await window.DF_API.audit.getAll();
        return allLogs;
    }

    function getFilteredLogs() {
        return allLogs.filter(log => {
            const matchesSearch = !filterSearch || 
                (log.details && log.details.toLowerCase().includes(filterSearch.toLowerCase())) ||
                (log.actorUserId && log.actorUserId.toLowerCase().includes(filterSearch.toLowerCase())) ||
                (log.targetEntityId && log.targetEntityId.toLowerCase().includes(filterSearch.toLowerCase())) ||
                (log.logId && log.logId.toLowerCase().includes(filterSearch.toLowerCase()));

            const matchesType = filterType === 'ALL' || log.eventType === filterType;
            const matchesOrg = filterOrg === 'ALL' || log.organizationId === filterOrg;

            return matchesSearch && matchesType && matchesOrg;
        });
    }

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Global Security Audit Trail...')}
            </div>
        `;

        try {
            await loadData();
            currentPage = 1;
            renderView(container);
        } catch (err) {
            console.error('[SA_AUDIT] Failed to load audit logs:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Audit Trail',
                        message: err.message || 'Error communicating with Consent Manager authority.'
                    })}
                    <div class="text-center mt-3">
                        <button class="btn btn-primary rounded-pill px-4" onclick="window.DF_PAGE_SA_AUDIT.render(document.getElementById('df-main-view'))">
                            <i class="bi bi-arrow-clockwise me-1"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    function renderView(container) {
        const filtered = getFilteredLogs();
        const total = filtered.length;
        const totalPages = Math.ceil(total / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * pageSize;
        const pageItems = filtered.slice(startIndex, startIndex + pageSize);

        // Derive unique event types and organizations for filter dropdowns
        const eventTypes = [...new Set(allLogs.map(l => l.eventType).filter(Boolean))].sort();
        const organizations = [...new Set(allLogs.map(l => l.organizationId).filter(Boolean))].sort();

        const tableColumns = [
            {
                key: 'timestamp',
                label: 'Timestamp',
                width: '170px',
                render: (val) => {
                    if (!val) return '—';
                    try {
                        const d = new Date(val);
                        return `
                            <div class="small fw-semibold text-dark">${d.toLocaleDateString()}</div>
                            <div class="text-muted font-monospace" style="font-size:0.75rem;">${d.toLocaleTimeString()}</div>
                        `;
                    } catch (e) {
                        return String(val);
                    }
                }
            },
            {
                key: 'eventType',
                label: 'Event Type',
                width: '180px',
                render: (val) => window.DF_UI.renderStatusBadge(val || 'EVENT')
            },
            {
                key: 'actorUserId',
                label: 'Actor',
                width: '160px',
                render: (val, row) => `
                    <div>
                        <div class="fw-bold text-dark font-monospace small">${window.DF_UI.escapeHtml(val || 'SYSTEM')}</div>
                        <span class="badge bg-light text-secondary border small">${window.DF_UI.escapeHtml(row.actorRole || 'SYS')}</span>
                    </div>
                `
            },
            {
                key: 'organizationId',
                label: 'Organization',
                width: '140px',
                render: (val) => val 
                    ? `<span class="badge bg-primary-subtle text-primary font-monospace">${window.DF_UI.escapeHtml(val)}</span>` 
                    : '<span class="text-muted small">Global Root</span>'
            },
            {
                key: 'targetEntityId',
                label: 'Target Entity',
                width: '160px',
                render: (val, row) => val 
                    ? `<div><span class="badge bg-secondary-subtle text-dark font-monospace small">${window.DF_UI.escapeHtml(val)}</span><div class="text-muted small" style="font-size:0.7rem;">${window.DF_UI.escapeHtml(row.targetEntityType || '')}</div></div>` 
                    : '—'
            },
            {
                key: 'details',
                label: 'Event Details',
                render: (val) => `
                    <div class="text-truncate text-secondary" style="max-width: 320px;" title="${window.DF_UI.escapeHtml(val || '')}">
                        ${window.DF_UI.escapeHtml(val || '—')}
                    </div>
                `
            },
            {
                key: 'actions',
                label: 'Inspect',
                width: '90px',
                render: (_, row) => `
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-2 py-0" onclick="window.DF_PAGE_SA_AUDIT.inspectLog('${row.logId}')">
                        <i class="bi bi-search me-1"></i>View
                    </button>
                `
            }
        ];

        const dataTableHtml = window.DF_UI.renderDataTable({
            id: 'sa-audit-logs-table',
            columns: tableColumns,
            data: pageItems,
            emptyMsg: filterSearch || filterType !== 'ALL' || filterOrg !== 'ALL'
                ? 'No audit records match the selected filters.'
                : 'No security events logged in the audit repository.'
        });

        const paginationHtml = window.DF_UI.renderPagination({
            page: currentPage,
            total: total,
            perPage: pageSize,
            id: 'sa-audit-pagination'
        });

        container.innerHTML = `
            <!-- Page Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h2 class="fw-bold text-dark fs-4 mb-1">Global Security Audit Trail</h2>
                    <p class="text-muted small mb-0">
                        Append-only cryptographic audit logs recording all participant authentication, consent lifecycle, and data transactions.
                    </p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-dark rounded-pill px-3 py-2 font-monospace">
                        <i class="bi bi-shield-lock-fill text-warning me-1"></i> IMMUTABLE REGISTRY
                    </span>
                </div>
            </div>

            <!-- Filters Bar -->
            <div class="card df-card border-0 mb-4 shadow-sm" style="border-radius: var(--df-radius-md);">
                <div class="card-body p-3">
                    <div class="row g-2 align-items-center">
                        <!-- Search Input -->
                        <div class="col-md-5">
                            <div class="input-group">
                                <span class="input-group-text bg-white border-end-0 text-muted">
                                    <i class="bi bi-search"></i>
                                </span>
                                <input 
                                    type="text" 
                                    class="form-control border-start-0" 
                                    id="sa-audit-search" 
                                    placeholder="Search by details, actor ID, target entity, or log ID..."
                                    value="${window.DF_UI.escapeHtml(filterSearch)}"
                                />
                            </div>
                        </div>

                        <!-- Event Type Filter -->
                        <div class="col-md-3">
                            <select class="form-select" id="sa-audit-type-select">
                                <option value="ALL" ${filterType === 'ALL' ? 'selected' : ''}>All Event Types (${allLogs.length})</option>
                                ${eventTypes.map(t => `<option value="${t}" ${filterType === t ? 'selected' : ''}>${t}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Organization Filter -->
                        <div class="col-md-2">
                            <select class="form-select" id="sa-audit-org-select">
                                <option value="ALL" ${filterOrg === 'ALL' ? 'selected' : ''}>All Organizations</option>
                                ${organizations.map(o => `<option value="${o}" ${filterOrg === o ? 'selected' : ''}>${o}</option>`).join('')}
                            </select>
                        </div>

                        <!-- Refresh Button -->
                        <div class="col-md-2 text-end">
                            <button class="btn btn-outline-secondary w-100" id="sa-audit-refresh-btn">
                                <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Audit Table Container -->
            <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                    <div class="fw-bold text-dark">
                        Audit Events
                        <span class="badge bg-secondary-subtle text-secondary rounded-pill ms-2 font-monospace">${total} records</span>
                    </div>
                    <div class="small text-muted">
                        Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong>
                    </div>
                </div>
                <div class="card-body p-0">
                    ${dataTableHtml}
                </div>
                <div class="card-footer bg-white border-top py-3 d-flex justify-content-center">
                    ${paginationHtml}
                </div>
            </div>
        `;

        bindEvents(container);
    }

    function bindEvents(container) {
        const searchInput = container.querySelector('#sa-audit-search');
        const typeSelect = container.querySelector('#sa-audit-type-select');
        const orgSelect = container.querySelector('#sa-audit-org-select');
        const refreshBtn = container.querySelector('#sa-audit-refresh-btn');
        const pagination = container.querySelector('#sa-audit-pagination');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterSearch = e.target.value.trim();
                currentPage = 1;
                renderView(container);
            });
        }

        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                filterType = e.target.value;
                currentPage = 1;
                renderView(container);
            });
        }

        if (orgSelect) {
            orgSelect.addEventListener('change', (e) => {
                filterOrg = e.target.value;
                currentPage = 1;
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
                    window.DF_UI.showToast('Security audit trail refreshed.', 'info');
                }
            });
        }

        if (pagination) {
            pagination.querySelectorAll('button[data-page]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const page = parseInt(btn.getAttribute('data-page'), 10);
                    if (!isNaN(page) && page >= 1) {
                        currentPage = page;
                        renderView(container);
                    }
                });
            });
        }
    }

    function inspectLog(logId) {
        const log = allLogs.find(l => l.logId === logId);
        if (!log) return;

        const contentHtml = `
            <div class="p-2">
                <div class="d-flex align-items-center justify-content-between border-bottom pb-3 mb-3">
                    <div>
                        <span class="badge bg-secondary-subtle text-dark font-monospace">${window.DF_UI.escapeHtml(log.logId)}</span>
                        <div class="text-muted small mt-1">${log.timestamp ? new Date(log.timestamp).toUTCString() : '—'}</div>
                    </div>
                    <div>
                        ${window.DF_UI.renderStatusBadge(log.eventType)}
                    </div>
                </div>

                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Actor User ID</label>
                        <p class="fw-bold font-monospace text-dark mb-0">${window.DF_UI.escapeHtml(log.actorUserId || 'SYSTEM')}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Actor Role</label>
                        <p class="fw-medium text-dark mb-0">${window.DF_UI.escapeHtml(log.actorRole || 'SYSTEM')}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Organization ID</label>
                        <p class="fw-medium font-monospace text-dark mb-0">${window.DF_UI.escapeHtml(log.organizationId || 'GLOBAL ROOT')}</p>
                    </div>
                    <div class="col-md-6">
                        <label class="text-muted small fw-semibold">Target Entity Type</label>
                        <p class="fw-medium text-dark mb-0">${window.DF_UI.escapeHtml(log.targetEntityType || 'N/A')}</p>
                    </div>
                    <div class="col-md-12">
                        <label class="text-muted small fw-semibold">Target Entity ID</label>
                        <p class="fw-medium font-monospace text-dark mb-0">${window.DF_UI.escapeHtml(log.targetEntityId || 'N/A')}</p>
                    </div>
                    <div class="col-md-12">
                        <label class="text-muted small fw-semibold">Details & Payload Narrative</label>
                        <div class="p-3 bg-light rounded border text-dark font-monospace small" style="white-space: pre-wrap; word-break: break-all;">
                            ${window.DF_UI.escapeHtml(log.details || '—')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        window.DF_UI.showModal({
            id: 'modal-inspect-audit-log',
            title: `Audit Event Record: ${log.logId}`,
            contentHtml: contentHtml,
            size: 'lg'
        });
    }

    return {
        render,
        inspectLog
    };
})();


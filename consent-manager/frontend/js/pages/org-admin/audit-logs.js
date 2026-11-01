/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — ORGANIZATION ADMIN: INSTITUTIONAL AUDIT TRAIL
 * Read-only cryptographic audit events strictly scoped to the authenticated
 * organization node.
 * ==============================================================================
 */

window.DF_PAGE_OA_AUDIT = (function () {
    'use strict';

    let allAuditLogs = [];
    let filteredLogs = [];
    let currentSearch = '';
    let currentEventTypeFilter = 'ALL';
    let currentPage = 1;
    const PAGE_SIZE = 12;

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Scoped Institutional Audit Trail...')}
            </div>
        `;

        try {
            allAuditLogs = await window.DF_API.orgAdmin.getAuditLogs();
            if (!Array.isArray(allAuditLogs)) allAuditLogs = [];
            filteredLogs = [...allAuditLogs];
            currentPage = 1;

            renderMainView(container);
        } catch (err) {
            console.error('Failed to load institutional audit logs:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Institutional Audit Trail',
                        message: err.message || 'An error occurred while fetching audit records.',
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    function renderMainView(container) {
        const total = allAuditLogs.length;

        // Extract unique event types
        const eventTypes = Array.from(new Set(allAuditLogs.map(l => l.eventType).filter(Boolean))).sort();

        const html = `
        <!-- Page Header -->
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
            <div>
                <h3 class="fw-bold text-dark mb-1">Institutional Security Audit Trail</h3>
                <p class="text-muted small mb-0">Immutable, read-only transaction log strictly scoped to your institution's node.</p>
            </div>
            <div class="d-flex align-items-center gap-2">
                <span class="badge bg-success-subtle text-success border px-3 py-2 rounded-pill font-monospace small">
                    <i class="bi bi-shield-check me-1"></i> Immutability Guaranteed
                </span>
            </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
            <div class="card-body p-3">
                <div class="row g-3 align-items-center">
                    <div class="col-md-7">
                        <div class="input-group">
                            <span class="input-group-text bg-white border-end-0 text-muted">
                                <i class="bi bi-search"></i>
                            </span>
                            <input 
                                type="text" 
                                id="oa-audit-search-input" 
                                class="form-control border-start-0 ps-0" 
                                placeholder="Search by event type, actor ID, log ID, or details..."
                                value="${window.DF_UI.escapeHtml(currentSearch)}"
                            />
                        </div>
                    </div>
                    <div class="col-sm-8 col-md-4">
                        <select class="form-select" id="oa-audit-type-filter">
                            <option value="ALL" ${currentEventTypeFilter === 'ALL' ? 'selected' : ''}>All Event Types (${eventTypes.length})</option>
                            ${eventTypes.map(t => `<option value="${window.DF_UI.escapeHtml(t)}" ${currentEventTypeFilter === t ? 'selected' : ''}>${window.DF_UI.escapeHtml(t)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-sm-4 col-md-1 text-end">
                        <button type="button" class="btn btn-outline-secondary btn-sm w-100" id="btn-reset-audit-filters" title="Reset Filters">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Audit Records Table Card -->
        <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-journal-check text-primary fs-5"></i>
                    <h6 class="mb-0 fw-bold text-dark">Institutional Security Events</h6>
                </div>
                <span class="badge bg-light text-dark border font-monospace small" id="oa-audit-count-badge">
                    Showing ${filteredLogs.length} of ${total} Events
                </span>
            </div>
            <div class="table-responsive">
                <table class="table df-table align-middle mb-0" id="oa-audit-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Event Type</th>
                            <th>Actor User ID</th>
                            <th>Actor Role</th>
                            <th>Target Entity</th>
                            <th>Summary Details</th>
                            <th class="text-end pe-3">Inspect</th>
                        </tr>
                    </thead>
                    <tbody id="oa-audit-tbody">
                        ${renderTableRows()}
                    </tbody>
                </table>
            </div>

            <!-- Pagination Footer -->
            <div class="card-footer bg-transparent border-top p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                <span class="text-muted small" id="oa-audit-pagination-info">
                    ${getPaginationInfoText()}
                </span>
                <div id="oa-audit-pagination-controls">
                    ${renderPaginationControls()}
                </div>
            </div>
        </div>

        <!-- Inspection Modal Mount -->
        <div id="oa-audit-modal-mount"></div>
        `;

        container.innerHTML = html;
        bindEvents(container);
    }

    function renderTableRows() {
        if (!filteredLogs || filteredLogs.length === 0) {
            return `
            <tr>
                <td colspan="7" class="text-center py-5">
                    ${window.DF_UI.renderEmptyState({
                        title: 'No Matching Audit Records',
                        message: 'No institutional security events match the current search or event filter.',
                        icon: 'bi-journal-x'
                    })}
                </td>
            </tr>
            `;
        }

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const pageRecords = filteredLogs.slice(startIndex, startIndex + PAGE_SIZE);

        return pageRecords.map(log => {
            const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A';
            const roleStr = log.actorRole || 'SYSTEM';
            const roleBadgeClass = roleStr === 'ORG_ADMIN' ? 'bg-primary-subtle text-primary border-primary' : 'bg-secondary-subtle text-secondary border-secondary';

            return `
            <tr>
                <td class="font-monospace small text-muted" style="white-space: nowrap;">
                    ${window.DF_UI.escapeHtml(timeStr)}
                </td>
                <td>
                    <span class="badge bg-light text-dark border font-monospace small">
                        ${window.DF_UI.escapeHtml(log.eventType || 'UNKNOWN')}
                    </span>
                </td>
                <td class="font-monospace small text-primary">
                    ${window.DF_UI.escapeHtml(log.actorUserId || 'SYSTEM')}
                </td>
                <td>
                    <span class="badge ${roleBadgeClass} border rounded-pill px-2 py-1 small">
                        ${window.DF_UI.escapeHtml(roleStr)}
                    </span>
                </td>
                <td>
                    <span class="badge bg-light text-secondary border font-monospace small">
                        ${window.DF_UI.escapeHtml(log.targetEntityId || '—')}
                    </span>
                </td>
                <td class="small text-secondary" style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${window.DF_UI.escapeHtml(log.details || '—')}
                </td>
                <td class="text-end pe-3">
                    <button 
                        type="button" 
                        class="btn btn-sm btn-outline-secondary rounded-pill px-2 btn-inspect-audit-row"
                        data-log-id="${window.DF_UI.escapeHtml(log.logId || log.id)}"
                        title="Inspect Event"
                    >
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    }

    function getPaginationInfoText() {
        const total = filteredLogs.length;
        if (total === 0) return 'No events to display';
        const start = (currentPage - 1) * PAGE_SIZE + 1;
        const end = Math.min(start + PAGE_SIZE - 1, total);
        return `Showing events ${start}–${end} of ${total}`;
    }

    function renderPaginationControls() {
        const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;
        if (totalPages <= 1) return '';

        return `
        <div class="btn-group btn-group-sm" role="group" aria-label="Audit pagination">
            <button type="button" class="btn btn-outline-secondary ${currentPage === 1 ? 'disabled' : ''}" id="btn-audit-prev">
                <i class="bi bi-chevron-left"></i> Previous
            </button>
            <button type="button" class="btn btn-outline-secondary disabled fw-bold text-dark font-monospace">
                ${currentPage} / ${totalPages}
            </button>
            <button type="button" class="btn btn-outline-secondary ${currentPage >= totalPages ? 'disabled' : ''}" id="btn-audit-next">
                Next <i class="bi bi-chevron-right"></i>
            </button>
        </div>
        `;
    }

    function applyFilters() {
        const query = currentSearch.toLowerCase().trim();
        filteredLogs = allAuditLogs.filter(log => {
            const matchesSearch = !query ||
                (log.logId && log.logId.toLowerCase().includes(query)) ||
                (log.id && log.id.toLowerCase().includes(query)) ||
                (log.eventType && log.eventType.toLowerCase().includes(query)) ||
                (log.actorUserId && log.actorUserId.toLowerCase().includes(query)) ||
                (log.targetEntityId && log.targetEntityId.toLowerCase().includes(query)) ||
                (log.details && log.details.toLowerCase().includes(query));

            const matchesType = currentEventTypeFilter === 'ALL' || log.eventType === currentEventTypeFilter;

            return matchesSearch && matchesType;
        });

        currentPage = 1;
        updateView();
    }

    function updateView() {
        const tbody = document.getElementById('oa-audit-tbody');
        const countBadge = document.getElementById('oa-audit-count-badge');
        const paginationInfo = document.getElementById('oa-audit-pagination-info');
        const paginationControls = document.getElementById('oa-audit-pagination-controls');

        if (tbody) tbody.innerHTML = renderTableRows();
        if (countBadge) countBadge.textContent = `Showing ${filteredLogs.length} of ${allAuditLogs.length} Events`;
        if (paginationInfo) paginationInfo.textContent = getPaginationInfoText();
        if (paginationControls) paginationControls.innerHTML = renderPaginationControls();

        bindPaginationButtons();
    }

    function bindPaginationButtons() {
        const prevBtn = document.getElementById('btn-audit-prev');
        const nextBtn = document.getElementById('btn-audit-next');
        const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE) || 1;

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    updateView();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    updateView();
                }
            });
        }
    }

    function bindEvents(container) {
        // Search input
        const searchInput = document.getElementById('oa-audit-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearch = e.target.value;
                applyFilters();
            });
        }

        // Type filter
        const typeFilter = document.getElementById('oa-audit-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                currentEventTypeFilter = e.target.value;
                applyFilters();
            });
        }

        // Reset filter
        const resetBtn = document.getElementById('btn-reset-audit-filters');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                currentSearch = '';
                currentEventTypeFilter = 'ALL';
                if (searchInput) searchInput.value = '';
                if (typeFilter) typeFilter.value = 'ALL';
                applyFilters();
            });
        }

        // Inspection action delegation
        container.addEventListener('click', (e) => {
            const inspectBtn = e.target.closest('.btn-inspect-audit-row');
            if (inspectBtn) {
                const logId = inspectBtn.getAttribute('data-log-id');
                const log = allAuditLogs.find(l => (l.logId || l.id) === logId);
                if (log) openInspectModal(log);
            }
        });

        bindPaginationButtons();
    }

    function openInspectModal(log) {
        const mount = document.getElementById('oa-audit-modal-mount');
        if (!mount) return;

        const timeStr = log.timestamp ? new Date(log.timestamp).toISOString() : 'N/A';

        mount.innerHTML = `
        <div class="modal fade" id="modal-oa-inspect-audit" tabindex="-1" aria-labelledby="modalInspectAuditTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content border-0 shadow-lg" style="border-radius: var(--df-radius-lg);">
                    <div class="modal-header border-bottom p-3">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-journal-text text-primary fs-5"></i>
                            <h5 class="modal-title fw-bold text-dark" id="modalInspectAuditTitle">
                                Institutional Audit Record: ${window.DF_UI.escapeHtml(log.logId || log.id)}
                            </h5>
                        </div>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row g-3">
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Log Identifier</label>
                                <div class="p-2 bg-light rounded border font-monospace text-primary">
                                    ${window.DF_UI.escapeHtml(log.logId || log.id)}
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Event Type</label>
                                <div class="p-2 bg-light rounded border font-monospace fw-bold text-dark">
                                    ${window.DF_UI.escapeHtml(log.eventType || 'N/A')}
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Actor User ID</label>
                                <div class="p-2 bg-light rounded border font-monospace text-dark">
                                    ${window.DF_UI.escapeHtml(log.actorUserId || 'SYSTEM')}
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Actor Role</label>
                                <div class="p-2 bg-light rounded border">
                                    <span class="badge bg-primary-subtle text-primary border">${window.DF_UI.escapeHtml(log.actorRole || 'SYSTEM')}</span>
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Target Entity Type</label>
                                <div class="p-2 bg-light rounded border font-monospace text-secondary">
                                    ${window.DF_UI.escapeHtml(log.targetEntityType || 'N/A')}
                                </div>
                            </div>
                            <div class="col-sm-6">
                                <label class="text-muted small fw-bold text-uppercase">Target Entity ID</label>
                                <div class="p-2 bg-light rounded border font-monospace text-dark">
                                    ${window.DF_UI.escapeHtml(log.targetEntityId || '—')}
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="text-muted small fw-bold text-uppercase">Timestamp (UTC ISO-8601)</label>
                                <div class="p-2 bg-light rounded border font-monospace text-muted small">
                                    ${window.DF_UI.escapeHtml(timeStr)}
                                </div>
                            </div>
                            <div class="col-12">
                                <label class="text-muted small fw-bold text-uppercase">Event Summary & Action Details</label>
                                <div class="p-3 bg-light rounded border font-monospace small text-dark" style="white-space: pre-wrap; word-break: break-all;">
                                    ${window.DF_UI.escapeHtml(log.details || 'No additional payload details recorded.')}
                                </div>
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

        const modalEl = document.getElementById('modal-oa-inspect-audit');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    return {
        render: render
    };
})();


/**
 * ==============================================================================
 * DEPA COLLEGE A — STUDENT: CONSENT DECISION HISTORY & REVOCATION
 * Review past disclosure authorizations, active grants, and execute instant revocation.
 * Backend: GET /api/student/consents/history, POST /{id}/revoke
 * ==============================================================================
 */

window.DF_PAGE_STUDENT_HISTORY = (function () {
    'use strict';

    let historyRecords = [];
    let currentFilter = 'ALL';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Consent History & Active Grants...')}
            </div>
        `;

        try {
            historyRecords = await window.DF_API.student.getConsentHistory();
            const list = Array.isArray(historyRecords) ? historyRecords : [];
            renderView(container, list);
        } catch (err) {
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Consent History',
                        message: err.message,
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    function renderView(container, list) {
        const filtered = list.filter(item => {
            if (currentFilter === 'ALL') return true;
            return (item.status === currentFilter);
        });

        const activeCount = list.filter(item => item.status === 'ACTIVE').length;
        const revokedCount = list.filter(item => item.status === 'REVOKED').length;

        const html = `
            <!-- Page Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h3 class="fw-bold text-dark mb-1">Consent History & Active Grants</h3>
                    <p class="text-muted small mb-0">Audit trail of all your past consent decisions and active credential disclosure permissions.</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill font-monospace small">
                        <span class="text-success fw-bold">${activeCount} Active</span> •
                        <span class="text-secondary fw-semibold">${revokedCount} Revoked</span>
                    </span>
                    <button class="btn btn-sm btn-outline-secondary" onclick="window.DF_PAGE_STUDENT_HISTORY.render(document.getElementById('df-main-content'))">
                        <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                    </button>
                </div>
            </div>

            <!-- Revocation Policy Notice Card -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-body p-4">
                    <div class="d-flex align-items-start gap-3">
                        <div class="rounded-circle bg-danger-subtle text-danger p-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; flex-shrink: 0;">
                            <i class="bi bi-shield-x fs-5"></i>
                        </div>
                        <div>
                            <h6 class="fw-bold text-dark mb-1">Legal & Technical Revocation Effect</h6>
                            <p class="text-muted small mb-0" style="line-height: 1.6;">
                                Revoking an active consent immediately invalidates the associated Access Grant in the Consent Manager's live introspection registry.
                                Subsequent attempts by the consumer institution to query your academic records will fail closed with <code>HTTP 403 Forbidden</code>.
                                <em>Note: Revocation prevents future access; it cannot recall copies of data that were already lawfully retrieved and stored by the consumer under prior consent.</em>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filter Tabs -->
            <div class="d-flex align-items-center gap-2 mb-3">
                <button class="btn btn-sm ${currentFilter === 'ALL' ? 'btn-success' : 'btn-outline-secondary'} rounded-pill px-3" onclick="window.DF_PAGE_STUDENT_HISTORY.setFilter('ALL')">
                    All Decisions (${list.length})
                </button>
                <button class="btn btn-sm ${currentFilter === 'ACTIVE' ? 'btn-success' : 'btn-outline-secondary'} rounded-pill px-3" onclick="window.DF_PAGE_STUDENT_HISTORY.setFilter('ACTIVE')">
                    Active Grants (${activeCount})
                </button>
                <button class="btn btn-sm ${currentFilter === 'REVOKED' ? 'btn-success' : 'btn-outline-secondary'} rounded-pill px-3" onclick="window.DF_PAGE_STUDENT_HISTORY.setFilter('REVOKED')">
                    Revoked (${revokedCount})
                </button>
            </div>

            <!-- Consent History Table Card -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table df-table table-hover align-middle mb-0">
                            <thead class="table-light text-muted small text-uppercase">
                                <tr>
                                    <th class="ps-3">Consent ID</th>
                                    <th>Requesting Institution</th>
                                    <th>Purpose</th>
                                    <th>Disclosed Fields</th>
                                    <th>Granted Timestamp</th>
                                    <th>Status</th>
                                    <th class="text-end pe-3">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.map(item => {
                                    const consentId = item.id || item.consentId;
                                    const isActive = item.status === 'ACTIVE';
                                    const fields = Array.isArray(item.approvedFields) ? item.approvedFields : [];

                                    return `
                                        <tr>
                                            <td class="ps-3 font-monospace small fw-bold text-success">
                                                ${window.DF_UI.escapeHtml(consentId)}
                                            </td>
                                            <td class="fw-semibold text-dark">
                                                ${window.DF_UI.escapeHtml(item.requesterOrganizationName || item.requesterOrganizationCode || 'Consumer Institution')}
                                            </td>
                                            <td class="small text-secondary" style="max-width: 220px;">
                                                ${window.DF_UI.escapeHtml(item.purpose || 'Verification')}
                                            </td>
                                            <td>
                                                <div class="d-flex flex-wrap gap-1" style="max-width: 260px;">
                                                    ${fields.map(f => `
                                                        <span class="badge bg-light text-dark border font-monospace" style="font-size: 0.68rem;">
                                                            ${window.DF_UI.escapeHtml(f)}
                                                        </span>
                                                    `).join('')}
                                                    ${fields.length === 0 ? '<span class="text-muted small">None</span>' : ''}
                                                </div>
                                            </td>
                                            <td class="small text-muted font-monospace">
                                                ${item.grantedAt ? new Date(item.grantedAt).toLocaleString() : 'N/A'}
                                            </td>
                                            <td>
                                                ${window.DF_UI.renderStatusBadge(item.status)}
                                            </td>
                                            <td class="text-end pe-3">
                                                ${isActive ? `
                                                    <button class="btn btn-sm btn-outline-danger py-1 px-3 d-flex align-items-center gap-1 ms-auto" onclick="window.DF_PAGE_STUDENT_HISTORY.handleRevoke('${window.DF_UI.escapeHtml(consentId)}', '${window.DF_UI.escapeHtml(item.requesterOrganizationName || 'the consumer')}')">
                                                        <i class="bi bi-x-circle"></i> Revoke
                                                    </button>
                                                ` : `
                                                    <span class="text-muted small font-monospace">Sealed</span>
                                                `}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                ${filtered.length === 0 ? `
                                    <tr>
                                        <td colspan="7" class="text-center py-5">
                                            ${window.DF_UI.renderEmptyState({
                                                icon: 'bi-clock-history',
                                                title: 'No Consent Records Found',
                                                description: 'No history records matched the selected filter.'
                                            })}
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function setFilter(filterKey) {
        currentFilter = filterKey;
        const container = document.getElementById('df-main-content');
        if (container) {
            renderView(container, historyRecords);
        }
    }

    function handleRevoke(consentId, institutionName) {
        window.DF_UI.showConfirmDialog({
            title: 'Revoke Consent Access Grant',
            message: `Are you sure you want to revoke consent for ${institutionName}? The Consent Manager will immediately mark the grant as REVOKED, and any future data retrieval attempt will fail closed.`,
            confirmText: 'Yes, Revoke Access Immediately',
            confirmBtnClass: 'btn-danger',
            onConfirm: async () => {
                try {
                    await window.DF_API.student.revokeConsent(consentId);
                    window.DF_UI.showToast(`Consent ${consentId} successfully revoked! Access is now terminated.`, 'success');
                    const container = document.getElementById('df-main-content');
                    render(container);
                } catch (err) {
                    window.DF_UI.showToast(`Revocation failed: ${err.message}`, 'error');
                }
            }
        });
    }

    return {
        render,
        setFilter,
        handleRevoke
    };
})();


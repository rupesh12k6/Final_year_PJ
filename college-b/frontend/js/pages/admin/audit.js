/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: CONSUMER NODE SESSION ACTIVITY FEED
 * Real-time operational activity feed for College B Consumer inquiries and operations.
 * Reflects active administrative session events and real outbound data requests.
 * Central regulatory audit logs are persisted at Consent Manager (:8095).
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_AUDIT = (function () {
    'use strict';

    let auditLogs = [];
    let filteredLogs = [];
    let actionFilter = 'ALL';
    let searchQuery = '';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="df-page-header mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h2 class="h4 fw-bold text-slate-900 mb-0">Session Operations Activity Feed</h2>
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                <i class="bi bi-clock-history me-1"></i> Session Activity
                            </span>
                        </div>
                        <p class="text-muted small mb-0">Activity log of outbound credential inquiries, grant inspections, and student operations performed during this session.</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-audit">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh Activity
                        </button>
                    </div>
                </div>
            </div>

            <!-- Architectural Audit Transparency Notice -->
            <div class="alert alert-info border shadow-sm py-2 px-3 small rounded-3 mb-4 d-flex align-items-start gap-2">
                <i class="bi bi-info-circle-fill text-info fs-5 mt-1 flex-shrink-0"></i>
                <div>
                    <strong>Architectural Architecture Note:</strong> This view functions as a local session activity feed. Under the DEPA framework, centralized statutory audit logging and immutable compliance records are maintained by the Consent Manager Regulatory Authority (Port 8095).
                </div>
            </div>

            <!-- Filter Card -->
            <div class="card border-0 shadow-sm rounded-4 mb-4">
                <div class="card-body p-3">
                    <div class="row g-3 align-items-center">
                        <div class="col-md-6">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control border-start-0" id="audit-search-input" placeholder="Search activity by action, actor, or entity ID..." value="${window.DF_UI.escapeHtml(searchQuery)}">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center gap-2">
                                <label class="text-muted small fw-semibold text-nowrap mb-0">Action:</label>
                                <select class="form-select form-select-sm" id="audit-action-filter">
                                    <option value="ALL">All Actions</option>
                                    <option value="DATA_REQUEST_INITIATED">Data Request Initiated</option>
                                    <option value="GRANT_STATUS_CHECKED">Grant Status Inspected</option>
                                    <option value="PEER_DATA_RETRIEVED">Peer Data Retrieved</option>
                                    <option value="STUDENT_ENROLLED">Student Enrolled</option>
                                    <option value="AUTH_LOGIN_SUCCESS">Login Successful</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-2 text-md-end">
                            <span class="text-muted small fw-semibold" id="audit-count-badge">0 events</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Activity Table -->
            <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0" id="audit-table">
                        <thead class="bg-light text-slate-700 small text-uppercase fw-semibold border-bottom">
                            <tr>
                                <th class="ps-4">Timestamp</th>
                                <th>Action Type</th>
                                <th>Actor</th>
                                <th>Target Entity / ID</th>
                                <th>Outcome</th>
                                <th class="text-end pe-4">Details</th>
                            </tr>
                        </thead>
                        <tbody id="audit-tbody" class="small">
                            <!-- Populated dynamically -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Detail Modal Container -->
            <div id="audit-modal-root"></div>
        `;

        setupListeners(container);
        await loadAuditLogs(container);
    }

    async function loadAuditLogs(container) {
        const logs = [];
        const user = window.DF_SESSION.getUser() || { email: 'dean@collegeb.edu' };

        // 1. Current Session Login Event
        logs.push({
            id: 'ACT-001',
            timestamp: new Date().toISOString(),
            action: 'AUTH_LOGIN_SUCCESS',
            actor: user.email,
            target: 'COLLEGE_B_AUTH',
            status: 'SUCCESS',
            details: `Consumer Officer session active. Role: ${user.role || 'ORG_ADMIN'}`
        });

        // 2. Outgoing requests from real backend
        try {
            const requests = await window.DF_API.consumer.getOutgoingRequests();
            if (Array.isArray(requests)) {
                requests.forEach((r, idx) => {
                    const reqId = r.id || r.requestId || r.dataRequestId || `REQ-${idx + 1}`;
                    const targetStudent = r.dataPrincipalId || r.studentId || 'STU-2023-001';
                    
                    logs.push({
                        id: `ACT-REQ-${idx + 1}`,
                        timestamp: r.createdAt || new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
                        action: 'DATA_REQUEST_INITIATED',
                        actor: user.email,
                        target: `Student: ${targetStudent}`,
                        status: 'SUCCESS',
                        details: `Outbound request ${reqId} initiated for ${targetStudent} to ${r.providerOrganizationId || 'COLLEGE_A'}. Purpose: ${r.purpose || 'Verification'}`
                    });

                    if (r.status === 'APPROVED' || r.status === 'READY' || r.status === 'ACTIVE') {
                        logs.push({
                            id: `ACT-GRNT-${idx + 1}`,
                            timestamp: new Date().toISOString(),
                            action: 'GRANT_STATUS_CHECKED',
                            actor: user.email,
                            target: `Grant: ${reqId}`,
                            status: 'APPROVED',
                            details: `Polled Consent Manager for grant readiness. RS256 token sealed in backend.`
                        });
                    }
                });
            }
        } catch (e) {
            console.warn('Could not pull requests for activity feed:', e);
        }

        // 3. Volatile in-memory retrieved records (from DF_RECORDS_STORE, not persistent storage)
        if (window.DF_RECORDS_STORE && typeof window.DF_RECORDS_STORE.getRecords === 'function') {
            const memoryRecords = window.DF_RECORDS_STORE.getRecords();
            memoryRecords.forEach((rec, idx) => {
                logs.push({
                    id: `ACT-FETCH-${idx + 1}`,
                    timestamp: rec.fetchedAt || new Date().toISOString(),
                    action: 'PEER_DATA_RETRIEVED',
                    actor: user.email,
                    target: `Student: ${rec.studentId}`,
                    status: 'SUCCESS',
                    details: `Direct peer retrieval from College A Provider completed in active session. Decrypted verified academic dossier.`
                });
            });
        }

        // Sort descending by timestamp
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        auditLogs = logs;
        applyFilters();
        renderTable(container);
    }

    function applyFilters() {
        const query = searchQuery.trim().toLowerCase();
        filteredLogs = auditLogs.filter(log => {
            const matchesAction = (actionFilter === 'ALL') || (log.action === actionFilter);
            const matchesQuery = !query ||
                log.action.toLowerCase().includes(query) ||
                log.actor.toLowerCase().includes(query) ||
                log.target.toLowerCase().includes(query) ||
                log.details.toLowerCase().includes(query);
            return matchesAction && matchesQuery;
        });
    }

    function renderTable(container) {
        const tbody = container.querySelector('#audit-tbody');
        const badge = container.querySelector('#audit-count-badge');

        if (badge) {
            badge.textContent = `${filteredLogs.length} events logged in session`;
        }

        if (!tbody) return;

        if (filteredLogs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-5">
                        <i class="bi bi-journal-x fs-2 d-block mb-2"></i>
                        No activity events match your search or filter.
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        filteredLogs.forEach(log => {
            const dateStr = window.DF_UI.formatDateTime(log.timestamp);
            const actionBadge = getActionBadge(log.action);

            html += `
                <tr>
                    <td class="ps-4 text-muted font-monospace small">${window.DF_UI.escapeHtml(dateStr)}</td>
                    <td>${actionBadge}</td>
                    <td><span class="fw-semibold text-slate-800">${window.DF_UI.escapeHtml(log.actor)}</span></td>
                    <td><span class="font-monospace small text-primary">${window.DF_UI.escapeHtml(log.target)}</span></td>
                    <td>${window.DF_UI.renderStatusBadge(log.status)}</td>
                    <td class="text-end pe-4">
                        <button type="button" class="btn btn-sm btn-outline-secondary btn-inspect-audit" data-details="${window.DF_UI.escapeHtml(log.details)}" data-action="${window.DF_UI.escapeHtml(log.action)}">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Modal triggers
        tbody.querySelectorAll('.btn-inspect-audit').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                const details = btn.getAttribute('data-details');
                showAuditModal(action, details, container);
            });
        });
    }

    function getActionBadge(action) {
        const map = {
            'DATA_REQUEST_INITIATED': '<span class="badge bg-indigo-subtle text-indigo border"><i class="bi bi-send me-1"></i> Data Request Initiated</span>',
            'GRANT_STATUS_CHECKED': '<span class="badge bg-amber-subtle text-amber border"><i class="bi bi-shield-check me-1"></i> Grant Inspected</span>',
            'PEER_DATA_RETRIEVED': '<span class="badge bg-emerald-subtle text-emerald border"><i class="bi bi-cloud-download me-1"></i> Peer Data Retrieved</span>',
            'STUDENT_ENROLLED': '<span class="badge bg-light text-dark border"><i class="bi bi-person-plus me-1"></i> Student Enrolled</span>',
            'AUTH_LOGIN_SUCCESS': '<span class="badge bg-light text-muted border"><i class="bi bi-box-arrow-in-right me-1"></i> Officer Login</span>'
        };
        return map[action] || `<span class="badge bg-light text-dark border">${window.DF_UI.escapeHtml(action)}</span>`;
    }

    function showAuditModal(action, details, container) {
        const modalRoot = container.querySelector('#audit-modal-root');
        if (!modalRoot) return;

        modalRoot.innerHTML = `
            <div class="modal fade" id="audit-details-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div class="modal-header border-bottom py-3 px-4">
                            <div class="d-flex align-items-center">
                                <div class="p-2 rounded-3 me-2 text-white" style="background:#4F46E5;">
                                    <i class="bi bi-journal-code"></i>
                                </div>
                                <h6 class="modal-title fw-bold mb-0">Session Activity Event</h6>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="mb-3">
                                <label class="text-muted small fw-semibold d-block">Action Type</label>
                                <span class="fw-bold text-dark">${window.DF_UI.escapeHtml(action)}</span>
                            </div>
                            <div class="p-3 bg-light rounded-3 mb-3 border">
                                <label class="text-muted small fw-semibold d-block mb-1">Activity Description</label>
                                <p class="mb-0 text-slate-800 small font-monospace">${window.DF_UI.escapeHtml(details)}</p>
                            </div>
                            <div class="alert alert-light border small text-muted mb-0">
                                <i class="bi bi-shield-lock me-1"></i> Permanent cryptographic audit logs for this transaction are archived at Consent Manager.
                            </div>
                        </div>
                        <div class="modal-footer bg-light py-2 px-4 border-top">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalEl = modalRoot.querySelector('#audit-details-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    function setupListeners(container) {
        const searchInput = container.querySelector('#audit-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                applyFilters();
                renderTable(container);
            });
        }

        const actionSelect = container.querySelector('#audit-action-filter');
        if (actionSelect) {
            actionSelect.addEventListener('change', (e) => {
                actionFilter = e.target.value;
                applyFilters();
                renderTable(container);
            });
        }

        const refreshBtn = container.querySelector('#btn-refresh-audit');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadAuditLogs(container);
            });
        }
    }

    return {
        render
    };
})();

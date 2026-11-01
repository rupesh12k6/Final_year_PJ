/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: OUTBOUND DATA REQUESTS TRACKER
 * Track outgoing data inquiries, check consent status, inspect grant metadata,
 * and securely trigger peer data retrieval from College A Provider.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_REQUESTS = (function () {
    'use strict';

    let allRequests = [];
    let filteredRequests = [];
    let statusFilter = 'ALL';
    let searchQuery = '';
    let currentPage = 1;
    const pageSize = 10;

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="df-page-header mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h2 class="h4 fw-bold text-slate-900 mb-0">Outbound Data Requests Tracker</h2>
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                <i class="bi bi-send-check me-1"></i> Inquiries & Grants
                            </span>
                        </div>
                        <p class="text-muted small mb-0">Real-time tracking of academic credential inquiries dispatched to Consent Manager and Provider nodes.</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-requests">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                        <a href="#/admin/new-request" class="btn btn-sm btn-primary" style="background-color: #4F46E5; border-color: #4F46E5;">
                            <i class="bi bi-plus-lg me-1"></i> Initiate New Request
                        </a>
                    </div>
                </div>
            </div>

            <!-- Filter & Search Controls -->
            <div class="card border-0 shadow-sm rounded-4 mb-4">
                <div class="card-body p-3">
                    <div class="row g-3 align-items-center">
                        <div class="col-md-6">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control border-start-0" id="requests-search-input" placeholder="Search by student ID, request ID, or purpose..." value="${window.DF_UI.escapeHtml(searchQuery)}">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center gap-2">
                                <label class="text-muted small fw-semibold text-nowrap mb-0">Status:</label>
                                <select class="form-select form-select-sm" id="requests-status-filter">
                                    <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
                                    <option value="PENDING" ${statusFilter === 'PENDING' ? 'selected' : ''}>Pending Consent</option>
                                    <option value="APPROVED" ${statusFilter === 'APPROVED' ? 'selected' : ''}>Approved / Ready</option>
                                    <option value="REJECTED" ${statusFilter === 'REJECTED' ? 'selected' : ''}>Rejected</option>
                                    <option value="REVOKED" ${statusFilter === 'REVOKED' ? 'selected' : ''}>Revoked</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-2 text-md-end">
                            <span class="text-muted small fw-semibold" id="requests-count-badge">0 requests</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loading Skeleton -->
            <div id="requests-loading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="text-muted small mt-2">Querying outgoing requests from Consent Manager...</div>
            </div>

            <!-- Table Card Container -->
            <div id="requests-table-container" class="d-none">
                <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="requests-table">
                            <thead class="bg-light text-slate-700 small text-uppercase fw-semibold border-bottom">
                                <tr>
                                    <th class="ps-4">Request ID</th>
                                    <th>Student ID</th>
                                    <th>Provider Node</th>
                                    <th>Purpose</th>
                                    <th>Requested Fields</th>
                                    <th>Consent Status</th>
                                    <th>Timestamp</th>
                                    <th class="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="requests-tbody" class="small">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                    <div class="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center" id="requests-pagination">
                        <!-- Pagination controls -->
                    </div>
                </div>
            </div>

            <!-- Empty State Container -->
            <div id="requests-empty" class="d-none"></div>

            <!-- Grant Inspection & Data Fetch Modals Container -->
            <div id="requests-modals-root"></div>
        `;

        setupListeners(container);
        await loadRequests(container);
    }

    async function loadRequests(container) {
        const loadingEl = container.querySelector('#requests-loading');
        const tableContainerEl = container.querySelector('#requests-table-container');
        const emptyEl = container.querySelector('#requests-empty');
        const countBadge = container.querySelector('#requests-count-badge');

        if (loadingEl) loadingEl.classList.remove('d-none');
        if (tableContainerEl) tableContainerEl.classList.add('d-none');
        if (emptyEl) emptyEl.classList.add('d-none');
        if (countBadge) {
            countBadge.innerHTML = '<span class="spinner-border spinner-border-sm me-1 text-muted" role="status"></span><span class="text-muted small">Loading...</span>';
        }

        try {
            const data = await window.DF_API.consumer.getOutgoingRequests();
            allRequests = Array.isArray(data) ? data : [];
            applyFilters();
            renderTable(container);
        } catch (err) {
            if (loadingEl) loadingEl.classList.add('d-none');
            if (countBadge) {
                countBadge.innerHTML = '<span class="badge bg-danger-subtle text-danger border border-danger-subtle small fw-semibold">Error Loading</span>';
            }
            if (emptyEl) {
                emptyEl.classList.remove('d-none');
                emptyEl.innerHTML = window.DF_UI.renderErrorState({
                    title: 'Failed to Load Outgoing Requests',
                    message: `Could not retrieve outgoing data requests from backend: ${window.DF_UI.escapeHtml(err.message)}`,
                    onRetry: () => loadRequests(container)
                });
            }
        }
    }

    function applyFilters() {
        const query = searchQuery.trim().toLowerCase();
        filteredRequests = allRequests.filter(req => {
            const reqId = String(req.id || req.requestId || req.dataRequestId || '').toLowerCase();
            const studentId = String(req.dataPrincipalId || req.studentId || '').toLowerCase();
            const purpose = String(req.purpose || '').toLowerCase();
            const provider = String(req.providerOrganizationId || req.providerOrganizationCode || '').toLowerCase();
            const status = String(req.status || '').toUpperCase();

            const matchesQuery = !query || reqId.includes(query) || studentId.includes(query) || purpose.includes(query) || provider.includes(query);
            
            let matchesStatus = true;
            if (statusFilter !== 'ALL') {
                if (statusFilter === 'APPROVED') {
                    matchesStatus = (status === 'APPROVED' || status === 'READY');
                } else {
                    matchesStatus = (status === statusFilter);
                }
            }

            return matchesQuery && matchesStatus;
        });
        currentPage = 1;
    }

    function renderTable(container) {
        const loadingEl = container.querySelector('#requests-loading');
        const tableContainerEl = container.querySelector('#requests-table-container');
        const emptyEl = container.querySelector('#requests-empty');
        const countBadge = container.querySelector('#requests-count-badge');
        const tbody = container.querySelector('#requests-tbody');
        const pagination = container.querySelector('#requests-pagination');

        if (loadingEl) loadingEl.classList.add('d-none');

        if (countBadge) {
            countBadge.textContent = `${filteredRequests.length} of ${allRequests.length} requests`;
        }

        if (filteredRequests.length === 0) {
            if (tableContainerEl) tableContainerEl.classList.add('d-none');
            if (emptyEl) {
                emptyEl.classList.remove('d-none');
                emptyEl.innerHTML = window.DF_UI.renderEmptyState({
                    title: allRequests.length === 0 ? 'No Outgoing Data Requests' : 'No Matching Requests',
                    message: allRequests.length === 0 
                        ? 'College B has not initiated any academic credential inquiries yet.' 
                        : 'No requests matched your active filter or search query.',
                    icon: 'bi-send-dash',
                    actionText: allRequests.length === 0 ? 'Initiate First Request' : 'Clear Filters',
                    actionHref: allRequests.length === 0 ? '#/admin/new-request' : '#',
                    actionId: 'btn-empty-action'
                });
                const emptyActionBtn = emptyEl.querySelector('#btn-empty-action');
                if (emptyActionBtn && allRequests.length > 0) {
                    emptyActionBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        searchQuery = '';
                        statusFilter = 'ALL';
                        const searchInput = container.querySelector('#requests-search-input');
                        const statusSelect = container.querySelector('#requests-status-filter');
                        if (searchInput) searchInput.value = '';
                        if (statusSelect) statusSelect.value = 'ALL';
                        applyFilters();
                        renderTable(container);
                    });
                }
            }
            return;
        }

        if (emptyEl) emptyEl.classList.add('d-none');
        if (tableContainerEl) tableContainerEl.classList.remove('d-none');

        // Pagination slice
        const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const startIdx = (currentPage - 1) * pageSize;
        const pageItems = filteredRequests.slice(startIdx, startIdx + pageSize);

        let rowsHtml = '';
        pageItems.forEach(req => {
            const reqId = req.id || req.requestId || req.dataRequestId || '—';
            const studentId = req.dataPrincipalId || req.studentId || '—';
            const provider = req.providerOrganizationId || req.providerOrganizationCode || 'COLLEGE_A';
            const purpose = req.purpose || 'Verification';
            const status = (req.status || 'PENDING').toUpperCase();
            const createdAt = req.createdAt ? window.DF_UI.formatDateTime(req.createdAt) : 'Recent';

            // Requested Fields chips
            let fields = req.requestedFields || [];
            if (typeof fields === 'string') {
                fields = fields.replace(/[{}"]/g, '').split(',').map(s => s.trim());
            }
            const fieldsHtml = fields.length > 0 
                ? fields.slice(0, 3).map(f => `<span class="badge bg-light text-dark border me-1">${window.DF_UI.escapeHtml(f)}</span>`).join('') + (fields.length > 3 ? `<span class="badge bg-light text-muted border">+${fields.length - 3}</span>` : '')
                : '<span class="text-muted small">All Academic</span>';

            const isApproved = (status === 'APPROVED' || status === 'READY');

            rowsHtml += `
                <tr>
                    <td class="ps-4">
                        <span class="font-monospace fw-semibold text-primary">${window.DF_UI.escapeHtml(String(reqId).substring(0, 16))}</span>
                    </td>
                    <td>
                        <span class="font-monospace fw-bold text-dark">${window.DF_UI.escapeHtml(studentId)}</span>
                    </td>
                    <td>
                        <span class="badge bg-emerald-subtle text-emerald border px-2 py-1 rounded-pill small" style="background:#ECFDF5; color:#065F46; border-color:#A7F3D0;">
                            <i class="bi bi-bank me-1"></i> ${window.DF_UI.escapeHtml(provider)}
                        </span>
                    </td>
                    <td>
                        <span class="text-truncate d-inline-block" style="max-width: 180px;" title="${window.DF_UI.escapeHtml(purpose)}">
                            ${window.DF_UI.escapeHtml(purpose)}
                        </span>
                    </td>
                    <td>${fieldsHtml}</td>
                    <td>${window.DF_UI.renderStatusBadge(status)}</td>
                    <td class="text-muted small">${window.DF_UI.escapeHtml(createdAt)}</td>
                    <td class="text-end pe-4">
                        <div class="btn-group btn-group-sm">
                            <button type="button" class="btn btn-outline-secondary btn-inspect-status" data-req-id="${window.DF_UI.escapeHtml(reqId)}" title="Inspect Grant Status">
                                <i class="bi bi-info-circle me-1"></i> Status
                            </button>
                            ${isApproved ? `
                                <button type="button" class="btn btn-primary btn-fetch-data" data-req-id="${window.DF_UI.escapeHtml(reqId)}" style="background-color: #4F46E5; border-color: #4F46E5;" title="Fetch Authorized Data">
                                    <i class="bi bi-cloud-arrow-down-fill me-1"></i> Fetch
                                </button>
                            ` : `
                                <button type="button" class="btn btn-outline-secondary" disabled title="Awaiting Student Approval">
                                    <i class="bi bi-clock me-1"></i> Awaiting
                                </button>
                            `}
                        </div>
                    </td>
                </tr>
            `;
        });

        if (tbody) tbody.innerHTML = rowsHtml;

        // Render Pagination Controls
        if (pagination) {
            pagination.innerHTML = `
                <span class="text-muted small">
                    Showing <strong>${startIdx + 1}</strong> to <strong>${Math.min(startIdx + pageSize, filteredRequests.length)}</strong> of <strong>${filteredRequests.length}</strong>
                </span>
                <nav aria-label="Table pagination">
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                            <button class="page-link" id="btn-page-prev"><i class="bi bi-chevron-left"></i></button>
                        </li>
                        <li class="page-item disabled">
                            <span class="page-link text-dark fw-semibold">${currentPage} / ${totalPages}</span>
                        </li>
                        <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
                            <button class="page-link" id="btn-page-next"><i class="bi bi-chevron-right"></i></button>
                        </li>
                    </ul>
                </nav>
            `;

            const prevBtn = pagination.querySelector('#btn-page-prev');
            const nextBtn = pagination.querySelector('#btn-page-next');
            if (prevBtn && currentPage > 1) {
                prevBtn.addEventListener('click', () => {
                    currentPage--;
                    renderTable(container);
                });
            }
            if (nextBtn && currentPage < totalPages) {
                nextBtn.addEventListener('click', () => {
                    currentPage++;
                    renderTable(container);
                });
            }
        }

        // Attach action handlers for inspect and fetch
        container.querySelectorAll('.btn-inspect-status').forEach(btn => {
            btn.addEventListener('click', () => {
                const reqId = btn.getAttribute('data-req-id');
                inspectGrantStatus(reqId, container);
            });
        });

        container.querySelectorAll('.btn-fetch-data').forEach(btn => {
            btn.addEventListener('click', () => {
                const reqId = btn.getAttribute('data-req-id');
                fetchAuthorizedData(reqId, container);
            });
        });
    }

    async function inspectGrantStatus(dataRequestId, container) {
        const modalsRoot = container.querySelector('#requests-modals-root');
        if (!modalsRoot) return;

        // Render initial loading modal
        modalsRoot.innerHTML = `
            <div class="modal fade" id="grant-status-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div class="modal-header border-bottom py-3 px-4">
                            <div class="d-flex align-items-center">
                                <div class="p-2 rounded-3 me-2 text-white" style="background:#4F46E5;">
                                    <i class="bi bi-shield-check"></i>
                                </div>
                                <h6 class="modal-title fw-bold mb-0">Consent Grant Inspection</h6>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-4 text-center" id="grant-modal-body">
                            <div class="spinner-border text-primary" role="status"></div>
                            <p class="text-muted small mt-2 mb-0">Querying Consent Manager for cryptographic grant status...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalEl = modalsRoot.querySelector('#grant-status-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        try {
            const statusData = await window.DF_API.consumer.getGrantStatus(dataRequestId);
            const modalBody = modalEl.querySelector('#grant-modal-body');
            if (!modalBody) return;

            const isReady = statusData.ready || statusData.status === 'APPROVED' || statusData.status === 'READY';
            const status = String(statusData.status || 'PENDING').toUpperCase();

            let approvedFieldsBadges = 'None specified';
            if (statusData.approvedFields && Array.isArray(statusData.approvedFields)) {
                approvedFieldsBadges = statusData.approvedFields.map(f => `<span class="badge bg-indigo-subtle text-indigo border me-1 mb-1">${window.DF_UI.escapeHtml(f)}</span>`).join('');
            } else if (typeof statusData.approvedFields === 'string') {
                approvedFieldsBadges = `<span class="badge bg-indigo-subtle text-indigo border">${window.DF_UI.escapeHtml(statusData.approvedFields)}</span>`;
            }

            modalBody.innerHTML = `
                <div class="text-start">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <span class="text-muted small fw-semibold">Grant State</span>
                        ${window.DF_UI.renderStatusBadge(status)}
                    </div>
                    <div class="p-3 bg-light rounded-3 mb-3">
                        <div class="mb-2">
                            <label class="text-muted small fw-semibold d-block">Data Request ID</label>
                            <code class="text-slate-800">${window.DF_UI.escapeHtml(dataRequestId)}</code>
                        </div>
                        <div class="mb-2">
                            <label class="text-muted small fw-semibold d-block">Consent Grant ID</label>
                            <code class="text-slate-800">${statusData.grantId ? window.DF_UI.escapeHtml(statusData.grantId) : '<span class="text-muted">Not generated yet</span>'}</code>
                        </div>
                        <div class="mb-2">
                            <label class="text-muted small fw-semibold d-block">Provider Node</label>
                            <span class="badge bg-light text-dark border">${window.DF_UI.escapeHtml(statusData.providerOrganizationCode || 'COLLEGE_A')}</span>
                        </div>
                        <div class="mb-2">
                            <label class="text-muted small fw-semibold d-block">Approved Academic Fields</label>
                            <div>${approvedFieldsBadges}</div>
                        </div>
                        <div>
                            <label class="text-muted small fw-semibold d-block">Grant Expiry</label>
                            <span class="small text-slate-700">${statusData.expiresAt ? window.DF_UI.formatDateTime(statusData.expiresAt) : 'Pending generation'}</span>
                        </div>
                    </div>

                    <!-- Security Assurance Notice -->
                    <div class="alert alert-info py-2 px-3 small rounded-3 mb-3 d-flex align-items-start gap-2">
                        <i class="bi bi-shield-lock-fill fs-6 mt-1 flex-shrink-0 text-info"></i>
                        <div>
                            <strong>Access Token Confidentiality:</strong> The RS256 token is sealed securely inside College B backend. It is never transmitted to or cached within browser storage.
                        </div>
                    </div>

                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        ${isReady ? `
                            <button type="button" class="btn btn-sm btn-primary" id="btn-modal-trigger-fetch" style="background:#4F46E5; border-color:#4F46E5;">
                                <i class="bi bi-cloud-arrow-down-fill me-1"></i> Retrieve Academic Data
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;

            const triggerFetchBtn = modalBody.querySelector('#btn-modal-trigger-fetch');
            if (triggerFetchBtn) {
                triggerFetchBtn.addEventListener('click', () => {
                    modal.hide();
                    fetchAuthorizedData(dataRequestId, container);
                });
            }
        } catch (err) {
            const modalBody = modalEl.querySelector('#grant-modal-body');
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="text-danger mb-3"><i class="bi bi-exclamation-circle-fill display-5"></i></div>
                    <h6 class="fw-bold text-danger">Grant Inspection Failed</h6>
                    <p class="text-muted small mb-3">${window.DF_UI.escapeHtml(err.message)}</p>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                `;
            }
        }
    }

    async function fetchAuthorizedData(dataRequestId, container) {
        const modalsRoot = container.querySelector('#requests-modals-root');
        if (!modalsRoot) return;

        modalsRoot.innerHTML = `
            <div class="modal fade" id="fetch-data-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div class="modal-header border-bottom py-3 px-4">
                            <div class="d-flex align-items-center">
                                <div class="p-2 rounded-3 me-2 text-white" style="background:#4F46E5;">
                                    <i class="bi bi-cloud-download-fill"></i>
                                </div>
                                <h6 class="modal-title fw-bold mb-0">Peer Academic Credential Retrieval</h6>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-4 text-center" id="fetch-modal-body">
                            <div class="spinner-border text-primary mb-3" role="status"></div>
                            <h6 class="fw-bold text-dark">Connecting to Provider Node (College A)...</h6>
                            <p class="text-muted small mb-0">College B backend is presenting the verified RS256 token to retrieve student records directly.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalEl = modalsRoot.querySelector('#fetch-data-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        try {
            const result = await window.DF_API.consumer.fetchAuthorizedData(dataRequestId);
            const modalBody = modalEl.querySelector('#fetch-modal-body');
            if (!modalBody) return;

            const retrieved = result.retrievedData || {};
            const approvedFields = result.approvedFields || [];

            // Hold decrypted academic record strictly in volatile memory (never in persistent browser storage)
            if (window.DF_RECORDS_STORE) {
                window.DF_RECORDS_STORE.addRecord({
                    dataRequestId,
                    grantId: result.grantId,
                    fetchedAt: new Date().toISOString(),
                    studentId: retrieved.studentId || retrieved.dataPrincipalId || '—',
                    name: retrieved.name || retrieved.fullName || '—',
                    department: retrieved.department || '—',
                    cgpa: retrieved.cgpa || '—',
                    degree: retrieved.degree || '—',
                    data: retrieved
                });
            }

            modalBody.innerHTML = `
                <div class="text-start">
                    <div class="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-4">
                        <i class="bi bi-check-circle-fill fs-5 text-success"></i>
                        <div>
                            <strong>Direct Peer Retrieval Successful:</strong> Academic data retrieved securely from Provider using CM Access Grant.
                        </div>
                    </div>

                    <div class="card border-0 bg-light rounded-3 p-3 mb-4">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="fw-bold text-slate-800">Verified Academic Dossier</span>
                            <span class="badge bg-emerald-subtle text-emerald border px-2 py-1 rounded-pill small" style="background:#ECFDF5; color:#065F46; border-color:#A7F3D0;">
                                <i class="bi bi-patch-check-fill me-1"></i> Provider Authenticated
                            </span>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="text-muted small fw-semibold d-block">Student ID</label>
                                <span class="font-monospace fw-bold text-dark">${window.DF_UI.escapeHtml(retrieved.studentId || retrieved.dataPrincipalId || '—')}</span>
                            </div>
                            <div class="col-md-6">
                                <label class="text-muted small fw-semibold d-block">Student Name</label>
                                <span class="fw-semibold text-dark">${window.DF_UI.escapeHtml(retrieved.name || retrieved.fullName || '—')}</span>
                            </div>
                            <div class="col-md-6">
                                <label class="text-muted small fw-semibold d-block">Department / Major</label>
                                <span>${window.DF_UI.escapeHtml(retrieved.department || retrieved.program || '—')}</span>
                            </div>
                            <div class="col-md-6">
                                <label class="text-muted small fw-semibold d-block">Cumulative GPA (CGPA)</label>
                                <span class="badge bg-indigo-subtle text-indigo border fw-bold fs-6">${window.DF_UI.escapeHtml(retrieved.cgpa || '—')}</span>
                            </div>
                            <div class="col-md-6">
                                <label class="text-muted small fw-semibold d-block">Degree Program</label>
                                <span>${window.DF_UI.escapeHtml(retrieved.degree || '—')}</span>
                            </div>
                            <div class="col-md-6">
                                <label class="text-muted small fw-semibold d-block">Approved Fields</label>
                                <div>
                                    ${Array.isArray(approvedFields) ? approvedFields.map(f => `<span class="badge bg-white text-dark border me-1">${window.DF_UI.escapeHtml(f)}</span>`).join('') : window.DF_UI.escapeHtml(String(approvedFields))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- JSON Raw Payload Inspector -->
                    <div class="accordion mb-4" id="accordionRawData">
                        <div class="accordion-item border-0 shadow-sm rounded-3 overflow-hidden">
                            <h2 class="accordion-header">
                                <button class="accordion-button collapsed py-2 px-3 bg-white text-muted small fw-semibold" type="button" data-bs-toggle="collapse" data-bs-target="#collapseRawJson">
                                    <i class="bi bi-code-slash me-2"></i> View Raw Encrypted-Decrypted Response
                                </button>
                            </h2>
                            <div id="collapseRawJson" class="accordion-collapse collapse" data-bs-parent="#accordionRawData">
                                <div class="accordion-body bg-dark text-light p-3">
                                    <pre class="mb-0 font-monospace small" style="max-height: 200px; overflow-y: auto;"><code>${window.DF_UI.escapeHtml(JSON.stringify(retrieved, null, 2))}</code></pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-end gap-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        <a href="#/admin/records" class="btn btn-sm btn-primary" style="background:#4F46E5; border-color:#4F46E5;" data-bs-dismiss="modal">
                            <i class="bi bi-mortarboard-fill me-1"></i> View in Retrieved Records
                        </a>
                    </div>
                </div>
            `;
            window.DF_UI.showToast('Academic data retrieved successfully from College A!', 'success');
        } catch (err) {
            const modalBody = modalEl.querySelector('#fetch-modal-body');
            if (modalBody) {
                modalBody.innerHTML = `
                    <div class="text-danger mb-3"><i class="bi bi-shield-x display-5"></i></div>
                    <h6 class="fw-bold text-danger">Data Retrieval Failed</h6>
                    <p class="text-muted small mb-3">${window.DF_UI.escapeHtml(err.message)}</p>
                    <div class="alert alert-light border small text-muted text-start mb-3">
                        Possible causes:
                        <ul class="mb-0 ps-3">
                            <li>Student has not approved the consent request yet.</li>
                            <li>The RS256 Access Token has expired.</li>
                            <li>SSRF protection blocked the provider URL endpoint.</li>
                        </ul>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                `;
            }
        }
    }

    function setupListeners(container) {
        const searchInput = container.querySelector('#requests-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                applyFilters();
                renderTable(container);
            });
        }

        const statusSelect = container.querySelector('#requests-status-filter');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                statusFilter = e.target.value;
                applyFilters();
                renderTable(container);
            });
        }

        const refreshBtn = container.querySelector('#btn-refresh-requests');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadRequests(container);
            });
        }
    }

    return {
        render
    };
})();


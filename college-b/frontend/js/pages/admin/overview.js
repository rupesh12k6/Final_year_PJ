/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: CONSUMER OFFICER OVERVIEW DASHBOARD
 * Displays live metrics, status distribution, and recent outbound requests.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_OVERVIEW = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="df-page-header mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h2 class="h4 fw-bold text-slate-900 mb-0">Consumer Overview</h2>
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                <i class="bi bi-building me-1"></i> Data Consumer Node
                            </span>
                        </div>
                        <p class="text-muted small mb-0">Monitor outgoing academic inquiries, student consent decisions, and verified peer retrievals.</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-overview">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                        <a href="#/admin/new-request" class="btn btn-sm btn-primary" style="background-color: #4F46E5; border-color: #4F46E5;">
                            <i class="bi bi-plus-lg me-1"></i> Initiate Data Request
                        </a>
                    </div>
                </div>
            </div>

            <!-- Hero Banner -->
            <div class="card border-0 mb-4 rounded-4 shadow-sm text-white overflow-hidden" style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4F46E5 100%);">
                <div class="card-body p-4 position-relative">
                    <div class="row align-items-center">
                        <div class="col-lg-8">
                            <span class="badge bg-white text-dark mb-2 px-3 py-1 rounded-pill small fw-semibold">
                                <i class="bi bi-shield-check text-success me-1"></i> DEPA Consumer Node Active
                            </span>
                            <h3 class="fw-bold mb-2 text-white">College B University Inquirer System</h3>
                            <p class="mb-3 text-indigo-100" style="color: #E0E7FF; max-width: 650px;">
                                You are signed in as Consumer Inquirer Officer. Initiate cross-institutional academic credential requests, track student consent lifecycles, and retrieve verified student dossiers.
                            </p>
                            <div class="d-flex gap-2 flex-wrap">
                                <a href="#/admin/new-request" class="btn btn-light btn-sm fw-semibold text-indigo">
                                    <i class="bi bi-send-plus-fill me-1"></i> New Request
                                </a>
                                <a href="#/admin/requests" class="btn btn-outline-light btn-sm fw-semibold">
                                    <i class="bi bi-list-check me-1"></i> Track Requests
                                </a>
                                <a href="#/admin/records" class="btn btn-outline-light btn-sm fw-semibold">
                                    <i class="bi bi-mortarboard me-1"></i> Retrieved Credentials
                                </a>
                            </div>
                        </div>
                        <div class="col-lg-4 text-end d-none d-lg-block">
                            <i class="bi bi-file-earmark-lock2-fill display-1" style="color: rgba(255,255,255,0.15);"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loading Spinner -->
            <div id="overview-loading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="text-muted small mt-2">Loading live consumer metrics...</div>
            </div>

            <!-- Stats Grid -->
            <div id="overview-content" class="d-none">
                <div class="row g-3 mb-4" id="stats-grid">
                    <!-- Populated dynamically -->
                </div>

                <!-- Recent Activity & Quick Breakdown -->
                <div class="row g-3">
                    <div class="col-lg-8">
                        <div class="card border-0 shadow-sm rounded-4 h-100">
                            <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                                <h6 class="fw-bold text-slate-800 mb-0">
                                    <i class="bi bi-clock-history text-indigo me-2"></i>Recent Outbound Inquiries
                                </h6>
                                <a href="#/admin/requests" class="small text-decoration-none text-indigo fw-semibold">
                                    View All <i class="bi bi-arrow-right"></i>
                                </a>
                            </div>
                            <div class="card-body p-0">
                                <div class="table-responsive">
                                    <table class="table table-hover align-middle mb-0">
                                        <thead class="table-light">
                                            <tr class="small text-muted">
                                                <th class="ps-4">Request ID</th>
                                                <th>Student ID</th>
                                                <th>Provider</th>
                                                <th>Purpose</th>
                                                <th>Status</th>
                                                <th class="text-end pe-4">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody id="recent-requests-tbody">
                                            <!-- Rows populated dynamically -->
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="card border-0 shadow-sm rounded-4 h-100">
                            <div class="card-header bg-white border-bottom py-3 px-4">
                                <h6 class="fw-bold text-slate-800 mb-0">
                                    <i class="bi bi-pie-chart text-indigo me-2"></i>Consent Status Distribution
                                </h6>
                            </div>
                            <div class="card-body p-4" id="status-breakdown-card">
                                <!-- Status distribution bars populated dynamically -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const refreshBtn = container.querySelector('#btn-refresh-overview');
        refreshBtn.addEventListener('click', () => loadData(container));

        await loadData(container);
    }

    async function loadData(container) {
        const loadingEl = container.querySelector('#overview-loading');
        const contentEl = container.querySelector('#overview-content');
        const statsGrid = container.querySelector('#stats-grid');
        const recentTbody = container.querySelector('#recent-requests-tbody');
        const statusBreakdown = container.querySelector('#status-breakdown-card');

        loadingEl.classList.remove('d-none');
        contentEl.classList.add('d-none');

        try {
            const [outboundRequests, studentsList] = await Promise.all([
                window.DF_API.consumer.getOutgoingRequests().catch(() => []),
                window.DF_API.students.getAll().catch(() => [])
            ]);

            const requests = Array.isArray(outboundRequests) ? outboundRequests : [];
            const students = Array.isArray(studentsList) ? studentsList : [];

            const totalRequests = requests.length;
            const pendingRequests = requests.filter(r => {
                const s = String(r.status || '').toUpperCase();
                return s === 'REQUESTED' || s === 'PENDING';
            }).length;

            const approvedRequests = requests.filter(r => {
                const s = String(r.status || '').toUpperCase();
                return s === 'APPROVED' || s === 'READY';
            }).length;

            const rejectedRequests = requests.filter(r => {
                const s = String(r.status || '').toUpperCase();
                return s === 'REJECTED' || s === 'REVOKED';
            }).length;

            // Render StatCards
            statsGrid.innerHTML = `
                <div class="col-xl-3 col-sm-6">
                    ${window.DF_UI.renderStatCard({
                        title: 'Total Outbound Requests',
                        value: totalRequests,
                        icon: 'bi-send-fill',
                        color: 'indigo',
                        trend: 'All time inquiries',
                        trendUp: true
                    })}
                </div>
                <div class="col-xl-3 col-sm-6">
                    ${window.DF_UI.renderStatCard({
                        title: 'Pending Student Consents',
                        value: pendingRequests,
                        icon: 'bi-clock-fill',
                        color: 'amber',
                        trend: 'Awaiting student review',
                        trendUp: false
                    })}
                </div>
                <div class="col-xl-3 col-sm-6">
                    ${window.DF_UI.renderStatCard({
                        title: 'Authorized Grants Ready',
                        value: approvedRequests,
                        icon: 'bi-patch-check-fill',
                        color: 'emerald',
                        trend: 'Ready for peer retrieval',
                        trendUp: true
                    })}
                </div>
                <div class="col-xl-3 col-sm-6">
                    ${window.DF_UI.renderStatCard({
                        title: 'Registered Local Students',
                        value: students.length,
                        icon: 'bi-mortarboard-fill',
                        color: 'blue',
                        trend: 'Enrolled in College B',
                        trendUp: true
                    })}
                </div>
            `;

            // Render Recent Requests Table
            if (requests.length === 0) {
                recentTbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4 text-muted small">
                            <i class="bi bi-inbox fs-3 d-block mb-1"></i>
                            No outgoing data requests recorded yet. Click "Initiate Data Request" to start.
                        </td>
                    </tr>
                `;
            } else {
                const recent = requests.slice(0, 5);
                recentTbody.innerHTML = recent.map(r => {
                    const reqId = r.id || r.dataRequestId || '—';
                    const stuId = r.dataPrincipalId || r.studentId || '—';
                    const prov = r.providerOrganizationId || r.providerOrganizationCode || 'COLLEGE_A';
                    const purpose = r.purpose || 'Verification';
                    const status = r.status || 'REQUESTED';

                    return `
                        <tr class="small">
                            <td class="ps-4 fw-mono text-dark fw-semibold">${window.DF_UI.escapeHtml(reqId)}</td>
                            <td><span class="badge bg-light text-dark border">${window.DF_UI.escapeHtml(stuId)}</span></td>
                            <td><span class="badge bg-indigo-subtle text-indigo">${window.DF_UI.escapeHtml(prov)}</span></td>
                            <td class="text-truncate" style="max-width: 180px;">${window.DF_UI.escapeHtml(purpose)}</td>
                            <td>${window.DF_UI.renderStatusBadge(status)}</td>
                            <td class="text-end pe-4">
                                <a href="#/admin/requests" class="btn btn-xs btn-outline-primary py-1 px-2" style="font-size:0.75rem;">
                                    Track <i class="bi bi-arrow-right"></i>
                                </a>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            // Render Status Distribution Breakdown
            const pct = (cnt) => totalRequests > 0 ? Math.round((cnt / totalRequests) * 100) : 0;
            statusBreakdown.innerHTML = `
                <div class="mb-3">
                    <div class="d-flex justify-content-between small fw-semibold mb-1">
                        <span class="text-emerald"><i class="bi bi-check-circle me-1"></i>Approved / Ready</span>
                        <span>${approvedRequests} (${pct(approvedRequests)}%)</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-success" style="width: ${pct(approvedRequests)}%"></div>
                    </div>
                </div>

                <div class="mb-3">
                    <div class="d-flex justify-content-between small fw-semibold mb-1">
                        <span class="text-amber"><i class="bi bi-clock me-1"></i>Pending Student Consent</span>
                        <span>${pendingRequests} (${pct(pendingRequests)}%)</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-warning" style="width: ${pct(pendingRequests)}%"></div>
                    </div>
                </div>

                <div class="mb-4">
                    <div class="d-flex justify-content-between small fw-semibold mb-1">
                        <span class="text-danger"><i class="bi bi-x-circle me-1"></i>Rejected / Revoked</span>
                        <span>${rejectedRequests} (${pct(rejectedRequests)}%)</span>
                    </div>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar bg-danger" style="width: ${pct(rejectedRequests)}%"></div>
                    </div>
                </div>

                <div class="p-3 bg-light rounded-3 small text-muted border">
                    <div class="fw-semibold text-dark mb-1"><i class="bi bi-info-circle text-primary me-1"></i>Consent Lifecycle Protocol</div>
                    Requests remain in <strong>PENDING</strong> until approved by the student on the Provider portal. Authorized grants yield cryptographic Access JWTs for peer data retrieval.
                </div>
            `;

            loadingEl.classList.add('d-none');
            contentEl.classList.remove('d-none');
        } catch (err) {
            loadingEl.innerHTML = `
                <div class="alert alert-danger mx-auto" style="max-width: 500px;">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>Failed to load overview data: ${err.message}
                </div>
            `;
        }
    }

    return { render };
})();


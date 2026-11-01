/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — SUPER ADMIN: OVERVIEW DASHBOARD
 * Real metrics, system statistics, recent activity, and participant matrix.
 * ==============================================================================
 */

window.DF_PAGE_SA_OVERVIEW = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        // Render loading state initially
        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Federation Governance Overview...')}
            </div>
        `;

        try {
            // Fetch live metrics, registered organizations, and recent audit activity in parallel
            const [metrics, orgs, auditLogs] = await Promise.all([
                window.DF_API.admin.getMetrics().catch(() => null),
                window.DF_API.admin.getOrganizations().catch(() => []),
                window.DF_API.audit.getAll().catch(() => [])
            ]);

            const totalOrgs = (metrics && typeof metrics.totalOrganizations === 'number') ? metrics.totalOrganizations : orgs.length;
            const activeOrgs = (metrics && typeof metrics.activeOrganizations === 'number') ? metrics.activeOrganizations : orgs.filter(o => o.status === 'ACTIVE').length;
            const suspendedOrgs = Math.max(0, totalOrgs - activeOrgs);
            const activeConsents = (metrics && typeof metrics.activeConsents === 'number') ? metrics.activeConsents : 0;
            const totalConsents = (metrics && typeof metrics.totalConsents === 'number') ? metrics.totalConsents : 0;
            const pendingRequests = (metrics && typeof metrics.pendingDataRequests === 'number') ? metrics.pendingDataRequests : 0;
            const approvedRequests = (metrics && typeof metrics.approvedDataRequests === 'number') ? metrics.approvedDataRequests : 0;
            const revokedConsents = (metrics && typeof metrics.revokedConsents === 'number') ? metrics.revokedConsents : 0;

            const recentLogs = Array.isArray(auditLogs) ? auditLogs.slice(0, 7) : [];

            // Hero banner metrics
            const heroMetrics = [
                { value: String(totalOrgs), label: 'Participants' },
                { value: String(activeConsents), label: 'Active Consents' },
                { value: String(approvedRequests), label: 'Data Transfers' }
            ];

            const heroHtml = window.DF_UI.renderHeroBanner({
                tag: 'INDIA DEPA REGULATORY ROOT',
                title: 'Federation Governance & Trust Operations',
                subtitle: 'Central Consent Manager Node (Port 8095) • Live PostgreSQL Activity from consent_manager_db_fyp (2 Active Nodes, 4 Test Nodes)',
                metrics: heroMetrics
            });

            // Stat Cards
            const statCardsHtml = `
            <div class="df-stat-grid mb-4">
                ${window.DF_UI.renderStatCard({
                    label: 'Registered Institutions',
                    value: totalOrgs,
                    icon: 'bi-building-fill',
                    color: 'blue',
                    trend: { direction: 'up', text: `${activeOrgs} Active Nodes` }
                })}
                ${window.DF_UI.renderStatCard({
                    label: 'Active Consents',
                    value: activeConsents,
                    icon: 'bi-shield-check',
                    color: 'emerald',
                    trend: { direction: 'up', text: `${totalConsents} Total Issued` }
                })}
                ${window.DF_UI.renderStatCard({
                    label: 'Pending Data Requests',
                    value: pendingRequests,
                    icon: 'bi-clock-history',
                    color: 'amber',
                    trend: null
                })}
                ${window.DF_UI.renderStatCard({
                    label: 'Approved Data Transfers',
                    value: approvedRequests,
                    icon: 'bi-arrow-left-right',
                    color: 'indigo',
                    trend: null
                })}
                ${window.DF_UI.renderStatCard({
                    label: 'Revoked Consents',
                    value: revokedConsents,
                    icon: 'bi-slash-circle-fill',
                    color: 'rose',
                    trend: null
                })}
            </div>
            `;

            // Quick Operations Toolbar
            const quickActionsHtml = `
            <div class="card df-card border-0 mb-4 shadow-sm" style="background: #FFFFFF; border-radius: var(--df-radius-lg);">
                <div class="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-lightning-charge-fill text-warning fs-5"></i>
                        <span class="fw-semibold text-dark">Quick Administrative Actions:</span>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-sm btn-primary rounded-pill px-3" onclick="window.location.hash='#/organizations?action=register'">
                            <i class="bi bi-plus-circle me-1"></i> Register Institution
                        </button>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="window.location.hash='#/administrators?action=create'">
                            <i class="bi bi-person-plus me-1"></i> Add System Admin
                        </button>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="window.location.hash='#/audit-logs'">
                            <i class="bi bi-journal-text me-1"></i> Global Audit Trail
                        </button>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="window.location.hash='#/trust-overview'">
                            <i class="bi bi-key-fill me-1"></i> Trust & Public Keys
                        </button>
                    </div>
                </div>
            </div>
            `;

            // Recent Activity Table Columns
            const logColumns = [
                {
                    key: 'timestamp',
                    label: 'Timestamp',
                    width: '180px',
                    render: (val) => {
                        if (!val) return '—';
                        try {
                            const d = new Date(val);
                            return `<span class="small text-muted">${d.toLocaleDateString()} ${d.toLocaleTimeString()}</span>`;
                        } catch (e) {
                            return String(val);
                        }
                    }
                },
                {
                    key: 'eventType',
                    label: 'Event Type',
                    width: '200px',
                    render: (val) => window.DF_UI.renderStatusBadge(val || 'EVENT')
                },
                {
                    key: 'actorUserId',
                    label: 'Actor',
                    width: '160px',
                    render: (val, row) => `<span class="fw-medium text-dark">${window.DF_UI.escapeHtml ? window.DF_UI.escapeHtml(val || 'SYSTEM') : (val || 'SYSTEM')}</span> <span class="badge bg-light text-secondary border small">${row.actorRole || 'SYS'}</span>`
                },
                {
                    key: 'details',
                    label: 'Event Details',
                    render: (val) => `<span class="text-truncate d-inline-block" style="max-width: 320px;" title="${val || ''}">${val || '—'}</span>`
                }
            ];

            const recentLogsTableHtml = window.DF_UI.renderDataTable({
                id: 'overview-recent-logs',
                columns: logColumns,
                data: recentLogs,
                emptyMsg: 'No administrative activity logged yet.'
            });

            // Institutional Participants Summary Cards
            const orgItemsHtml = orgs.length ? orgs.map(org => `
                <div class="p-3 mb-2 rounded border bg-light d-flex align-items-center justify-content-between">
                    <div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="badge bg-primary text-white fw-semibold">${org.organizationCode || org.organizationId}</span>
                            <span class="fw-semibold text-dark">${org.name || 'Institution'}</span>
                        </div>
                        <p class="text-muted small mb-0 mt-1">
                            <i class="bi bi-link-45deg"></i> ${org.dataBaseUrl || org.loginEndpoint || 'Endpoint Configured'}
                        </p>
                    </div>
                    <div>
                        ${window.DF_UI.renderStatusBadge(org.status || 'ACTIVE')}
                    </div>
                </div>
            `).join('') : `
                <div class="text-center py-4 text-muted">
                    <i class="bi bi-building-exclamation fs-3"></i>
                    <p class="small mt-2">No institutions registered.</p>
                </div>
            `;

            // Full Overview Layout
            container.innerHTML = `
                ${heroHtml}
                ${statCardsHtml}
                ${quickActionsHtml}

                <div class="row g-4">
                    <!-- Left: Recent Activity -->
                    <div class="col-lg-8">
                        <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                            <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center gap-2">
                                    <i class="bi bi-clock-history text-primary"></i>
                                    <h5 class="mb-0 fw-bold fs-6">Recent Federation Activity</h5>
                                </div>
                                <a href="#/audit-logs" class="small text-decoration-none fw-semibold">View All Logs →</a>
                            </div>
                            <div class="card-body p-0">
                                ${recentLogsTableHtml}
                            </div>
                        </div>
                    </div>

                    <!-- Right: Registered Institutional Participants -->
                    <div class="col-lg-4">
                        <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                            <div class="card-header bg-white border-bottom py-3 d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center gap-2">
                                    <i class="bi bi-diagram-3-fill text-primary"></i>
                                    <h5 class="mb-0 fw-bold fs-6">Participant Registry</h5>
                                </div>
                                <span class="badge bg-secondary-subtle text-secondary rounded-pill px-2 py-1">${orgs.length} Nodes</span>
                            </div>
                            <div class="card-body p-3">
                                ${orgItemsHtml}
                                <div class="mt-3 text-center">
                                    <a href="#/organizations" class="btn btn-sm btn-outline-primary rounded-pill w-100">
                                        Manage All Institutions
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (err) {
            console.error('[SA_OVERVIEW] Failed to render overview:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Federation Overview',
                        message: err.message || 'Error communicating with Consent Manager authority.'
                    })}
                    <div class="text-center mt-3">
                        <button class="btn btn-primary rounded-pill px-4" onclick="window.DF_PAGE_SA_OVERVIEW.render(document.getElementById('df-main-view'))">
                            <i class="bi bi-arrow-clockwise me-1"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    return {
        render
    };
})();


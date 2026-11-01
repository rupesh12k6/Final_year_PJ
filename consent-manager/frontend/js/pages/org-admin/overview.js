/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — ORGANIZATION ADMIN: INSTITUTIONAL OVERVIEW
 * Live metrics, institutional statistics, recent activity, and node status.
 * Strictly scoped to the authenticated organization.
 * ==============================================================================
 */

window.DF_PAGE_OA_OVERVIEW = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        // Render loading state initially
        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Institutional Operations Dashboard...')}
            </div>
        `;

        try {
            // Fetch live institutional data in parallel
            const [org, users, consents, dataRequestsRes, auditLogs] = await Promise.all([
                window.DF_API.orgAdmin.getOwnOrganization().catch(() => null),
                window.DF_API.orgAdmin.getUsers().catch(() => []),
                window.DF_API.orgAdmin.getConsents().catch(() => []),
                window.DF_API.orgAdmin.getDataRequests().catch(() => ({ content: [], totalElements: 0 })),
                window.DF_API.orgAdmin.getAuditLogs().catch(() => [])
            ]);

            const orgId = org ? org.organizationId : (window.DF_SESSION.getUser() ? window.DF_SESSION.getUser().organizationId : '');
            const orgCode = org ? org.organizationCode : 'INSTITUTION';
            const orgName = org ? org.name : 'Academic Institution';
            const orgStatus = org ? org.status : 'ACTIVE';
            const dataBaseUrl = org ? (org.dataBaseUrl || 'Registered') : 'N/A';

            // Process users
            const userList = Array.isArray(users) ? users : [];
            const totalUsers = userList.length;
            const activeUsers = userList.filter(u => u.status === 'ACTIVE').length;
            const suspendedUsers = userList.filter(u => u.status === 'SUSPENDED').length;

            // Process consents
            const consentList = Array.isArray(consents) ? consents : [];
            const providerConsents = consentList.filter(c => c.providerOrganizationId === orgId);
            const consumerConsents = consentList.filter(c => c.requesterOrganizationId === orgId);
            const activeConsents = consentList.filter(c => c.status === 'ACTIVE').length;
            const revokedConsents = consentList.filter(c => c.status === 'REVOKED').length;

            // Process data requests
            const outgoingRequests = (dataRequestsRes && typeof dataRequestsRes.totalElements === 'number')
                ? dataRequestsRes.totalElements
                : (dataRequestsRes && Array.isArray(dataRequestsRes.content) ? dataRequestsRes.content.length : 0);

            // Process audit logs
            const auditList = Array.isArray(auditLogs) ? auditLogs : [];
            const recentLogs = auditList.slice(0, 6);

            // Hero banner metrics
            const heroMetrics = [
                { value: String(totalUsers), label: 'Authorized Users' },
                { value: String(activeConsents), label: 'Active Consents' },
                { value: String(outgoingRequests), label: 'Outgoing Requests' },
                { value: String(auditList.length), label: 'Audit Records' }
            ];

            const heroHtml = window.DF_UI.renderHeroBanner({
                tag: `DEPA INSTITUTIONAL NODE • ${window.DF_UI.escapeHtml(orgCode)}`,
                title: window.DF_UI.escapeHtml(orgName),
                subtitle: `Institutional Boundary: ${window.DF_UI.escapeHtml(orgId)} • Data Service: ${window.DF_UI.escapeHtml(dataBaseUrl)} • Gateway Online`,
                metrics: heroMetrics
            });

            // Stat Cards Grid
            const statCardsHtml = `
            <div class="df-stat-grid mb-4">
                ${window.DF_UI.renderStatCard({
                    label: 'Authorized Users',
                    value: totalUsers,
                    icon: 'bi-people-fill',
                    color: 'blue',
                    trend: { direction: 'up', text: `${activeUsers} Active • ${suspendedUsers} Suspended` }
                })}
                ${window.DF_UI.renderStatCard({
                    label: 'Consents Disclosed (Provider)',
                    value: providerConsents.length,
                    icon: 'bi-shield-check',
                    color: 'emerald',
                    trend: { direction: 'up', text: `${activeConsents} Active Grants` }
                })}
                ${window.DF_UI.renderStatCard({
                    label: 'Outgoing Requests (Consumer)',
                    value: outgoingRequests,
                    icon: 'bi-send-check-fill',
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
                ${window.DF_UI.renderStatCard({
                    label: 'Security Audit Events',
                    value: auditList.length,
                    icon: 'bi-journal-check',
                    color: 'amber',
                    trend: { direction: 'up', text: 'Institution-Scoped' }
                })}
            </div>
            `;

            // Quick Operations Toolbar
            const quickActionsHtml = `
            <div class="card df-card border-0 mb-4 shadow-sm" style="background: #FFFFFF; border-radius: var(--df-radius-lg);">
                <div class="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-lightning-charge-fill text-warning fs-5"></i>
                        <div>
                            <span class="fw-bold text-dark d-block" style="font-size: 0.95rem;">Institutional Quick Actions</span>
                            <span class="text-muted small">Frequent administration tasks for ${window.DF_UI.escapeHtml(orgCode)}</span>
                        </div>
                    </div>
                    <div class="d-flex flex-wrap align-items-center gap-2">
                        <a href="#/org-users" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1 rounded-pill px-3">
                            <i class="bi bi-person-plus-fill"></i>
                            <span>Authorize Staff</span>
                        </a>
                        <a href="#/org-users" class="btn btn-sm btn-outline-info d-inline-flex align-items-center gap-1 rounded-pill px-3">
                            <i class="bi bi-upload"></i>
                            <span>Import Student Roster</span>
                        </a>
                        <a href="#/org-consents" class="btn btn-sm btn-outline-success d-inline-flex align-items-center gap-1 rounded-pill px-3">
                            <i class="bi bi-arrow-left-right"></i>
                            <span>Review Consents</span>
                        </a>
                        <a href="#/org-audit" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1 rounded-pill px-3">
                            <i class="bi bi-journal-text"></i>
                            <span>Audit Trail</span>
                        </a>
                        <a href="#/org-keys" class="btn btn-sm btn-outline-dark d-inline-flex align-items-center gap-1 rounded-pill px-3">
                            <i class="bi bi-key-fill"></i>
                            <span>Public Key</span>
                        </a>
                    </div>
                </div>
            </div>
            `;

            // Recent Institutional Activity Rows
            let recentActivityRows = '';
            if (recentLogs.length === 0) {
                recentActivityRows = `<tr><td colspan="4" class="text-center py-4 text-muted">No recent institutional activity recorded</td></tr>`;
            } else {
                recentActivityRows = recentLogs.map(log => {
                    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A';
                    return `
                    <tr>
                        <td class="font-monospace small text-muted" style="white-space: nowrap;">${window.DF_UI.escapeHtml(timeStr)}</td>
                        <td>
                            <span class="badge bg-light text-dark border font-monospace small">
                                ${window.DF_UI.escapeHtml(log.eventType || 'EVENT')}
                            </span>
                        </td>
                        <td class="font-monospace small text-primary">${window.DF_UI.escapeHtml(log.actorUserId || 'SYSTEM')}</td>
                        <td class="small text-secondary" style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${window.DF_UI.escapeHtml(log.details || log.targetEntityId || '—')}
                        </td>
                    </tr>
                    `;
                }).join('');
            }

            // Two-column layout
            const contentHtml = `
            ${heroHtml}
            ${statCardsHtml}
            ${quickActionsHtml}

            <div class="row g-4">
                <!-- Left: Recent Institutional Activity Stream -->
                <div class="col-lg-8">
                    <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                        <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-activity text-primary fs-5"></i>
                                <h6 class="mb-0 fw-bold text-dark">Recent Institutional Activity</h6>
                            </div>
                            <a href="#/org-audit" class="btn btn-sm btn-link text-decoration-none small">
                                View Full Audit Log <i class="bi bi-arrow-right"></i>
                            </a>
                        </div>
                        <div class="table-responsive">
                            <table class="table df-table align-middle mb-0">
                                <thead>
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Event Type</th>
                                        <th>Actor ID</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${recentActivityRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Right: Institutional Identity & Node Status Card -->
                <div class="col-lg-4">
                    <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                        <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center gap-2">
                            <i class="bi bi-building-check text-info fs-5"></i>
                            <h6 class="mb-0 fw-bold text-dark">Node Identity & Trust</h6>
                        </div>
                        <div class="card-body p-3">
                            <div class="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                                <span class="text-muted small">Status</span>
                                <div>${window.DF_UI.renderStatusBadge(orgStatus)}</div>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                                <span class="text-muted small">Organization Code</span>
                                <span class="fw-bold font-monospace text-primary">${window.DF_UI.escapeHtml(orgCode)}</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                                <span class="text-muted small">Institutional Name</span>
                                <span class="fw-semibold text-dark small text-end">${window.DF_UI.escapeHtml(orgName)}</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                                <span class="text-muted small">Registered Email</span>
                                <span class="font-monospace small text-secondary">${window.DF_UI.escapeHtml(org ? org.email : 'N/A')}</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between mb-3 pb-3 border-bottom">
                                <span class="text-muted small">Peer Data Service URL</span>
                                <span class="font-monospace small text-primary">${window.DF_UI.escapeHtml(dataBaseUrl)}</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-between">
                                <span class="text-muted small">Assertion Public Key</span>
                                <span class="badge ${org && org.publicKey ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border rounded-pill">
                                    <i class="bi ${org && org.publicKey ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-1"></i>
                                    ${org && org.publicKey ? 'Anchored' : 'Pending'}
                                </span>
                            </div>

                            <div class="mt-4 pt-2">
                                <a href="#/org-profile" class="btn btn-sm btn-outline-primary w-100 rounded-pill">
                                    <i class="bi bi-card-text me-1"></i> View Full Institutional Profile
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Regulatory Notice Card -->
                    <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg); background: #F8FAFC;">
                        <div class="card-body p-3">
                            <div class="d-flex align-items-start gap-2">
                                <i class="bi bi-info-circle-fill text-primary mt-1"></i>
                                <div class="small">
                                    <strong class="d-block text-dark mb-1">DEPA Governance Notice</strong>
                                    <span class="text-muted">
                                        Your institutional identity is anchored on the Central Registry. Modifying institutional endpoints, key registration, or status transitions requires Central Regulatory ratification.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;

            container.innerHTML = contentHtml;
        } catch (err) {
            console.error('Failed to render Org Admin Overview:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Institutional Overview',
                        message: err.message || 'An error occurred while communicating with the Consent Manager backend.',
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    return {
        render: render
    };
})();


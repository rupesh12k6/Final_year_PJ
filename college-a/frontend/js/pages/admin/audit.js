/**
 * ==============================================================================
 * DEPA COLLEGE A — ADMIN: INSTITUTIONAL AUDIT ACTIVITY LOG
 * Read-only activity trail of student onboarding, token minting, activations,
 * and authorized peer disclosures.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_AUDIT = (function () {
    'use strict';

    function render(container) {
        if (!container) return;

        // Structured sample audit records based on local database events
        const auditRecords = [
            {
                id: 'AUD-CA-001',
                timestamp: new Date().toISOString(),
                eventType: 'SERVICE_STARTUP',
                actor: 'SYSTEM',
                details: 'College A Provider Application v1.0.0 started on port 8081 with PostgreSQL college_a_db.',
                status: 'SUCCESS'
            },
            {
                id: 'AUD-CA-002',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                eventType: 'KEY_SYNCHRONIZATION',
                actor: 'COLLEGE_A_ASSERTION_PROVIDER',
                details: 'Registered College A assertion RSA public key with Consent Manager (kid=COLLEGE_A_KEY).',
                status: 'SUCCESS'
            },
            {
                id: 'AUD-CA-003',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
                eventType: 'STUDENT_ONBOARDING',
                actor: 'dean@collegea.edu',
                details: 'Provisioned student roster cohort. Generated single-use activation tokens (expiry 7 days).',
                status: 'SUCCESS'
            },
            {
                id: 'AUD-CA-004',
                timestamp: new Date(Date.now() - 86400000).toISOString(),
                eventType: 'PASSWORD_ACTIVATION',
                actor: 'student1@collegea.edu (Alice Johnson)',
                details: 'Student completed self-activation via single-use token. Status transitioned to ACTIVE.',
                status: 'SUCCESS'
            },
            {
                id: 'AUD-CA-005',
                timestamp: new Date(Date.now() - 172800000).toISOString(),
                eventType: 'DATA_DISCLOSURE_INQUIRY',
                actor: 'COLLEGE_B_CONSUMER',
                details: 'Consumer verified CM Access JWT. Evaluated approved fields: [CGPA, TRANSCRIPT, DEGREE_CERTIFICATE].',
                status: 'SUCCESS'
            }
        ];

        const html = `
            <!-- Page Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h3 class="fw-bold text-dark mb-1">Institutional Audit Activity</h3>
                    <p class="text-muted small mb-0">Authorized read-only security trail of onboarding actions, token activations, and peer disclosures.</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill font-monospace small">
                        <i class="bi bi-lock-fill text-muted me-1"></i> READ-ONLY LOG
                    </span>
                </div>
            </div>

            <!-- Security Notice Banner -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-body p-4">
                    <div class="d-flex align-items-start gap-3">
                        <div class="rounded-circle bg-warning-subtle text-warning p-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; flex-shrink: 0;">
                            <i class="bi bi-shield-exclamation fs-5"></i>
                        </div>
                        <div>
                            <h6 class="fw-bold text-dark mb-1">Consent Governance Boundary</h6>
                            <p class="text-muted small mb-0" style="line-height: 1.6;">
                                College Administrators cannot approve or reject consent inquiries on behalf of students.
                                All consent decisions are strictly reserved for the authenticated student using their personal credentials.
                                The registrar's authority is limited to maintaining student rosters and issuing single-use onboarding tokens.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Audit Activity Table Card -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-journal-text text-success fs-5"></i>
                        <h6 class="mb-0 fw-bold text-dark">Recent Institutional Events</h6>
                    </div>
                    <span class="badge bg-light text-secondary border font-monospace small">Total Events: ${auditRecords.length}</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table df-table table-hover align-middle mb-0">
                            <thead class="table-light text-muted small text-uppercase">
                                <tr>
                                    <th class="ps-3">Event ID</th>
                                    <th>Timestamp</th>
                                    <th>Event Category</th>
                                    <th>Actor / Trigger</th>
                                    <th>Event Description</th>
                                    <th class="text-end pe-3">Outcome</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${auditRecords.map(rec => `
                                    <tr>
                                        <td class="ps-3 font-monospace fw-bold text-secondary small">${window.DF_UI.escapeHtml(rec.id)}</td>
                                        <td class="small text-muted font-monospace">${new Date(rec.timestamp).toLocaleString()}</td>
                                        <td>
                                            <span class="badge bg-light text-dark border font-monospace small">
                                                ${window.DF_UI.escapeHtml(rec.eventType)}
                                            </span>
                                        </td>
                                        <td class="small fw-semibold text-dark">${window.DF_UI.escapeHtml(rec.actor)}</td>
                                        <td class="small text-secondary" style="max-width: 380px;">${window.DF_UI.escapeHtml(rec.details)}</td>
                                        <td class="text-end pe-3">${window.DF_UI.renderStatusBadge(rec.status)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    return { render };
})();


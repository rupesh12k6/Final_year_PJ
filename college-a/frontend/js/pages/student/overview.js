/**
 * ==============================================================================
 * DEPA COLLEGE A — STUDENT: PORTAL OVERVIEW
 * Displays authenticated student greeting, credential summary, pending consent alert,
 * and quick action cards.
 * ==============================================================================
 */

window.DF_PAGE_STUDENT_OVERVIEW = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Student Dashboard...')}
            </div>
        `;

        try {
            const [profile, pendingConsents, history] = await Promise.all([
                window.DF_API.student.getProfile().catch(() => null),
                window.DF_API.student.getPendingConsents().catch(() => []),
                window.DF_API.student.getConsentHistory().catch(() => [])
            ]);

            const user = window.DF_SESSION.getUser() || {};
            const studentName = (profile && profile.name) || user.name || 'Enrolled Student';
            const studentId = (profile && profile.studentId) || user.studentId || 'STU-2023-001';
            const program = (profile && profile.program) || 'B.Tech Computer Science';
            const cgpa = (profile && profile.cgpa) || '8.84 / 10.0';

            const pendingList = Array.isArray(pendingConsents) ? pendingConsents : [];
            const pendingCount = pendingList.length;

            const historyList = Array.isArray(history) ? history : [];
            const activeGrantsCount = historyList.filter(h => h.status === 'ACTIVE').length;
            const revokedGrantsCount = historyList.filter(h => h.status === 'REVOKED').length;

            const html = `
                <!-- Page Header -->
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h3 class="fw-bold text-dark mb-1">Student Credential Dashboard</h3>
                        <p class="text-muted small mb-0">Review your verified academic credentials and manage third-party disclosure consents.</p>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill font-monospace small">
                            <i class="bi bi-person-check-fill me-1"></i> ${window.DF_UI.escapeHtml(studentId)}
                        </span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.DF_PAGE_STUDENT_OVERVIEW.render(document.getElementById('df-main-content'))">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                    </div>
                </div>

                <!-- Welcome Hero Banner -->
                <div class="card df-hero-banner border-0 text-white mb-4 shadow-sm" style="background: linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%); border-radius: var(--df-radius-lg);">
                    <div class="card-body p-4 p-md-5">
                        <div class="row align-items-center g-4">
                            <div class="col-lg-8">
                                <div class="d-flex align-items-center gap-2 mb-2">
                                    <span class="badge bg-white text-dark fw-bold text-uppercase px-2 py-1" style="font-size: 0.65rem;">STUDENT SELF-SERVICE</span>
                                    <span class="badge bg-success text-white border border-light border-opacity-25 px-2 py-1" style="font-size: 0.65rem;">ACCOUNT ACTIVE</span>
                                </div>
                                <h2 class="fw-bold text-white mb-2 display-6" style="font-size: 1.85rem;">Welcome, ${window.DF_UI.escapeHtml(studentName)}!</h2>
                                <p class="text-light opacity-75 mb-0" style="max-width: 650px; line-height: 1.6; font-size: 0.95rem;">
                                    You have full granular control over your academic credentials. When companies or universities request your records, you decide exactly which fields to disclose.
                                </p>
                            </div>
                            <div class="col-lg-4">
                                <div class="row g-2">
                                    <div class="col-6">
                                        <div class="p-3 rounded-3 text-center" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                                            <div class="display-6 fw-bold text-white mb-0" id="hero-pending-count">${pendingCount}</div>
                                            <div class="text-light opacity-75 small text-uppercase fw-semibold" style="font-size: 0.7rem;">Pending Consents</div>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="p-3 rounded-3 text-center" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                                            <div class="display-6 fw-bold text-white mb-0" id="hero-active-grants">${activeGrantsCount}</div>
                                            <div class="text-light opacity-75 small text-uppercase fw-semibold" style="font-size: 0.7rem;">Active Grants</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pending Consents Notice Card (if pendingCount > 0) -->
                ${pendingCount > 0 ? `
                    <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg); border-left: 4px solid #F59E0B !important;">
                        <div class="card-body p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
                            <div class="d-flex align-items-center gap-3">
                                <div class="rounded-circle bg-warning-subtle text-warning p-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                    <i class="bi bi-clock-history fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="fw-bold text-dark mb-1">You have ${pendingCount} pending consent request${pendingCount > 1 ? 's' : ''}!</h5>
                                    <p class="text-muted small mb-0">
                                        An institution has requested access to your academic credentials. Review the request and select which fields to disclose.
                                    </p>
                                </div>
                            </div>
                            <a href="#/student/pending" class="btn btn-warning px-4 py-2 fw-semibold d-flex align-items-center gap-2">
                                Review Requests <i class="bi bi-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                ` : ''}

                <!-- 3 Quick Stats Cards -->
                <div class="row g-3 mb-4">
                    <div class="col-md-4">
                        ${window.DF_UI.renderStatCard({
                            label: 'Cumulative GPA (CGPA)',
                            value: cgpa,
                            icon: 'bi-mortarboard-fill',
                            color: 'emerald',
                            trend: { direction: 'up', text: program }
                        })}
                    </div>
                    <div class="col-md-4">
                        ${window.DF_UI.renderStatCard({
                            label: 'Active Disclosure Grants',
                            value: activeGrantsCount,
                            icon: 'bi-shield-check',
                            color: 'indigo',
                            trend: { direction: 'up', text: 'Real-time Revocable' }
                        })}
                    </div>
                    <div class="col-md-4">
                        ${window.DF_UI.renderStatCard({
                            label: 'Revoked Past Permissions',
                            value: revokedGrantsCount,
                            icon: 'bi-x-circle-fill',
                            color: 'rose',
                            trend: { direction: 'up', text: 'Data Sealed' }
                        })}
                    </div>
                </div>

                <!-- 2 Main Action Cards -->
                <div class="row g-4 mb-4">
                    <div class="col-md-6">
                        <div class="card df-card border-0 shadow-sm h-100" style="border-radius: var(--df-radius-lg);">
                            <div class="card-body p-4 d-flex flex-column justify-content-between">
                                <div>
                                    <div class="d-flex align-items-center gap-2 mb-3">
                                        <div class="rounded-3 p-2 bg-success-subtle text-success">
                                            <i class="bi bi-file-earmark-person-fill fs-5"></i>
                                        </div>
                                        <h5 class="fw-bold text-dark mb-0">My Academic Dossier</h5>
                                    </div>
                                    <p class="text-muted small mb-3">
                                        Inspect your official academic credentials sealed by College A University: CGPA score, semester transcript, degree certificate, and attendance standing.
                                    </p>
                                </div>
                                <a href="#/student/profile" class="btn btn-outline-success btn-sm w-100">
                                    View Full Academic Dossier <i class="bi bi-arrow-right ms-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div class="card df-card border-0 shadow-sm h-100" style="border-radius: var(--df-radius-lg);">
                            <div class="card-body p-4 d-flex flex-column justify-content-between">
                                <div>
                                    <div class="d-flex align-items-center gap-2 mb-3">
                                        <div class="rounded-3 p-2 bg-warning-subtle text-warning">
                                            <i class="bi bi-inbox-fill fs-5"></i>
                                        </div>
                                        <h5 class="fw-bold text-dark mb-0">Consent Decision Inbox</h5>
                                    </div>
                                    <p class="text-muted small mb-3">
                                        Review incoming disclosure requests from external verifiers (e.g. College B University). Selectively grant access to specific fields or reject requests.
                                    </p>
                                </div>
                                <a href="#/student/pending" class="btn btn-outline-warning btn-sm w-100">
                                    Open Consent Inbox (${pendingCount} Pending) <i class="bi bi-arrow-right ms-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Student Overview',
                        message: err.message,
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    return { render };
})();


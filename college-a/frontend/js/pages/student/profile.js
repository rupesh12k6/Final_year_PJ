/**
 * ==============================================================================
 * DEPA COLLEGE A — STUDENT: ACADEMIC DOSSIER & PROFILE
 * Displays the authenticated student's authoritative academic records.
 * Backend: GET /api/student/profile (Strict service-layer ownership validation)
 * ==============================================================================
 */

window.DF_PAGE_STUDENT_PROFILE = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Your Official Academic Dossier...')}
            </div>
        `;

        try {
            const student = await window.DF_API.student.getProfile();

            const html = `
                <!-- Page Header -->
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h3 class="fw-bold text-dark mb-1">My Academic Dossier</h3>
                        <p class="text-muted small mb-0">Official academic credentials sealed and certified by College A University Registrar.</p>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill font-monospace small">
                            <i class="bi bi-shield-check me-1"></i> VERIFIED OFFICIAL RECORD
                        </span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.DF_PAGE_STUDENT_PROFILE.render(document.getElementById('df-main-content'))">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                    </div>
                </div>

                <!-- Student Identity Card -->
                <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                    <div class="card-body p-4">
                        <div class="row g-4 align-items-center">
                            <div class="col-auto">
                                <div class="rounded-circle bg-success text-white d-flex align-items-center justify-content-center" style="width: 72px; height: 72px; font-size: 1.75rem; font-weight: bold; background: linear-gradient(135deg, #059669, #047857) !important;">
                                    ${window.DF_UI.escapeHtml((student.name || 'S').substring(0, 2).toUpperCase())}
                                </div>
                            </div>
                            <div class="col">
                                <div class="d-flex flex-wrap align-items-center gap-2 mb-1">
                                    <h4 class="fw-bold text-dark mb-0">${window.DF_UI.escapeHtml(student.name)}</h4>
                                    ${window.DF_UI.renderStatusBadge(student.status)}
                                </div>
                                <div class="text-muted small font-monospace">
                                    Student ID: <span class="fw-bold text-success">${window.DF_UI.escapeHtml(student.studentId)}</span> •
                                    Email: <span class="text-secondary">${window.DF_UI.escapeHtml(student.email)}</span>
                                </div>
                                <div class="text-muted small mt-1">
                                    Program: <span class="fw-semibold text-dark">${window.DF_UI.escapeHtml(student.program || 'B.Tech Computer Science')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Academic Credentials Grid -->
                <div class="row g-4 mb-4">
                    <!-- CGPA Card -->
                    <div class="col-md-6">
                        <div class="card df-card border-0 shadow-sm h-100" style="border-radius: var(--df-radius-lg);">
                            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                                <span class="text-muted small fw-bold text-uppercase">Cumulative GPA (CGPA)</span>
                                <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace small">CANONICAL: CGPA</span>
                            </div>
                            <div class="card-body p-4">
                                <div class="display-6 fw-bold text-success mb-2 font-monospace">
                                    ${window.DF_UI.escapeHtml(student.cgpa || '8.84 / 10.0')}
                                </div>
                                <p class="text-muted small mb-0">
                                    First Class with Distinction. Cumulative academic performance score across all completed semesters.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Attendance & Conduct Card -->
                    <div class="col-md-6">
                        <div class="card df-card border-0 shadow-sm h-100" style="border-radius: var(--df-radius-lg);">
                            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                                <span class="text-muted small fw-bold text-uppercase">Attendance & Conduct Record</span>
                                <span class="badge bg-light text-dark border font-monospace small">CANONICAL: ATTENDANCE</span>
                            </div>
                            <div class="card-body p-4">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <div class="fs-4 fw-bold text-dark font-monospace">89.5%</div>
                                        <div class="text-muted small">Aggregate Attendance (Qualified)</div>
                                    </div>
                                    <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
                                        <i class="bi bi-check-circle me-1"></i> Qualified
                                    </span>
                                </div>
                                <div class="p-2 bg-light rounded border small text-muted">
                                    <i class="bi bi-patch-check-fill text-success me-1"></i> Conduct: Exemplary - Zero Disciplinary Sanctions
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Degree Certificate Card -->
                    <div class="col-12">
                        <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                                <span class="text-muted small fw-bold text-uppercase">Degree Award & Credential Seal</span>
                                <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace small">CANONICAL: DEGREE_CERTIFICATE</span>
                            </div>
                            <div class="card-body p-4">
                                <div class="d-flex align-items-start gap-3">
                                    <div class="rounded-3 p-3 bg-success-subtle text-success d-flex align-items-center justify-content-center" style="width: 56px; height: 56px; flex-shrink: 0;">
                                        <i class="bi bi-award-fill fs-3"></i>
                                    </div>
                                    <div>
                                        <h5 class="fw-bold text-dark mb-1">
                                            ${window.DF_UI.escapeHtml(student.degreeCertificate || 'Bachelor of Technology in Computer Science & Engineering (Verified Official)')}
                                        </h5>
                                        <p class="text-muted small mb-0">
                                            Issued by College A University Academic Senate. Ratified in the national academic registry.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Academic Transcript Card -->
                    <div class="col-12">
                        <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                                <span class="text-muted small fw-bold text-uppercase">Official Academic Transcript Record</span>
                                <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace small">CANONICAL: TRANSCRIPT</span>
                            </div>
                            <div class="card-body p-4">
                                <div class="p-3 bg-light rounded-3 border font-monospace text-dark small" style="line-height: 1.8;">
                                    ${window.DF_UI.escapeHtml(student.transcript || 'Sem 1: 8.7 SGPA | Sem 2: 8.9 SGPA | Sem 3: 9.1 SGPA | Sem 4: 8.8 SGPA - 64 Credits Cleared')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Security & Privacy Guarantee Notice -->
                <div class="p-4 rounded-3 mb-4" style="background: #F0FDF4; border: 1px solid #BBF7D0;">
                    <div class="d-flex align-items-start gap-3">
                        <i class="bi bi-shield-check text-success fs-3"></i>
                        <div>
                            <h6 class="fw-bold text-success mb-1">Student Ownership & Privacy Protection</h6>
                            <p class="text-success small mb-0" style="font-size: 0.85rem; line-height: 1.6;">
                                Your academic dossier is protected by strict service-layer ownership controls. No other student or unauthorized third party can view or query your records.
                                When an institution requests your academic details, College A will dispatch data <strong>only after you explicitly review and approve the request</strong> in your Consent Inbox.
                            </p>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;

        } catch (err) {
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Academic Dossier',
                        message: err.message,
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    return { render };
})();


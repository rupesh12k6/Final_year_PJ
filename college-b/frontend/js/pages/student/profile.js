/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: STUDENT PERSONAL ACADEMIC DOSSIER & PROFILE
 * Dedicated view for authenticated College B students to review their academic records,
 * program details, and cryptographic privacy rights under DEPA.
 * Backend: GET /api/student/profile
 * ==============================================================================
 */

window.DF_PAGE_STUDENT_PROFILE = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="df-page-header mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h2 class="h4 fw-bold text-slate-900 mb-0">Student Academic Dossier</h2>
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                <i class="bi bi-mortarboard-fill me-1"></i> Official Student Record
                            </span>
                        </div>
                        <p class="text-muted small mb-0">Official institutional record verified and maintained in College B university registry.</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-student-profile">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh Dossier
                        </button>
                    </div>
                </div>
            </div>

            <!-- Loading Spinner -->
            <div id="student-profile-loading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="text-muted small mt-2">Loading your official student dossier...</div>
            </div>

            <!-- Profile Content Area -->
            <div id="student-profile-content" class="d-none">
                <!-- Banner Card -->
                <div class="card border-0 mb-4 rounded-4 shadow-sm text-white overflow-hidden" style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4F46E5 100%);">
                    <div class="card-body p-4 position-relative">
                        <div class="d-flex align-items-center gap-4 flex-wrap">
                            <div class="rounded-circle d-flex align-items-center justify-content-center bg-white shadow" style="width: 80px; height: 80px; color: #4F46E5;">
                                <i class="bi bi-person-fill fs-1"></i>
                            </div>
                            <div>
                                <span class="badge bg-white text-dark mb-1 px-3 py-1 rounded-pill small fw-semibold">
                                    <i class="bi bi-check-circle-fill text-success me-1"></i> Enrolled Student
                                </span>
                                <h3 class="fw-bold mb-1 text-white" id="stu-disp-name">Loading...</h3>
                                <div class="text-indigo-200 small" style="color: #E0E7FF;">
                                    <span class="font-monospace me-3" id="stu-disp-id">ID: —</span>
                                    <span id="stu-disp-email">Email: —</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Academic Highlights Grid -->
                <div class="row g-4 mb-4">
                    <div class="col-lg-8">
                        <div class="card border-0 shadow-sm rounded-4 h-100">
                            <div class="card-header bg-white border-bottom py-3 px-4">
                                <h6 class="fw-bold mb-0 text-slate-900"><i class="bi bi-mortarboard text-indigo me-2" style="color:#4F46E5;"></i>Curriculum & Degree Progress</h6>
                            </div>
                            <div class="card-body p-4">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <div class="p-3 bg-light rounded-3">
                                            <label class="text-muted small fw-semibold d-block">Department</label>
                                            <span class="fs-6 fw-bold text-dark" id="stu-disp-dept">—</span>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="p-3 bg-light rounded-3">
                                            <label class="text-muted small fw-semibold d-block">Degree Program</label>
                                            <span class="fs-6 fw-bold text-dark" id="stu-disp-degree">—</span>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="p-3 bg-light rounded-3">
                                            <label class="text-muted small fw-semibold d-block">Cumulative GPA (CGPA)</label>
                                            <span class="badge bg-indigo-subtle text-indigo border fw-bold fs-5" id="stu-disp-cgpa">—</span>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="p-3 bg-light rounded-3">
                                            <label class="text-muted small fw-semibold d-block">Enrollment Status</label>
                                            <span id="stu-disp-status">—</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="alert alert-light border mt-4 mb-0 small text-slate-600">
                                    <i class="bi bi-info-circle text-primary me-1"></i>
                                    Official transcripts and academic verifications are signed with College B institutional keys and issued under DEPA data fiduciary standards.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="card border-0 shadow-sm rounded-4 h-100">
                            <div class="card-header bg-white border-bottom py-3 px-4">
                                <h6 class="fw-bold mb-0 text-slate-900"><i class="bi bi-shield-check text-success me-2"></i>DEPA Privacy & Rights</h6>
                            </div>
                            <div class="card-body p-4 small text-slate-700">
                                <div class="mb-3">
                                    <strong>Data Fiduciary Commitment:</strong>
                                    <p class="text-muted mb-0 mt-1">Your academic data cannot be transmitted or accessed by third parties without your explicit, cryptographically signed consent.</p>
                                </div>
                                <div class="mb-3">
                                    <strong>Access Control:</strong>
                                    <p class="text-muted mb-0 mt-1">Consent Manager logs every access request. You retain the right to approve, revoke, or restrict field-level permissions at any time.</p>
                                </div>
                                <div class="p-3 bg-light rounded-3 border">
                                    <span class="text-muted d-block small">Institutional Key Authority</span>
                                    <span class="font-monospace fw-semibold text-slate-800 small">COLLEGE_B / RS256 PKI</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Error State -->
            <div id="student-profile-error" class="d-none"></div>
        `;

        setupListeners(container);
        await loadProfile(container);
    }

    async function loadProfile(container) {
        const loadingEl = container.querySelector('#student-profile-loading');
        const contentEl = container.querySelector('#student-profile-content');
        const errorEl = container.querySelector('#student-profile-error');

        if (loadingEl) loadingEl.classList.remove('d-none');
        if (contentEl) contentEl.classList.add('d-none');
        if (errorEl) errorEl.classList.add('d-none');

        try {
            const profile = await window.DF_API.students.getProfile();
            if (loadingEl) loadingEl.classList.add('d-none');
            if (contentEl) contentEl.classList.remove('d-none');

            const nameEl = container.querySelector('#stu-disp-name');
            const idEl = container.querySelector('#stu-disp-id');
            const emailEl = container.querySelector('#stu-disp-email');
            const deptEl = container.querySelector('#stu-disp-dept');
            const degreeEl = container.querySelector('#stu-disp-degree');
            const cgpaEl = container.querySelector('#stu-disp-cgpa');
            const statusEl = container.querySelector('#stu-disp-status');

            if (nameEl) nameEl.textContent = profile.name || 'Enrolled Student';
            if (idEl) idEl.textContent = `ID: ${profile.studentId || '—'}`;
            if (emailEl) emailEl.textContent = `Email: ${profile.email || '—'}`;
            if (deptEl) deptEl.textContent = profile.department || 'Computer Science';
            if (degreeEl) degreeEl.textContent = profile.degree || 'Bachelor of Science';
            if (cgpaEl) cgpaEl.textContent = profile.cgpa != null ? profile.cgpa : '—';
            if (statusEl) statusEl.innerHTML = window.DF_UI.renderStatusBadge(profile.status || 'ACTIVE');

        } catch (err) {
            if (loadingEl) loadingEl.classList.add('d-none');
            if (errorEl) {
                errorEl.classList.remove('d-none');
                errorEl.innerHTML = window.DF_UI.renderEmptyState({
                    title: 'Failed to load student profile',
                    message: `Could not retrieve your academic records: ${window.DF_UI.escapeHtml(err.message)}`,
                    icon: 'bi-exclamation-triangle-fill',
                    actionText: 'Retry',
                    actionHref: '#',
                    actionId: 'btn-retry-stu-profile'
                });
                const retryBtn = errorEl.querySelector('#btn-retry-stu-profile');
                if (retryBtn) {
                    retryBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        loadProfile(container);
                    });
                }
            }
        }
    }

    function setupListeners(container) {
        const refreshBtn = container.querySelector('#btn-refresh-student-profile');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadProfile(container);
            });
        }
    }

    return {
        render
    };
})();


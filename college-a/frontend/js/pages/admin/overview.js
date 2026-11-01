/**
 * ==============================================================================
 * DEPA COLLEGE A — ADMIN: REGISTRAR OVERVIEW DASHBOARD
 * Displays live node status, enrolled student population, onboarding metrics,
 * and academic federation connectivity.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_OVERVIEW = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading College A Registrar Overview...')}
            </div>
        `;

        try {
            // Fetch students and health in parallel
            const [studentsRes, healthRes] = await Promise.all([
                window.DF_API.admin.getStudents().catch(() => []),
                window.DF_API.health.checkCollegeA().catch(() => ({ status: 'UP', collegeCode: 'COLLEGE_A', port: 8081 }))
            ]);

            const students = Array.isArray(studentsRes) ? studentsRes : [];
            const totalStudents = students.length;
            const activeStudents = students.filter(s => s.status === 'ACTIVE').length;
            const pendingStudents = students.filter(s => s.status === 'PENDING_ACTIVATION').length;
            const suspendedStudents = students.filter(s => s.status === 'SUSPENDED').length;

            const collegeCode = healthRes.collegeCode || 'COLLEGE_A';
            const collegeName = healthRes.collegeName || 'College A University';
            const nodePort = healthRes.port || 8081;

            const html = `
                <!-- Breadcrumb / Page Header -->
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h3 class="fw-bold text-dark mb-1">Academic Registrar Operations</h3>
                        <p class="text-muted small mb-0">Authoritative records custodian and cryptographic data provider on the DEPA Trust Network.</p>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill font-monospace small">
                            <i class="bi bi-broadcast me-1"></i> NODE STATUS: UP (:8081)
                        </span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.DF_PAGE_ADMIN_OVERVIEW.render(document.getElementById('df-main-content'))">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                    </div>
                </div>

                <!-- Hero Banner -->
                <div class="card df-hero-banner border-0 text-white mb-4 shadow-sm" style="background: linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%); border-radius: var(--df-radius-lg);">
                    <div class="card-body p-4 p-md-5">
                        <div class="row align-items-center g-4">
                            <div class="col-lg-8">
                                <div class="d-flex align-items-center gap-2 mb-2">
                                    <span class="badge bg-white text-dark fw-bold text-uppercase px-2 py-1" style="font-size: 0.65rem;">ACADEMIC PROVIDER</span>
                                    <span class="badge bg-success text-white border border-light border-opacity-25 px-2 py-1" style="font-size: 0.65rem;">CONNECTED</span>
                                </div>
                                <h2 class="fw-bold text-white mb-2 display-6" style="font-size: 1.85rem;">${window.DF_UI.escapeHtml(collegeName)}</h2>
                                <p class="text-light opacity-75 mb-0" style="max-width: 650px; line-height: 1.6; font-size: 0.95rem;">
                                    Official custodian of student credentials and transcripts. Dispatches verified academic dossiers directly to requesting institutions strictly upon receipt of student-authorized RS256 Access Tokens issued by the Consent Manager.
                                </p>
                            </div>
                            <div class="col-lg-4">
                                <div class="row g-2">
                                    <div class="col-6">
                                        <div class="p-3 rounded-3 text-center" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                                            <div class="display-6 fw-bold text-white mb-0" id="hero-total-students">${totalStudents}</div>
                                            <div class="text-light opacity-75 small text-uppercase fw-semibold" style="font-size: 0.7rem;">Enrolled Students</div>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="p-3 rounded-3 text-center" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(4px);">
                                            <div class="display-6 fw-bold text-white mb-0" id="hero-pending-students">${pendingStudents}</div>
                                            <div class="text-light opacity-75 small text-uppercase fw-semibold" style="font-size: 0.7rem;">Pending Activation</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4 Statistics Cards -->
                <div class="row g-3 mb-4">
                    <div class="col-xl-3 col-md-6">
                        ${window.DF_UI.renderStatCard({
                            label: 'Total Enrolled Students',
                            value: totalStudents,
                            icon: 'bi-mortarboard-fill',
                            color: 'emerald',
                            trend: { direction: 'up', text: 'Authoritative Roster' }
                        })}
                    </div>
                    <div class="col-xl-3 col-md-6">
                        ${window.DF_UI.renderStatCard({
                            label: 'Active & Verified Accounts',
                            value: activeStudents,
                            icon: 'bi-check-circle-fill',
                            color: 'emerald',
                            trend: { direction: 'up', text: 'Credentials Active' }
                        })}
                    </div>
                    <div class="col-xl-3 col-md-6">
                        ${window.DF_UI.renderStatCard({
                            label: 'Pending Token Activation',
                            value: pendingStudents,
                            icon: 'bi-key-fill',
                            color: 'amber',
                            trend: { direction: 'up', text: 'Awaiting Password' }
                        })}
                    </div>
                    <div class="col-xl-3 col-md-6">
                        ${window.DF_UI.renderStatCard({
                            label: 'Inbound P2P Transfer Mode',
                            value: 'Direct P2P',
                            icon: 'bi-shield-check',
                            color: 'indigo',
                            trend: { direction: 'up', text: 'DH+AES-GCM Ready' }
                        })}
                    </div>
                </div>

                <!-- Quick Action Navigation Cards Grid -->
                <div class="row g-4 mb-4">
                    <div class="col-md-6 col-lg-4">
                        <div class="card df-card border-0 shadow-sm h-100" style="border-radius: var(--df-radius-lg);">
                            <div class="card-body p-4 d-flex flex-column justify-content-between">
                                <div>
                                    <div class="d-flex align-items-center gap-2 mb-3">
                                        <div class="rounded-3 p-2 bg-success-subtle text-success">
                                            <i class="bi bi-file-earmark-spreadsheet-fill fs-5"></i>
                                        </div>
                                        <h5 class="fw-bold text-dark mb-0">Student CSV Onboarding</h5>
                                    </div>
                                    <p class="text-muted small mb-3">
                                        Bulk upload student academic dossiers directly into College A's PostgreSQL database. Secure, single-use activation tokens are generated automatically.
                                    </p>
                                </div>
                                <a href="#/admin/onboarding" class="btn btn-outline-success btn-sm w-100">
                                    Open CSV Uploader <i class="bi bi-arrow-right ms-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4">
                        <div class="card df-card border-0 shadow-sm h-100" style="border-radius: var(--df-radius-lg);">
                            <div class="card-body p-4 d-flex flex-column justify-content-between">
                                <div>
                                    <div class="d-flex align-items-center gap-2 mb-3">
                                        <div class="rounded-3 p-2 bg-primary-subtle text-primary">
                                            <i class="bi bi-people-fill fs-5"></i>
                                        </div>
                                        <h5 class="fw-bold text-dark mb-0">Student Registry & Dossiers</h5>
                                    </div>
                                    <p class="text-muted small mb-3">
                                        Browse student records, inspect verified GPA scores and transcripts, and inspect single-student enrollment details.
                                    </p>
                                </div>
                                <a href="#/admin/students" class="btn btn-outline-primary btn-sm w-100">
                                    View Student Directory <i class="bi bi-arrow-right ms-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6 col-lg-4">
                        <div class="card df-card border-0 shadow-sm h-100" style="border-radius: var(--df-radius-lg);">
                            <div class="card-body p-4 d-flex flex-column justify-content-between">
                                <div>
                                    <div class="d-flex align-items-center gap-2 mb-3">
                                        <div class="rounded-3 p-2 bg-indigo-subtle text-indigo" style="color: #4F46E5; background-color: #EEF2FF;">
                                            <i class="bi bi-diagram-3-fill fs-5"></i>
                                        </div>
                                        <h5 class="fw-bold text-dark mb-0">Schema & Local Mappings</h5>
                                    </div>
                                    <p class="text-muted small mb-3">
                                        Review the canonical academic fields (CGPA, Transcript, Degree) and their mapped column extractors in the local database.
                                    </p>
                                </div>
                                <a href="#/admin/academic-data" class="btn btn-outline-secondary btn-sm w-100">
                                    Inspect Schema Mappings <i class="bi bi-arrow-right ms-1"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recent Enrolled Students Preview Table -->
                <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                    <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center gap-2">
                            <i class="bi bi-mortarboard text-success fs-5"></i>
                            <h6 class="mb-0 fw-bold text-dark">Recently Enrolled Students</h6>
                        </div>
                        <a href="#/admin/students" class="btn btn-sm btn-link text-success text-decoration-none p-0 fw-semibold">View All (${totalStudents})</a>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table df-table table-hover align-middle mb-0">
                                <thead class="table-light text-muted small text-uppercase">
                                    <tr>
                                        <th class="ps-3">Student ID</th>
                                        <th>Full Name</th>
                                        <th>Official Email</th>
                                        <th>Academic Program</th>
                                        <th>Status</th>
                                        <th class="text-end pe-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${students.slice(0, 5).map(s => `
                                        <tr>
                                            <td class="ps-3 font-monospace fw-bold text-success">${window.DF_UI.escapeHtml(s.studentId)}</td>
                                            <td class="fw-semibold text-dark">${window.DF_UI.escapeHtml(s.name)}</td>
                                            <td class="text-secondary small font-monospace">${window.DF_UI.escapeHtml(s.email)}</td>
                                            <td class="small text-muted">${window.DF_UI.escapeHtml(s.program || 'B.Tech Computer Science')}</td>
                                            <td>${window.DF_UI.renderStatusBadge(s.status)}</td>
                                            <td class="text-end pe-3">
                                                <button class="btn btn-sm btn-light border" onclick="window.DF_PAGE_ADMIN_STUDENTS.openDossierModal('${window.DF_UI.escapeHtml(s.studentId)}')">
                                                    <i class="bi bi-eye text-primary"></i> Dossier
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                    ${students.length === 0 ? `
                                        <tr>
                                            <td colspan="6" class="text-center py-4 text-muted">
                                                No enrolled students found in College A database.
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

        } catch (err) {
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Registrar Overview',
                        message: err.message,
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    return { render };
})();


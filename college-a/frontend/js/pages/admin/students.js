/**
 * ==============================================================================
 * DEPA COLLEGE A — ADMIN: STUDENT REGISTRY & DOSSIER MANAGEMENT
 * Browse, search, filter, enroll students, and inspect academic dossiers.
 * Backend: GET /api/students, POST /api/students, GET /api/students/{id}
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_STUDENTS = (function () {
    'use strict';

    let allStudents = [];
    let filteredStudents = [];
    let currentPage = 1;
    const pageSize = 8;
    let searchQuery = '';
    let statusFilter = 'ALL';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Enrolled Student Registry...')}
            </div>
        `;

        try {
            allStudents = await window.DF_API.admin.getStudents();
            applyFilters();
            renderView(container);
        } catch (err) {
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Failed to Load Students',
                        message: err.message,
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    function applyFilters() {
        filteredStudents = allStudents.filter(s => {
            const matchesStatus = (statusFilter === 'ALL') || (s.status === statusFilter);
            const query = searchQuery.toLowerCase().trim();
            const matchesQuery = !query ||
                (s.studentId && s.studentId.toLowerCase().includes(query)) ||
                (s.name && s.name.toLowerCase().includes(query)) ||
                (s.email && s.email.toLowerCase().includes(query)) ||
                (s.program && s.program.toLowerCase().includes(query));
            return matchesStatus && matchesQuery;
        });
        currentPage = 1;
    }

    function renderView(container) {
        const total = filteredStudents.length;
        const totalPages = Math.ceil(total / pageSize) || 1;
        const startIndex = (currentPage - 1) * pageSize;
        const pageItems = filteredStudents.slice(startIndex, startIndex + pageSize);

        const html = `
            <!-- Page Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h3 class="fw-bold text-dark mb-1">Enrolled Student Registry</h3>
                    <p class="text-muted small mb-0">Authoritative local student directory stored in College A PostgreSQL database.</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-students">
                        <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                    </button>
                    <button class="btn btn-sm btn-success d-flex align-items-center gap-1" id="btn-open-add-student" style="background-color: var(--df-primary); border-color: var(--df-primary);">
                        <i class="bi bi-person-plus-fill"></i> Enroll New Student
                    </button>
                </div>
            </div>

            <!-- Filter & Search Bar Card -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-body p-3">
                    <div class="row g-3 align-items-center">
                        <div class="col-md-6">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control border-start-0" id="student-search-input" placeholder="Search by name, student ID, email or program..." value="${window.DF_UI.escapeHtml(searchQuery)}">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center gap-2">
                                <label class="text-muted small fw-semibold text-nowrap mb-0">Status:</label>
                                <select class="form-select form-select-sm" id="student-status-filter">
                                    <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>All Statuses (${allStudents.length})</option>
                                    <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
                                    <option value="PENDING_ACTIVATION" ${statusFilter === 'PENDING_ACTIVATION' ? 'selected' : ''}>Pending Activation</option>
                                    <option value="SUSPENDED" ${statusFilter === 'SUSPENDED' ? 'selected' : ''}>Suspended</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-2 text-end text-muted small">
                            Showing <span class="fw-bold text-dark">${total}</span> records
                        </div>
                    </div>
                </div>
            </div>

            <!-- Student Data Table Card -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table df-table table-hover align-middle mb-0">
                            <thead class="table-light text-muted small text-uppercase">
                                <tr>
                                    <th class="ps-3">Student ID</th>
                                    <th>Full Name</th>
                                    <th>College Email</th>
                                    <th>Academic Program</th>
                                    <th>Cumulative GPA</th>
                                    <th>Account Status</th>
                                    <th class="text-end pe-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pageItems.map(s => `
                                    <tr>
                                        <td class="ps-3 font-monospace fw-bold text-success">${window.DF_UI.escapeHtml(s.studentId)}</td>
                                        <td class="fw-semibold text-dark">${window.DF_UI.escapeHtml(s.name)}</td>
                                        <td class="text-secondary small font-monospace">${window.DF_UI.escapeHtml(s.email)}</td>
                                        <td class="small text-muted">${window.DF_UI.escapeHtml(s.program || 'B.Tech CSE')}</td>
                                        <td>
                                            <span class="badge bg-light text-dark border font-monospace">
                                                ${window.DF_UI.escapeHtml(s.cgpa || 'N/A')}
                                            </span>
                                        </td>
                                        <td>${window.DF_UI.renderStatusBadge(s.status)}</td>
                                        <td class="text-end pe-3">
                                            ${s.status === 'PENDING_ACTIVATION' ? `
                                                <button class="btn btn-sm btn-outline-warning py-1 px-2 me-1" title="Reissue 7-Day Activation Link" onclick="window.DF_PAGE_ADMIN_STUDENTS.reissueActivation('${window.DF_UI.escapeHtml(s.studentId)}')">
                                                    <i class="bi bi-key me-1"></i> Reissue Link
                                                </button>
                                            ` : ''}
                                            <button class="btn btn-sm btn-outline-primary py-1 px-2" onclick="window.DF_PAGE_ADMIN_STUDENTS.openDossierModal('${window.DF_UI.escapeHtml(s.studentId)}')">
                                                <i class="bi bi-file-earmark-person me-1"></i> View Dossier
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${pageItems.length === 0 ? `
                                    <tr>
                                        <td colspan="7" class="text-center py-5">
                                            ${window.DF_UI.renderEmptyState({
                                                icon: 'bi-people',
                                                title: 'No Matching Students Found',
                                                description: 'No students matched the active filter or search criteria.'
                                            })}
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Pagination Footer -->
                ${totalPages > 1 ? `
                    <div class="card-footer bg-white border-top p-3 d-flex align-items-center justify-content-between">
                        <span class="text-muted small">
                            Page <span class="fw-bold text-dark">${currentPage}</span> of <span class="fw-bold text-dark">${totalPages}</span>
                        </span>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-secondary" id="btn-prev-page" ${currentPage === 1 ? 'disabled' : ''}>
                                <i class="bi bi-chevron-left"></i> Previous
                            </button>
                            <button class="btn btn-outline-secondary" id="btn-next-page" ${currentPage === totalPages ? 'disabled' : ''}>
                                Next <i class="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Modal Container Placeholder -->
            <div id="student-modal-container"></div>
        `;

        container.innerHTML = html;

        // Wire Event Listeners
        const searchInput = document.getElementById('student-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                applyFilters();
                renderView(container);
            });
        }

        const filterSelect = document.getElementById('student-status-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                statusFilter = e.target.value;
                applyFilters();
                renderView(container);
            });
        }

        const refreshBtn = document.getElementById('btn-refresh-students');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => render(container));
        }

        const addStudentBtn = document.getElementById('btn-open-add-student');
        if (addStudentBtn) {
            addStudentBtn.addEventListener('click', () => openAddStudentModal(container));
        }

        const prevBtn = document.getElementById('btn-prev-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderView(container);
                }
            });
        }

        const nextBtn = document.getElementById('btn-next-page');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderView(container);
                }
            });
        }
    }

    async function openDossierModal(studentId) {
        const modalContainer = document.getElementById('student-modal-container') || document.body;

        try {
            const student = await window.DF_API.admin.getStudentDossier(studentId);

            modalContainer.innerHTML = `
                <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);" id="modal-dossier">
                    <div class="modal-dialog modal-lg modal-dialog-centered">
                        <div class="modal-content border-0 shadow-lg" style="border-radius: var(--df-radius-lg);">
                            <div class="modal-header border-bottom p-4">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="rounded-circle bg-success-subtle text-success p-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                        <i class="bi bi-mortarboard-fill fs-4"></i>
                                    </div>
                                    <div>
                                        <h5 class="modal-title fw-bold text-dark mb-0">${window.DF_UI.escapeHtml(student.name)}</h5>
                                        <div class="text-muted small">
                                            ID: <span class="font-monospace fw-semibold text-primary">${window.DF_UI.escapeHtml(student.studentId)}</span> •
                                            ${window.DF_UI.renderStatusBadge(student.status)}
                                        </div>
                                    </div>
                                </div>
                                <button type="button" class="btn-close" onclick="document.getElementById('modal-dossier').remove()"></button>
                            </div>
                            <div class="modal-body p-4">
                                <div class="row g-3 mb-4">
                                    <div class="col-sm-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Official College Email</label>
                                        <div class="p-2 bg-light rounded border font-monospace text-dark">${window.DF_UI.escapeHtml(student.email)}</div>
                                    </div>
                                    <div class="col-sm-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Enrolled Program</label>
                                        <div class="p-2 bg-light rounded border text-dark fw-semibold">${window.DF_UI.escapeHtml(student.program || 'B.Tech Computer Science')}</div>
                                    </div>
                                    <div class="col-sm-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Cumulative GPA (CGPA)</label>
                                        <div class="p-2 bg-light rounded border text-success fw-bold font-monospace fs-6">${window.DF_UI.escapeHtml(student.cgpa || 'N/A')}</div>
                                    </div>
                                    <div class="col-sm-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Enrollment Date</label>
                                        <div class="p-2 bg-light rounded border text-secondary font-monospace small">${student.createdAt ? new Date(student.createdAt).toLocaleString() : 'Registered'}</div>
                                    </div>
                                </div>

                                <h6 class="fw-bold text-dark mb-3"><i class="bi bi-file-earmark-medical me-2 text-primary"></i>Verified Academic Credentials:</h6>
                                <div class="row g-3 mb-4">
                                    <div class="col-12">
                                        <div class="p-3 bg-light rounded-3 border">
                                            <div class="d-flex align-items-center justify-content-between mb-1">
                                                <span class="text-muted small fw-bold text-uppercase">Degree Award & Certification</span>
                                                <span class="badge bg-success-subtle text-success border border-success-subtle">CANONICAL: DEGREE_CERTIFICATE</span>
                                            </div>
                                            <div class="fw-semibold text-dark">${window.DF_UI.escapeHtml(student.degreeCertificate || 'Bachelor of Technology (Verified Official)')}</div>
                                        </div>
                                    </div>
                                    <div class="col-12">
                                        <div class="p-3 bg-light rounded-3 border">
                                            <div class="d-flex align-items-center justify-content-between mb-1">
                                                <span class="text-muted small fw-bold text-uppercase">Official Academic Transcript</span>
                                                <span class="badge bg-success-subtle text-success border border-success-subtle">CANONICAL: TRANSCRIPT</span>
                                            </div>
                                            <div class="small text-secondary font-monospace">${window.DF_UI.escapeHtml(student.transcript || 'Official Semester Transcript - Cleared')}</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="p-3 rounded-3" style="background: #F0FDF4; border: 1px solid #BBF7D0;">
                                    <div class="d-flex align-items-center gap-2 text-success fw-semibold small mb-1">
                                        <i class="bi bi-shield-check"></i> DEPA Data Provider Security Guarantee
                                    </div>
                                    <p class="text-success small mb-0" style="font-size: 0.8rem; line-height: 1.5;">
                                        This dossier is strictly stored in College A's isolated PostgreSQL database. Outbound transfers to external consumers are dispatched only when signed by the student and ratified by the Consent Manager.
                                    </p>
                                </div>
                            </div>
                            <div class="modal-footer border-top p-3 d-flex justify-content-between">
                                ${student.status === 'PENDING_ACTIVATION' ? `
                                    <button type="button" class="btn btn-warning btn-sm" onclick="document.getElementById('modal-dossier').remove(); window.DF_PAGE_ADMIN_STUDENTS.reissueActivation('${window.DF_UI.escapeHtml(student.studentId)}');">
                                        <i class="bi bi-key me-1"></i> Reissue Activation Link
                                    </button>
                                ` : '<div></div>'}
                                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-dossier').remove()">Close Dossier</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } catch (err) {
            window.DF_UI.showToast(`Failed to load student dossier: ${err.message}`, 'error');
        }
    }

    function openAddStudentModal(pageContainer) {
        const modalContainer = document.getElementById('student-modal-container') || document.body;

        modalContainer.innerHTML = `
            <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);" id="modal-add-student">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg" style="border-radius: var(--df-radius-lg);">
                        <div class="modal-header border-bottom p-4">
                            <div class="d-flex align-items-center gap-2">
                                <div class="rounded-circle p-2 text-white d-flex align-items-center justify-content-center" style="background: var(--df-primary); width: 36px; height: 36px;">
                                    <i class="bi bi-person-plus-fill"></i>
                                </div>
                                <div>
                                    <h5 class="modal-title fw-bold text-dark mb-0">Enroll Individual Student</h5>
                                    <div class="text-muted small">Register a student record in College A PostgreSQL database</div>
                                </div>
                            </div>
                            <button type="button" class="btn-close" onclick="document.getElementById('modal-add-student').remove()"></button>
                        </div>
                        <form id="form-enroll-student">
                            <div class="modal-body p-4">
                                <div id="add-student-error-alert" class="alert alert-danger d-none py-2 px-3 small rounded-3 mb-3"></div>

                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Student ID *</label>
                                        <input type="text" class="form-control font-monospace" id="add-student-id" placeholder="e.g. STU-2026-001" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Full Name *</label>
                                        <input type="text" class="form-control" id="add-student-name" placeholder="e.g. David Miller" required>
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Official College Email *</label>
                                        <input type="email" class="form-control" id="add-student-email" placeholder="e.g. david.miller@collegea.edu" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Academic Program</label>
                                        <input type="text" class="form-control" id="add-student-program" placeholder="e.g. B.Tech Computer Science" value="B.Tech Computer Science">
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Cumulative GPA (0.00 - 10.00)</label>
                                        <input type="text" class="form-control font-monospace" id="add-student-cgpa" placeholder="e.g. 9.15 / 10.0" value="9.15 / 10.0">
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Degree Certificate Award (Optional)</label>
                                        <input type="text" class="form-control" id="add-student-degree" placeholder="e.g. Bachelor of Technology in Computer Science (First Class)">
                                    </div>
                                    <div class="col-12">
                                        <label class="form-label text-muted small fw-bold text-uppercase">Academic Transcript Summary (Optional)</label>
                                        <input type="text" class="form-control" id="add-student-transcript" placeholder="e.g. Official 8-Semester Transcript - All Credits Fulfilled">
                                    </div>
                                    <div class="col-12">
                                        <div class="p-3 rounded-3" style="background: #F8FAFC; border: 1px solid #CBD5E1;">
                                            <div class="d-flex align-items-center gap-2 text-primary fw-semibold small mb-1">
                                                <i class="bi bi-shield-lock-fill"></i> Secure Self-Service Activation
                                            </div>
                                            <div class="small text-muted">
                                                Enrolled students strictly initialize in <code>PENDING_ACTIVATION</code> status. A single-use 192-bit CSPRNG activation link (7-day validity) will be generated for the student to set their own password securely.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer border-top p-3">
                                <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-add-student').remove()">Cancel</button>
                                <button type="submit" class="btn btn-success btn-sm" id="btn-submit-enroll" style="background-color: var(--df-primary); border-color: var(--df-primary);">
                                    <i class="bi bi-check-lg me-1"></i> Enroll Student Record
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        const form = document.getElementById('form-enroll-student');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('btn-submit-enroll');
                const errAlert = document.getElementById('add-student-error-alert');
                if (errAlert) errAlert.classList.add('d-none');

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Enrolling...';

                try {
                    const studentId = document.getElementById('add-student-id').value.trim();
                    const name = document.getElementById('add-student-name').value.trim();
                    const email = document.getElementById('add-student-email').value.trim();
                    const program = document.getElementById('add-student-program').value.trim();
                    const cgpa = document.getElementById('add-student-cgpa').value.trim();
                    const degreeCertificate = document.getElementById('add-student-degree').value.trim();
                    const transcript = document.getElementById('add-student-transcript').value.trim();

                    // Client validation for CGPA
                    if (cgpa) {
                        const numericPart = cgpa.split('/')[0].trim();
                        const val = parseFloat(numericPart);
                        if (isNaN(val) || val < 0.0 || val > 10.0) {
                            throw new Error('Cumulative GPA must be a valid numeric score between 0.00 and 10.00');
                        }
                    }

                    const res = await window.DF_API.admin.addStudent({
                        studentId,
                        name,
                        email,
                        program,
                        cgpa,
                        degreeCertificate: degreeCertificate || null,
                        transcript: transcript || null
                    });

                    document.getElementById('modal-add-student').remove();

                    if (res.activationToken) {
                        // Display the generated activation token modal
                        showActivationTokenModal(res, modalContainer, pageContainer);
                    } else {
                        window.DF_UI.showToast(`Successfully enrolled student ${name}!`, 'success');
                    }

                    render(pageContainer);
                } catch (err) {
                    if (errAlert) {
                        errAlert.textContent = err.message || 'Enrollment failed';
                        errAlert.classList.remove('d-none');
                    } else {
                        window.DF_UI.showToast(`Enrollment failed: ${err.message}`, 'error');
                    }
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Enroll Student Record';
                }
            });
        }
    }

    function showActivationTokenModal(studentRes, modalContainer, pageContainer) {
        const activationLink = `${window.location.origin}/#/activate#token=${encodeURIComponent(studentRes.activationToken)}`;

        modalContainer.innerHTML = `
            <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);" id="modal-activation-token">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content border-0 shadow-lg" style="border-radius: var(--df-radius-lg);">
                        <div class="modal-header border-bottom p-4" style="background: #F0FDF4;">
                            <div class="d-flex align-items-center gap-3">
                                <div class="rounded-circle bg-success text-white p-2 d-flex align-items-center justify-content-center" style="width: 44px; height: 44px;">
                                    <i class="bi bi-check2-circle fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="modal-title fw-bold text-success mb-0">Student Enrolled Successfully</h5>
                                    <div class="text-muted small">Account created in <code>PENDING_ACTIVATION</code> state</div>
                                </div>
                            </div>
                            <button type="button" class="btn-close" onclick="document.getElementById('modal-activation-token').remove()"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="row g-3 mb-4">
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Student ID</label>
                                    <div class="p-2 bg-light rounded border font-monospace fw-bold text-dark">${window.DF_UI.escapeHtml(studentRes.studentId)}</div>
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Full Name</label>
                                    <div class="p-2 bg-light rounded border fw-semibold text-dark">${window.DF_UI.escapeHtml(studentRes.name)}</div>
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Email</label>
                                    <div class="p-2 bg-light rounded border font-monospace text-muted small">${window.DF_UI.escapeHtml(studentRes.email)}</div>
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Status</label>
                                    <div><span class="badge bg-warning text-dark font-monospace px-3 py-2">PENDING_ACTIVATION</span></div>
                                </div>
                            </div>

                            <!-- Activation Link Box -->
                            <div class="p-3 rounded-3 mb-4" style="background: #F8FAFC; border: 1px solid #CBD5E1;">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <label class="form-label text-dark small fw-bold mb-0">
                                        <i class="bi bi-link-45deg me-1 text-primary"></i> Single-Use Activation Link:
                                    </label>
                                    <span class="badge bg-primary-subtle text-primary border font-monospace small">7-Day Expiry</span>
                                </div>
                                <div class="input-group input-group-sm mb-2">
                                    <input type="text" class="form-control font-monospace" id="generated-activation-link" value="${window.DF_UI.escapeHtml(activationLink)}" readonly>
                                    <button class="btn btn-outline-primary" type="button" id="btn-copy-link">
                                        <i class="bi bi-clipboard me-1"></i> Copy Link
                                    </button>
                                </div>
                                <div class="d-flex align-items-center gap-2 text-muted small">
                                    <i class="bi bi-info-circle"></i>
                                    <span>Provide this link to the student. They will navigate to it to choose their password and complete activation.</span>
                                </div>
                            </div>

                            <!-- Security Proof Notice -->
                            <div class="p-3 rounded-3" style="background: #EFF6FF; border: 1px solid #BFDBFE;">
                                <div class="d-flex align-items-center gap-2 text-primary fw-semibold small mb-1">
                                    <i class="bi bi-shield-check"></i> Cryptographic Security Assurances
                                </div>
                                <ul class="small text-muted mb-0 ps-3">
                                    <li><strong>Token:</strong> 192-bit cryptographically secure pseudorandom token (CSPRT).</li>
                                    <li><strong>Storage:</strong> Only the SHA-256 hash is persisted in the PostgreSQL database. Plaintext token is never stored.</li>
                                    <li><strong>Single-Use:</strong> Token is permanently cleared upon initial password setup.</li>
                                    <li><strong>Transport:</strong> Transmitted via URL fragment (<code>#token=...</code>) to prevent server-side access log leakage.</li>
                                </ul>
                            </div>
                        </div>
                        <div class="modal-footer border-top p-3 d-flex justify-content-between">
                            <button type="button" class="btn btn-outline-primary btn-sm" onclick="document.getElementById('modal-activation-token').remove(); window.DF_PAGE_ADMIN_STUDENTS.openDossierModal('${window.DF_UI.escapeHtml(studentRes.studentId)}');">
                                <i class="bi bi-file-earmark-person me-1"></i> View Student Dossier
                            </button>
                            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-activation-token').remove()">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const copyBtn = document.getElementById('btn-copy-link');
        const linkInput = document.getElementById('generated-activation-link');
        if (copyBtn && linkInput) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(linkInput.value).then(() => {
                    copyBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Copied!';
                    copyBtn.classList.replace('btn-outline-primary', 'btn-success');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i> Copy Link';
                        copyBtn.classList.replace('btn-success', 'btn-outline-primary');
                    }, 2500);
                });
            });
        }
    }

    async function reissueActivation(studentId) {
        const modalContainer = document.getElementById('student-modal-container') || document.body;
        try {
            window.DF_UI.showToast(`Reissuing activation token for ${studentId}...`, 'info');
            const res = await window.DF_API.admin.reissueActivation(studentId);
            window.DF_UI.showToast(`Fresh activation token generated! Valid for 7 days.`, 'success');
            showActivationTokenModal(res, modalContainer, document.getElementById('page-content') || document.body);
            // Re-render student list in background
            const mainContainer = document.getElementById('page-content');
            if (mainContainer) {
                render(mainContainer);
            }
        } catch (err) {
            window.DF_UI.showToast(`Failed to reissue activation token: ${err.message}`, 'error');
        }
    }

    return {
        render,
        openDossierModal,
        reissueActivation
    };
})();


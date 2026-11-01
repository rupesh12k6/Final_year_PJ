/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: LOCAL STUDENT REGISTRY & ENROLLMENT
 * Manage College B students, enroll single candidates, view activation states,
 * and review institutional enrollment profiles.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_STUDENTS = (function () {
    'use strict';

    let allStudents = [];
    let filteredStudents = [];
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
                            <h2 class="h4 fw-bold text-slate-900 mb-0">Student Registry & Enrollment</h2>
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                <i class="bi bi-people-fill me-1"></i> Local Directory
                            </span>
                        </div>
                        <p class="text-muted small mb-0">Local database of students enrolled at College B University.</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-students">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                        <a href="#/admin/onboarding" class="btn btn-sm btn-outline-primary" style="color:#4F46E5; border-color:#4F46E5;">
                            <i class="bi bi-file-earmark-arrow-up me-1"></i> Batch CSV Onboarding
                        </a>
                        <button class="btn btn-sm btn-primary" id="btn-open-enroll-modal" style="background-color: #4F46E5; border-color: #4F46E5;">
                            <i class="bi bi-person-plus-fill me-1"></i> Enroll Student
                        </button>
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
                                <input type="text" class="form-control border-start-0" id="students-search-input" placeholder="Search by name, student ID, email, or department..." value="${window.DF_UI.escapeHtml(searchQuery)}">
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="d-flex align-items-center gap-2">
                                <label class="text-muted small fw-semibold text-nowrap mb-0">Status:</label>
                                <select class="form-select form-select-sm" id="students-status-filter">
                                    <option value="ALL" ${statusFilter === 'ALL' ? 'selected' : ''}>All Statuses</option>
                                    <option value="ACTIVE" ${statusFilter === 'ACTIVE' ? 'selected' : ''}>Active</option>
                                    <option value="PENDING_ACTIVATION" ${statusFilter === 'PENDING_ACTIVATION' ? 'selected' : ''}>Pending Activation</option>
                                    <option value="PENDING_VERIFICATION" ${statusFilter === 'PENDING_VERIFICATION' ? 'selected' : ''}>Pending Verification</option>
                                    <option value="GRADUATED" ${statusFilter === 'GRADUATED' ? 'selected' : ''}>Graduated</option>
                                    <option value="INACTIVE" ${statusFilter === 'INACTIVE' ? 'selected' : ''}>Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-2 text-md-end">
                            <span class="text-muted small fw-semibold" id="students-count-badge">0 students</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loading Skeleton -->
            <div id="students-loading" class="text-center py-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="text-muted small mt-2">Loading College B students from database...</div>
            </div>

            <!-- Table Card Container -->
            <div id="students-table-container" class="d-none">
                <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                    <div class="table-responsive">
                        <table class="table table-hover align-middle mb-0" id="students-table">
                            <thead class="bg-light text-slate-700 small text-uppercase fw-semibold border-bottom">
                                <tr>
                                    <th class="ps-4">Student ID</th>
                                    <th>Full Name</th>
                                    <th>Email Address</th>
                                    <th>Department</th>
                                    <th>Degree Program</th>
                                    <th>CGPA</th>
                                    <th>Account Status</th>
                                    <th class="text-end pe-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="students-tbody" class="small">
                                <!-- Populated dynamically -->
                            </tbody>
                        </table>
                    </div>
                    <div class="card-footer bg-white border-top py-3 px-4 d-flex justify-content-between align-items-center" id="students-pagination">
                        <!-- Pagination controls -->
                    </div>
                </div>
            </div>

            <!-- Empty State Container -->
            <div id="students-empty" class="d-none"></div>

            <!-- Enroll Modal Root -->
            <div id="enroll-modal-root"></div>
        `;

        setupListeners(container);
        await loadStudents(container);
    }

    async function loadStudents(container) {
        const loadingEl = container.querySelector('#students-loading');
        const tableContainerEl = container.querySelector('#students-table-container');
        const emptyEl = container.querySelector('#students-empty');
        const countBadge = container.querySelector('#students-count-badge');

        if (loadingEl) loadingEl.classList.remove('d-none');
        if (tableContainerEl) tableContainerEl.classList.add('d-none');
        if (emptyEl) emptyEl.classList.add('d-none');
        if (countBadge) {
            countBadge.innerHTML = '<span class="spinner-border spinner-border-sm me-1 text-muted" role="status"></span><span class="text-muted small">Loading...</span>';
        }

        try {
            const data = await window.DF_API.students.getAll();
            allStudents = Array.isArray(data) ? data : [];
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
                    title: 'Failed to Load Student Registry',
                    message: `Could not retrieve student records from backend: ${window.DF_UI.escapeHtml(err.message)}`,
                    onRetry: () => loadStudents(container)
                });
            }
        }
    }

    function applyFilters() {
        const query = searchQuery.trim().toLowerCase();
        filteredStudents = allStudents.filter(stu => {
            const sid = String(stu.studentId || '').toLowerCase();
            const name = String(stu.name || '').toLowerCase();
            const email = String(stu.email || '').toLowerCase();
            const dept = String(stu.department || '').toLowerCase();
            const status = String(stu.status || '').toUpperCase();

            const matchesQuery = !query || sid.includes(query) || name.includes(query) || email.includes(query) || dept.includes(query);
            const matchesStatus = (statusFilter === 'ALL') || (status === statusFilter);

            return matchesQuery && matchesStatus;
        });
        currentPage = 1;
    }

    function renderTable(container) {
        const loadingEl = container.querySelector('#students-loading');
        const tableContainerEl = container.querySelector('#students-table-container');
        const emptyEl = container.querySelector('#students-empty');
        const countBadge = container.querySelector('#students-count-badge');
        const tbody = container.querySelector('#students-tbody');
        const pagination = container.querySelector('#students-pagination');

        if (loadingEl) loadingEl.classList.add('d-none');

        if (countBadge) {
            countBadge.textContent = allStudents.length === 0
                ? '0 students'
                : `${filteredStudents.length} of ${allStudents.length} students`;
        }

        if (filteredStudents.length === 0) {
            if (tableContainerEl) tableContainerEl.classList.add('d-none');
            if (emptyEl) {
                emptyEl.classList.remove('d-none');
                emptyEl.innerHTML = window.DF_UI.renderEmptyState({
                    title: allStudents.length === 0 ? 'No Students Found' : 'No Matching Students',
                    message: allStudents.length === 0
                        ? 'College B database currently contains no enrolled students.'
                        : 'No student records match your current filter criteria.',
                    icon: 'bi-person-x',
                    actionText: allStudents.length === 0 ? 'Enroll First Student' : 'Clear Filters',
                    actionHref: '#',
                    actionId: 'btn-students-empty-action'
                });
                const emptyActionBtn = emptyEl.querySelector('#btn-students-empty-action');
                if (emptyActionBtn) {
                    emptyActionBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        if (allStudents.length === 0) {
                            openEnrollModal(container);
                        } else {
                            searchQuery = '';
                            statusFilter = 'ALL';
                            const searchInput = container.querySelector('#students-search-input');
                            const statusSelect = container.querySelector('#students-status-filter');
                            if (searchInput) searchInput.value = '';
                            if (statusSelect) statusSelect.value = 'ALL';
                            applyFilters();
                            renderTable(container);
                        }
                    });
                }
            }
            return;
        }

        if (emptyEl) emptyEl.classList.add('d-none');
        if (tableContainerEl) tableContainerEl.classList.remove('d-none');

        // Pagination slice
        const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        const startIdx = (currentPage - 1) * pageSize;
        const pageItems = filteredStudents.slice(startIdx, startIdx + pageSize);

        let rowsHtml = '';
        pageItems.forEach(stu => {
            const sid = stu.studentId || '—';
            const name = stu.name || '—';
            const email = stu.email || '—';
            const dept = stu.department || '—';
            const degree = stu.degree || '—';
            const cgpa = (stu.cgpa != null) ? stu.cgpa : '—';
            const status = (stu.status || 'ACTIVE').toUpperCase();
            const isPending = (status === 'PENDING_ACTIVATION');

            rowsHtml += `
                <tr>
                    <td class="ps-4">
                        <span class="font-monospace fw-bold text-dark">${window.DF_UI.escapeHtml(sid)}</span>
                    </td>
                    <td>
                        <span class="fw-semibold text-slate-800">${window.DF_UI.escapeHtml(name)}</span>
                    </td>
                    <td>
                        <span class="text-muted small">${window.DF_UI.escapeHtml(email)}</span>
                    </td>
                    <td>
                        <span class="badge bg-light text-dark border">${window.DF_UI.escapeHtml(dept)}</span>
                    </td>
                    <td>
                        <span class="small text-slate-700">${window.DF_UI.escapeHtml(degree)}</span>
                    </td>
                    <td>
                        <span class="badge bg-indigo-subtle text-indigo border fw-semibold">${window.DF_UI.escapeHtml(String(cgpa))}</span>
                    </td>
                    <td>${window.DF_UI.renderStatusBadge(status)}</td>
                    <td class="text-end pe-4">
                        ${isPending ? `
                            <button type="button" class="btn btn-sm btn-outline-primary btn-reissue-token" data-sid="${window.DF_UI.escapeHtml(sid)}" title="Reissue Activation Link">
                                <i class="bi bi-link-45deg me-1"></i> Reissue Link
                            </button>
                        ` : `
                            <span class="badge bg-light text-muted border">Enrolled</span>
                        `}
                    </td>
                </tr>
            `;
        });

        if (tbody) tbody.innerHTML = rowsHtml;

        // Attach pagination
        if (pagination) {
            pagination.innerHTML = `
                <span class="text-muted small">
                    Showing <strong>${startIdx + 1}</strong> to <strong>${Math.min(startIdx + pageSize, filteredStudents.length)}</strong> of <strong>${filteredStudents.length}</strong>
                </span>
                <nav aria-label="Students pagination">
                    <ul class="pagination pagination-sm mb-0">
                        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                            <button class="page-link" id="btn-stu-page-prev"><i class="bi bi-chevron-left"></i></button>
                        </li>
                        <li class="page-item disabled">
                            <span class="page-link text-dark fw-semibold">${currentPage} / ${totalPages}</span>
                        </li>
                        <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
                            <button class="page-link" id="btn-stu-page-next"><i class="bi bi-chevron-right"></i></button>
                        </li>
                    </ul>
                </nav>
            `;

            const prevBtn = pagination.querySelector('#btn-stu-page-prev');
            const nextBtn = pagination.querySelector('#btn-stu-page-next');
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

        // Reissue activation token listener
        container.querySelectorAll('.btn-reissue-token').forEach(btn => {
            btn.addEventListener('click', () => {
                const sid = btn.getAttribute('data-sid');
                if (sid) {
                    reissueActivation(sid, container);
                }
            });
        });
    }

    async function reissueActivation(studentId, container) {
        try {
            window.DF_UI.showToast(`Reissuing activation token for ${studentId}...`, 'info');
            const res = await window.DF_API.students.reissueActivation(studentId);
            window.DF_UI.showToast(`Fresh activation token generated! Valid for 7 days.`, 'success');
            showActivationTokenModal(res, container);
            await loadStudents(container);
        } catch (err) {
            window.DF_UI.showToast(`Failed to reissue activation token: ${err.message}`, 'error');
        }
    }

    function showActivationTokenModal(studentRes, container) {
        let modalRoot = container.querySelector('#enroll-modal-root');
        if (!modalRoot) {
            modalRoot = document.createElement('div');
            modalRoot.id = 'enroll-modal-root';
            container.appendChild(modalRoot);
        }

        const activationLink = `${window.location.origin}${window.location.pathname}#/activate#token=${encodeURIComponent(studentRes.activationToken || '')}`;

        modalRoot.innerHTML = `
            <div class="modal fade show d-block" tabindex="-1" style="background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);" id="modal-activation-token">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div class="modal-header border-bottom p-4" style="background: #EEF2FF;">
                            <div class="d-flex align-items-center gap-3">
                                <div class="rounded-circle text-white p-2 d-flex align-items-center justify-content-center" style="width: 44px; height: 44px; background: #4F46E5;">
                                    <i class="bi bi-shield-check fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="modal-title fw-bold text-dark mb-0">Student Enrolled Successfully</h5>
                                    <div class="text-muted small">Account initialized in <span class="badge bg-warning text-dark font-monospace">PENDING_ACTIVATION</span> state</div>
                                </div>
                            </div>
                            <button type="button" class="btn-close" onclick="document.getElementById('modal-activation-token').remove()"></button>
                        </div>
                        <div class="modal-body p-4">
                            <div class="row g-3 mb-4">
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Student ID</label>
                                    <div class="p-2 bg-light rounded border font-monospace fw-bold text-dark">${window.DF_UI.escapeHtml(studentRes.studentId || '')}</div>
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Full Name</label>
                                    <div class="p-2 bg-light rounded border fw-semibold text-dark">${window.DF_UI.escapeHtml(studentRes.name || '')}</div>
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Institutional Email</label>
                                    <div class="p-2 bg-light rounded border font-monospace text-muted small">${window.DF_UI.escapeHtml(studentRes.email || '')}</div>
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Account Status</label>
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
                                    <button class="btn btn-primary" type="button" id="btn-copy-link" style="background:#4F46E5; border-color:#4F46E5;">
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
                        <div class="modal-footer border-top p-3 d-flex justify-content-end">
                            <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('modal-activation-token').remove()">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const copyBtn = modalRoot.querySelector('#btn-copy-link');
        const linkInput = modalRoot.querySelector('#generated-activation-link');
        if (copyBtn && linkInput) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(linkInput.value).then(() => {
                    copyBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Copied!';
                    copyBtn.classList.replace('btn-primary', 'btn-success');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="bi bi-clipboard me-1"></i> Copy Link';
                        copyBtn.classList.replace('btn-success', 'btn-primary');
                    }, 2500);
                });
            });
        }
    }

    function openEnrollModal(container) {
        const modalRoot = container.querySelector('#enroll-modal-root');
        if (!modalRoot) return;

        modalRoot.innerHTML = `
            <div class="modal fade" id="enroll-student-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div class="modal-header border-bottom py-3 px-4">
                            <div class="d-flex align-items-center">
                                <div class="p-2 rounded-3 me-2 text-white" style="background:#4F46E5;">
                                    <i class="bi bi-person-plus-fill"></i>
                                </div>
                                <div>
                                    <h6 class="modal-title fw-bold mb-0">Enroll Student Candidate</h6>
                                    <small class="text-muted">Register an individual student profile in College B</small>
                                </div>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>

                        <form id="enroll-student-form">
                            <div class="modal-body p-4">
                                <div id="enroll-alert" class="alert d-none py-2 px-3 small rounded-3 mb-3"></div>

                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <label for="enroll-student-id" class="form-label small fw-semibold">Student ID <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control form-control-sm font-monospace" id="enroll-student-id" placeholder="e.g. STU-2024-001" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="enroll-name" class="form-label small fw-semibold">Full Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control form-control-sm" id="enroll-name" placeholder="e.g. Jane Doe" required>
                                    </div>
                                    <div class="col-12">
                                        <label for="enroll-email" class="form-label small fw-semibold">Institutional Email <span class="text-danger">*</span></label>
                                        <input type="email" class="form-control form-control-sm" id="enroll-email" placeholder="e.g. jane.doe@collegeb.edu" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="enroll-dept" class="form-label small fw-semibold">Department <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control form-control-sm" id="enroll-dept" placeholder="Computer Science" value="Computer Science" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label for="enroll-degree" class="form-label small fw-semibold">Degree Program</label>
                                        <input type="text" class="form-control form-control-sm" id="enroll-degree" placeholder="B.Tech Computer Science" value="B.Tech Computer Science">
                                    </div>
                                    <div class="col-md-6">
                                        <label for="enroll-cgpa" class="form-label small fw-semibold">Current CGPA</label>
                                        <input type="number" step="0.01" min="0" max="10" class="form-control form-control-sm" id="enroll-cgpa" placeholder="8.50" value="8.50">
                                    </div>
                                    <div class="col-12">
                                        <div class="p-3 rounded-3" style="background: #F8FAFC; border: 1px solid #CBD5E1;">
                                            <div class="d-flex align-items-center gap-2 text-indigo fw-semibold small mb-1">
                                                <i class="bi bi-shield-lock-fill"></i> Secure Self-Service Activation
                                            </div>
                                            <div class="small text-muted">
                                                Enrolled students strictly initialize in <code>PENDING_ACTIVATION</code> status. A single-use 192-bit CSPRNG activation link (7-day validity) will be generated for the student to set their own password securely.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="modal-footer bg-light py-2 px-4 border-top">
                                <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-sm btn-primary" id="btn-submit-enroll" style="background:#4F46E5; border-color:#4F46E5;">
                                    <i class="bi bi-check-lg me-1"></i> Register Student
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        const modalEl = modalRoot.querySelector('#enroll-student-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const form = modalEl.querySelector('#enroll-student-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('#btn-submit-enroll');
            const alertEl = form.querySelector('#enroll-alert');

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Enrolling...';
            alertEl.classList.add('d-none');

            const payload = {
                studentId: form.querySelector('#enroll-student-id').value.trim(),
                name: form.querySelector('#enroll-name').value.trim(),
                email: form.querySelector('#enroll-email').value.trim(),
                department: form.querySelector('#enroll-dept').value.trim(),
                degree: form.querySelector('#enroll-degree').value.trim(),
                cgpa: form.querySelector('#enroll-cgpa').value.trim()
            };

            try {
                const response = await window.DF_API.students.add(payload);
                modal.hide();
                window.DF_UI.showToast(`Student ${payload.name} enrolled successfully!`, 'success');
                showActivationTokenModal(response, container);
                await loadStudents(container);
            } catch (err) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-check-lg me-1"></i> Register Student';
                alertEl.className = 'alert alert-danger py-2 px-3 small rounded-3 mb-3';
                alertEl.textContent = `Enrollment failed: ${err.message}`;
                alertEl.classList.remove('d-none');
            }
        });
    }

    function setupListeners(container) {
        const searchInput = container.querySelector('#students-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                applyFilters();
                renderTable(container);
            });
        }

        const statusSelect = container.querySelector('#students-status-filter');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                statusFilter = e.target.value;
                applyFilters();
                renderTable(container);
            });
        }

        const refreshBtn = container.querySelector('#btn-refresh-students');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                loadStudents(container);
            });
        }

        const enrollBtn = container.querySelector('#btn-open-enroll-modal');
        if (enrollBtn) {
            enrollBtn.addEventListener('click', () => {
                openEnrollModal(container);
            });
        }
    }

    return {
        render
    };
})();

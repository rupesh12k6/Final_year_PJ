/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: RETRIEVED ACADEMIC RECORDS & VERIFIED CREDENTIALS
 * Displays student records peer-retrieved from external Provider nodes (e.g. College A)
 * under cryptographic RS256 authorization issued by Consent Manager.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_RECORDS = (function () {
    'use strict';

    let records = [];
    let searchQuery = '';

    async function render(container) {
        if (!container) return;

        loadRecords();

        container.innerHTML = `
            <div class="df-page-header mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h2 class="h4 fw-bold text-slate-900 mb-0">Retrieved Academic Credentials</h2>
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                <i class="bi bi-patch-check-fill me-1"></i> Verified Dossiers
                            </span>
                        </div>
                        <p class="text-muted small mb-0">Academic records fetched directly from accredited Provider institutions via Consent Manager Access Grants.</p>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="#/admin/requests" class="btn btn-sm btn-outline-primary" style="color:#4F46E5; border-color:#4F46E5;">
                            <i class="bi bi-send-check me-1"></i> Track Outbound Requests
                        </a>
                        <a href="#/admin/new-request" class="btn btn-sm btn-primary" style="background-color: #4F46E5; border-color: #4F46E5;">
                            <i class="bi bi-plus-lg me-1"></i> Initiate Inquiry
                        </a>
                    </div>
                </div>
            </div>

            <!-- Search and Filter Bar -->
            <div class="card border-0 shadow-sm rounded-4 mb-4">
                <div class="card-body p-3">
                    <div class="row g-3 align-items-center">
                        <div class="col-md-8">
                            <div class="input-group input-group-sm">
                                <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control border-start-0" id="records-search-input" placeholder="Search retrieved dossiers by Student ID, name, or department..." value="${window.DF_UI.escapeHtml(searchQuery)}">
                            </div>
                        </div>
                        <div class="col-md-4 text-md-end">
                            <span class="text-muted small fw-semibold" id="records-count-badge">${records.length} dossier(s) in active memory</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- In-Memory Data Protection Notice -->
            <div class="alert alert-light border shadow-sm py-2 px-3 small rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-shield-check text-primary fs-5"></i>
                    <span><strong>Volatile In-Memory Security:</strong> Retrieved academic data is kept strictly in runtime application memory. It is never persisted to localStorage, sessionStorage, or browser disks, and is cleared upon logout or refresh.</span>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 small" id="btn-clear-memory-records" style="font-size:0.75rem;">
                    <i class="bi bi-trash3 me-1"></i> Clear Memory Cache
                </button>
            </div>

            <!-- Records Content Grid -->
            <div id="records-grid" class="row g-3 mb-4">
                <!-- Dynamically rendered -->
            </div>

            <!-- Empty State -->
            <div id="records-empty" class="d-none"></div>

            <!-- Dossier Detail Modal Container -->
            <div id="dossier-modal-root"></div>
        `;

        setupListeners(container);
        renderRecords(container);
    }

    function loadRecords() {
        if (window.DF_RECORDS_STORE && typeof window.DF_RECORDS_STORE.getRecords === 'function') {
            records = window.DF_RECORDS_STORE.getRecords();
        } else {
            records = [];
        }
    }

    function renderRecords(container) {
        const grid = container.querySelector('#records-grid');
        const emptyEl = container.querySelector('#records-empty');
        const countBadge = container.querySelector('#records-count-badge');

        const query = searchQuery.trim().toLowerCase();
        const filtered = records.filter(r => {
            if (!query) return true;
            const sid = String(r.studentId || '').toLowerCase();
            const name = String(r.name || '').toLowerCase();
            const dept = String(r.department || '').toLowerCase();
            return sid.includes(query) || name.includes(query) || dept.includes(query);
        });

        if (countBadge) {
            countBadge.textContent = `${filtered.length} of ${records.length} dossier(s)`;
        }

        if (filtered.length === 0) {
            if (grid) grid.innerHTML = '';
            if (emptyEl) {
                emptyEl.classList.remove('d-none');
                emptyEl.innerHTML = window.DF_UI.renderEmptyState({
                    title: records.length === 0 ? 'No Credentials Retrieved Yet' : 'No Matching Dossiers',
                    message: records.length === 0
                        ? 'To retrieve verified academic records, initiate an inquiry and fetch the data once the student approves the consent grant.'
                        : 'No dossiers match your search query.',
                    icon: 'bi-folder2-open',
                    actionText: records.length === 0 ? 'View Outgoing Requests' : 'Clear Search',
                    actionHref: records.length === 0 ? '#/admin/requests' : '#',
                    actionId: 'btn-records-empty-action'
                });

                const emptyBtn = emptyEl.querySelector('#btn-records-empty-action');
                if (emptyBtn && records.length > 0) {
                    emptyBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        searchQuery = '';
                        const input = container.querySelector('#records-search-input');
                        if (input) input.value = '';
                        renderRecords(container);
                    });
                }
            }
            return;
        }

        if (emptyEl) emptyEl.classList.add('d-none');

        let html = '';
        filtered.forEach((rec, idx) => {
            const sid = rec.studentId || '—';
            const name = rec.name || '—';
            const dept = rec.department || 'Computer Science';
            const cgpa = rec.cgpa || '—';
            const degree = rec.degree || 'Bachelor of Science';
            const fetchedAt = rec.fetchedAt ? window.DF_UI.formatDateTime(rec.fetchedAt) : 'Recent';
            const grantId = rec.grantId ? String(rec.grantId).substring(0, 12) + '...' : 'Verified Grant';

            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card border-0 shadow-sm rounded-4 h-100 position-relative overflow-hidden hover-shadow transition-all">
                        <div class="card-body p-4 d-flex flex-column justify-content-between">
                            <div>
                                <div class="d-flex justify-content-between align-items-start mb-3">
                                    <div class="p-2 rounded-3 text-white" style="background:#4F46E5;">
                                        <i class="bi bi-mortarboard-fill fs-5"></i>
                                    </div>
                                    <span class="badge bg-emerald-subtle text-emerald border px-2 py-1 rounded-pill small" style="background:#ECFDF5; color:#065F46; border-color:#A7F3D0;">
                                        <i class="bi bi-patch-check-fill me-1"></i> Verified Provider
                                    </span>
                                </div>

                                <h5 class="fw-bold text-dark mb-1">${window.DF_UI.escapeHtml(name)}</h5>
                                <div class="font-monospace text-muted small mb-3">ID: ${window.DF_UI.escapeHtml(sid)}</div>

                                <div class="bg-light rounded-3 p-3 mb-3">
                                    <div class="d-flex justify-content-between mb-1">
                                        <span class="text-muted small">Department:</span>
                                        <span class="fw-semibold small text-dark">${window.DF_UI.escapeHtml(dept)}</span>
                                    </div>
                                    <div class="d-flex justify-content-between mb-1">
                                        <span class="text-muted small">Degree:</span>
                                        <span class="fw-semibold small text-dark">${window.DF_UI.escapeHtml(degree)}</span>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="text-muted small">CGPA:</span>
                                        <span class="badge bg-indigo-subtle text-indigo border fw-bold">${window.DF_UI.escapeHtml(cgpa)}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div class="d-flex justify-content-between align-items-center text-muted small mb-3 border-top pt-2">
                                    <span><i class="bi bi-shield-check text-success me-1"></i> ${window.DF_UI.escapeHtml(grantId)}</span>
                                    <span>${window.DF_UI.escapeHtml(fetchedAt)}</span>
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-primary w-100 btn-view-dossier" data-index="${idx}" style="color:#4F46E5; border-color:#4F46E5;">
                                    <i class="bi bi-eye-fill me-1"></i> Inspect Full Dossier
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        if (grid) grid.innerHTML = html;

        // Attach modal trigger listeners
        container.querySelectorAll('.btn-view-dossier').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                showDossierModal(filtered[idx], container);
            });
        });
    }

    function showDossierModal(record, container) {
        if (!record) return;
        const modalRoot = container.querySelector('#dossier-modal-root');
        if (!modalRoot) return;

        const data = record.data || record;

        modalRoot.innerHTML = `
            <div class="modal fade" id="dossier-inspect-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                        <div class="modal-header border-bottom py-3 px-4">
                            <div class="d-flex align-items-center">
                                <div class="p-2 rounded-3 me-2 text-white" style="background:#4F46E5;">
                                    <i class="bi bi-file-earmark-person-fill"></i>
                                </div>
                                <div>
                                    <h6 class="modal-title fw-bold mb-0">Verified Student Academic Dossier</h6>
                                    <small class="text-muted">Origin: College A Provider | DEPA Peer-to-Peer Protocol</small>
                                </div>
                            </div>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body p-4">
                            <!-- Verification Banner -->
                            <div class="alert alert-success d-flex align-items-center gap-2 py-2 px-3 rounded-3 mb-4">
                                <i class="bi bi-shield-fill-check fs-5 text-success"></i>
                                <div>
                                    <strong>Cryptographically Authenticated:</strong> This record was verified against College A Provider signatures and Consent Manager RS256 token constraints.
                                </div>
                            </div>

                            <div class="row g-3 mb-4">
                                <div class="col-md-6">
                                    <div class="p-3 bg-light rounded-3">
                                        <label class="text-muted small fw-semibold d-block">Full Legal Name</label>
                                        <span class="fs-6 fw-bold text-dark">${window.DF_UI.escapeHtml(record.name || '—')}</span>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="p-3 bg-light rounded-3">
                                        <label class="text-muted small fw-semibold d-block">Provider Student ID</label>
                                        <span class="fs-6 font-monospace fw-bold text-primary">${window.DF_UI.escapeHtml(record.studentId || '—')}</span>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="p-3 bg-light rounded-3">
                                        <label class="text-muted small fw-semibold d-block">Department / Field of Study</label>
                                        <span class="text-dark fw-semibold">${window.DF_UI.escapeHtml(record.department || '—')}</span>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="p-3 bg-light rounded-3">
                                        <label class="text-muted small fw-semibold d-block">Degree Awarded / Candidate</label>
                                        <span class="text-dark fw-semibold">${window.DF_UI.escapeHtml(record.degree || '—')}</span>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="p-3 bg-light rounded-3">
                                        <label class="text-muted small fw-semibold d-block">Cumulative GPA (CGPA)</label>
                                        <span class="badge bg-indigo-subtle text-indigo border fw-bold fs-6">${window.DF_UI.escapeHtml(record.cgpa || '—')}</span>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="p-3 bg-light rounded-3">
                                        <label class="text-muted small fw-semibold d-block">Provider Institution</label>
                                        <span class="badge bg-light text-dark border"><i class="bi bi-bank me-1"></i> College A Provider Node</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Raw Decrypted Dossier View -->
                            <div class="card border-0 bg-dark text-light rounded-3 p-3 mb-3">
                                <label class="small text-muted fw-semibold d-block mb-2 font-monospace">Payload Inspection (JSON)</label>
                                <pre class="mb-0 font-monospace small" style="max-height: 220px; overflow-y: auto;"><code>${window.DF_UI.escapeHtml(JSON.stringify(data, null, 2))}</code></pre>
                            </div>
                        </div>
                        <div class="modal-footer bg-light py-2 px-4 border-top">
                            <button type="button" class="btn btn-sm btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-sm btn-primary" onclick="window.print()" style="background:#4F46E5; border-color:#4F46E5;">
                                <i class="bi bi-printer-fill me-1"></i> Print Dossier
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalEl = modalRoot.querySelector('#dossier-inspect-modal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    }

    function setupListeners(container) {
        const searchInput = container.querySelector('#records-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderRecords(container);
            });
        }

        const clearBtn = container.querySelector('#btn-clear-memory-records');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (window.DF_RECORDS_STORE) {
                    window.DF_RECORDS_STORE.clear();
                }
                loadRecords();
                renderRecords(container);
                window.DF_UI.showToast('Volatile in-memory records cleared', 'info');
            });
        }
    }

    return {
        render
    };
})();


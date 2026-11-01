/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: BATCH STUDENT CSV ONBOARDING
 * Bulk enroll student cohorts via CSV roster upload.
 * Issues single-use activation tokens without emailing credentials in plaintext.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_ONBOARDING = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="df-page-header mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h2 class="h4 fw-bold text-slate-900 mb-0">Batch Student CSV Onboarding</h2>
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                <i class="bi bi-file-earmark-spreadsheet me-1"></i> Bulk Ingestion
                            </span>
                        </div>
                        <p class="text-muted small mb-0">Upload student cohorts via CSV to generate secure activation tokens for account onboarding.</p>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="#/admin/students" class="btn btn-sm btn-outline-secondary">
                            <i class="bi bi-arrow-left me-1"></i> Back to Student Registry
                        </a>
                        <button type="button" class="btn btn-sm btn-outline-primary" id="btn-download-sample-csv" style="color:#4F46E5; border-color:#4F46E5;">
                            <i class="bi bi-download me-1"></i> Download Sample CSV
                        </button>
                    </div>
                </div>
            </div>

            <!-- Upload Area & Instructions Grid -->
            <div class="row g-4 mb-4">
                <div class="col-lg-7">
                    <div class="card border-0 shadow-sm rounded-4 h-100">
                        <div class="card-header bg-white border-bottom py-3 px-4">
                            <h6 class="fw-bold mb-0 text-slate-900"><i class="bi bi-cloud-arrow-up-fill text-indigo me-2" style="color:#4F46E5;"></i>Upload Student Cohort CSV</h6>
                        </div>
                        <div class="card-body p-4">
                            <div id="onboarding-alert" class="alert d-none py-2 px-3 small rounded-3 mb-4"></div>

                            <form id="csv-upload-form">
                                <div class="border border-2 border-dashed rounded-4 p-5 text-center mb-4 bg-light" id="drop-zone" style="cursor: pointer; border-color: #CBD5E1 !important;">
                                    <div class="p-3 rounded-circle d-inline-block mb-3 text-white" style="background:#4F46E5;">
                                        <i class="bi bi-file-earmark-text fs-2"></i>
                                    </div>
                                    <h6 class="fw-bold text-dark mb-1">Drag and drop your CSV file here</h6>
                                    <p class="text-muted small mb-3">or click to browse from your computer (UTF-8 formatted .csv)</p>
                                    <input type="file" id="csv-file-input" accept=".csv" class="d-none">
                                    <span class="badge bg-white text-muted border px-3 py-2 rounded-pill font-monospace" id="selected-file-label">No file selected</span>
                                </div>

                                <div class="d-flex justify-content-between align-items-center">
                                    <span class="text-muted small"><i class="bi bi-shield-check text-success me-1"></i> Cryptographic single-use tokens generated automatically</span>
                                    <button type="submit" class="btn btn-primary px-4" id="btn-submit-csv" disabled style="background-color: #4F46E5; border-color: #4F46E5;">
                                        <i class="bi bi-upload me-1"></i> Ingest & Process CSV
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="col-lg-5">
                    <div class="card border-0 shadow-sm rounded-4 h-100">
                        <div class="card-header bg-white border-bottom py-3 px-4">
                            <h6 class="fw-bold mb-0 text-slate-900"><i class="bi bi-info-circle text-primary me-2"></i>CSV Format Specifications</h6>
                        </div>
                        <div class="card-body p-4 small text-slate-700">
                            <p class="mb-3">Ensure your CSV file contains the following column headers in the first line:</p>
                            <div class="p-3 bg-light rounded-3 font-monospace mb-3 small border">
                                studentId,name,email,department,degree,cgpa
                            </div>
                            <ul class="ps-3 mb-3">
                                <li><strong>studentId:</strong> Unique enrollment code (e.g. <code>STU-2024-001</code>).</li>
                                <li><strong>name:</strong> Full student legal name.</li>
                                <li><strong>email:</strong> Institutional email address.</li>
                                <li><strong>department:</strong> Academic department (e.g. <code>Computer Science</code>).</li>
                                <li><strong>degree:</strong> Degree program (e.g. <code>B.Tech Information Technology</code>).</li>
                                <li><strong>cgpa:</strong> Cumulative GPA on a 10-point or 4-point scale.</li>
                            </ul>
                            <div class="alert alert-info py-2 px-3 small rounded-3 mb-0">
                                <i class="bi bi-key-fill text-info me-1"></i> Students are created with <code>PENDING_ACTIVATION</code> status. They must set their password via the secure activation fragment.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Import Results Section -->
            <div id="import-results-container" class="d-none">
                <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-4">
                    <div class="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                        <h6 class="fw-bold mb-0 text-slate-900"><i class="bi bi-check-circle-fill text-success me-2"></i>Batch Ingestion Results</h6>
                        <span class="badge bg-success-subtle text-success border px-2 py-1 rounded-pill small" id="result-status-badge">Completed</span>
                    </div>
                    <div class="card-body p-4">
                        <!-- Stat Summary -->
                        <div class="row g-3 mb-4" id="import-summary-row">
                            <div class="col-md-4">
                                <div class="p-3 bg-light rounded-3 text-center border">
                                    <div class="text-muted small fw-semibold">Total Processed</div>
                                    <div class="fs-4 fw-bold text-dark" id="res-total">0</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="p-3 bg-light rounded-3 text-center border">
                                    <div class="text-muted small fw-semibold text-success">Successfully Imported</div>
                                    <div class="fs-4 fw-bold text-success" id="res-imported">0</div>
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="p-3 bg-light rounded-3 text-center border">
                                    <div class="text-muted small fw-semibold text-warning">Skipped / Duplicates</div>
                                    <div class="fs-4 fw-bold text-warning" id="res-skipped">0</div>
                                </div>
                            </div>
                        </div>

                        <!-- Errors Box if any -->
                        <div id="import-errors-box" class="alert alert-warning py-2 px-3 small rounded-3 mb-4 d-none"></div>

                        <!-- Generated Activation Links Table -->
                        <h6 class="fw-bold text-dark mb-3">Generated Activation Credentials</h6>
                        <div class="table-responsive">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="bg-light text-slate-700 small text-uppercase fw-semibold border-bottom">
                                    <tr>
                                        <th class="ps-3">Student ID</th>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Status</th>
                                        <th class="text-end pe-3">Activation Action</th>
                                    </tr>
                                </thead>
                                <tbody id="import-items-tbody" class="small">
                                    <!-- Populated dynamically -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupListeners(container);
    }

    function setupListeners(container) {
        const dropZone = container.querySelector('#drop-zone');
        const fileInput = container.querySelector('#csv-file-input');
        const fileLabel = container.querySelector('#selected-file-label');
        const submitBtn = container.querySelector('#btn-submit-csv');
        const form = container.querySelector('#csv-upload-form');
        const sampleBtn = container.querySelector('#btn-download-sample-csv');

        if (sampleBtn) {
            sampleBtn.addEventListener('click', downloadSampleCsv);
        }

        if (dropZone && fileInput) {
            dropZone.addEventListener('click', () => fileInput.click());

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '#4F46E5';
                dropZone.style.backgroundColor = '#EEF2FF';
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.style.borderColor = '#CBD5E1';
                dropZone.style.backgroundColor = '#F8FAFC';
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.style.borderColor = '#CBD5E1';
                dropZone.style.backgroundColor = '#F8FAFC';
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    fileInput.files = e.dataTransfer.files;
                    handleFileSelection(fileInput.files[0], fileLabel, submitBtn);
                }
            });

            fileInput.addEventListener('change', () => {
                if (fileInput.files && fileInput.files.length > 0) {
                    handleFileSelection(fileInput.files[0], fileLabel, submitBtn);
                }
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!fileInput.files || fileInput.files.length === 0) return;

                const file = fileInput.files[0];
                const formData = new FormData();
                formData.append('file', file);
                
                // Pass frontend portal URL base
                const portalBaseUrl = `${window.location.origin}${window.location.pathname}`;
                formData.append('portalBaseUrl', portalBaseUrl);

                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing CSV...';

                const alertEl = container.querySelector('#onboarding-alert');
                alertEl.classList.add('d-none');

                try {
                    const result = await window.DF_API.students.importCsv(formData);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-upload me-1"></i> Ingest & Process CSV';
                    renderResults(result, container);
                    window.DF_UI.showToast(`Imported ${result.importedCount || 0} students successfully!`, 'success');
                } catch (err) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-upload me-1"></i> Ingest & Process CSV';
                    alertEl.className = 'alert alert-danger py-2 px-3 small rounded-3 mb-4';
                    alertEl.textContent = `Batch import failed: ${err.message}`;
                    alertEl.classList.remove('d-none');
                }
            });
        }
    }

    function handleFileSelection(file, labelEl, btnEl) {
        if (!file) return;
        if (!file.name.endsWith('.csv')) {
            window.DF_UI.showToast('Please select a valid .csv file', 'danger');
            return;
        }
        if (labelEl) {
            labelEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            labelEl.classList.remove('text-muted');
            labelEl.classList.add('text-primary', 'fw-semibold');
        }
        if (btnEl) {
            btnEl.disabled = false;
        }
    }

    function renderResults(result, container) {
        const resultsContainer = container.querySelector('#import-results-container');
        if (!resultsContainer) return;

        resultsContainer.classList.remove('d-none');

        const totalEl = resultsContainer.querySelector('#res-total');
        const importedEl = resultsContainer.querySelector('#res-imported');
        const skippedEl = resultsContainer.querySelector('#res-skipped');
        const errorsBox = resultsContainer.querySelector('#import-errors-box');
        const tbody = resultsContainer.querySelector('#import-items-tbody');

        if (totalEl) totalEl.textContent = result.totalProcessed || 0;
        if (importedEl) importedEl.textContent = result.importedCount || 0;
        if (skippedEl) skippedEl.textContent = result.skippedCount || 0;

        if (errorsBox) {
            if (result.errors && result.errors.length > 0) {
                errorsBox.classList.remove('d-none');
                errorsBox.innerHTML = `<strong>Import Notices:</strong><ul class="mb-0 ps-3 mt-1">${result.errors.map(e => `<li>${window.DF_UI.escapeHtml(e)}</li>`).join('')}</ul>`;
            } else {
                errorsBox.classList.add('d-none');
            }
        }

        if (tbody) {
            const items = result.items || [];
            if (items.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No new students required activation tokens.</td></tr>';
            } else {
                let html = '';
                items.forEach(item => {
                    const sid = item.studentId || '—';
                    const name = item.name || '—';
                    const email = item.email || '—';
                    const token = item.activationToken || '';
                    const link = `${window.location.origin}${window.location.pathname}#/activate#token=${encodeURIComponent(token)}`;

                    html += `
                        <tr>
                            <td class="ps-3 font-monospace fw-bold text-dark">${window.DF_UI.escapeHtml(sid)}</td>
                            <td class="fw-semibold text-slate-800">${window.DF_UI.escapeHtml(name)}</td>
                            <td class="text-muted small">${window.DF_UI.escapeHtml(email)}</td>
                            <td><span class="badge bg-amber-subtle text-amber border px-2 py-1 rounded-pill small" style="background:#FFFBEB; color:#B45309; border-color:#FDE68A;">Pending Activation</span></td>
                            <td class="text-end pe-3">
                                ${token ? `
                                    <button type="button" class="btn btn-sm btn-outline-primary btn-copy-link" data-url="${window.DF_UI.escapeHtml(link)}" style="color:#4F46E5; border-color:#4F46E5;">
                                        <i class="bi bi-copy me-1"></i> Copy Activation Link
                                    </button>
                                ` : '<span class="text-muted small">Already active</span>'}
                            </td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;

                tbody.querySelectorAll('.btn-copy-link').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const url = btn.getAttribute('data-url');
                        navigator.clipboard.writeText(url).then(() => {
                            window.DF_UI.showToast('Activation URL copied to clipboard!', 'success');
                        }).catch(() => {
                            prompt('Copy activation URL:', url);
                        });
                    });
                });
            }
        }

        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function downloadSampleCsv() {
        const csvContent = "studentId,name,email,department,degree,cgpa\n"
            + "STU-B-2024-001,Emily Watson,emily.watson@collegeb.edu,Computer Science,B.Tech Computer Science,8.90\n"
            + "STU-B-2024-002,Carlos Rivera,carlos.rivera@collegeb.edu,Information Technology,B.Tech Information Technology,8.45\n"
            + "STU-B-2024-003,Fatima Zahra,fatima.zahra@collegeb.edu,Data Science,B.Sc Data Science,9.15\n";

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "college_b_students_sample.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    return {
        render
    };
})();


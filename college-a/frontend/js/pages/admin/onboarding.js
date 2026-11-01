/**
 * ==============================================================================
 * DEPA COLLEGE A — ADMIN: STUDENT CSV ONBOARDING MODULE
 * Provisions student cohorts directly into College A's database with single-use tokens.
 * Backend: POST /api/students/import-csv, POST /api/students/onboard
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_ONBOARDING = (function () {
    'use strict';

    let lastImportResult = null;

    async function render(container) {
        if (!container) return;

        const html = `
            <!-- Page Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h3 class="fw-bold text-dark mb-1">Student CSV Onboarding</h3>
                    <p class="text-muted small mb-0">Provision student records directly into College A's database with cryptographic single-use activation tokens.</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn btn-sm btn-outline-secondary" onclick="window.DF_PAGE_ADMIN_ONBOARDING.render(document.getElementById('df-main-content'))">
                        <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                    </button>
                    <button class="btn btn-sm btn-outline-success" id="btn-sync-eligible-cm">
                        <i class="bi bi-cloud-arrow-up-fill me-1"></i> Sync Active with CM
                    </button>
                </div>
            </div>

            <!-- Onboarding Instructions & Architecture Note -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-body p-4">
                    <div class="row g-4 align-items-center">
                        <div class="col-lg-7">
                            <div class="d-flex align-items-center gap-2 mb-2">
                                <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace small">ZERO-KNOWLEDGE PROVISIONING</span>
                            </div>
                            <h5 class="fw-bold text-dark mb-2">Secure Student Identity Minting</h5>
                            <p class="text-muted small mb-3" style="line-height: 1.6;">
                                During CSV onboarding, College A mints secure, single-use activation tokens for each student.
                                <strong>Default passwords are strictly forbidden.</strong> Students independently activate their accounts and choose their passwords via the Student Portal.
                                The Consent Manager never receives student passwords or raw academic dossiers.
                            </p>
                            <div class="d-flex flex-wrap gap-2">
                                <span class="badge bg-light text-dark border"><i class="bi bi-shield-check text-success me-1"></i> SHA-256 Token Hashing</span>
                                <span class="badge bg-light text-dark border"><i class="bi bi-clock-history text-amber me-1"></i> 7-Day Auto-Expiration</span>
                                <span class="badge bg-light text-dark border"><i class="bi bi-database-check text-primary me-1"></i> Local DB Isolation</span>
                            </div>
                        </div>

                        <div class="col-lg-5">
                            <div class="p-3 bg-light rounded-3 border">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="text-muted small fw-bold text-uppercase">Expected CSV Columns</span>
                                    <button class="btn btn-sm btn-link p-0 text-success text-decoration-none small" id="btn-copy-csv-sample">
                                        <i class="bi bi-clipboard me-1"></i> Copy Sample
                                    </button>
                                </div>
                                <pre class="bg-white p-2 rounded border font-monospace mb-0" style="font-size: 0.75rem; overflow-x: auto; color: #1E293B;">studentId,name,email,program,cgpa
STU-2023-002,Bob Roberts,bob@collegea.edu,Computer Science,8.65
STU-2023-003,Carol White,carol@collegea.edu,Electrical Eng,9.10
STU-2023-004,David Miller,david@collegea.edu,Mechanical Eng,8.40</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CSV Upload Form Card -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-header bg-transparent border-bottom p-3">
                    <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-file-earmark-arrow-up me-2 text-success"></i>Upload Student Roster</h6>
                </div>
                <div class="card-body p-4">
                    <form id="form-csv-upload">
                        <div class="mb-3">
                            <label for="csv-file-input" class="form-label text-muted small fw-bold text-uppercase">Select CSV File (.csv)</label>
                            <input class="form-control" type="file" id="csv-file-input" accept=".csv" required>
                            <div class="form-text small text-muted">Must contain studentId, name, and email columns. Header row is detected automatically.</div>
                        </div>

                        <div class="d-flex justify-content-between align-items-center">
                            <span class="text-muted small">Max file size: 5MB • UTF-8 encoded</span>
                            <button type="submit" class="btn btn-success d-flex align-items-center gap-2" id="btn-submit-csv" style="background-color: var(--df-primary); border-color: var(--df-primary);">
                                <span id="csv-spinner" class="spinner-border spinner-border-sm d-none" role="status"></span>
                                <span id="csv-btn-text">Upload & Mint Tokens</span>
                                <i class="bi bi-arrow-right"></i>
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Import Results Section (Initially empty or shows last result) -->
            <div id="csv-results-section" class="${lastImportResult ? '' : 'd-none'}">
                ${lastImportResult ? renderResultsHtml(lastImportResult) : ''}
            </div>
        `;

        container.innerHTML = html;

        // Wire Event Handlers
        const sampleBtn = document.getElementById('btn-copy-csv-sample');
        if (sampleBtn) {
            sampleBtn.addEventListener('click', () => {
                const sampleText = `studentId,name,email,program,cgpa\nSTU-2023-002,Bob Roberts,bob@collegea.edu,Computer Science,8.65\nSTU-2023-003,Carol White,carol@collegea.edu,Electrical Eng,9.10\nSTU-2023-004,David Miller,david@collegea.edu,Mechanical Eng,8.40`;
                navigator.clipboard.writeText(sampleText).then(() => {
                    window.DF_UI.showToast('Sample CSV copied to clipboard!', 'info');
                });
            });
        }

        const syncCmBtn = document.getElementById('btn-sync-eligible-cm');
        if (syncCmBtn) {
            syncCmBtn.addEventListener('click', async () => {
                syncCmBtn.disabled = true;
                syncCmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Syncing...';
                try {
                    const res = await window.DF_API.admin.initiateBulkOnboard();
                    window.DF_UI.showToast(`Sync with CM complete! Processed: ${res.totalProcessed || res.total || 0}`, 'success');
                } catch (err) {
                    window.DF_UI.showToast(`CM Sync note: ${err.message}`, 'info');
                } finally {
                    syncCmBtn.disabled = false;
                    syncCmBtn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill me-1"></i> Sync Active with CM';
                }
            });
        }

        const form = document.getElementById('form-csv-upload');
        const fileInput = document.getElementById('csv-file-input');
        const submitBtn = document.getElementById('btn-submit-csv');
        const spinner = document.getElementById('csv-spinner');
        const btnText = document.getElementById('csv-btn-text');
        const resultsSection = document.getElementById('csv-results-section');

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const file = fileInput.files[0];
                if (!file) {
                    window.DF_UI.showToast('Please select a CSV file first.', 'error');
                    return;
                }

                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                btnText.textContent = 'Processing & Minting Tokens...';

                try {
                    const portalBaseUrl = window.location.origin;
                    const res = await window.DF_API.admin.importCsv(file, portalBaseUrl);
                    lastImportResult = res;

                    resultsSection.innerHTML = renderResultsHtml(res);
                    resultsSection.classList.remove('d-none');
                    resultsSection.scrollIntoView({ behavior: 'smooth' });

                    window.DF_UI.showToast(`CSV imported: ${res.importedCount} students provisioned!`, 'success');
                } catch (err) {
                    window.DF_UI.showToast(`CSV Import failed: ${err.message}`, 'error');
                } finally {
                    submitBtn.disabled = false;
                    spinner.classList.add('d-none');
                    btnText.textContent = 'Upload & Mint Tokens';
                }
            });
        }
    }

    function renderResultsHtml(res) {
        const items = Array.isArray(res.items) ? res.items : [];

        return `
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-check-circle-fill text-success fs-5"></i>
                        <h6 class="mb-0 fw-bold text-dark">Onboarding Summary & Minted Activation Tokens</h6>
                    </div>
                    <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace px-3 py-1">
                        IMPORTED: ${res.importedCount} / ${res.totalCount}
                    </span>
                </div>
                <div class="card-body p-4">
                    <div class="row g-3 mb-4">
                        <div class="col-sm-4">
                            <div class="p-3 bg-light rounded border text-center">
                                <div class="text-muted small fw-semibold text-uppercase">Total Processed</div>
                                <div class="fs-4 fw-bold text-dark mt-1">${res.totalCount}</div>
                            </div>
                        </div>
                        <div class="col-sm-4">
                            <div class="p-3 bg-light rounded border text-center">
                                <div class="text-muted small fw-semibold text-uppercase text-success">Successfully Imported</div>
                                <div class="fs-4 fw-bold text-success mt-1">${res.importedCount}</div>
                            </div>
                        </div>
                        <div class="col-sm-4">
                            <div class="p-3 bg-light rounded border text-center">
                                <div class="text-muted small fw-semibold text-uppercase text-warning">Skipped / Duplicates</div>
                                <div class="fs-4 fw-bold text-warning mt-1">${res.skippedCount}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Security Banner for Activation Links -->
                    <div class="alert alert-warning py-3 px-3 small rounded-3 mb-4 d-flex align-items-start gap-3 border-warning border-opacity-50">
                        <i class="bi bi-shield-lock-fill fs-4 text-warning flex-shrink-0 mt-1"></i>
                        <div>
                            <h6 class="fw-bold text-dark mb-1">Confidential Single-Use Activation Links</h6>
                            <p class="mb-0 text-muted" style="line-height: 1.5;">
                                Single-use activation tokens are displayed only once upon minting. Raw tokens are never stored in plaintext in the database (only SHA-256 hashes are retained).
                                Activation links use secure URL fragments (<code>#/activate#token=...</code>) so tokens are strictly client-side and never transmitted in HTTP query parameters or server logs.
                                Please distribute each link confidentially to the corresponding student.
                            </p>
                        </div>
                    </div>

                    <h6 class="fw-bold text-dark mb-3"><i class="bi bi-key me-2 text-primary"></i>Minted Activation Tokens & Links:</h6>
                    <div class="table-responsive">
                        <table class="table df-table table-hover align-middle mb-0">
                            <thead class="table-light text-muted small text-uppercase">
                                <tr>
                                    <th class="ps-3">Student ID</th>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Activation Token</th>
                                    <th>Expires</th>
                                    <th class="text-end pe-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td class="ps-3 font-monospace fw-bold text-success">${window.DF_UI.escapeHtml(item.studentId)}</td>
                                        <td class="fw-semibold text-dark">${window.DF_UI.escapeHtml(item.name)}</td>
                                        <td class="text-secondary small font-monospace">${window.DF_UI.escapeHtml(item.email)}</td>
                                        <td>
                                            <span class="font-monospace small bg-light p-1 rounded border">
                                                ${window.DF_UI.escapeHtml(item.activationToken ? item.activationToken.substring(0, 16) + '...' : 'Seeded')}
                                            </span>
                                        </td>
                                        <td class="small text-muted font-monospace">${item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : '7 Days'}</td>
                                        <td class="text-end pe-3">
                                            <div class="d-flex justify-content-end gap-1">
                                                <button class="btn btn-sm btn-outline-success py-1 px-2" title="Copy secure activation link with fragment" onclick="navigator.clipboard.writeText(window.location.origin + '/index.html#/activate#token=' + '${window.DF_UI.escapeHtml(item.activationToken || '')}').then(() => window.DF_UI.showToast('Copied activation link to clipboard!', 'info'))">
                                                    <i class="bi bi-link-45deg me-1"></i> Copy Link
                                                </button>
                                                <button class="btn btn-sm btn-outline-secondary py-1 px-2" title="Copy raw token" onclick="navigator.clipboard.writeText('${window.DF_UI.escapeHtml(item.activationToken || '')}').then(() => window.DF_UI.showToast('Copied token to clipboard!', 'info'))">
                                                    <i class="bi bi-copy"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                                ${items.length === 0 ? `
                                    <tr>
                                        <td colspan="6" class="text-center py-4 text-muted">
                                            No new activation tokens were generated (records may already exist).
                                        </td>
                                    </tr>
                                ` : ''}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    return { render };
})();


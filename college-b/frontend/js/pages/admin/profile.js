/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: INSTITUTIONAL PROFILE & CRYPTOGRAPHIC NODE CONFIGURATION
 * Institutional identity, cryptographic certificates, node endpoints,
 * and authenticated Consumer Officer administrative session parameters.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_PROFILE = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        const user = window.DF_SESSION.getUser() || {};

        container.innerHTML = `
            <div class="df-page-header mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h2 class="h4 fw-bold text-slate-900 mb-0">Institution Profile & Node Keys</h2>
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                <i class="bi bi-shield-lock-fill me-1"></i> Consumer Node Cryptography
                            </span>
                        </div>
                        <p class="text-muted small mb-0">Institutional metadata, RS256 key boundaries, and cryptographic node settings for College B.</p>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-secondary" id="btn-ping-node">
                            <i class="bi bi-activity me-1"></i> Check Node Connectivity
                        </button>
                    </div>
                </div>
            </div>

            <div class="row g-4 mb-4">
                <!-- Institution Profile Card -->
                <div class="col-lg-6">
                    <div class="card border-0 shadow-sm rounded-4 h-100">
                        <div class="card-header bg-white border-bottom py-3 px-4">
                            <h6 class="fw-bold mb-0 text-slate-900"><i class="bi bi-building text-indigo me-2" style="color:#4F46E5;"></i>Institutional Identity</h6>
                        </div>
                        <div class="card-body p-4">
                            <div class="d-flex align-items-center gap-3 mb-4">
                                <div class="p-3 rounded-4 text-white" style="background: linear-gradient(135deg, #1E1B4B 0%, #4F46E5 100%);">
                                    <i class="bi bi-mortarboard fs-2"></i>
                                </div>
                                <div>
                                    <h5 class="fw-bold text-dark mb-0">College B University</h5>
                                    <div class="text-muted small">Accredited Academic Inquirer & Consumer Node</div>
                                    <span class="badge bg-emerald-subtle text-emerald border px-2 py-0 rounded-pill small mt-1" style="background:#ECFDF5; color:#065F46; border-color:#A7F3D0;">
                                        <i class="bi bi-check-circle-fill me-1"></i> Fiduciary Registered
                                    </span>
                                </div>
                            </div>

                            <div class="list-group list-group-flush small">
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Organization Code</span>
                                    <span class="font-monospace fw-bold text-dark">COLLEGE_B</span>
                                </div>
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Node Category</span>
                                    <span class="badge bg-light text-dark border">DATA CONSUMER (Inquirer)</span>
                                </div>
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Backend Service</span>
                                    <code class="text-slate-800">http://localhost:8082</code>
                                </div>
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Frontend Portal</span>
                                    <code class="text-slate-800">http://localhost:3003</code>
                                </div>
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Database Engine</span>
                                    <span class="badge bg-light text-dark border">PostgreSQL (college_b_db)</span>
                                </div>
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Consent Manager Node</span>
                                    <code class="text-slate-800">http://localhost:8095</code>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cryptographic Architecture Card -->
                <div class="col-lg-6">
                    <div class="card border-0 shadow-sm rounded-4 h-100">
                        <div class="card-header bg-white border-bottom py-3 px-4">
                            <h6 class="fw-bold mb-0 text-slate-900"><i class="bi bi-shield-shaded text-indigo me-2" style="color:#4F46E5;"></i>Security & Cryptographic Boundary</h6>
                        </div>
                        <div class="card-body p-4">
                            <div class="alert alert-info py-2 px-3 small rounded-3 mb-4 d-flex align-items-start gap-2">
                                <i class="bi bi-info-circle-fill text-info mt-1 flex-shrink-0"></i>
                                <div>
                                    <strong>DEPA Architecture Compliance:</strong> Academic data travels peer-to-peer directly from College A to College B. The Consent Manager only brokers the digital consent artifact.
                                </div>
                            </div>

                            <div class="list-group list-group-flush small">
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Token Secrecy Policy</span>
                                    <span class="badge bg-success-subtle text-success border">Backend Sealed (Zero Browser Leak)</span>
                                </div>
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Transport Encryption</span>
                                    <span class="badge bg-light text-dark border">TLS / HTTPS + DH Key Exchange</span>
                                </div>
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Data Exchange Cipher</span>
                                    <span class="font-monospace fw-semibold text-slate-800">AES-256-GCM + Diffie-Hellman</span>
                                </div>
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">Authorization Token Format</span>
                                    <span class="font-monospace fw-semibold text-slate-800">RS256 JWT (Signed by CM)</span>
                                </div>
                                <div class="list-group-item px-0 d-flex justify-content-between align-items-center">
                                    <span class="text-muted">SSRF Protection Engine</span>
                                    <span class="badge bg-emerald-subtle text-emerald border">Strict URL & Domain Whitelist</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Authenticated Officer Session Card -->
                <div class="col-12">
                    <div class="card border-0 shadow-sm rounded-4">
                        <div class="card-header bg-white border-bottom py-3 px-4">
                            <h6 class="fw-bold mb-0 text-slate-900"><i class="bi bi-person-badge text-indigo me-2" style="color:#4F46E5;"></i>Active Officer Session Credentials</h6>
                        </div>
                        <div class="card-body p-4">
                            <div class="row g-3 small">
                                <div class="col-md-3">
                                    <label class="text-muted small fw-semibold d-block">Officer Name</label>
                                    <span class="fw-bold text-dark fs-6">${window.DF_UI.escapeHtml(user.name || 'Dean / Consumer Admin')}</span>
                                </div>
                                <div class="col-md-3">
                                    <label class="text-muted small fw-semibold d-block">Officer Email</label>
                                    <span class="text-dark">${window.DF_UI.escapeHtml(user.email || 'dean@collegeb.edu')}</span>
                                </div>
                                <div class="col-md-3">
                                    <label class="text-muted small fw-semibold d-block">RBAC Security Role</label>
                                    <span class="badge bg-indigo-subtle text-indigo border px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                        ${window.DF_UI.escapeHtml(user.role || 'ORG_ADMIN')}
                                    </span>
                                </div>
                                <div class="col-md-3">
                                    <label class="text-muted small fw-semibold d-block">Session Status</label>
                                    <span class="badge bg-emerald-subtle text-emerald border px-2 py-1 rounded-pill small" style="background:#ECFDF5; color:#065F46; border-color:#A7F3D0;">
                                        <i class="bi bi-check-circle-fill me-1"></i> Active Session
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        setupListeners(container);
    }

    function setupListeners(container) {
        const pingBtn = container.querySelector('#btn-ping-node');
        if (pingBtn) {
            pingBtn.addEventListener('click', async () => {
                pingBtn.disabled = true;
                pingBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Pinging...';
                try {
                    const health = await window.DF_API.cm.checkHealth();
                    pingBtn.disabled = false;
                    pingBtn.innerHTML = '<i class="bi bi-activity me-1"></i> Check Node Connectivity';
                    window.DF_UI.showToast(`Node Healthy: status=${health.status || 'UP'}`, 'success');
                } catch (err) {
                    pingBtn.disabled = false;
                    pingBtn.innerHTML = '<i class="bi bi-activity me-1"></i> Check Node Connectivity';
                    window.DF_UI.showToast(`Ping failed: ${err.message}`, 'danger');
                }
            });
        }
    }

    return {
        render
    };
})();


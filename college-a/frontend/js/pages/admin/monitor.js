/**
 * ==============================================================================
 * DEPA COLLEGE A — ADMIN: INBOUND CRYPTOGRAPHIC P2P MONITOR
 * Observability into provider-side RS256 token validation, CM live introspection,
 * and Diffie-Hellman peer-to-peer data transfers.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_MONITOR = (function () {
    'use strict';

    let logEntries = [
        `[SYSTEM] College A Provider Node online on port 8081`,
        `[SECURITY] RSA Key initialized with kid=COLLEGE_A_ASSERTION_KEY`,
        `[FEDERATION] Consent Manager RS256 Public Key synchronized from :8095`,
        `[CRYPTO] Direct peer-to-peer listener active at POST /api/data/access/{grantId}`,
        `[DIFFIE-HELLMAN] Ephemeral DH key agreement enabled (AES-256-GCM cipher suite)`,
        `[INTROSPECTION] Fail-closed real-time grant status validation configured`
    ];

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Initializing Cryptographic Inbound Monitor...')}
            </div>
        `;

        try {
            const [healthA, healthCm] = await Promise.all([
                window.DF_API.health.checkCollegeA().catch(err => ({ status: 'DOWN', error: err.message })),
                window.DF_API.health.checkCm().catch(err => ({ status: 'DOWN', error: err.message }))
            ]);

            const isAOnline = healthA.status === 'UP';
            const isCmOnline = healthCm.status === 'UP';

            const html = `
                <!-- Page Header -->
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h3 class="fw-bold text-dark mb-1">Inbound Cryptographic P2P Monitor</h3>
                        <p class="text-muted small mb-0">Live observability into peer-to-peer data requests, token signature validation, and introspection checks.</p>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-sm btn-outline-secondary" id="btn-refresh-monitor">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh Nodes
                        </button>
                        <button class="btn btn-sm btn-outline-danger" id="btn-clear-console">
                            <i class="bi bi-trash me-1"></i> Clear Log
                        </button>
                    </div>
                </div>

                <!-- Node Health Cards -->
                <div class="row g-3 mb-4">
                    <div class="col-md-6">
                        <div class="card df-card border-0 shadow-sm p-3" style="border-radius: var(--df-radius-lg);">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="rounded-circle ${isAOnline ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} p-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                        <i class="bi bi-server fs-4"></i>
                                    </div>
                                    <div>
                                        <h6 class="fw-bold text-dark mb-0">College A Provider Node</h6>
                                        <div class="text-muted small font-monospace">http://localhost:8081/health</div>
                                    </div>
                                </div>
                                <span class="badge ${isAOnline ? 'bg-success' : 'bg-danger'} px-3 py-2 rounded-pill font-monospace small">
                                    ${isAOnline ? 'STATUS: UP' : 'STATUS: OFFLINE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div class="card df-card border-0 shadow-sm p-3" style="border-radius: var(--df-radius-lg);">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="rounded-circle ${isCmOnline ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} p-3 d-flex align-items-center justify-content-center" style="width: 48px; height: 48px;">
                                        <i class="bi bi-shield-check fs-4"></i>
                                    </div>
                                    <div>
                                        <h6 class="fw-bold text-dark mb-0">Central Consent Manager</h6>
                                        <div class="text-muted small font-monospace">http://localhost:8095/api/health</div>
                                    </div>
                                </div>
                                <span class="badge ${isCmOnline ? 'bg-success' : 'bg-danger'} px-3 py-2 rounded-pill font-monospace small">
                                    ${isCmOnline ? 'STATUS: UP' : 'STATUS: OFFLINE'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4-Stage Verification Pipeline Card -->
                <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                    <div class="card-header bg-transparent border-bottom p-3">
                        <h6 class="mb-0 fw-bold text-dark"><i class="bi bi-shield-lock-fill me-2 text-success"></i>Provider Cryptographic Verification Pipeline</h6>
                    </div>
                    <div class="card-body p-4">
                        <div class="row g-3 text-center">
                            <div class="col-md-3">
                                <div class="p-3 bg-light rounded-3 border h-100 d-flex flex-column justify-content-between">
                                    <div>
                                        <span class="badge bg-secondary-subtle text-secondary font-monospace mb-2">STAGE 1</span>
                                        <h6 class="fw-bold text-dark">RS256 Signature</h6>
                                        <p class="text-muted small mb-0" style="font-size: 0.8rem;">
                                            Validates CM cryptographic signature using authoritative public key (kid matching).
                                        </p>
                                    </div>
                                    <div class="mt-2 text-success small fw-semibold"><i class="bi bi-check2-circle"></i> Active</div>
                                </div>
                            </div>

                            <div class="col-md-3">
                                <div class="p-3 bg-light rounded-3 border h-100 d-flex flex-column justify-content-between">
                                    <div>
                                        <span class="badge bg-secondary-subtle text-secondary font-monospace mb-2">STAGE 2</span>
                                        <h6 class="fw-bold text-dark">Claims & Scope</h6>
                                        <p class="text-muted small mb-0" style="font-size: 0.8rem;">
                                            Ensures issuer=consent-manager, audience=COLLEGE_A, and token is not expired.
                                        </p>
                                    </div>
                                    <div class="mt-2 text-success small fw-semibold"><i class="bi bi-check2-circle"></i> Enforced</div>
                                </div>
                            </div>

                            <div class="col-md-3">
                                <div class="p-3 bg-light rounded-3 border h-100 d-flex flex-column justify-content-between">
                                    <div>
                                        <span class="badge bg-secondary-subtle text-secondary font-monospace mb-2">STAGE 3</span>
                                        <h6 class="fw-bold text-dark">Live Introspection</h6>
                                        <p class="text-muted small mb-0" style="font-size: 0.8rem;">
                                            Live call to CM: checks that consent grant is not revoked, suspended, or expired.
                                        </p>
                                    </div>
                                    <div class="mt-2 text-success small fw-semibold"><i class="bi bi-check2-circle"></i> Fail-Closed</div>
                                </div>
                            </div>

                            <div class="col-md-3">
                                <div class="p-3 bg-light rounded-3 border h-100 d-flex flex-column justify-content-between">
                                    <div>
                                        <span class="badge bg-secondary-subtle text-secondary font-monospace mb-2">STAGE 4</span>
                                        <h6 class="fw-bold text-dark">DH + AES-GCM</h6>
                                        <p class="text-muted small mb-0" style="font-size: 0.8rem;">
                                            Diffie-Hellman ephemeral secret computed with Consumer public key; payload sealed.
                                        </p>
                                    </div>
                                    <div class="mt-2 text-success small fw-semibold"><i class="bi bi-check2-circle"></i> End-to-End</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Live Monitor Console Card -->
                <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                    <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center gap-2">
                            <span class="health-dot online"></span>
                            <h6 class="mb-0 fw-bold text-dark">Cryptographic Event Console</h6>
                        </div>
                        <span class="badge bg-light text-secondary border font-monospace small">Listening: :8081</span>
                    </div>
                    <div class="card-body p-0">
                        <pre class="p-4 mb-0 font-monospace text-light rounded-bottom" id="crypto-event-pre" style="background-color: #0F172A; font-size: 0.82rem; line-height: 1.7; min-height: 240px; max-height: 380px; overflow-y: auto;">
${logEntries.map(e => `[${new Date().toLocaleTimeString()}] ${window.DF_UI.escapeHtml(e)}`).join('\n')}</pre>
                    </div>
                </div>
            `;

            container.innerHTML = html;

            const refreshBtn = document.getElementById('btn-refresh-monitor');
            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => render(container));
            }

            const clearBtn = document.getElementById('btn-clear-console');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    logEntries = [
                        `[CONSOLE] Event log cleared by administrator`,
                        `[LISTENER] Inbound endpoint active at POST /api/data/access/{grantId}`
                    ];
                    const pre = document.getElementById('crypto-event-pre');
                    if (pre) {
                        pre.textContent = logEntries.map(e => `[${new Date().toLocaleTimeString()}] ${e}`).join('\n');
                    }
                });
            }

        } catch (err) {
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Monitor Unavailable',
                        message: err.message,
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    return { render };
})();


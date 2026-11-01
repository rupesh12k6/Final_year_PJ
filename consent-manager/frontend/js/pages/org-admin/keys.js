/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — ORGANIZATION ADMIN: CRYPTOGRAPHIC INFRASTRUCTURE
 * View institutional assertion public keys, Central Consent Manager RS256
 * public keys, and canonical academic field definitions.
 * ==============================================================================
 */

window.DF_PAGE_OA_KEYS = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Cryptographic Key Infrastructure...')}
            </div>
        `;

        try {
            const [org, cmPublicKey, canonicalFields] = await Promise.all([
                window.DF_API.orgAdmin.getOwnOrganization().catch(() => null),
                window.DF_API.auth.getPublicKey().catch(() => 'PUBLIC_KEY_UNAVAILABLE'),
                window.DF_API.trust.getSupportedFields().catch(() => [])
            ]);

            const orgCode = org ? org.organizationCode : 'INST';
            const orgPublicKey = (org && org.publicKey) ? org.publicKey.trim() : '';
            const fieldsList = Array.isArray(canonicalFields) ? canonicalFields : [];

            const html = `
            <!-- Page Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h3 class="fw-bold text-dark mb-1">Cryptographic Trust & Key Infrastructure</h3>
                    <p class="text-muted small mb-0">Public key anchoring, RS256 signature verification, and DEPA canonical academic schemas.</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-primary-subtle text-primary border px-3 py-2 rounded-pill font-monospace small">
                        <i class="bi bi-shield-lock-fill me-1"></i> Asymmetric Cryptography (RS256)
                    </span>
                </div>
            </div>

            <div class="row g-4 mb-4">
                <!-- Left: Institutional Assertion Public Key -->
                <div class="col-lg-6">
                    <div class="card df-card border-0 shadow-sm h-100" style="border-radius: var(--df-radius-lg);">
                        <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-building-lock text-info fs-5"></i>
                                <h6 class="mb-0 fw-bold text-dark">${window.DF_UI.escapeHtml(orgCode)} Assertion Public Key</h6>
                            </div>
                            <span class="badge ${orgPublicKey ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border rounded-pill">
                                ${orgPublicKey ? 'Registered & Anchored' : 'Key Pending'}
                            </span>
                        </div>
                        <div class="card-body p-4 d-flex flex-column justify-content-between">
                            <p class="text-secondary small mb-3">
                                Registered with the DEPA Central Authority to verify student identity assertions issued by this college node.
                            </p>

                            <div class="position-relative mb-3 flex-grow-1">
                                <textarea 
                                    id="oa-keys-org-pem"
                                    class="form-control font-monospace small bg-dark text-light border-0 p-3" 
                                    rows="9" 
                                    readonly 
                                    style="resize: none; font-size: 0.72rem; border-radius: var(--df-radius-md);"
                                >${window.DF_UI.escapeHtml(orgPublicKey || 'No public key registered for this institution.')}</textarea>
                                
                                ${orgPublicKey ? `
                                <button 
                                    type="button" 
                                    class="btn btn-sm btn-light border position-absolute top-0 end-0 m-2 rounded-pill shadow-sm"
                                    id="btn-copy-org-pem"
                                    title="Copy Institutional PEM"
                                >
                                    <i class="bi bi-clipboard me-1"></i> Copy
                                </button>
                                ` : ''}
                            </div>

                            <div class="d-flex align-items-center justify-content-between text-muted small pt-2 border-top">
                                <span>Algorithm: <strong class="text-dark">RSA 2048</strong></span>
                                <span>Scope: <strong class="text-dark">Student Assertion Verification</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Central Consent Manager RS256 Public Key -->
                <div class="col-lg-6">
                    <div class="card df-card border-0 shadow-sm h-100" style="border-radius: var(--df-radius-lg);">
                        <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-shield-check text-primary fs-5"></i>
                                <h6 class="mb-0 fw-bold text-dark">Central Authority Root RS256 Key</h6>
                            </div>
                            <span class="badge bg-primary-subtle text-primary border rounded-pill">
                                Central Signer
                            </span>
                        </div>
                        <div class="card-body p-4 d-flex flex-column justify-content-between">
                            <p class="text-secondary small mb-3">
                                Published by Consent Manager (Port 8095). College B uses this public key to cryptographically verify RS256 Data Access JWTs before retrieving student data.
                            </p>

                            <div class="position-relative mb-3 flex-grow-1">
                                <textarea 
                                    id="oa-keys-cm-pem"
                                    class="form-control font-monospace small bg-dark text-light border-0 p-3" 
                                    rows="9" 
                                    readonly 
                                    style="resize: none; font-size: 0.72rem; border-radius: var(--df-radius-md);"
                                >${window.DF_UI.escapeHtml(cmPublicKey || 'Public key unavailable.')}</textarea>
                                
                                <button 
                                    type="button" 
                                    class="btn btn-sm btn-light border position-absolute top-0 end-0 m-2 rounded-pill shadow-sm"
                                    id="btn-copy-cm-pem"
                                    title="Copy CM Root PEM"
                                >
                                    <i class="bi bi-clipboard me-1"></i> Copy
                                </button>
                            </div>

                            <div class="d-flex align-items-center justify-content-between text-muted small pt-2 border-top">
                                <span>Algorithm: <strong class="text-dark">RS256 (RSA 2048)</strong></span>
                                <span>Scope: <strong class="text-dark">Data Access Grant Signature</strong></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Canonical Academic Fields Card -->
            <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center gap-2">
                    <i class="bi bi-journal-bookmark-fill text-indigo fs-5"></i>
                    <h6 class="mb-0 fw-bold text-dark">Supported Canonical Academic Fields</h6>
                </div>
                <div class="card-body p-4">
                    <p class="text-secondary small mb-3">
                        These standard credential fields can be requested by evaluating institutions and selectively approved by students under DEPA granular consent principles:
                    </p>
                    <div class="row g-3">
                        ${fieldsList.map(field => `
                        <div class="col-md-6 col-lg-4">
                            <div class="p-3 bg-light rounded border h-100">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="badge bg-primary-subtle text-primary border font-monospace small">${window.DF_UI.escapeHtml(field.field || field.name)}</span>
                                    <i class="bi bi-patch-check-fill text-primary"></i>
                                </div>
                                <div class="fw-bold text-dark small mb-1">${window.DF_UI.escapeHtml(field.label || field.field)}</div>
                                <div class="text-muted small">${window.DF_UI.escapeHtml(field.description || 'Standard institutional credential field.')}</div>
                            </div>
                        </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            `;

            container.innerHTML = html;

            // Wire copy buttons
            const copyOrgBtn = document.getElementById('btn-copy-org-pem');
            if (copyOrgBtn && orgPublicKey) {
                copyOrgBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(orgPublicKey);
                        window.DF_UI.showToast('Institutional public key copied.', 'success');
                    } catch (e) {
                        const ta = document.getElementById('oa-keys-org-pem');
                        if (ta) {
                            ta.select();
                            document.execCommand('copy');
                            window.DF_UI.showToast('Institutional public key copied.', 'success');
                        }
                    }
                });
            }

            const copyCmBtn = document.getElementById('btn-copy-cm-pem');
            if (copyCmBtn && cmPublicKey) {
                copyCmBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(cmPublicKey);
                        window.DF_UI.showToast('CM Root public key copied.', 'success');
                    } catch (e) {
                        const ta = document.getElementById('oa-keys-cm-pem');
                        if (ta) {
                            ta.select();
                            document.execCommand('copy');
                            window.DF_UI.showToast('CM Root public key copied.', 'success');
                        }
                    }
                });
            }
        } catch (err) {
            console.error('Failed to render Keys overview:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Cryptographic Infrastructure',
                        message: err.message || 'An error occurred while fetching cryptographic keys.',
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    return {
        render: render
    };
})();


/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — ORGANIZATION ADMIN: INSTITUTION PROFILE
 * Displays verified institutional identity, peer endpoints, cryptographic keys,
 * and central governance status.
 * ==============================================================================
 */

window.DF_PAGE_OA_PROFILE = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Loading Institutional Profile & Endpoints...')}
            </div>
        `;

        try {
            const org = await window.DF_API.orgAdmin.getOwnOrganization();
            const user = window.DF_SESSION.getUser() || {};

            if (!org) {
                container.innerHTML = `
                    <div class="py-5">
                        ${window.DF_UI.renderErrorState({
                            title: 'Institution Profile Not Found',
                            message: 'Could not resolve institutional profile for organization ID: ' + (user.organizationId || 'Unknown'),
                            onRetry: () => render(container)
                        })}
                    </div>
                `;
                return;
            }

            const orgCode = org.organizationCode || 'INST';
            const orgName = org.name || 'Academic Institution';
            const orgEmail = org.email || 'N/A';
            const orgStatus = org.status || 'ACTIVE';
            const dataBaseUrl = org.dataBaseUrl || 'http://localhost:8081';
            const publicKeyPem = (org.publicKey || '').trim();
            const createdAtStr = org.createdAt ? new Date(org.createdAt).toLocaleString() : 'N/A';
            const updatedAtStr = org.updatedAt ? new Date(org.updatedAt).toLocaleString() : 'N/A';

            const contentHtml = `
            <!-- Breadcrumb Navigation / Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h3 class="fw-bold text-dark mb-1">Institutional Profile & Trust Identity</h3>
                    <p class="text-muted small mb-0">Verified identity, endpoint registry, and public assertion credentials on DEPA Central Network.</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    ${window.DF_UI.renderStatusBadge(orgStatus)}
                    <span class="badge bg-light text-dark border px-3 py-2 rounded-pill font-monospace small">
                        ORG ID: ${window.DF_UI.escapeHtml(org.organizationId)}
                    </span>
                </div>
            </div>

            <div class="row g-4">
                <!-- Left: Institutional Attributes Card -->
                <div class="col-lg-7">
                    <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                        <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-building-fill text-primary fs-5"></i>
                                <h6 class="mb-0 fw-bold text-dark">Institutional Registry Record</h6>
                            </div>
                            <span class="badge bg-primary-subtle text-primary border rounded-pill px-3 py-1 font-monospace small">
                                ${window.DF_UI.escapeHtml(orgCode)}
                            </span>
                        </div>
                        <div class="card-body p-4">
                            <div class="row g-3">
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Organization Code</label>
                                    <div class="p-2 bg-light rounded border font-monospace fw-bold text-primary">
                                        ${window.DF_UI.escapeHtml(orgCode)}
                                    </div>
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Registration Status</label>
                                    <div class="p-2 bg-light rounded border d-flex align-items-center justify-content-between">
                                        ${window.DF_UI.renderStatusBadge(orgStatus)}
                                        <span class="text-muted small">Central Authority Ratified</span>
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Institutional Full Name</label>
                                    <div class="p-2 bg-light rounded border fw-semibold text-dark">
                                        ${window.DF_UI.escapeHtml(orgName)}
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Authorized Contact Email</label>
                                    <div class="p-2 bg-light rounded border font-monospace text-secondary">
                                        <i class="bi bi-envelope-at me-2 text-primary"></i>
                                        ${window.DF_UI.escapeHtml(orgEmail)}
                                    </div>
                                </div>
                                <div class="col-12">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Peer Data Service Endpoint (Data Base URL)</label>
                                    <div class="p-2 bg-light rounded border font-monospace text-dark d-flex align-items-center justify-content-between">
                                        <div>
                                            <i class="bi bi-hdd-network me-2 text-success"></i>
                                            <span>${window.DF_UI.escapeHtml(dataBaseUrl)}</span>
                                        </div>
                                        <span class="badge bg-success-subtle text-success border rounded-pill small">Verified Peer</span>
                                    </div>
                                    <small class="text-muted mt-1 d-block">Academic credential requests and provider queries communicate peer-to-peer over this address.</small>
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Network Registration Date</label>
                                    <div class="p-2 bg-light rounded border font-monospace small text-muted">
                                        ${window.DF_UI.escapeHtml(createdAtStr)}
                                    </div>
                                </div>
                                <div class="col-sm-6">
                                    <label class="form-label text-muted small fw-bold text-uppercase">Last Metadata Update</label>
                                    <div class="p-2 bg-light rounded border font-monospace small text-muted">
                                        ${window.DF_UI.escapeHtml(updatedAtStr)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Administrative Gap & Immutability Notice -->
                    <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg); background: #F8FAFC; border-left: 4px solid var(--df-primary) !important;">
                        <div class="card-body p-3">
                            <div class="d-flex align-items-start gap-3">
                                <i class="bi bi-shield-lock-fill text-primary fs-4 mt-1"></i>
                                <div>
                                    <h6 class="fw-bold text-dark mb-1">Administrative Governance & Sovereign Trust Architecture</h6>
                                    <p class="text-secondary small mb-2">
                                        To maintain cryptographic non-repudiation and prevent unauthorized identity spoofing across the DEPA Academic Trust Network, institution identity attributes (Organization Code, Full Legal Name, and Status) are <strong>immutable</strong> from the Organization Admin portal.
                                    </p>
                                    <p class="text-muted small mb-0">
                                        To request endpoint re-pointing, domain verification, or status transitions, submit a formal attestation through the Regulatory Super Admin Authority or rotate assertion keys via the pre-registered backend bridge API.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Cryptographic Assertion Key Card -->
                <div class="col-lg-5">
                    <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                        <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                            <div class="d-flex align-items-center gap-2">
                                <i class="bi bi-key-fill text-warning fs-5"></i>
                                <h6 class="mb-0 fw-bold text-dark">Assertion Public Key</h6>
                            </div>
                            <span class="badge ${publicKeyPem ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border rounded-pill">
                                ${publicKeyPem ? 'Anchored & Active' : 'Key Pending'}
                            </span>
                        </div>
                        <div class="card-body p-4">
                            <p class="text-secondary small mb-3">
                                This RSA 2048-bit public key is registered with the Consent Manager Central Authority to cryptographically verify student identity assertions issued by this college.
                            </p>

                            <div class="position-relative">
                                <textarea 
                                    id="oa-public-key-textarea"
                                    class="form-control font-monospace small bg-dark text-light border-0 p-3" 
                                    rows="9" 
                                    readonly 
                                    style="resize: none; font-size: 0.75rem; border-radius: var(--df-radius-md);"
                                >${window.DF_UI.escapeHtml(publicKeyPem || 'No public key currently registered for this institution.')}</textarea>
                                
                                ${publicKeyPem ? `
                                <button 
                                    type="button" 
                                    class="btn btn-sm btn-light border position-absolute top-0 end-0 m-2 rounded-pill shadow-sm"
                                    id="btn-copy-public-key"
                                    title="Copy Public Key PEM"
                                >
                                    <i class="bi bi-clipboard me-1"></i> Copy PEM
                                </button>
                                ` : ''}
                            </div>

                            <div class="mt-3 d-flex align-items-center justify-content-between text-muted small">
                                <span>Algorithm: <strong class="text-dark">RSA 2048 (RS256)</strong></span>
                                <span>Key Scope: <strong class="text-dark">Assertion Signature</strong></span>
                            </div>

                            <div class="border-top pt-3 mt-3">
                                <div class="d-flex align-items-center gap-2 text-muted small">
                                    <i class="bi bi-shield-check text-success fs-5"></i>
                                    <span>Private signing key remains stored exclusively in the college's secure keystore.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Administrator Account Card -->
                    <div class="card df-card border-0 shadow-sm" style="border-radius: var(--df-radius-lg);">
                        <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center gap-2">
                            <i class="bi bi-person-badge-fill text-primary fs-5"></i>
                            <h6 class="mb-0 fw-bold text-dark">Active Session Administrator</h6>
                        </div>
                        <div class="card-body p-3">
                            <div class="d-flex align-items-center gap-3 mb-3">
                                <div class="df-user-avatar" style="width: 44px; height: 44px; font-size: 1.1rem; background: #0284C7;">
                                    OA
                                </div>
                                <div>
                                    <strong class="text-dark d-block">${window.DF_UI.escapeHtml(user.name || 'Institutional Admin')}</strong>
                                    <span class="font-monospace text-muted small">${window.DF_UI.escapeHtml(user.email || 'N/A')}</span>
                                </div>
                            </div>
                            <div class="d-flex align-items-center justify-content-between text-muted small pt-2 border-top">
                                <span>Role</span>
                                <span class="badge bg-info-subtle text-info border rounded-pill">ORGANIZATION_ADMIN</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;

            container.innerHTML = contentHtml;

            // Wire up copy button
            const copyBtn = document.getElementById('btn-copy-public-key');
            if (copyBtn && publicKeyPem) {
                copyBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(publicKeyPem);
                        window.DF_UI.showToast('Public key PEM copied to clipboard.', 'success');
                    } catch (e) {
                        const textarea = document.getElementById('oa-public-key-textarea');
                        if (textarea) {
                            textarea.select();
                            document.execCommand('copy');
                            window.DF_UI.showToast('Public key PEM copied to clipboard.', 'success');
                        }
                    }
                });
            }
        } catch (err) {
            console.error('Failed to render Org Profile:', err);
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Institutional Profile',
                        message: err.message || 'An error occurred while communicating with the Consent Manager backend.',
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


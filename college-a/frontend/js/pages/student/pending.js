/**
 * ==============================================================================
 * DEPA COLLEGE A — STUDENT: CONSENT DECISION INBOX
 * Review inbound disclosure requests, perform granular field-level selection,
 * approve with institutional assertion, or reject requests.
 * Backend: GET /api/student/consents/pending, POST /{id}/approve, POST /{id}/reject
 * ==============================================================================
 */

window.DF_PAGE_STUDENT_PENDING = (function () {
    'use strict';

    let pendingRequests = [];

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="py-5">
                ${window.DF_UI.renderLoadingState('Checking Consent Inbox...')}
            </div>
        `;

        try {
            pendingRequests = await window.DF_API.student.getPendingConsents();
            const list = Array.isArray(pendingRequests) ? pendingRequests : [];

            const html = `
                <!-- Page Header -->
                <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div>
                        <h3 class="fw-bold text-dark mb-1">Consent Decision Inbox</h3>
                        <p class="text-muted small mb-0">Review incoming academic credential requests from external institutions and employers.</p>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge ${list.length > 0 ? 'bg-warning-subtle text-warning border border-warning-subtle' : 'bg-light text-muted border'} px-3 py-2 rounded-pill font-monospace small">
                            ${list.length} PENDING INQUIRIES
                        </span>
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.DF_PAGE_STUDENT_PENDING.render(document.getElementById('df-main-content'))">
                            <i class="bi bi-arrow-clockwise me-1"></i> Refresh
                        </button>
                    </div>
                </div>

                <!-- Info Notice -->
                <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                    <div class="card-body p-4">
                        <div class="d-flex align-items-start gap-3">
                            <div class="rounded-circle bg-success-subtle text-success p-2 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; flex-shrink: 0;">
                                <i class="bi bi-ui-checks-grid fs-5"></i>
                            </div>
                            <div>
                                <h6 class="fw-bold text-dark mb-1">Granular Consent Control Principle</h6>
                                <p class="text-muted small mb-0" style="line-height: 1.6;">
                                    You have full granular control. When an institution requests your academic details, <strong>you choose exactly which fields to share</strong>.
                                    Fields are never preselected by default. If you approve a request, only the checked fields will be sealed in the Access Grant.
                                    You may also reject any request completely.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pending Requests Container -->
                <div id="pending-cards-list">
                    ${list.map((req, idx) => renderRequestCard(req, idx)).join('')}
                    ${list.length === 0 ? `
                        <div class="card df-card border-0 shadow-sm p-5 text-center" style="border-radius: var(--df-radius-lg);">
                            <div class="py-4">
                                <i class="bi bi-inbox text-muted display-4 mb-3 d-block opacity-50"></i>
                                <h5 class="fw-bold text-dark">Your Consent Inbox is Clean!</h5>
                                <p class="text-muted small mb-0" style="max-width: 480px; margin: 0 auto;">
                                    There are currently no pending academic disclosure requests. When an external institution initiates a data inquiry, it will appear here for your approval.
                                </p>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            container.innerHTML = html;

            // Wire Card Events
            list.forEach(req => {
                wireCardEvents(req, container);
            });

        } catch (err) {
            container.innerHTML = `
                <div class="py-5">
                    ${window.DF_UI.renderErrorState({
                        title: 'Unable to Load Consent Requests',
                        message: err.message,
                        onRetry: () => render(container)
                    })}
                </div>
            `;
        }
    }

    function renderRequestCard(req, idx) {
        const reqId = req.id || req.consentRequestId;
        const requestedFields = Array.isArray(req.requestedFields) ? req.requestedFields : [];
        const expiresAtStr = req.expiresAt ? new Date(req.expiresAt).toLocaleDateString() : '7 Days';

        return `
            <div class="card df-card border-0 shadow-sm mb-4" id="card-${reqId}" style="border-radius: var(--df-radius-lg); border-left: 4px solid #10B981 !important;">
                <div class="card-header bg-transparent border-bottom p-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div class="d-flex align-items-center gap-3">
                        <div class="rounded-3 p-3 bg-light text-primary border d-flex align-items-center justify-content-center" style="width: 52px; height: 52px;">
                            <i class="bi bi-building-fill fs-4 text-success"></i>
                        </div>
                        <div>
                            <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace small mb-1">
                                REQUEST ID: ${window.DF_UI.escapeHtml(reqId)}
                            </span>
                            <h5 class="fw-bold text-dark mb-0">
                                ${window.DF_UI.escapeHtml(req.requesterOrganizationName || req.requesterOrganizationCode || 'Consumer Institution')}
                            </h5>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge bg-warning-subtle text-warning border border-warning-subtle px-3 py-2 rounded-pill font-monospace small">
                            <i class="bi bi-clock-fill me-1"></i> EXPIRES: ${expiresAtStr}
                        </span>
                    </div>
                </div>

                <div class="card-body p-4">
                    <!-- Request Purpose and Resource -->
                    <div class="row g-3 mb-4">
                        <div class="col-md-7">
                            <label class="form-label text-muted small fw-bold text-uppercase">Declared Purpose of Access</label>
                            <div class="p-3 bg-light rounded-3 border fw-semibold text-dark">
                                <i class="bi bi-info-circle text-primary me-2"></i>
                                ${window.DF_UI.escapeHtml(req.purpose || 'Verification of Academic Standing & Credentials')}
                            </div>
                        </div>
                        <div class="col-md-5">
                            <label class="form-label text-muted small fw-bold text-uppercase">Requested Resource</label>
                            <div class="p-3 bg-light rounded-3 border font-monospace text-secondary small">
                                <i class="bi bi-folder-check text-success me-2"></i>
                                ${window.DF_UI.escapeHtml(req.requestedResource || 'STUDENT_ACADEMIC_RECORD')}
                            </div>
                        </div>
                    </div>

                    <!-- Granular Field Selection Checklist -->
                    <div class="mb-4">
                        <div class="d-flex align-items-center justify-content-between mb-2">
                            <label class="form-label text-muted small fw-bold text-uppercase mb-0">
                                Select Academic Fields to Disclose (Granular Opt-In):
                            </label>
                            <span class="text-muted small" style="font-size: 0.8rem;">
                                Fields are unselected by default. Check only what you consent to share.
                            </span>
                        </div>

                        <div class="p-3 bg-light rounded-3 border">
                            <div class="row g-2">
                                ${requestedFields.map(f => {
                                    const meta = (window.DF_API.canonicalFields || []).find(cf => cf.id === f) || { name: f, desc: 'Verified credential attribute' };
                                    return `
                                        <div class="col-md-6">
                                            <div class="form-check p-2 bg-white rounded border d-flex align-items-start gap-2 h-100">
                                                <input class="form-check-input ms-1 mt-1 field-checkbox" type="checkbox" value="${window.DF_UI.escapeHtml(f)}" id="chk-${reqId}-${f}">
                                                <label class="form-check-label w-100 small" for="chk-${reqId}-${f}">
                                                    <span class="fw-bold text-dark d-block">${window.DF_UI.escapeHtml(meta.name)}</span>
                                                    <span class="text-muted font-monospace" style="font-size: 0.72rem;">[${window.DF_UI.escapeHtml(f)}]</span>
                                                </label>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Action Controls -->
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3 border-top">
                        <div class="text-muted small">
                            <i class="bi bi-shield-lock-fill text-success me-1"></i>
                            Approving signs an institutional identity assertion sealed by College A.
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-danger btn-sm px-3 py-2 d-flex align-items-center gap-1" id="btn-reject-${reqId}">
                                <i class="bi bi-x-circle"></i> Reject Request
                            </button>
                            <button class="btn btn-success btn-sm px-4 py-2 fw-semibold d-flex align-items-center gap-2" id="btn-approve-${reqId}" style="background-color: var(--df-primary); border-color: var(--df-primary);">
                                <i class="bi bi-check-circle-fill"></i> Approve Selected Fields
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function wireCardEvents(req, pageContainer) {
        const reqId = req.id || req.consentRequestId;
        const requestedFields = Array.isArray(req.requestedFields) ? req.requestedFields : [];

        const approveBtn = document.getElementById(`btn-approve-${reqId}`);
        const rejectBtn = document.getElementById(`btn-reject-${reqId}`);

        if (approveBtn) {
            approveBtn.addEventListener('click', async () => {
                // Collect checked fields
                const checkedBoxes = document.querySelectorAll(`#card-${reqId} .field-checkbox:checked`);
                const approvedFields = Array.from(checkedBoxes).map(cb => cb.value);

                if (approvedFields.length === 0) {
                    window.DF_UI.showToast('Please check at least one field to approve, or click Reject if you do not want to share any data.', 'warning');
                    return;
                }

                // Verify subset
                const isSubset = approvedFields.every(f => requestedFields.includes(f));
                if (!isSubset) {
                    window.DF_UI.showToast('Security validation failed: Approved fields must be a subset of requested fields.', 'error');
                    return;
                }

                window.DF_UI.showConfirmDialog({
                    title: 'Confirm Consent Approval',
                    message: `You are about to authorize disclosure of ${approvedFields.length} field(s) (${approvedFields.join(', ')}) to ${req.requesterOrganizationName || 'the requesting institution'}. You can revoke this permission at any time in your Consent History.`,
                    confirmText: 'Confirm & Sign Approval',
                    confirmBtnClass: 'btn-success',
                    onConfirm: async () => {
                        approveBtn.disabled = true;
                        rejectBtn.disabled = true;
                        approveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Signing...';

                        try {
                            const res = await window.DF_API.student.approveConsent(reqId, approvedFields);
                            window.DF_UI.showToast(`Consent granted successfully! Access Token issued to ${req.requesterOrganizationName || 'requester'}.`, 'success');
                            render(pageContainer);
                        } catch (err) {
                            window.DF_UI.showToast(`Approval failed: ${err.message}`, 'error');
                            approveBtn.disabled = false;
                            rejectBtn.disabled = false;
                            approveBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Approve Selected Fields';
                        }
                    }
                });
            });
        }

        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => {
                window.DF_UI.showConfirmDialog({
                    title: 'Reject Consent Request',
                    message: `Are you sure you want to reject this request from ${req.requesterOrganizationName || 'the requesting institution'}? No academic credentials will be disclosed, and no access grant will be generated.`,
                    confirmText: 'Confirm Rejection',
                    confirmBtnClass: 'btn-danger',
                    onConfirm: async () => {
                        approveBtn.disabled = true;
                        rejectBtn.disabled = true;
                        rejectBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Rejecting...';

                        try {
                            await window.DF_API.student.rejectConsent(reqId);
                            window.DF_UI.showToast('Request rejected successfully. No credentials were shared.', 'info');
                            render(pageContainer);
                        } catch (err) {
                            window.DF_UI.showToast(`Rejection failed: ${err.message}`, 'error');
                            approveBtn.disabled = false;
                            rejectBtn.disabled = false;
                            rejectBtn.innerHTML = '<i class="bi bi-x-circle"></i> Reject Request';
                        }
                    }
                });
            });
        }
    }

    return { render };
})();


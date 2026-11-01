/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: STUDENT ACCOUNT ACTIVATION & PASSWORD PROVISIONING
 * Single-use token validation and credential setup for newly enrolled students.
 * Enforces URL fragment scrubbing, JSON body transport, and in-memory cleanup.
 * ==============================================================================
 */

window.DF_PAGE_STUDENT_ACTIVATE = (function () {
    'use strict';

    let validatedStudentData = null;
    let currentToken = null;

    function render(container) {
        if (!container) return;

        // Retrieve token from transient memory variable
        if (window._pendingActivationToken) {
            currentToken = window._pendingActivationToken;
            window._pendingActivationToken = null; // Clean immediately from memory
        }

        container.innerHTML = `
            <div class="df-auth-split">
                <!-- Left Branding Panel -->
                <div class="df-auth-brand-panel" style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%);">
                    <div class="df-auth-brand-content">
                        <div class="df-auth-badge mb-4">
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-3 py-2 rounded-pill fw-semibold" style="background: rgba(99, 102, 241, 0.2); color: #C7D2FE; border-color: rgba(165, 180, 252, 0.3);">
                                <i class="bi bi-key-fill me-1"></i> Account Provisioning
                            </span>
                        </div>
                        <h1 class="display-6 fw-bold text-white mb-3">Activate Student Account</h1>
                        <p class="lead text-indigo-100 mb-4" style="color: #E0E7FF; font-size: 1.1rem; line-height: 1.6;">
                            College B University Student Onboarding &amp; Password Setup.
                        </p>

                        <div class="df-feature-list mt-5">
                            <div class="d-flex align-items-start mb-4">
                                <div class="df-feature-icon me-3 p-2 rounded-3" style="background: rgba(255,255,255,0.1); color: #A5B4FC;">
                                    <i class="bi bi-shield-check fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="text-white mb-1 fs-6 fw-bold">One-Time Activation Token</h5>
                                    <p class="text-indigo-200 small mb-0" style="color: #C7D2FE;">
                                        Your registrar-issued token is single-use and invalidates immediately upon password creation.
                                    </p>
                                </div>
                            </div>

                            <div class="d-flex align-items-start mb-4">
                                <div class="df-feature-icon me-3 p-2 rounded-3" style="background: rgba(255,255,255,0.1); color: #A5B4FC;">
                                    <i class="bi bi-lock-fill fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="text-white mb-1 fs-6 fw-bold">BCrypt Password Hashing</h5>
                                    <p class="text-indigo-200 small mb-0" style="color: #C7D2FE;">
                                        Your password is cryptographically salted and hashed. Never stored or transmitted in plaintext.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="mt-5 pt-4 border-top border-indigo-800" style="border-color: rgba(255,255,255,0.1) !important;">
                            <small class="text-indigo-200" style="color: #A5B4FC;">
                                College B University &bull; Registrar Identity Gateway
                            </small>
                        </div>
                    </div>
                </div>

                <!-- Right Form Panel -->
                <div class="df-auth-form-panel">
                    <div class="df-auth-form-card" style="max-width: 480px;">
                        <div class="text-center mb-4">
                            <div class="d-inline-flex p-3 rounded-circle mb-3" style="background: #EEF2FF; color: #4F46E5;">
                                <i class="bi bi-person-check-fill fs-2"></i>
                            </div>
                            <h2 class="h4 fw-bold text-slate-900 mb-1">Student Self-Activation</h2>
                            <p class="text-muted small">Verify your registration token and set your permanent password</p>
                        </div>

                        <div id="activation-error-alert" class="alert alert-danger d-none py-2 px-3 small rounded-3 mb-3" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <span id="activation-error-text"></span>
                        </div>

                        <div id="activation-success-alert" class="alert alert-success d-none py-2 px-3 small rounded-3 mb-3" role="alert">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            <span id="activation-success-text"></span>
                        </div>

                        <!-- Step 1: Token Input (if not validated) -->
                        <div id="step-token-section">
                            <form id="token-verify-form">
                                <div class="mb-3">
                                    <label for="act-token-input" class="form-label small fw-semibold text-slate-700">Activation Token</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-key"></i></span>
                                        <input type="text" class="form-control border-start-0 font-monospace" id="act-token-input" placeholder="Paste 48-character activation token" required autocomplete="off" value="${window.DF_UI.escapeHtml(currentToken || '')}">
                                    </div>
                                    <div class="form-text small text-muted">Provided in your welcome notification or registrar onboarding dossier.</div>
                                </div>

                                <div class="d-grid mb-3">
                                    <button type="submit" class="btn btn-primary py-2 fw-semibold" id="btn-verify-token" style="background-color: #4F46E5; border-color: #4F46E5;">
                                        <span id="btn-verify-text">Verify Token</span>
                                        <span id="btn-verify-spinner" class="spinner-border spinner-border-sm ms-2 d-none" role="status" aria-hidden="true"></span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <!-- Step 2: Password Setup (revealed upon successful verification) -->
                        <div id="step-password-section" class="d-none">
                            <div class="p-3 mb-3 rounded-3 border" style="background: #F8FAFC; border-color: #E2E8F0;">
                                <div class="d-flex align-items-center mb-2">
                                    <span class="badge bg-success me-2"><i class="bi bi-check-lg"></i> Token Validated</span>
                                    <span class="fw-bold text-slate-800" id="candidate-name"></span>
                                </div>
                                <div class="small text-muted">
                                    <div>Student ID: <code class="fw-bold text-dark" id="candidate-id"></code></div>
                                    <div>Institutional Email: <span id="candidate-email" class="fw-semibold"></span></div>
                                </div>
                            </div>

                            <form id="password-setup-form">
                                <div class="mb-3">
                                    <label for="new-password" class="form-label small fw-semibold text-slate-700">New Password</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-lock"></i></span>
                                        <input type="password" class="form-control border-start-0" id="new-password" placeholder="At least 8 characters" required minlength="8" autocomplete="new-password">
                                    </div>
                                    <div class="form-text small text-muted">Must be at least 8 characters long.</div>
                                </div>

                                <div class="mb-4">
                                    <label for="confirm-password" class="form-label small fw-semibold text-slate-700">Confirm Password</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-lock-fill"></i></span>
                                        <input type="password" class="form-control border-start-0" id="confirm-password" placeholder="Re-enter password" required minlength="8" autocomplete="new-password">
                                    </div>
                                </div>

                                <div class="d-grid mb-3">
                                    <button type="submit" class="btn btn-success py-2 fw-semibold" id="btn-complete-setup">
                                        <span id="btn-setup-text">Set Password &amp; Activate Account</span>
                                        <span id="btn-setup-spinner" class="spinner-border spinner-border-sm ms-2 d-none" role="status" aria-hidden="true"></span>
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div class="pt-3 border-top text-center">
                            <a href="#/login-student" class="text-decoration-none small text-indigo">
                                <i class="bi bi-arrow-left me-1"></i> Back to Student Sign In
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Element references
        const tokenForm = container.querySelector('#token-verify-form');
        const tokenInput = container.querySelector('#act-token-input');
        const btnVerify = container.querySelector('#btn-verify-token');
        const btnVerifyText = container.querySelector('#btn-verify-text');
        const btnVerifySpinner = container.querySelector('#btn-verify-spinner');

        const stepTokenSec = container.querySelector('#step-token-section');
        const stepPassSec = container.querySelector('#step-password-section');

        const candidateName = container.querySelector('#candidate-name');
        const candidateId = container.querySelector('#candidate-id');
        const candidateEmail = container.querySelector('#candidate-email');

        const passForm = container.querySelector('#password-setup-form');
        const newPassInput = container.querySelector('#new-password');
        const confirmPassInput = container.querySelector('#confirm-password');
        const btnComplete = container.querySelector('#btn-complete-setup');
        const btnSetupText = container.querySelector('#btn-setup-text');
        const btnSetupSpinner = container.querySelector('#btn-setup-spinner');

        const errorDiv = container.querySelector('#activation-error-alert');
        const errorText = container.querySelector('#activation-error-text');
        const successDiv = container.querySelector('#activation-success-alert');
        const successText = container.querySelector('#activation-success-text');

        async function doValidateToken(tokenVal) {
            errorDiv.classList.add('d-none');
            btnVerify.disabled = true;
            btnVerifyText.textContent = 'Verifying...';
            btnVerifySpinner.classList.remove('d-none');

            try {
                const res = await window.DF_API.auth.validateToken(tokenVal.trim());
                currentToken = tokenVal.trim();
                validatedStudentData = res;

                candidateName.textContent = res.name || 'Student Candidate';
                candidateId.textContent = res.studentId || '—';
                candidateEmail.textContent = res.maskedEmail || '—';

                stepTokenSec.classList.add('d-none');
                stepPassSec.classList.remove('d-none');
            } catch (err) {
                let safeMsg = err.message || 'Token verification failed. Token may be invalid or expired.';
                if (currentToken && safeMsg.includes(currentToken)) {
                    safeMsg = safeMsg.replace(currentToken, '***');
                }
                errorText.textContent = safeMsg;
                errorDiv.classList.remove('d-none');
            } finally {
                btnVerify.disabled = false;
                btnVerifyText.textContent = 'Verify Token';
                btnVerifySpinner.classList.add('d-none');
            }
        }

        tokenForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const val = tokenInput.value.trim();
            if (!val) return;
            await doValidateToken(val);
        });

        passForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorDiv.classList.add('d-none');

            const p1 = newPassInput.value;
            const p2 = confirmPassInput.value;

            if (p1.length < 8) {
                errorText.textContent = 'Password must be at least 8 characters long.';
                errorDiv.classList.remove('d-none');
                return;
            }

            if (p1 !== p2) {
                errorText.textContent = 'Passwords do not match. Please re-enter.';
                errorDiv.classList.remove('d-none');
                return;
            }

            btnComplete.disabled = true;
            btnSetupText.textContent = 'Activating account...';
            btnSetupSpinner.classList.remove('d-none');

            try {
                await window.DF_API.auth.setupPassword(currentToken, p1);
                currentToken = null; // Clean token from memory immediately upon successful password setup
                successText.textContent = 'Account activated successfully! Redirecting to student login...';
                successDiv.classList.remove('d-none');
                stepPassSec.classList.add('d-none');

                setTimeout(() => {
                    window.location.hash = '#/login-student';
                }, 2000);
            } catch (err) {
                let safeMsg = err.message || 'Failed to complete password setup.';
                if (currentToken && safeMsg.includes(currentToken)) {
                    safeMsg = safeMsg.replace(currentToken, '***');
                }
                errorText.textContent = safeMsg;
                errorDiv.classList.remove('d-none');
                btnComplete.disabled = false;
                btnSetupText.textContent = 'Set Password & Activate Account';
                btnSetupSpinner.classList.add('d-none');
            }
        });

        // Auto-validate if token was provided in URL
        if (currentToken && currentToken.length >= 16) {
            doValidateToken(currentToken);
        }
    }

    return { render };
})();


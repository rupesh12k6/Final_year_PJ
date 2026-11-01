/**
 * ==============================================================================
 * DEPA COLLEGE A — STUDENT ACCOUNT ACTIVATION PAGE
 * Handles single-use activation token verification and password provisioning.
 * Tokens are strictly passed via URL fragment (#token=...), never query parameters.
 * Tokens are NEVER logged.
 * ==============================================================================
 */

window.DF_PAGE_STUDENT_ACTIVATE = (function () {
    'use strict';

    let validatedStudentData = null;
    let currentToken = null;

    function render(container) {
        if (!container) return;

        // Retrieve token from transient memory variable or storage
        if (window._pendingActivationToken) {
            currentToken = window._pendingActivationToken;
            window._pendingActivationToken = null; // Clean immediately from memory
        } else {
            const pendingToken = sessionStorage.getItem('pending_activation_token');
            if (pendingToken) {
                currentToken = pendingToken;
                sessionStorage.removeItem('pending_activation_token');
            }
        }

        container.innerHTML = `
            <div class="df-auth-wrapper">
                <!-- Left: Branding Panel -->
                <div class="df-auth-brand-panel" style="background: linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%);">
                    <div class="df-auth-brand-content">
                        <div class="d-flex align-items-center gap-3 mb-4">
                            <div class="df-logo-box" style="background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(110, 231, 183, 0.4); border-radius: 12px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
                                <i class="bi bi-key-fill text-white fs-3"></i>
                            </div>
                            <div>
                                <span class="badge bg-white text-dark fw-bold text-uppercase px-2 py-1" style="font-size: 0.65rem; letter-spacing: 0.05em;">STUDENT ONBOARDING</span>
                                <h4 class="text-white fw-bold mb-0 mt-1">College A University</h4>
                            </div>
                        </div>

                        <h2 class="text-white fw-bold display-6 mb-3">Activate Your Student Account</h2>
                        <p class="text-light opacity-75 mb-5" style="line-height: 1.6; font-size: 0.95rem;">
                            Your college registrar has provisioned your academic profile. Complete this one-time activation using your secure single-use token to set your personal password.
                        </p>

                        <!-- Activation Security Highlights -->
                        <div class="d-flex flex-column gap-3 mb-5">
                            <div class="d-flex align-items-start gap-3">
                                <div class="df-feature-icon" style="background: rgba(16, 185, 129, 0.2); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="bi bi-shield-check text-white"></i>
                                </div>
                                <div>
                                    <h6 class="text-white fw-semibold mb-1">Single-Use Cryptographic Token</h6>
                                    <p class="text-light opacity-75 small mb-0">Tokens are stored as SHA-256 hashes and immediately invalidated upon password creation.</p>
                                </div>
                            </div>

                            <div class="d-flex align-items-start gap-3">
                                <div class="df-feature-icon" style="background: rgba(16, 185, 129, 0.2); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="bi bi-clock-history text-white"></i>
                                </div>
                                <div>
                                    <h6 class="text-white fw-semibold mb-1">7-Day Expiry Guarantee</h6>
                                    <p class="text-light opacity-75 small mb-0">Unused activation tokens automatically expire to protect your academic identity.</p>
                                </div>
                            </div>

                            <div class="d-flex align-items-start gap-3">
                                <div class="df-feature-icon" style="background: rgba(16, 185, 129, 0.2); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="bi bi-link-45deg text-white"></i>
                                </div>
                                <div>
                                    <h6 class="text-white fw-semibold mb-1">URL Fragment Privacy</h6>
                                    <p class="text-light opacity-75 small mb-0">Tokens are processed via URL fragments (#) and stripped from the address bar to prevent browser history leakage.</p>
                                </div>
                            </div>
                        </div>

                        <div class="pt-4 border-top border-success border-opacity-25 text-light opacity-50 small">
                            DEPA Academic Trust Protocol v1.0 • Node Port 8081 • Zero-Knowledge Token Validation
                        </div>
                    </div>
                </div>

                <!-- Right: Form Panel -->
                <div class="df-auth-form-panel">
                    <div class="df-auth-form-content">
                        <!-- Top Navigation Between Portals -->
                        <div class="d-flex align-items-center justify-content-between mb-4">
                            <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill font-monospace small">
                                <i class="bi bi-key me-1"></i> ACCOUNT ACTIVATION
                            </span>
                            <a href="#/login/student" class="text-decoration-none small fw-semibold text-secondary">
                                Back to Login <i class="bi bi-arrow-right"></i>
                            </a>
                        </div>

                        <div class="mb-4">
                            <h3 class="fw-bold text-dark mb-1">Account Activation</h3>
                            <p class="text-muted small">Enter your single-use activation token to verify your identity and set a password.</p>
                        </div>

                        <!-- Error alert container -->
                        <div id="act-error" class="alert alert-danger d-none py-2 px-3 small rounded-3" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <span id="act-error-text"></span>
                        </div>

                        <!-- Success alert container -->
                        <div id="act-success" class="alert alert-success d-none py-2 px-3 small rounded-3" role="alert">
                            <i class="bi bi-check-circle-fill me-2"></i>
                            <span id="act-success-text"></span>
                        </div>

                        <!-- STEP 1: Token Input / Validation Form -->
                        <div id="act-step-1">
                            <form id="form-validate-token" novalidate>
                                <div class="mb-3">
                                    <label for="act-token-input" class="form-label text-muted small fw-bold text-uppercase">Single-Use Activation Token</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-key"></i></span>
                                        <input type="text" class="form-control border-start-0 font-monospace" id="act-token-input" placeholder="Paste 48-character activation token" required autocomplete="off" value="${window.DF_UI.escapeHtml(currentToken || '')}">
                                    </div>
                                    <div class="form-text small text-muted">Found in your welcome email or registrar onboarding dossier.</div>
                                </div>

                                <button type="submit" class="btn btn-success w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 mb-4" id="btn-validate-token" style="background-color: var(--df-primary); border-color: var(--df-primary);">
                                    <span id="validate-spinner" class="spinner-border spinner-border-sm d-none" role="status"></span>
                                    <span id="validate-text">Verify Token & Proceed</span>
                                    <i class="bi bi-arrow-right"></i>
                                </button>
                            </form>
                        </div>

                        <!-- STEP 2: Password Setup Form (Shown after token validated) -->
                        <div id="act-step-2" class="d-none">
                            <div class="p-3 bg-light rounded-3 border mb-4">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; font-weight: bold;">
                                        <i class="bi bi-person-check-fill fs-5"></i>
                                    </div>
                                    <div>
                                        <h6 class="fw-bold text-dark mb-0" id="verified-student-name">--</h6>
                                        <div class="text-muted small">
                                            ID: <span class="font-monospace fw-semibold" id="verified-student-id">--</span> • Email: <span id="verified-student-email">--</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <form id="form-setup-password" novalidate>
                                <div class="mb-3">
                                    <label for="act-password" class="form-label text-muted small fw-bold text-uppercase">Create Password</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-lock"></i></span>
                                        <input type="password" class="form-control border-start-0" id="act-password" placeholder="Minimum 8 characters" required minlength="8" autocomplete="new-password">
                                    </div>
                                    <div class="form-text small text-muted">Must be at least 8 characters long.</div>
                                </div>

                                <div class="mb-4">
                                    <label for="act-confirm-password" class="form-label text-muted small fw-bold text-uppercase">Confirm Password</label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-lock-fill"></i></span>
                                        <input type="password" class="form-control border-start-0" id="act-confirm-password" placeholder="Re-enter your password" required minlength="8" autocomplete="new-password">
                                    </div>
                                </div>

                                <button type="submit" class="btn btn-success w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 mb-4" id="btn-setup-password" style="background-color: var(--df-primary); border-color: var(--df-primary);">
                                    <span id="setup-spinner" class="spinner-border spinner-border-sm d-none" role="status"></span>
                                    <span id="setup-text">Set Password & Activate Account</span>
                                    <i class="bi bi-check-circle-fill"></i>
                                </button>
                            </form>
                        </div>

                        <div class="text-center text-muted small">
                            <p class="mb-0">Already activated your account? <a href="#/login/student" class="text-success fw-semibold text-decoration-none">Sign in here</a></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Wire event handlers
        const formValidate = document.getElementById('form-validate-token');
        const tokenInput = document.getElementById('act-token-input');
        const errorDiv = document.getElementById('act-error');
        const errorText = document.getElementById('act-error-text');
        const successDiv = document.getElementById('act-success');
        const successText = document.getElementById('act-success-text');

        const step1 = document.getElementById('act-step-1');
        const step2 = document.getElementById('act-step-2');
        const validateBtn = document.getElementById('btn-validate-token');
        const validateSpinner = document.getElementById('validate-spinner');
        const validateText = document.getElementById('validate-text');

        const formSetup = document.getElementById('form-setup-password');
        const passwordInput = document.getElementById('act-password');
        const confirmPasswordInput = document.getElementById('act-confirm-password');
        const setupBtn = document.getElementById('btn-setup-password');
        const setupSpinner = document.getElementById('setup-spinner');
        const setupText = document.getElementById('setup-text');

        const verifiedName = document.getElementById('verified-student-name');
        const verifiedId = document.getElementById('verified-student-id');
        const verifiedEmail = document.getElementById('verified-student-email');

        async function doValidateToken(tokenVal) {
            if (!tokenVal || tokenVal.trim().length < 8) {
                errorText.textContent = 'Please enter a valid activation token.';
                errorDiv.classList.remove('d-none');
                return;
            }

            errorDiv.classList.add('d-none');
            validateBtn.disabled = true;
            validateSpinner.classList.remove('d-none');
            validateText.textContent = 'Verifying Token...';

            try {
                const res = await window.DF_API.auth.validateToken(tokenVal.trim());
                currentToken = tokenVal.trim();
                validatedStudentData = res;

                // Populate Step 2
                verifiedName.textContent = res.name || 'Verified Student';
                verifiedId.textContent = res.studentId || 'N/A';
                verifiedEmail.textContent = res.maskedEmail || 'N/A';

                step1.classList.add('d-none');
                step2.classList.remove('d-none');
                passwordInput.focus();
            } catch (err) {
                let safeMsg = err.message || 'Invalid or expired activation token.';
                if (tokenVal && safeMsg.includes(tokenVal)) {
                    safeMsg = safeMsg.replace(tokenVal, '***');
                }
                errorText.textContent = safeMsg;
                errorDiv.classList.remove('d-none');
                validateBtn.disabled = false;
                validateSpinner.classList.add('d-none');
                validateText.textContent = 'Verify Token & Proceed';
            }
        }

        if (formValidate) {
            formValidate.addEventListener('submit', (e) => {
                e.preventDefault();
                doValidateToken(tokenInput.value);
            });
        }

        if (formSetup) {
            formSetup.addEventListener('submit', async (e) => {
                e.preventDefault();
                errorDiv.classList.add('d-none');

                const p1 = passwordInput.value;
                const p2 = confirmPasswordInput.value;

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

                setupBtn.disabled = true;
                setupSpinner.classList.remove('d-none');
                setupText.textContent = 'Activating Account...';

                try {
                    await window.DF_API.auth.setupPassword(currentToken, p1);
                    currentToken = null; // Clean token from memory immediately upon successful password setup
                    successText.textContent = 'Account activated successfully! Redirecting to student login...';
                    successDiv.classList.remove('d-none');
                    step2.classList.add('d-none');

                    setTimeout(() => {
                        window.DF_ROUTER.navigate('#/login/student');
                    }, 1800);
                } catch (err) {
                    let safeMsg = err.message || 'Failed to complete password setup.';
                    if (currentToken && safeMsg.includes(currentToken)) {
                        safeMsg = safeMsg.replace(currentToken, '***');
                    }
                    errorText.textContent = safeMsg;
                    errorDiv.classList.remove('d-none');
                    setupBtn.disabled = false;
                    setupSpinner.classList.add('d-none');
                    setupText.textContent = 'Set Password & Activate Account';
                }
            });
        }

        // Auto-validate if token was provided in URL
        if (currentToken && currentToken.length >= 16) {
            doValidateToken(currentToken);
        }
    }

    return { render };
})();


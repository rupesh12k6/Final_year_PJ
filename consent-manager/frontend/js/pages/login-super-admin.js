/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — SUPER ADMIN LOGIN PAGE
 * Split-screen authentication experience based on DriveFlow visual language.
 * ==============================================================================
 */

window.DF_PAGE_LOGIN_SUPER_ADMIN = (function () {
    'use strict';

    function render(container) {
        if (!container) return;

        container.innerHTML = `
        <div class="df-auth-split">
            <!-- Left Branding Side -->
            <div class="df-auth-brand-side">
                <div class="df-auth-brand-content">
                    <div class="df-auth-brand-badge">
                        <i class="bi bi-shield-lock-fill"></i>
                    </div>
                    <p class="df-auth-brand-tag">DEPA REGULATORY ROOT</p>
                    <h1 class="df-auth-brand-title">Consent Manager</h1>
                    <p class="df-auth-brand-desc">
                        Central regulatory trust authority for consent artifact issuance, key rotation, and cross-institutional governance.
                    </p>

                    <div class="df-auth-features">
                        <div class="df-auth-feature-item">
                            <i class="bi bi-patch-check-fill"></i>
                            <span>Anchor and verify institutional participant keys</span>
                        </div>
                        <div class="df-auth-feature-item">
                            <i class="bi bi-diagram-3-fill"></i>
                            <span>Global consent lifecycle monitoring & audit registry</span>
                        </div>
                        <div class="df-auth-feature-item">
                            <i class="bi bi-key-fill"></i>
                            <span>Central cryptographic JWKS key authority & rotation</span>
                        </div>
                        <div class="df-auth-feature-item">
                            <i class="bi bi-file-earmark-lock2-fill"></i>
                            <span>Zero-trust verification of Access JWT assertions</span>
                        </div>
                    </div>

                    <div class="df-auth-notice-card">
                        <strong>Regulatory Compliance Notice:</strong> Access is restricted strictly to authorized Central Fiduciary Officers. All administrative sessions are cryptographically logged.
                    </div>
                </div>

                <div class="df-auth-brand-footer">
                    © 2026 India DEPA Fiduciary Network • Central Root Node (Port 8095)
                </div>
            </div>

            <!-- Right Form Side -->
            <div class="df-auth-form-side">
                <div class="df-auth-card">
                    <div class="df-auth-header">
                        <p class="df-auth-tag">REGULATORY ACCESS</p>
                        <h2 class="df-auth-title">Super Admin Sign In</h2>
                        <p class="df-auth-subtitle">Authenticate with your central authority credentials.</p>
                    </div>

                    <!-- Error Alert -->
                    <div id="sa-login-error" class="df-auth-alert-danger d-none" role="alert">
                        <i class="bi bi-exclamation-circle-fill"></i>
                        <span id="sa-login-error-text">Authentication failed</span>
                    </div>

                    <form id="sa-login-form" novalidate>
                        <!-- Email Input -->
                        <div class="df-auth-form-group">
                            <label class="df-auth-label" for="sa-email">Official Regulatory Email</label>
                            <div class="df-auth-input-group">
                                <i class="bi bi-envelope-fill input-icon"></i>
                                <input
                                    type="email"
                                    id="sa-email"
                                    class="df-auth-input"
                                    placeholder="superadmin@depa.cm"
                                    autocomplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <!-- Password Input -->
                        <div class="df-auth-form-group">
                            <label class="df-auth-label" for="sa-password">Master Password</label>
                            <div class="df-auth-input-group">
                                <i class="bi bi-lock-fill input-icon"></i>
                                <input
                                    type="password"
                                    id="sa-password"
                                    class="df-auth-input"
                                    placeholder="Enter your security password"
                                    autocomplete="current-password"
                                    required
                                />
                                <button type="button" class="df-auth-pw-toggle" id="sa-pw-toggle" aria-label="Toggle password visibility">
                                    <i class="bi bi-eye-fill"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Submit Button -->
                        <button type="submit" class="df-auth-submit-btn" id="sa-submit-btn">
                            <span class="spinner-border spinner-border-sm d-none me-2" role="status" aria-hidden="true" id="sa-spinner"></span>
                            <span id="sa-btn-text"><i class="bi bi-shield-check me-2"></i>Sign in as Super Admin</span>
                        </button>
                    </form>

                    <!-- Portal Switcher -->
                    <div class="df-auth-switch-link">
                        <span>Institution Administrator? </span>
                        <a href="#/login/org-admin" id="link-to-org-admin">Sign in as Organization Admin →</a>
                    </div>
                </div>
            </div>
        </div>
        `;

        bindEvents(container);
    }

    function bindEvents(container) {
        const form = container.querySelector('#sa-login-form');
        const emailInput = container.querySelector('#sa-email');
        const passwordInput = container.querySelector('#sa-password');
        const pwToggle = container.querySelector('#sa-pw-toggle');
        const errorAlert = container.querySelector('#sa-login-error');
        const errorText = container.querySelector('#sa-login-error-text');
        const submitBtn = container.querySelector('#sa-submit-btn');
        const spinner = container.querySelector('#sa-spinner');
        const btnText = container.querySelector('#sa-btn-text');

        // Password visibility toggle
        if (pwToggle && passwordInput) {
            pwToggle.addEventListener('click', () => {
                const isPassword = passwordInput.getAttribute('type') === 'password';
                passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
                pwToggle.innerHTML = isPassword ? '<i class="bi bi-eye-slash-fill"></i>' : '<i class="bi bi-eye-fill"></i>';
            });
        }

        // Form submit handler
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Clear previous error
                errorAlert.classList.add('d-none');
                errorText.textContent = '';

                const email = emailInput.value.trim();
                const password = passwordInput.value;

                if (!email) {
                    showError('Please enter your official regulatory email.');
                    emailInput.focus();
                    return;
                }
                if (!password) {
                    showError('Please enter your account password.');
                    passwordInput.focus();
                    return;
                }

                // Set loading state
                setLoading(true);

                try {
                    const result = await window.DF_AUTH.login(email, password, {
                        expectedRole: 'SUPER_ADMIN'
                    });

                    if (result.success) {
                        if (window.DF_UI && window.DF_UI.showToast) {
                            window.DF_UI.showToast(`Welcome back, ${result.user.name || result.user.email}!`, 'success');
                        }
                        if (window.DF_ROUTER) {
                            window.DF_ROUTER.navigate(result.redirectTo || '/dashboard');
                        } else {
                            window.location.hash = '#/dashboard';
                        }
                    } else {
                        showError(result.message || 'Authentication failed. Please verify credentials.');
                    }
                } catch (err) {
                    showError(err.message || 'Unexpected communication failure.');
                } finally {
                    setLoading(false);
                }
            });
        }

        function showError(msg) {
            errorText.textContent = msg;
            errorAlert.classList.remove('d-none');
        }

        function setLoading(isLoading) {
            submitBtn.disabled = isLoading;
            if (isLoading) {
                spinner.classList.remove('d-none');
                btnText.textContent = 'Verifying Authority...';
            } else {
                spinner.classList.add('d-none');
                btnText.innerHTML = '<i class="bi bi-shield-check me-2"></i>Sign in as Super Admin';
            }
        }
    }

    return {
        render
    };
})();


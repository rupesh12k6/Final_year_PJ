/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — ORGANIZATION ADMIN LOGIN PAGE
 * Split-screen authentication experience based on DriveFlow visual language.
 * ==============================================================================
 */

window.DF_PAGE_LOGIN_ORG_ADMIN = (function () {
    'use strict';

    function render(container) {
        if (!container) return;

        container.innerHTML = `
        <div class="df-auth-split">
            <!-- Left Branding Side -->
            <div class="df-auth-brand-side" style="background: linear-gradient(145deg, #1E293B 0%, #0F172A 55%, #020617 100%);">
                <div class="df-auth-brand-content">
                    <div class="df-auth-brand-badge" style="color: #38BDF8; border-color: rgba(56, 189, 248, 0.25);">
                        <i class="bi bi-building-gear"></i>
                    </div>
                    <p class="df-auth-brand-tag" style="color: #7DD3FC;">DEPA INSTITUTIONAL NODE</p>
                    <h1 class="df-auth-brand-title">Organization Portal</h1>
                    <p class="df-auth-brand-desc">
                        Sovereign Institutional Administration. Empowering academic universities, colleges, and evaluators to manage student consent policies, authorized staff, and credential disclosures.
                    </p>

                    <div class="df-auth-features">
                        <div class="df-auth-feature-item">
                            <i class="bi bi-building-check"></i>
                            <span>Manage verified institutional profile, endpoints & keys</span>
                        </div>
                        <div class="df-auth-feature-item">
                            <i class="bi bi-people-fill"></i>
                            <span>Authorize departmental staff and verifier roles</span>
                        </div>
                        <div class="df-auth-feature-item">
                            <i class="bi bi-folder-check"></i>
                            <span>Review student consent disclosures and grant scopes</span>
                        </div>
                        <div class="df-auth-feature-item">
                            <i class="bi bi-shield-shaded"></i>
                            <span>Cryptographic audit trail for all academic data transactions</span>
                        </div>
                    </div>

                    <div class="df-auth-notice-card">
                        <strong>Institutional Security Notice:</strong> Access is permitted only to authorized administrators of active institutions. Organizations must be ratified on the DEPA Central Registry.
                    </div>
                </div>

                <div class="df-auth-brand-footer">
                    © 2026 India DEPA Fiduciary Network • Institutional Gateway
                </div>
            </div>

            <!-- Right Form Side -->
            <div class="df-auth-form-side">
                <div class="df-auth-card">
                    <div class="df-auth-header">
                        <p class="df-auth-tag" style="color: #38BDF8;">INSTITUTIONAL ACCESS</p>
                        <h2 class="df-auth-title">Organization Admin Sign In</h2>
                        <p class="df-auth-subtitle">Sign in with your registered college or university credentials.</p>
                    </div>

                    <!-- Error Alert -->
                    <div id="oa-login-error" class="df-auth-alert-danger d-none" role="alert">
                        <i class="bi bi-exclamation-circle-fill"></i>
                        <span id="oa-login-error-text">Authentication failed</span>
                    </div>

                    <form id="oa-login-form" novalidate>
                        <!-- Email Input -->
                        <div class="df-auth-form-group">
                            <label class="df-auth-label" for="oa-email">Institutional Email</label>
                            <div class="df-auth-input-group">
                                <i class="bi bi-envelope-at-fill input-icon"></i>
                                <input
                                    type="email"
                                    id="oa-email"
                                    class="df-auth-input"
                                    placeholder="admin@collegea.edu"
                                    autocomplete="username"
                                    required
                                />
                            </div>
                        </div>

                        <!-- Password Input -->
                        <div class="df-auth-form-group">
                            <label class="df-auth-label" for="oa-password">Password</label>
                            <div class="df-auth-input-group">
                                <i class="bi bi-lock-fill input-icon"></i>
                                <input
                                    type="password"
                                    id="oa-password"
                                    class="df-auth-input"
                                    placeholder="Enter institutional password"
                                    autocomplete="current-password"
                                    required
                                />
                                <button type="button" class="df-auth-pw-toggle" id="oa-pw-toggle" aria-label="Toggle password visibility">
                                    <i class="bi bi-eye-fill"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Optional College Code (if applicable) -->
                        <div class="df-auth-form-group">
                            <label class="df-auth-label" for="oa-college-id">College Code (Optional)</label>
                            <div class="df-auth-input-group">
                                <i class="bi bi-mortarboard-fill input-icon"></i>
                                <input
                                    type="text"
                                    id="oa-college-id"
                                    class="df-auth-input"
                                    placeholder="e.g. COLLEGE_A (leave blank to auto-detect)"
                                />
                            </div>
                        </div>

                        <!-- Submit Button -->
                        <button type="submit" class="df-auth-submit-btn" id="oa-submit-btn" style="background: linear-gradient(135deg, #0284C7, #0369A1);">
                            <span class="spinner-border spinner-border-sm d-none me-2" role="status" aria-hidden="true" id="oa-spinner"></span>
                            <span id="oa-btn-text"><i class="bi bi-building-check me-2"></i>Sign in as Organization Admin</span>
                        </button>
                    </form>

                    <!-- Portal Switcher -->
                    <div class="df-auth-switch-link">
                        <span>Regulatory Central Officer? </span>
                        <a href="#/login/super-admin" id="link-to-super-admin">Sign in as Super Admin →</a>
                    </div>
                </div>
            </div>
        </div>
        `;

        bindEvents(container);
    }

    function bindEvents(container) {
        const form = container.querySelector('#oa-login-form');
        const emailInput = container.querySelector('#oa-email');
        const passwordInput = container.querySelector('#oa-password');
        const collegeIdInput = container.querySelector('#oa-college-id');
        const pwToggle = container.querySelector('#oa-pw-toggle');
        const errorAlert = container.querySelector('#oa-login-error');
        const errorText = container.querySelector('#oa-login-error-text');
        const submitBtn = container.querySelector('#oa-submit-btn');
        const spinner = container.querySelector('#oa-spinner');
        const btnText = container.querySelector('#oa-btn-text');

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

                errorAlert.classList.add('d-none');
                errorText.textContent = '';

                const email = emailInput.value.trim();
                const password = passwordInput.value;
                const collegeId = collegeIdInput ? collegeIdInput.value.trim() : null;

                if (!email) {
                    showError('Please enter your institutional email address.');
                    emailInput.focus();
                    return;
                }
                if (!password) {
                    showError('Please enter your account password.');
                    passwordInput.focus();
                    return;
                }

                setLoading(true);

                try {
                    const result = await window.DF_AUTH.login(email, password, {
                        expectedRole: 'ORG_ADMIN',
                        collegeId: collegeId || undefined
                    });

                    if (result.success) {
                        if (window.DF_UI && window.DF_UI.showToast) {
                            window.DF_UI.showToast(`Authenticated as Organization Admin: ${result.user.email}`, 'success');
                        }
                        if (window.DF_ROUTER) {
                            window.DF_ROUTER.navigate(result.redirectTo || '/org-dashboard');
                        } else {
                            window.location.hash = '#/org-dashboard';
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
                btnText.textContent = 'Verifying Institution...';
            } else {
                spinner.classList.add('d-none');
                btnText.innerHTML = '<i class="bi bi-building-check me-2"></i>Sign in as Organization Admin';
            }
        }
    }

    return {
        render
    };
})();


/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: CONSUMER OFFICER LOGIN
 * Split-screen authentication experience for College B administrators.
 * ==============================================================================
 */

window.DF_PAGE_LOGIN_ADMIN = (function () {
    'use strict';

    function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="df-auth-split">
                <!-- Left Branding Panel -->
                <div class="df-auth-brand-panel" style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4F46E5 100%);">
                    <div class="df-auth-brand-content">
                        <div class="df-auth-badge mb-4">
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-3 py-2 rounded-pill fw-semibold" style="background: rgba(99, 102, 241, 0.2); color: #C7D2FE; border-color: rgba(165, 180, 252, 0.3);">
                                <i class="bi bi-shield-lock-fill me-1"></i> Data Consumer Node
                            </span>
                        </div>
                        <h1 class="display-6 fw-bold text-white mb-3">College B University</h1>
                        <p class="lead text-indigo-100 mb-4" style="color: #E0E7FF; font-size: 1.1rem; line-height: 1.6;">
                            Consumer Operations &amp; Inquirer Portal within the DEPA Academic Trust Network.
                        </p>

                        <div class="df-feature-list mt-5">
                            <div class="d-flex align-items-start mb-4">
                                <div class="df-feature-icon me-3 p-2 rounded-3" style="background: rgba(255,255,255,0.1); color: #A5B4FC;">
                                    <i class="bi bi-arrow-left-right fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="text-white mb-1 fs-6 fw-bold">Peer-to-Peer Data Inquiries</h5>
                                    <p class="text-indigo-200 small mb-0" style="color: #C7D2FE;">
                                        Initiate verified academic inquiries to external providers with end-to-end cryptographic enforcement.
                                    </p>
                                </div>
                            </div>

                            <div class="d-flex align-items-start mb-4">
                                <div class="df-feature-icon me-3 p-2 rounded-3" style="background: rgba(255,255,255,0.1); color: #A5B4FC;">
                                    <i class="bi bi-file-earmark-check-fill fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="text-white mb-1 fs-6 fw-bold">Granular Consent Verification</h5>
                                    <p class="text-indigo-200 small mb-0" style="color: #C7D2FE;">
                                        Fetch authorized academic records strictly compliant with student-approved field disclosures.
                                    </p>
                                </div>
                            </div>

                            <div class="d-flex align-items-start">
                                <div class="df-feature-icon me-3 p-2 rounded-3" style="background: rgba(255,255,255,0.1); color: #A5B4FC;">
                                    <i class="bi bi-lock-fill fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="text-white mb-1 fs-6 fw-bold">Encrypted Data Transport</h5>
                                    <p class="text-indigo-200 small mb-0" style="color: #C7D2FE;">
                                        Direct peer data transfer using Diffie-Hellman exchange and RS256 token verification.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="mt-5 pt-4 border-top border-indigo-800" style="border-color: rgba(255,255,255,0.1) !important;">
                            <small class="text-indigo-200" style="color: #A5B4FC;">
                                Connected to Consent Manager Federation Node &bull; College B University
                            </small>
                        </div>
                    </div>
                </div>

                <!-- Right Form Panel -->
                <div class="df-auth-form-panel">
                    <div class="df-auth-form-card">
                        <div class="text-center mb-4">
                            <div class="d-inline-flex p-3 rounded-circle mb-3" style="background: #EEF2FF; color: #4F46E5;">
                                <i class="bi bi-person-badge-fill fs-2"></i>
                            </div>
                            <h2 class="h4 fw-bold text-slate-900 mb-1">Consumer Officer Portal</h2>
                            <p class="text-muted small">Sign in with your administrative credentials to manage outgoing inquiries</p>
                        </div>

                        <div id="login-error-alert" class="alert alert-danger d-none py-2 px-3 small rounded-3 mb-3" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <span id="login-error-text"></span>
                        </div>

                        <form id="admin-login-form">
                            <div class="mb-3">
                                <label for="admin-email" class="form-label small fw-semibold text-slate-700">Institutional Email</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-envelope"></i></span>
                                    <input type="email" class="form-control border-start-0 ps-0" id="admin-email" placeholder="name@collegeb.edu" value="dean@collegeb.edu" required autocomplete="username">
                                </div>
                                <div class="form-text small text-muted">Default Consumer Admin: <code>dean@collegeb.edu</code></div>
                            </div>

                            <div class="mb-4">
                                <label for="admin-password" class="form-label small fw-semibold text-slate-700">Password</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-key"></i></span>
                                    <input type="password" class="form-control border-start-0 border-end-0 ps-0" id="admin-password" placeholder="••••••••" value="OrgAdmin@123" required autocomplete="current-password">
                                    <button class="btn btn-outline-secondary border-start-0 text-muted" type="button" id="toggle-password-btn">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="d-grid mb-4">
                                <button type="submit" class="btn btn-primary py-2 fw-semibold" id="btn-submit-login" style="background-color: #4F46E5; border-color: #4F46E5;">
                                    <span id="btn-text">Authenticate as Consumer Officer</span>
                                    <span id="btn-spinner" class="spinner-border spinner-border-sm ms-2 d-none" role="status" aria-hidden="true"></span>
                                </button>
                            </div>
                        </form>

                        <div class="pt-3 border-top text-center">
                            <p class="text-muted small mb-2">Looking for student self-service?</p>
                            <a href="#/login-student" class="btn btn-sm btn-outline-secondary rounded-pill px-3">
                                <i class="bi bi-mortarboard me-1"></i> Switch to Student Sign In
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event Listeners
        const form = container.querySelector('#admin-login-form');
        const emailInput = container.querySelector('#admin-email');
        const passInput = container.querySelector('#admin-password');
        const toggleBtn = container.querySelector('#toggle-password-btn');
        const errorAlert = container.querySelector('#login-error-alert');
        const errorText = container.querySelector('#login-error-text');
        const btnSubmit = container.querySelector('#btn-submit-login');
        const btnText = container.querySelector('#btn-text');
        const btnSpinner = container.querySelector('#btn-spinner');

        toggleBtn.addEventListener('click', () => {
            const isPass = passInput.getAttribute('type') === 'password';
            passInput.setAttribute('type', isPass ? 'text' : 'password');
            toggleBtn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorAlert.classList.add('d-none');
            btnSubmit.disabled = true;
            btnText.textContent = 'Authenticating...';
            btnSpinner.classList.remove('d-none');

            try {
                await window.DF_AUTH.loginAdmin(emailInput.value, passInput.value);
                window.location.hash = '#/admin/overview';
            } catch (err) {
                errorText.textContent = err.message || 'Authentication failed. Please verify credentials.';
                errorAlert.classList.remove('d-none');
                btnSubmit.disabled = false;
                btnText.textContent = 'Authenticate as Consumer Officer';
                btnSpinner.classList.add('d-none');
            }
        });
    }

    return { render };
})();


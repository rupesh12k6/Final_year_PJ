/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: STUDENT LOGIN
 * Split-screen authentication experience for College B enrolled students.
 * ==============================================================================
 */

window.DF_PAGE_LOGIN_STUDENT = (function () {
    'use strict';

    function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="df-auth-split">
                <!-- Left Branding Panel -->
                <div class="df-auth-brand-panel" style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%);">
                    <div class="df-auth-brand-content">
                        <div class="df-auth-badge mb-4">
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-3 py-2 rounded-pill fw-semibold" style="background: rgba(99, 102, 241, 0.2); color: #C7D2FE; border-color: rgba(165, 180, 252, 0.3);">
                                <i class="bi bi-mortarboard-fill me-1"></i> Student Self-Service Portal
                            </span>
                        </div>
                        <h1 class="display-6 fw-bold text-white mb-3">College B University</h1>
                        <p class="lead text-indigo-100 mb-4" style="color: #E0E7FF; font-size: 1.1rem; line-height: 1.6;">
                            Access your academic profile, degree verification status, and enrolled credentials.
                        </p>

                        <div class="df-feature-list mt-5">
                            <div class="d-flex align-items-start mb-4">
                                <div class="df-feature-icon me-3 p-2 rounded-3" style="background: rgba(255,255,255,0.1); color: #A5B4FC;">
                                    <i class="bi bi-award-fill fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="text-white mb-1 fs-6 fw-bold">Verified Academic Records</h5>
                                    <p class="text-indigo-200 small mb-0" style="color: #C7D2FE;">
                                        Inspect your authentic CGPA, program credentials, and verified graduation dossier.
                                    </p>
                                </div>
                            </div>

                            <div class="d-flex align-items-start mb-4">
                                <div class="df-feature-icon me-3 p-2 rounded-3" style="background: rgba(255,255,255,0.1); color: #A5B4FC;">
                                    <i class="bi bi-shield-check fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="text-white mb-1 fs-6 fw-bold">Cryptographic Data Sovereignty</h5>
                                    <p class="text-indigo-200 small mb-0" style="color: #C7D2FE;">
                                        Full personal control over who inspects your cross-institutional academic records.
                                    </p>
                                </div>
                            </div>

                            <div class="d-flex align-items-start">
                                <div class="df-feature-icon me-3 p-2 rounded-3" style="background: rgba(255,255,255,0.1); color: #A5B4FC;">
                                    <i class="bi bi-key-fill fs-4"></i>
                                </div>
                                <div>
                                    <h5 class="text-white mb-1 fs-6 fw-bold">Single-Use Account Activation</h5>
                                    <p class="text-indigo-200 small mb-0" style="color: #C7D2FE;">
                                        New students activate their identity using registrar-issued single-use tokens.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="mt-5 pt-4 border-top border-indigo-800" style="border-color: rgba(255,255,255,0.1) !important;">
                            <small class="text-indigo-200" style="color: #A5B4FC;">
                                College B University &bull; Secure Academic Portal
                            </small>
                        </div>
                    </div>
                </div>

                <!-- Right Form Panel -->
                <div class="df-auth-form-panel">
                    <div class="df-auth-form-card">
                        <div class="text-center mb-4">
                            <div class="d-inline-flex p-3 rounded-circle mb-3" style="background: #EEF2FF; color: #4F46E5;">
                                <i class="bi bi-mortarboard-fill fs-2"></i>
                            </div>
                            <h2 class="h4 fw-bold text-slate-900 mb-1">Student Portal Sign In</h2>
                            <p class="text-muted small">Enter your student institutional email or ID to access your record</p>
                        </div>

                        <div id="student-login-error" class="alert alert-danger d-none py-2 px-3 small rounded-3 mb-3" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <span id="student-login-error-text"></span>
                        </div>

                        <form id="student-login-form">
                            <div class="mb-3">
                                <label for="student-identifier" class="form-label small fw-semibold text-slate-700">Student Email or ID</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-person"></i></span>
                                    <input type="text" class="form-control border-start-0 ps-0" id="student-identifier" placeholder="e.g. alice.johnson@collegeb.edu or STU-2023-001" value="alice.johnson@collegeb.edu" required autocomplete="username">
                                </div>
                                <div class="form-text small text-muted">Demo Student: <code>alice.johnson@collegeb.edu</code> (or <code>STU-2023-001</code>)</div>
                            </div>

                            <div class="mb-4">
                                <label for="student-password" class="form-label small fw-semibold text-slate-700">Password</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-key"></i></span>
                                    <input type="password" class="form-control border-start-0 border-end-0 ps-0" id="student-password" placeholder="••••••••" value="StudentPassword123" required autocomplete="current-password">
                                    <button class="btn btn-outline-secondary border-start-0 text-muted" type="button" id="student-toggle-password-btn">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="d-grid mb-4">
                                <button type="submit" class="btn btn-primary py-2 fw-semibold" id="btn-submit-student-login" style="background-color: #4F46E5; border-color: #4F46E5;">
                                    <span id="student-btn-text">Sign In to Student Portal</span>
                                    <span id="student-btn-spinner" class="spinner-border spinner-border-sm ms-2 d-none" role="status" aria-hidden="true"></span>
                                </button>
                            </div>
                        </form>

                        <div class="pt-3 border-top text-center">
                            <p class="text-muted small mb-2">Received an activation token from the registrar?</p>
                            <a href="#/activate" class="btn btn-sm btn-outline-primary rounded-pill px-3 me-2 mb-2">
                                <i class="bi bi-key me-1"></i> Activate Account
                            </a>
                            <a href="#/login-admin" class="btn btn-sm btn-outline-secondary rounded-pill px-3 mb-2">
                                <i class="bi bi-shield-lock me-1"></i> Consumer Officer Sign In
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event Listeners
        const form = container.querySelector('#student-login-form');
        const idInput = container.querySelector('#student-identifier');
        const passInput = container.querySelector('#student-password');
        const toggleBtn = container.querySelector('#student-toggle-password-btn');
        const errorAlert = container.querySelector('#student-login-error');
        const errorText = container.querySelector('#student-login-error-text');
        const btnSubmit = container.querySelector('#btn-submit-student-login');
        const btnText = container.querySelector('#student-btn-text');
        const btnSpinner = container.querySelector('#student-btn-spinner');

        toggleBtn.addEventListener('click', () => {
            const isPass = passInput.getAttribute('type') === 'password';
            passInput.setAttribute('type', isPass ? 'text' : 'password');
            toggleBtn.innerHTML = isPass ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorAlert.classList.add('d-none');
            btnSubmit.disabled = true;
            btnText.textContent = 'Verifying credentials...';
            btnSpinner.classList.remove('d-none');

            try {
                await window.DF_AUTH.loginStudent(idInput.value, passInput.value);
                window.location.hash = '#/student/profile';
            } catch (err) {
                errorText.textContent = err.message || 'Authentication failed. Please verify credentials.';
                errorAlert.classList.remove('d-none');
                btnSubmit.disabled = false;
                btnText.textContent = 'Sign In to Student Portal';
                btnSpinner.classList.add('d-none');
            }
        });
    }

    return { render };
})();


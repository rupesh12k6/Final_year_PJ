/**
 * ==============================================================================
 * DEPA COLLEGE A — STUDENT PORTAL LOGIN PAGE
 * Split-screen student self-service authentication experience.
 * Institutional Palette: Academic Provider Emerald
 * ==============================================================================
 */

window.DF_PAGE_LOGIN_STUDENT = (function () {
    'use strict';

    function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="df-auth-wrapper">
                <!-- Left: Branding Panel -->
                <div class="df-auth-brand-panel" style="background: linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%);">
                    <div class="df-auth-brand-content">
                        <div class="d-flex align-items-center gap-3 mb-4">
                            <div class="df-logo-box" style="background: rgba(16, 185, 129, 0.25); border: 1px solid rgba(110, 231, 183, 0.4); border-radius: 12px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
                                <i class="bi bi-mortarboard-fill text-white fs-3"></i>
                            </div>
                            <div>
                                <span class="badge bg-white text-dark fw-bold text-uppercase px-2 py-1" style="font-size: 0.65rem; letter-spacing: 0.05em;">STUDENT CREDENTIAL PORTAL</span>
                                <h4 class="text-white fw-bold mb-0 mt-1">College A University</h4>
                            </div>
                        </div>

                        <h2 class="text-white fw-bold display-6 mb-3">Your Academic Identity, Under Your Control</h2>
                        <p class="text-light opacity-75 mb-5" style="line-height: 1.6; font-size: 0.95rem;">
                            Access your official academic transcripts, view incoming disclosure requests from employers and universities, and approve only the specific credentials you choose to share.
                        </p>

                        <!-- Student Feature Highlights -->
                        <div class="d-flex flex-column gap-3 mb-5">
                            <div class="d-flex align-items-start gap-3">
                                <div class="df-feature-icon" style="background: rgba(16, 185, 129, 0.2); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="bi bi-ui-checks text-white"></i>
                                </div>
                                <div>
                                    <h6 class="text-white fw-semibold mb-1">Granular Field Selection</h6>
                                    <p class="text-light opacity-75 small mb-0">Select individual fields (e.g. CGPA, Degree Certificate) to share. Never forced to reveal your full transcript.</p>
                                </div>
                            </div>

                            <div class="d-flex align-items-start gap-3">
                                <div class="df-feature-icon" style="background: rgba(16, 185, 129, 0.2); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="bi bi-shield-check text-white"></i>
                                </div>
                                <div>
                                    <h6 class="text-white fw-semibold mb-1">Cryptographic Security</h6>
                                    <p class="text-light opacity-75 small mb-0">Decisions are signed by College A's institutional key pair. Third parties receive only student-approved attributes.</p>
                                </div>
                            </div>

                            <div class="d-flex align-items-start gap-3">
                                <div class="df-feature-icon" style="background: rgba(16, 185, 129, 0.2); border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                    <i class="bi bi-x-circle-fill text-white"></i>
                                </div>
                                <div>
                                    <h6 class="text-white fw-semibold mb-1">Real-time Revocation</h6>
                                    <p class="text-light opacity-75 small mb-0">Instantly revoke any active consent grant. Subsequent data retrieval requests will be immediately blocked.</p>
                                </div>
                            </div>
                        </div>

                        <div class="pt-4 border-top border-success border-opacity-25 text-light opacity-50 small">
                            DEPA Academic Trust Protocol v1.0 • Node Port 8081 • Single-Sign-On Verified
                        </div>
                    </div>
                </div>

                <!-- Right: Form Panel -->
                <div class="df-auth-form-panel">
                    <div class="df-auth-form-content">
                        <!-- Top Navigation Between Portals -->
                        <div class="d-flex align-items-center justify-content-between mb-4">
                            <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill font-monospace small">
                                <i class="bi bi-person-badge me-1"></i> STUDENT PORTAL
                            </span>
                            <a href="#/login/admin" class="text-decoration-none small fw-semibold text-secondary">
                                Registrar Admin <i class="bi bi-arrow-right"></i>
                            </a>
                        </div>

                        <div class="mb-4">
                            <h3 class="fw-bold text-dark mb-1">Student Sign In</h3>
                            <p class="text-muted small">Sign in with your Student ID or official college email to review and manage your consents.</p>
                        </div>

                        <!-- Error alert container -->
                        <div id="student-login-error" class="alert alert-danger d-none py-2 px-3 small rounded-3" role="alert">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>
                            <span id="student-login-error-text"></span>
                        </div>

                        <!-- Login Form -->
                        <form id="form-student-login" novalidate>
                            <div class="mb-3">
                                <label for="student-identifier" class="form-label text-muted small fw-bold text-uppercase">Student ID or College Email</label>
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-person"></i></span>
                                    <input type="text" class="form-control border-start-0" id="student-identifier" placeholder="STU-2023-001 or student1@collegea.edu" required autocomplete="username" value="student1@collegea.edu">
                                </div>
                            </div>

                            <div class="mb-4">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <label for="student-password" class="form-label text-muted small fw-bold text-uppercase mb-0">Password</label>
                                </div>
                                <div class="input-group">
                                    <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-lock"></i></span>
                                    <input type="password" class="form-control border-start-0 border-end-0" id="student-password" placeholder="••••••••••••" required autocomplete="current-password" value="StudentPassword123">
                                    <button class="btn btn-outline-secondary border-start-0 text-muted" type="button" id="btn-toggle-stu-password" title="Toggle password visibility">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </div>
                            </div>

                            <button type="submit" class="btn btn-success w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 mb-4" id="btn-student-submit" style="background-color: var(--df-primary); border-color: var(--df-primary);">
                                <span id="student-submit-spinner" class="spinner-border spinner-border-sm d-none" role="status"></span>
                                <span id="student-submit-text">Sign In to Student Portal</span>
                                <i class="bi bi-arrow-right"></i>
                            </button>
                        </form>

                        <div class="p-3 bg-light rounded-3 border mb-4">
                            <div class="d-flex align-items-center justify-content-between">
                                <div class="small">
                                    <p class="fw-semibold text-dark mb-0">First time here?</p>
                                    <p class="text-muted mb-0" style="font-size: 0.8rem;">Activate your account using your single-use onboarding token.</p>
                                </div>
                                <a href="#/activate" class="btn btn-sm btn-outline-success">Activate Token</a>
                            </div>
                        </div>

                        <div class="text-center text-muted small">
                            <p class="mb-0">Need help? Contact the College A Registrar at <span class="fw-semibold">registrar@collegea.edu</span></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Attach event handlers
        const form = document.getElementById('form-student-login');
        const idInput = document.getElementById('student-identifier');
        const passwordInput = document.getElementById('student-password');
        const errorDiv = document.getElementById('student-login-error');
        const errorText = document.getElementById('student-login-error-text');
        const submitBtn = document.getElementById('btn-student-submit');
        const submitSpinner = document.getElementById('student-submit-spinner');
        const submitText = document.getElementById('student-submit-text');
        const toggleBtn = document.getElementById('btn-toggle-stu-password');

        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const isPassword = passwordInput.getAttribute('type') === 'password';
                passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
                toggleBtn.innerHTML = isPassword ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                errorDiv.classList.add('d-none');
                submitBtn.disabled = true;
                submitSpinner.classList.remove('d-none');
                submitText.textContent = 'Verifying Account...';

                try {
                    await window.DF_AUTH.loginStudent(idInput.value, passwordInput.value);
                } catch (err) {
                    errorText.textContent = err.message || 'Login failed. Please check your credentials.';
                    errorDiv.classList.remove('d-none');
                    submitBtn.disabled = false;
                    submitSpinner.classList.add('d-none');
                    submitText.textContent = 'Sign In to Student Portal';
                }
            });
        }
    }

    return { render };
})();


/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — AUTHENTICATION CONTROLLER
 * Coordinates credentials validation, backend API dispatch, and role enforcement.
 * ==============================================================================
 */

window.DF_AUTH = (function () {
    'use strict';

    /**
     * Executes backend authentication via POST /api/auth/login.
     * The backend authenticates credentials and determines the user's actual role.
     * The frontend validates that the returned role matches the portal context.
     *
     * @param {string} email
     * @param {string} password
     * @param {Object} [options]
     * @param {string} [options.expectedRole] - 'SUPER_ADMIN' or 'ORG_ADMIN'
     * @param {string} [options.collegeId] - Optional college ID
     * @returns {Promise<{success: boolean, user?: Object, message?: string, redirectTo?: string}>}
     */
    async function login(email, password, options = {}) {
        const normalizedEmail = (email || '').trim().toLowerCase();
        if (!normalizedEmail) {
            return { success: false, message: 'Institutional email address is required.' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return { success: false, message: 'Please enter a valid institutional email address.' };
        }

        if (!password) {
            return { success: false, message: 'Account password is required.' };
        }

        try {
            const payload = {
                email: normalizedEmail,
                password: password
            };

            if (options.collegeId) {
                payload.collegeId = options.collegeId;
            }

            const response = await window.DF_API.auth.login(payload);

            if (!response || !response.token) {
                return { success: false, message: 'Authentication failed: No token returned by authority.' };
            }

            const role = String(response.role || '').toUpperCase();

            // Validate against the expected portal role experience
            if (options.expectedRole === 'SUPER_ADMIN') {
                if (role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
                    return {
                        success: false,
                        message: 'Access Denied: This account is an Organization Admin. Please use the Organization Admin Login portal.'
                    };
                }
            } else if (options.expectedRole === 'ORG_ADMIN') {
                if (role !== 'ORG_ADMIN') {
                    return {
                        success: false,
                        message: 'Access Denied: This account is a Regulatory Super Admin. Please use the Super Admin Login portal.'
                    };
                }
            }

            // Save authenticated session
            const user = {
                userId: response.userId,
                name: response.name,
                email: response.email,
                organizationId: response.organizationId,
                role: role
            };

            window.DF_SESSION.setSession({
                token: response.token,
                user: user
            });

            const redirectTo = (role === 'SUPER_ADMIN' || role === 'ADMIN') ? '/dashboard' : '/org-dashboard';

            return {
                success: true,
                user: user,
                token: response.token,
                redirectTo: redirectTo
            };
        } catch (err) {
            console.error('Authentication request error:', err);
            return {
                success: false,
                message: err.message || 'Authentication failed. Please verify your credentials.'
            };
        }
    }

    return {
        login
    };
})();


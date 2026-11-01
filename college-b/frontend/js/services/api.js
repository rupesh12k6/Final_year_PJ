/**
 * ==============================================================================
 * DEPA COLLEGE B — CENTRALIZED API CLIENT SERVICE
 * Handles HTTP requests to College B Backend (port 8082) and Consent Manager.
 * Automatically injects Bearer JWT from DF_SESSION and handles 401 expiration.
 * ==============================================================================
 */

window.DF_API = (function () {
    'use strict';

    function getBaseUrl() {
        return (window.DEPA_SERVERS && window.DEPA_SERVERS.COLLEGE_B_BASE_URL) || 'http://localhost:8082';
    }

    function getCmBaseUrl() {
        return (window.DEPA_SERVERS && window.DEPA_SERVERS.CM_BASE_URL) || 'http://localhost:8095';
    }

    async function request(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${getBaseUrl()}${endpoint}`;
        const headers = options.headers || {};

        const isExternal = endpoint.startsWith('http://') || endpoint.startsWith('https://');
        const token = window.DF_SESSION ? window.DF_SESSION.getToken() : null;
        if (token && !isExternal && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (!(options.body instanceof FormData) && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        // Enforce zero HTTP caching across all requests to prevent caching sensitive academic records
        if (!headers['Cache-Control']) {
            headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        }
        if (!headers['Pragma']) {
            headers['Pragma'] = 'no-cache';
        }

        const config = {
            cache: 'no-store',
            ...options,
            headers
        };

        let response;
        try {
            response = await fetch(url, config);
        } catch (netErr) {
            throw new Error(`Network connection error: ${netErr.message}`);
        }

        if (response.status === 401) {
            if (window.DF_SESSION && window.DF_SESSION.isAuthenticated()) {
                window.DF_SESSION.clearSession();
                if (window.location.hash.startsWith('#/admin')) {
                    window.location.hash = '#/login-admin';
                } else {
                    window.location.hash = '#/login-student';
                }
            }
        }

        let data = null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                data = await response.json();
            } catch (jsonErr) {
                data = null;
            }
        } else {
            try {
                data = await response.text();
            } catch (txtErr) {
                data = null;
            }
        }

        if (!response.ok) {
            const errorMsg = (data && (data.message || data.error)) || `HTTP ${response.status} ${response.statusText}`;
            const err = new Error(errorMsg);
            err.status = response.status;
            err.data = data;
            throw err;
        }

        return data;
    }

    // =========================================================================
    // API DOMAIN MODULES
    // =========================================================================

    const auth = {
        async login(email, password) {
            return request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: email.trim(), password: password })
            });
        },
        async validateToken(token) {
            return request('/api/auth/activation/validate', {
                method: 'POST',
                body: JSON.stringify({ token: token.trim() })
            });
        },
        async setupPassword(token, password) {
            return request('/api/auth/activation/setup-password', {
                method: 'POST',
                body: JSON.stringify({ token: token.trim(), password: password.trim() })
            });
        }
    };

    const consumer = {
        async initiateDataRequest(data) {
            return request('/api/consumer/data-requests/initiate', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },
        async getOutgoingRequests() {
            return request('/api/consumer/data-requests', {
                method: 'GET'
            });
        },
        async getGrantStatus(dataRequestId) {
            return request(`/api/consumer/data-requests/${encodeURIComponent(dataRequestId)}/status`, {
                method: 'GET'
            });
        },
        async fetchAuthorizedData(dataRequestId, providerUrl) {
            const q = providerUrl ? `?providerUrl=${encodeURIComponent(providerUrl)}` : '';
            return request(`/api/consumer/data-requests/${encodeURIComponent(dataRequestId)}/fetch-data${q}`, {
                method: 'POST'
            });
        },
        async fetchDirectData(grantId, accessToken, providerUrl) {
            const q = providerUrl ? `?providerUrl=${encodeURIComponent(providerUrl)}` : '';
            return request(`/api/consumer/fetch-direct-data${q}`, {
                method: 'POST',
                body: JSON.stringify({ grantId, accessToken })
            });
        }
    };

    const students = {
        async getAll() {
            return request('/api/students', { method: 'GET' });
        },
        async add(studentData) {
            return request('/api/students', {
                method: 'POST',
                body: JSON.stringify(studentData)
            });
        },
        async reissueActivation(studentId) {
            return request(`/api/students/${encodeURIComponent(studentId)}/reissue-activation`, { method: 'POST' });
        },
        async updateStatus(studentId, status) {
            return request(`/api/students/${encodeURIComponent(studentId)}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status })
            });
        },
        async getDossier(studentId) {
            return request(`/api/students/${encodeURIComponent(studentId)}`, { method: 'GET' });
        },
        async importCsv(formData) {
            return request('/api/students/import-csv', {
                method: 'POST',
                body: formData
            });
        },
        async getEligible() {
            return request('/api/provider/onboarding/eligible-students', { method: 'GET' });
        },
        async getProfile() {
            return request('/api/student/profile', { method: 'GET' });
        }
    };

    const cm = {
        async getOrganizations() {
            return request(`${getCmBaseUrl()}/api/consents/organizations`, { method: 'GET' });
        },
        async getCanonicalFields() {
            return request(`${getCmBaseUrl()}/api/consents/fields`, { method: 'GET' });
        },
        async checkHealth() {
            try {
                return await request(`${getCmBaseUrl()}/health`, { method: 'GET' });
            } catch (e) {
                return await request(`${getCmBaseUrl()}/api/health`, { method: 'GET' });
            }
        }
    };

    return {
        request,
        auth,
        consumer,
        students,
        cm,
        getBaseUrl,
        getCmBaseUrl
    };
})();


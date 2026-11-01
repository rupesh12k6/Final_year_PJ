/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — API CLIENT SERVICE
 * Handles communication with Consent Manager Backend (Port 8095)
 * ==============================================================================
 */

window.DF_API = (function () {
    'use strict';

    function getBaseUrl() {
        if (window.CM_BASE_URL) return window.CM_BASE_URL;
        if (window.DEPA_SERVERS && window.DEPA_SERVERS.CM_BASE_URL) return window.DEPA_SERVERS.CM_BASE_URL;
        const stored = localStorage.getItem('depa_cm_url');
        if (stored) return stored;
        return 'http://localhost:8095';
    }

    async function request(path, options = {}) {
        const baseUrl = getBaseUrl();
        const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        // Attach Authorization header if token exists and not already provided
        if (!headers['Authorization'] && window.DF_SESSION && window.DF_SESSION.getToken()) {
            headers['Authorization'] = `Bearer ${window.DF_SESSION.getToken()}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);

            // Handle 204 No Content
            if (response.status === 204) {
                return null;
            }

            let data = null;
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            if (!response.ok) {
                const message = (data && typeof data === 'object' && (data.message || data.error)) 
                    ? (data.message || data.error) 
                    : (typeof data === 'string' && data ? data : `Request failed with status ${response.status}`);
                const error = new Error(message);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                const connError = new Error(`Cannot connect to Consent Manager backend at ${baseUrl}. Ensure backend is running.`);
                connError.status = 0;
                throw connError;
            }
            throw err;
        }
    }

    // -------------------------------------------------------------------------
    // API Endpoints
    // -------------------------------------------------------------------------
    const auth = {
        login: (credentials) => request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),
        getPublicKey: () => request('/api/access-grants/public-key', {
            method: 'GET'
        })
    };

    const admin = {
        getMetrics: () => request('/api/admin/metrics', { method: 'GET' }),
        getOrganizations: () => request('/api/admin/organizations', { method: 'GET' }),
        getOrganizationById: (id) => request(`/api/admin/organizations/${id}`, { method: 'GET' }),
        createOrganization: (payload) => request('/api/admin/organizations', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        activateOrganization: (id) => request(`/api/admin/organizations/${id}/activate`, {
            method: 'PATCH'
        }),
        suspendOrganization: (id) => request(`/api/admin/organizations/${id}/suspend`, {
            method: 'PATCH'
        }),
        createOrgAdmin: (orgId, payload) => request(`/api/admin/organizations/${orgId}/org-admin`, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
    };

    const superAdmin = {
        getAdmins: () => request('/api/super-admin/admins', { method: 'GET' }),
        createAdmin: (payload) => request('/api/super-admin/admins', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        suspendAdmin: (adminId) => request(`/api/super-admin/admins/${adminId}/suspend`, {
            method: 'PATCH'
        }),
        activateAdmin: (adminId) => request(`/api/super-admin/admins/${adminId}/activate`, {
            method: 'PATCH'
        })
    };

    const audit = {
        getAll: () => request('/api/audit/all', { method: 'GET' }),
        getAuditLogs: (orgId) => request(orgId ? `/api/audit?organizationId=${encodeURIComponent(orgId)}` : '/api/audit', { method: 'GET' })
    };

    const trust = {
        getPublicKey: (kid) => request(kid ? `/api/access-grants/public-key?kid=${encodeURIComponent(kid)}` : '/api/access-grants/public-key', { method: 'GET' }),
        getSupportedFields: () => request('/api/consents/fields', { method: 'GET' })
    };

    const orgAdmin = {
        getUsers: () => request('/api/org-admin/users', { method: 'GET' }),
        createUser: (payload) => request('/api/org-admin/users', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        suspendUser: (userId) => request(`/api/org-admin/users/${userId}/suspend`, {
            method: 'PATCH'
        }),
        activateUser: (userId) => request(`/api/org-admin/users/${userId}/activate`, {
            method: 'PATCH'
        }),
        resetPassword: (userId, newPassword) => request(`/api/org-admin/users/${userId}/reset-password`, {
            method: 'PATCH',
            body: JSON.stringify({ newPassword })
        }),
        importStudents: (payload) => request('/api/org-admin/onboarding/import', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),
        getConsents: () => request('/api/consents/organization', { method: 'GET' }),
        getDataRequests: () => request('/api/data-requests', { method: 'GET' }),
        getAuditLogs: () => request('/api/audit', { method: 'GET' }),
        getUserProfile: () => request('/api/user/profile', { method: 'GET' }),
        getInstitutions: () => request('/api/consents/organizations', { method: 'GET' }),
        getOwnOrganization: () => request('/api/org-admin/organization', { method: 'GET' })
    };

    return {
        getBaseUrl,
        request,
        auth,
        admin,
        superAdmin,
        audit,
        trust,
        orgAdmin,
        // Legacy aliases for backward compatibility
        metrics: admin,
        organizations: admin
    };
})();

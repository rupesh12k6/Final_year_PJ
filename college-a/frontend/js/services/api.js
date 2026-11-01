/**
 * ==============================================================================
 * DEPA COLLEGE A — API CLIENT SERVICE
 * Type-safe, centralized HTTP client communicating with College A Provider Node.
 * Backend Port: 8081 | CM Port: 8095
 * ==============================================================================
 */

window.DF_API = (function () {
    'use strict';

    function getBaseUrl() {
        return (window.DEPA_SERVERS && window.DEPA_SERVERS.COLLEGE_A_BASE_URL) || 'http://localhost:8081';
    }

    function getCmBaseUrl() {
        return (window.DEPA_SERVERS && window.DEPA_SERVERS.CM_BASE_URL) || 'http://localhost:8095';
    }

    async function request(endpoint, options = {}) {
        const baseUrl = endpoint.startsWith('http') ? '' : getBaseUrl();
        const url = `${baseUrl}${endpoint}`;

        const headers = Object.assign({}, options.headers || {});

        const isExternal = endpoint.startsWith('http://') || endpoint.startsWith('https://');

        // Attach Authorization header if authenticated and not already provided (only for internal college endpoints)
        const token = window.DF_SESSION ? window.DF_SESSION.getToken() : null;
        if (token && !isExternal && !headers['Authorization'] && !headers['authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Default content type to application/json unless body is FormData
        if (!(options.body instanceof FormData) && !headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/json';
        }

        const fetchOptions = {
            method: options.method || 'GET',
            headers: headers,
            body: options.body
        };

        try {
            const res = await fetch(url, fetchOptions);

            let data = null;
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    data = await res.json();
                } catch (e) {
                    data = null;
                }
            } else {
                try {
                    data = await res.text();
                } catch (e) {
                    data = null;
                }
            }

            if (!res.ok) {
                if (res.status === 401 && !isExternal && window.DF_SESSION) {
                    console.warn('[DF_API] 401 Unauthorized encountered. Session cleared.');
                    window.DF_SESSION.clear();
                }
                const message = (data && typeof data === 'object' && (data.message || data.error))
                    ? (data.message || data.error)
                    : `Request failed with status ${res.status}`;
                const error = new Error(message);
                error.status = res.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            if (err.name === 'TypeError' && err.message.includes('fetch')) {
                throw new Error('College A backend service (:8081) is currently unreachable. Please check server status.');
            }
            throw err;
        }
    }

    // -------------------------------------------------------------------------
    // Authentication & Activation APIs
    // -------------------------------------------------------------------------
    const auth = {
        login: async (emailOrStudentId, password) => {
            const res = await request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: emailOrStudentId, password })
            });
            // The response contains accessToken, role, email, organizationCode, studentId, name
            return res;
        },

        validateToken: (token) => request('/api/auth/activation/validate', {
            method: 'POST',
            body: JSON.stringify({ token: token.trim() })
        }),

        setupPassword: (token, password) => request('/api/auth/activation/setup-password', {
            method: 'POST',
            body: JSON.stringify({ token: token.trim(), password })
        })
    };

    // -------------------------------------------------------------------------
    // College Administrator APIs (hasRole('ORG_ADMIN'))
    // -------------------------------------------------------------------------
    const admin = {
        getStudents: () => request('/api/students', { method: 'GET' }),

        getStudentDossier: (studentId) => request(`/api/students/${encodeURIComponent(studentId)}`, { method: 'GET' }),

        addStudent: (studentData) => request('/api/students', {
            method: 'POST',
            body: JSON.stringify(studentData)
        }),

        importCsv: (file, portalBaseUrl) => {
            const formData = new FormData();
            formData.append('file', file);
            if (portalBaseUrl) {
                formData.append('portalBaseUrl', portalBaseUrl);
            }
            return request('/api/students/import-csv', {
                method: 'POST',
                headers: {}, // Let browser set boundary automatically
                body: formData
            });
        },

        initiateBulkOnboard: () => request('/api/students/onboard', { method: 'POST' }),

        getEligibleStudents: () => request('/api/provider/onboarding/eligible-students', { method: 'GET' }),

        reissueActivation: (studentId) => request(`/api/students/${encodeURIComponent(studentId)}/reissue-activation`, { method: 'POST' }),

        updateStudentStatus: (studentId, status) => request(`/api/students/${encodeURIComponent(studentId)}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        })
    };

    // -------------------------------------------------------------------------
    // Consumer Inquirer APIs (hasRole('ORG_ADMIN'))
    // -------------------------------------------------------------------------
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
        }
    };

    // -------------------------------------------------------------------------
    // Student Self-Service APIs (hasRole('STUDENT'))
    // -------------------------------------------------------------------------
    const student = {
        getProfile: () => request('/api/student/profile', { method: 'GET' }),

        getPendingConsents: () => request('/api/student/consents/pending', { method: 'GET' }),

        getConsentHistory: () => request('/api/student/consents/history', { method: 'GET' }),

        approveConsent: (consentRequestId, approvedFields) => request(`/api/student/consents/${encodeURIComponent(consentRequestId)}/approve`, {
            method: 'POST',
            body: JSON.stringify({ approvedFields: approvedFields || [] })
        }),

        rejectConsent: (consentRequestId) => request(`/api/student/consents/${encodeURIComponent(consentRequestId)}/reject`, {
            method: 'POST'
        }),

        revokeConsent: (consentId) => request(`/api/student/consents/${encodeURIComponent(consentId)}/revoke`, {
            method: 'POST'
        })
    };

    // -------------------------------------------------------------------------
    // Health & Infrastructure Status
    // -------------------------------------------------------------------------
    const health = {
        checkCollegeA: () => request('/health', { method: 'GET' }),
        checkCm: async () => {
            try {
                return await request(`${getCmBaseUrl()}/health`, { method: 'GET' });
            } catch (e) {
                return await request(`${getCmBaseUrl()}/api/health`, { method: 'GET' });
            }
        }
    };

    // -------------------------------------------------------------------------
    // Canonical Academic Fields Metadata
    // -------------------------------------------------------------------------
    const canonicalFields = [
        {
            id: 'CGPA',
            name: 'Cumulative GPA (CGPA)',
            desc: 'Overall cumulative grade point average and academic standing',
            localField: 'cgpa',
            category: 'Academic Performance',
            icon: 'bi-mortarboard-fill'
        },
        {
            id: 'TRANSCRIPT',
            name: 'Academic Transcript',
            desc: 'Detailed semester-by-semester course marks and completed credits',
            localField: 'transcript',
            category: 'Course Records',
            icon: 'bi-file-earmark-text-fill'
        },
        {
            id: 'DEGREE_CERTIFICATE',
            name: 'Degree Certificate',
            desc: 'Official institutional graduation credential and branch award',
            localField: 'degree_certificate',
            category: 'Graduation Credentials',
            icon: 'bi-award-fill'
        },
        {
            id: 'ATTENDANCE',
            name: 'Attendance Record',
            desc: 'Official aggregate attendance percentage and qualification status',
            localField: 'attendance',
            category: 'Attendance',
            icon: 'bi-calendar-check-fill'
        },
        {
            id: 'CONDUCT_CERTIFICATE',
            name: 'Conduct Certificate',
            desc: 'Institutional disciplinary clearance and character certification',
            localField: 'conduct_certificate',
            category: 'Institutional Conduct',
            icon: 'bi-shield-check'
        },
        {
            id: 'ENROLLMENT_STATUS',
            name: 'Enrollment Status',
            desc: 'Current student registration standing on official college registry',
            localField: 'status',
            category: 'Registry Status',
            icon: 'bi-check-circle-fill'
        }
    ];

    return {
        getBaseUrl,
        getCmBaseUrl,
        request,
        auth,
        admin,
        consumer,
        student,
        health,
        canonicalFields
    };
})();


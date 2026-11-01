/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — SESSION MANAGEMENT MODULE
 * Manages authenticated user state in sessionStorage with strict isolation.
 * ==============================================================================
 */

window.DF_SESSION = (function () {
    'use strict';

    const TOKEN_KEY = 'cm_auth_token';
    const USER_KEY  = 'cm_auth_user';

    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY) || sessionStorage.getItem('cm_token') || null;
    }

    function getUser() {
        try {
            const raw = sessionStorage.getItem(USER_KEY) || sessionStorage.getItem('cm_user');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse stored session user:', e);
            return null;
        }
    }

    function setSession({ token, user }) {
        if (!token || !user) {
            throw new Error('setSession requires valid token and user object');
        }

        // Defensive normalization
        const normalizedUser = {
            userId: user.userId || '',
            name: user.name || '',
            email: user.email || '',
            organizationId: user.organizationId || null,
            role: String(user.role || '').toUpperCase()
        };

        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));

        // Legacy compatibility
        sessionStorage.setItem('cm_token', token);
        sessionStorage.setItem('cm_user', JSON.stringify(normalizedUser));
    }

    function clearSession() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        sessionStorage.removeItem('cm_token');
        sessionStorage.removeItem('cm_user');
    }

    function isAuthenticated() {
        const token = getToken();
        const user = getUser();
        return Boolean(token && user && user.role);
    }

    function getRole() {
        const user = getUser();
        return user ? user.role : null;
    }

    function isSuperAdmin() {
        const role = getRole();
        return role === 'SUPER_ADMIN' || role === 'ADMIN';
    }

    function isOrgAdmin() {
        const role = getRole();
        return role === 'ORG_ADMIN';
    }

    function getOrganizationId() {
        const user = getUser();
        return user ? user.organizationId : null;
    }

    function logout() {
        clearSession();
        if (window.DF_ROUTER) {
            window.DF_ROUTER.navigate('/login/super-admin');
        } else {
            window.location.hash = '#/login/super-admin';
        }
    }

    return {
        getToken,
        getUser,
        setSession,
        clearSession,
        isAuthenticated,
        getRole,
        isSuperAdmin,
        isOrgAdmin,
        getOrganizationId,
        logout
    };
})();


/**
 * ==============================================================================
 * DEPA COLLEGE B — INDEPENDENT SESSION MANAGER
 * Manages authenticated user session and JWT storage for College B Consumer Portal.
 * Strictly isolates storage keys from Consent Manager (depa_*) and College A (cola_*).
 * ==============================================================================
 */

window.DF_SESSION = (function () {
    'use strict';

    const TOKEN_KEY = 'colb_token';
    const USER_KEY = 'colb_user';

    function setSession(token, user) {
        if (!token) return;
        sessionStorage.setItem(TOKEN_KEY, token);
        if (user) {
            sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        }
    }

    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY);
    }

    function getUser() {
        const u = sessionStorage.getItem(USER_KEY);
        if (!u) return null;
        try {
            return JSON.parse(u);
        } catch (e) {
            return null;
        }
    }

    function isAuthenticated() {
        return Boolean(getToken());
    }

    function getRole() {
        const user = getUser();
        return user ? (user.role || '').toUpperCase() : '';
    }

    function hasRole(requiredRole) {
        if (!isAuthenticated()) return false;
        const current = getRole();
        if (Array.isArray(requiredRole)) {
            return requiredRole.map(r => r.toUpperCase()).includes(current);
        }
        return current === String(requiredRole).toUpperCase();
    }

    function clearSession() {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        try {
            sessionStorage.removeItem('colb_retrieved_records');
            localStorage.removeItem('colb_retrieved_records');
        } catch (e) {}
        if (window.DF_RECORDS_STORE && typeof window.DF_RECORDS_STORE.clear === 'function') {
            window.DF_RECORDS_STORE.clear();
        }
    }

    return {
        setSession,
        getToken,
        getUser,
        getRole,
        hasRole,
        isAuthenticated,
        clearSession
    };
})();


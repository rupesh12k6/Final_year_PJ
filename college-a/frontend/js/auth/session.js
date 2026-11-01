/**
 * ==============================================================================
 * DEPA COLLEGE A — SESSION MANAGEMENT MODULE
 * Manages authenticated user session in sessionStorage.
 * Strictly isolates College A JWT and prevents credential cross-contamination.
 * ==============================================================================
 */

window.DF_SESSION = (function () {
    'use strict';

    const STORAGE_KEY = 'depa_college_a_auth_session';

    function getSession() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('Failed to parse College A session storage:', e);
            return null;
        }
    }

    function setSession(sessionData) {
        if (!sessionData) {
            sessionStorage.removeItem(STORAGE_KEY);
            return;
        }
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
        } catch (e) {
            console.error('Failed to persist College A session:', e);
        }
    }

    function clear() {
        sessionStorage.removeItem(STORAGE_KEY);
    }

    function isAuthenticated() {
        const s = getSession();
        return Boolean(s && s.token);
    }

    function getToken() {
        const s = getSession();
        return s ? s.token : null;
    }

    function getUser() {
        const s = getSession();
        return s ? s.user : null;
    }

    function getRole() {
        const u = getUser();
        return u ? (u.role || null) : null;
    }

    function setUser(user, token) {
        if (!user || !token) {
            clear();
            return;
        }
        setSession({
            user: {
                email: user.email || '',
                name: user.name || '',
                role: user.role || 'STUDENT',
                organizationCode: user.organizationCode || 'COLLEGE_A',
                studentId: user.studentId || null
            },
            token: token,
            loginTime: new Date().toISOString()
        });
    }

    return {
        isAuthenticated,
        getToken,
        getUser,
        getRole,
        setUser,
        clear
    };
})();


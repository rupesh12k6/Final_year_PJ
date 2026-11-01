/**
 * ==============================================================================
 * DEPA COLLEGE A — SPA CLIENT ROUTER
 * Hash-based routing, layout transitions, and strict role-based access guards.
 * ==============================================================================
 */

window.DF_ROUTER = (function () {
    'use strict';

    let currentRoute = null;

    const routes = {
        // Public Auth & Activation
        '#/login/admin': {
            type: 'auth',
            title: 'College Admin Login',
            render: (c) => window.DF_PAGE_LOGIN_ADMIN && window.DF_PAGE_LOGIN_ADMIN.render(c)
        },
        '#/login/student': {
            type: 'auth',
            title: 'Student Portal Login',
            render: (c) => window.DF_PAGE_LOGIN_STUDENT && window.DF_PAGE_LOGIN_STUDENT.render(c)
        },
        '#/activate': {
            type: 'auth',
            title: 'Student Account Activation',
            render: (c) => window.DF_PAGE_STUDENT_ACTIVATE && window.DF_PAGE_STUDENT_ACTIVATE.render(c)
        },

        // College Admin Dashboard (ORG_ADMIN only)
        '#/admin/overview': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Registrar Overview & Metrics',
            navId: 'nav-admin-overview',
            render: (c) => window.DF_PAGE_ADMIN_OVERVIEW && window.DF_PAGE_ADMIN_OVERVIEW.render(c)
        },
        '#/admin/students': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Enrolled Student Registry',
            navId: 'nav-admin-students',
            render: (c) => window.DF_PAGE_ADMIN_STUDENTS && window.DF_PAGE_ADMIN_STUDENTS.render(c)
        },
        '#/admin/onboarding': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Student CSV Onboarding',
            navId: 'nav-admin-onboarding',
            render: (c) => window.DF_PAGE_ADMIN_ONBOARDING && window.DF_PAGE_ADMIN_ONBOARDING.render(c)
        },
        '#/admin/academic-data': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Academic Schema & Credentials',
            navId: 'nav-admin-academic',
            render: (c) => window.DF_PAGE_ADMIN_ACADEMIC && window.DF_PAGE_ADMIN_ACADEMIC.render(c)
        },
        '#/admin/academic': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Academic Schema & Credentials',
            navId: 'nav-admin-academic',
            render: (c) => window.DF_PAGE_ADMIN_ACADEMIC && window.DF_PAGE_ADMIN_ACADEMIC.render(c)
        },
        '#/admin/new-request': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Initiate Academic Request',
            navId: 'nav-admin-new-request',
            render: (c) => window.DF_PAGE_ADMIN_NEW_REQUEST && window.DF_PAGE_ADMIN_NEW_REQUEST.render(c)
        },
        '#/admin/requests': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Outbound Requests Tracker',
            navId: 'nav-admin-requests',
            render: (c) => window.DF_PAGE_ADMIN_REQUESTS && window.DF_PAGE_ADMIN_REQUESTS.render(c)
        },
        '#/admin/records': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Retrieved Academic Records',
            navId: 'nav-admin-records',
            render: (c) => window.DF_PAGE_ADMIN_RECORDS && window.DF_PAGE_ADMIN_RECORDS.render(c)
        },
        '#/admin/monitor': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Inbound P2P Monitor',
            navId: 'nav-admin-monitor',
            render: (c) => window.DF_PAGE_ADMIN_MONITOR && window.DF_PAGE_ADMIN_MONITOR.render(c)
        },
        '#/admin/audit': {
            type: 'app',
            role: 'ORG_ADMIN',
            title: 'Institutional Audit Activity',
            navId: 'nav-admin-audit',
            render: (c) => window.DF_PAGE_ADMIN_AUDIT && window.DF_PAGE_ADMIN_AUDIT.render(c)
        },

        // Student Dashboard (STUDENT only)
        '#/student/overview': {
            type: 'app',
            role: 'STUDENT',
            title: 'Student Portal Overview',
            navId: 'nav-student-overview',
            render: (c) => window.DF_PAGE_STUDENT_OVERVIEW && window.DF_PAGE_STUDENT_OVERVIEW.render(c)
        },
        '#/student/profile': {
            type: 'app',
            role: 'STUDENT',
            title: 'My Academic Dossier',
            navId: 'nav-student-profile',
            render: (c) => window.DF_PAGE_STUDENT_PROFILE && window.DF_PAGE_STUDENT_PROFILE.render(c)
        },
        '#/student/pending': {
            type: 'app',
            role: 'STUDENT',
            title: 'Consent Inquiries & Decisions',
            navId: 'nav-student-pending',
            render: (c) => window.DF_PAGE_STUDENT_PENDING && window.DF_PAGE_STUDENT_PENDING.render(c)
        },
        '#/student/history': {
            type: 'app',
            role: 'STUDENT',
            title: 'Consent History & Revocation',
            navId: 'nav-student-history',
            render: (c) => window.DF_PAGE_STUDENT_HISTORY && window.DF_PAGE_STUDENT_HISTORY.render(c)
        }
    };

    function navigate(hash) {
        window.location.hash = hash;
    }

    async function handleRouteChange() {
        let hash = window.location.hash || '';

        // Secure Activation Token extraction from URL fragment or query parameter
        let extractedToken = null;

        // 1. Extract from hash fragment (#token=xyz or #/activate#token=xyz or #activateToken=xyz)
        if (hash.includes('token=')) {
            const tokenMatch = hash.match(/token=([^&/#?]+)/);
            if (tokenMatch && tokenMatch[1]) {
                extractedToken = decodeURIComponent(tokenMatch[1].trim());
            }
        }

        // 2. Query param fallback (sanitize if user accidentally entered as query string)
        if (!extractedToken && window.location.search) {
            try {
                const searchParams = new URLSearchParams(window.location.search);
                const queryToken = searchParams.get('token');
                if (queryToken) {
                    extractedToken = queryToken.trim();
                }
            } catch (_) {}
        }

        // If an activation token was found, store transiently in-memory and IMMEDIATELY sanitize URL
        if (extractedToken) {
            window._pendingActivationToken = extractedToken;
            // Scrub token from address bar, history, and query parameters immediately
            window.history.replaceState(null, document.title, window.location.pathname + '#/activate');
            hash = '#/activate';
        }

        // Direct URL / pathname fallback if hash is missing
        if (!hash || hash === '#' || hash === '#/') {
            const p = window.location.pathname;
            if (p && p !== '/' && p !== '/index.html') {
                const candidate = '#' + (p.startsWith('/') ? p : '/' + p);
                if (routes[candidate]) {
                    hash = candidate;
                }
            }
        }

        // Default routing
        if (!hash || hash === '#' || hash === '#/') {
            if (window.DF_SESSION.isAuthenticated()) {
                const role = window.DF_SESSION.getRole();
                hash = (role === 'ORG_ADMIN') ? '#/admin/overview' : '#/student/overview';
            } else {
                hash = '#/login/student';
            }
            window.location.hash = hash;
            return;
        }

        const route = routes[hash];
        if (!route) {
            console.warn('Unknown route:', hash);
            if (window.DF_SESSION.isAuthenticated()) {
                const role = window.DF_SESSION.getRole();
                window.location.hash = (role === 'ORG_ADMIN') ? '#/admin/overview' : '#/student/overview';
            } else {
                window.location.hash = '#/login/student';
            }
            return;
        }

        const authContainer = document.getElementById('df-auth-container');
        const appLayout = document.getElementById('df-app-layout');
        const mainContent = document.getElementById('df-main-content');

        // Route Type: AUTH (public)
        if (route.type === 'auth') {
            if (authContainer) authContainer.style.display = 'block';
            if (appLayout) appLayout.style.display = 'none';

            currentRoute = hash;
            document.title = `${route.title} — College A University`;
            if (route.render && authContainer) {
                await route.render(authContainer);
            }
            return;
        }

        // Route Type: APP (protected)
        if (!window.DF_SESSION.isAuthenticated()) {
            console.warn('Protected route requires authentication. Redirecting to login.');
            window.location.hash = '#/login/student';
            return;
        }

        const userRole = window.DF_SESSION.getRole();

        // RBAC Enforcement
        if (route.role && route.role !== userRole) {
            console.warn(`RBAC violation: User role '${userRole}' cannot access route requiring '${route.role}'`);
            if (window.DF_UI && window.DF_UI.showToast) {
                window.DF_UI.showToast(`Access Denied: You do not have permissions for this section.`, 'error');
            }
            window.location.hash = (userRole === 'ORG_ADMIN') ? '#/admin/overview' : '#/student/overview';
            return;
        }

        if (authContainer) authContainer.style.display = 'none';
        if (appLayout) appLayout.style.display = 'flex';

        currentRoute = hash;
        document.title = `${route.title} — College A University`;

        // Update Topbar and Sidebar Navigation State
        if (window.DF_APP) {
            window.DF_APP.updateNav(hash, route);
        }

        if (route.render && mainContent) {
            try {
                await route.render(mainContent);
            } catch (renderErr) {
                console.error(`[Router] Failed to render route ${hash}:`, renderErr);
                if (window.DF_UI && window.DF_UI.renderErrorState) {
                    mainContent.innerHTML = window.DF_UI.renderErrorState({
                        title: 'Page Render Failure',
                        message: `Failed to load ${route.title}: ${renderErr.message}`,
                        onRetry: 'window.location.reload()'
                    });
                }
            }
        }
    }

    function init() {
        window.addEventListener('hashchange', handleRouteChange);
        handleRouteChange();
    }

    return {
        init,
        navigate,
        getCurrentRoute: () => currentRoute
    };
})();


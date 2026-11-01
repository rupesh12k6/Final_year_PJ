/**
 * ==============================================================================
 * DEPA COLLEGE B — CLIENT ROUTER & RBAC ROUTE GUARDS
 * Coordinates hash-based view routing, authentication guards, and address bar hygiene.
 * ==============================================================================
 */

window.DF_ROUTER = (function () {
    'use strict';

    const routes = {
        '#/login-admin': { render: () => window.DF_PAGE_LOGIN_ADMIN, public: true, layout: 'auth' },
        '#/login-student': { render: () => window.DF_PAGE_LOGIN_STUDENT, public: true, layout: 'auth' },
        '#/activate': { render: () => window.DF_PAGE_STUDENT_ACTIVATE, public: true, layout: 'auth' },

        '#/admin/overview': { render: () => window.DF_PAGE_ADMIN_OVERVIEW, role: 'ORG_ADMIN', layout: 'admin' },
        '#/admin/new-request': { render: () => window.DF_PAGE_ADMIN_NEW_REQUEST, role: 'ORG_ADMIN', layout: 'admin' },
        '#/admin/requests': { render: () => window.DF_PAGE_ADMIN_REQUESTS, role: 'ORG_ADMIN', layout: 'admin' },
        '#/admin/records': { render: () => window.DF_PAGE_ADMIN_RECORDS, role: 'ORG_ADMIN', layout: 'admin' },
        '#/admin/students': { render: () => window.DF_PAGE_ADMIN_STUDENTS, role: 'ORG_ADMIN', layout: 'admin' },
        '#/admin/onboarding': { render: () => window.DF_PAGE_ADMIN_ONBOARDING, role: 'ORG_ADMIN', layout: 'admin' },
        '#/admin/profile': { render: () => window.DF_PAGE_ADMIN_PROFILE, role: 'ORG_ADMIN', layout: 'admin' },
        '#/admin/audit': { render: () => window.DF_PAGE_ADMIN_AUDIT, role: 'ORG_ADMIN', layout: 'admin' },

        '#/student/profile': { render: () => window.DF_PAGE_STUDENT_PROFILE, role: 'STUDENT', layout: 'student' }
    };

    function init() {
        window.addEventListener('hashchange', handleRoute);
        // Initial route dispatch
        handleRoute();
    }

    function handleRoute() {
        let hash = window.location.hash || '';

        // -------------------------------------------------------------
        // Security: Intercept activation token in URL fragment (#/activate#token=...)
        // Immediately strip token from address bar via history.replaceState
        // -------------------------------------------------------------
        let extractedToken = null;
        if (hash.includes('#token=')) {
            const tokenMatch = hash.match(/#token=([^&]+)/);
            if (tokenMatch && tokenMatch[1]) {
                extractedToken = decodeURIComponent(tokenMatch[1]);
            }
        } else if (window.location.search.includes('token=')) {
            // Fallback for legacy queries: extract and scrub
            const params = new URLSearchParams(window.location.search);
            extractedToken = params.get('token');
        }

        if (extractedToken) {
            window._pendingActivationToken = extractedToken;
            // Scrub token from address bar, history, and query parameters immediately
            window.history.replaceState(null, document.title, window.location.pathname + '#/activate');
            hash = '#/activate';
        }

        if (!hash || hash === '#' || hash === '#/') {
            if (window.DF_SESSION.isAuthenticated()) {
                const role = window.DF_SESSION.getRole();
                hash = (role === 'STUDENT') ? '#/student/profile' : '#/admin/overview';
            } else {
                hash = '#/login-admin';
            }
            window.location.hash = hash;
            return;
        }

        const route = routes[hash];

        // Unknown route fallback
        if (!route) {
            if (window.DF_SESSION.isAuthenticated()) {
                window.location.hash = (window.DF_SESSION.getRole() === 'STUDENT') ? '#/student/profile' : '#/admin/overview';
            } else {
                window.location.hash = '#/login-admin';
            }
            return;
        }

        // RBAC and Authentication Guards
        if (!route.public) {
            if (!window.DF_SESSION.isAuthenticated()) {
                window.location.hash = '#/login-admin';
                return;
            }

            if (route.role && !window.DF_SESSION.hasRole(route.role)) {
                // User has wrong role for this view
                const userRole = window.DF_SESSION.getRole();
                if (userRole === 'STUDENT') {
                    window.location.hash = '#/student/profile';
                } else {
                    window.location.hash = '#/admin/overview';
                }
                return;
            }
        } else {
            // If already authenticated and trying to visit login pages
            if (window.DF_SESSION.isAuthenticated() && (hash === '#/login-admin' || hash === '#/login-student')) {
                const userRole = window.DF_SESSION.getRole();
                window.location.hash = (userRole === 'STUDENT') ? '#/student/profile' : '#/admin/overview';
                return;
            }
        }

        // Update layout shell visibility
        updateLayoutShell(route.layout);

        // Render page module
        const pageModule = route.render();
        const contentContainer = getContentContainer(route.layout);

        if (pageModule && typeof pageModule.render === 'function') {
            pageModule.render(contentContainer);
        }

        // Update active navigation items
        updateNavState(hash);
    }

    function updateLayoutShell(layoutType) {
        const authContainer = document.getElementById('auth-layout-root');
        const appShell = document.getElementById('app-shell-root');
        const adminNav = document.getElementById('nav-group-admin');
        const studentNav = document.getElementById('nav-group-student');

        if (layoutType === 'auth') {
            if (authContainer) authContainer.classList.remove('d-none');
            if (appShell) appShell.classList.add('d-none');
        } else {
            if (authContainer) authContainer.classList.add('d-none');
            if (appShell) appShell.classList.remove('d-none');

            if (layoutType === 'admin') {
                if (adminNav) adminNav.classList.remove('d-none');
                if (studentNav) studentNav.classList.add('d-none');
            } else if (layoutType === 'student') {
                if (adminNav) adminNav.classList.add('d-none');
                if (studentNav) studentNav.classList.remove('d-none');
            }

            // Sync user details to header and sidebar
            if (window.DF_APP && typeof window.DF_APP.syncUserUI === 'function') {
                window.DF_APP.syncUserUI();
            }
        }
    }

    function getContentContainer(layoutType) {
        if (layoutType === 'auth') {
            return document.getElementById('auth-layout-root');
        }
        return document.getElementById('page-content-area');
    }

    function updateNavState(hash) {
        const navLinks = document.querySelectorAll('.sidebar-nav-item');
        navLinks.forEach(link => {
            const targetHash = link.getAttribute('data-route') || link.getAttribute('href');
            if (targetHash === hash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    return {
        init,
        handleRoute
    };
})();


/**
 * ==============================================================================
 * DEPA CONSENT MANAGER — CLIENT-SIDE ROUTER & RBAC ROUTE GUARD
 * Routes authenticated Super Admin and Organization Admin views to dedicated
 * DriveFlow page modules with strict multi-tenant isolation.
 * ==============================================================================
 */

window.DF_ROUTER = (function () {
    'use strict';

    function getHashPath() {
        const hash = window.location.hash || '';
        if (!hash || hash === '#' || hash === '#/') {
            const p = window.location.pathname;
            if (p && p !== '/' && p !== '/index.html') {
                return p.startsWith('/') ? p : '/' + p;
            }
            return '/';
        }
        // Extract clean path excluding query parameters
        const clean = hash.replace(/^#/, '').split('?')[0];
        return clean.startsWith('/') ? clean : '/' + clean;
    }

    function navigate(path) {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        window.location.hash = '#' + cleanPath;
    }

    function updateSidebarAndBreadcrumb(activeRoute, title) {
        const isOrgAdmin = window.DF_SESSION.isOrgAdmin();
        const user = window.DF_SESSION.getUser() || {};
        const orgId = user.organizationId || 'PARTICIPANT';

        // Update sidebar links
        document.querySelectorAll('.df-nav-link').forEach(link => {
            const href = link.getAttribute('href') || '';
            const routeKey = href.replace(/^#/, '').split('?')[0];
            if (routeKey === activeRoute || (activeRoute === '/dashboard' && routeKey === '/dashboard') || (activeRoute === '/org-dashboard' && routeKey === '/org-dashboard')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Update topbar breadcrumbs
        const breadcrumbEl = document.getElementById('df-topbar-breadcrumb');
        if (breadcrumbEl) {
            if (isOrgAdmin) {
                breadcrumbEl.innerHTML = `
                    <span>DEPA PARTICIPANT NODE</span>
                    <i class="bi bi-chevron-right text-muted" style="font-size: 0.65rem;"></i>
                    <span class="font-monospace text-primary">${window.DF_UI ? window.DF_UI.escapeHtml(orgId) : orgId}</span>
                    <i class="bi bi-chevron-right text-muted" style="font-size: 0.65rem;"></i>
                    <span class="text-dark fw-bold">${title}</span>
                `;
            } else {
                breadcrumbEl.innerHTML = `
                    <span>DEPA REGULATORY ROOT</span>
                    <i class="bi bi-chevron-right text-muted" style="font-size: 0.65rem;"></i>
                    <span>SUPER ADMIN</span>
                    <i class="bi bi-chevron-right text-muted" style="font-size: 0.65rem;"></i>
                    <span class="text-dark fw-bold">${title}</span>
                `;
            }
        }
    }

    function resolveRoute() {
        const path = getHashPath();
        const authContainer = document.getElementById('auth-container');
        const dashboardContainer = document.getElementById('dashboard-container');
        const mainView = document.getElementById('df-main-view');

        const isAuthenticated = window.DF_SESSION.isAuthenticated();
        const isSuperAdmin = window.DF_SESSION.isSuperAdmin();
        const isOrgAdmin = window.DF_SESSION.isOrgAdmin();

        // ---------------------------------------------------------------------
        // 1. Unauthenticated Users -> Direct to Login Pages
        // ---------------------------------------------------------------------
        if (!isAuthenticated) {
            if (authContainer) authContainer.style.display = 'block';
            if (dashboardContainer) dashboardContainer.style.display = 'none';

            if (path === '/login/org-admin') {
                if (window.DF_PAGE_LOGIN_ORG_ADMIN) {
                    window.DF_PAGE_LOGIN_ORG_ADMIN.render(authContainer);
                }
            } else {
                if (path !== '/login/super-admin') {
                    navigate('/login/super-admin');
                    return;
                }
                if (window.DF_PAGE_LOGIN_SUPER_ADMIN) {
                    window.DF_PAGE_LOGIN_SUPER_ADMIN.render(authContainer);
                }
            }
            return;
        }

        // ---------------------------------------------------------------------
        // 2. Authenticated Users — Handle Login Route Redirection
        // ---------------------------------------------------------------------
        if (path === '/' || path === '/login/super-admin' || path === '/login/org-admin') {
            if (isSuperAdmin) {
                navigate('/dashboard');
                return;
            } else if (isOrgAdmin) {
                navigate('/org-dashboard');
                return;
            } else {
                window.DF_SESSION.clearSession();
                navigate('/login/super-admin');
                return;
            }
        }

        // ---------------------------------------------------------------------
        // 3. Authenticated Users — Role-Based Access Guards
        // ---------------------------------------------------------------------
        const superAdminRoutes = ['/dashboard', '/organizations', '/orgs', '/administrators', '/admins', '/audit-logs', '/audit', '/trust-overview', '/trust', '/keys'];
        const orgAdminRoutes = ['/org-dashboard', '/org-profile', '/org-users', '/org-staff', '/org-consents', '/org-audit', '/org-keys'];

        // Guard: Org Admin attempting to access Super Admin route
        if (isOrgAdmin && superAdminRoutes.includes(path)) {
            console.warn(`[RBAC] Access Denied: Org Admin attempted to access Super Admin route: ${path}`);
            if (window.DF_UI && window.DF_UI.showToast) {
                window.DF_UI.showToast('Access Denied: Regulatory Super Admin privileges required.', 'error');
            }
            navigate('/org-dashboard');
            return;
        }

        // Guard: Super Admin attempting to access Org Admin route
        if (isSuperAdmin && orgAdminRoutes.includes(path)) {
            console.warn(`[RBAC] Access Denied: Super Admin attempted to access Org Admin route: ${path}`);
            if (window.DF_UI && window.DF_UI.showToast) {
                window.DF_UI.showToast('Access Denied: Organization Admin views are restricted to participant node administrators.', 'error');
            }
            navigate('/dashboard');
            return;
        }

        // ---------------------------------------------------------------------
        // 4. Render Dashboard Shell & Route Views
        // ---------------------------------------------------------------------
        if (authContainer) authContainer.style.display = 'none';
        if (dashboardContainer) dashboardContainer.style.display = 'flex';

        // Synchronize user profile and sidebar navigation
        if (window.DF_APP && window.DF_APP.syncSessionDisplay) {
            window.DF_APP.syncSessionDisplay();
        }

        // Target container for page modules
        const renderTarget = mainView || document.getElementById('df-main-view');

        try {
            // Route matching for Super Admin
            if (isSuperAdmin) {
                switch (path) {
                    case '/dashboard':
                        updateSidebarAndBreadcrumb('/dashboard', 'Federation Overview');
                        if (window.DF_PAGE_SA_OVERVIEW) {
                            window.DF_PAGE_SA_OVERVIEW.render(renderTarget);
                        }
                        break;

                    case '/organizations':
                    case '/orgs':
                        updateSidebarAndBreadcrumb('/organizations', 'Institutional Registry');
                        if (window.DF_PAGE_SA_ORGANIZATIONS) {
                            window.DF_PAGE_SA_ORGANIZATIONS.render(renderTarget);
                        }
                        break;

                    case '/administrators':
                    case '/admins':
                        updateSidebarAndBreadcrumb('/administrators', 'Central Authority Officers');
                        if (window.DF_PAGE_SA_ADMINS) {
                            window.DF_PAGE_SA_ADMINS.render(renderTarget);
                        }
                        break;

                    case '/audit-logs':
                    case '/audit':
                        updateSidebarAndBreadcrumb('/audit-logs', 'Global Security Audit Trail');
                        if (window.DF_PAGE_SA_AUDIT) {
                            window.DF_PAGE_SA_AUDIT.render(renderTarget);
                        }
                        break;

                    case '/trust-overview':
                    case '/trust':
                    case '/keys':
                        updateSidebarAndBreadcrumb('/trust-overview', 'Trust & Cryptographic Infrastructure');
                        if (window.DF_PAGE_SA_TRUST) {
                            window.DF_PAGE_SA_TRUST.render(renderTarget);
                        }
                        break;

                    default:
                        console.log(`[Router] Unmapped Super Admin route: ${path}, redirecting to /dashboard`);
                        navigate('/dashboard');
                        break;
                }
            } else if (isOrgAdmin) {
                switch (path) {
                    case '/org-dashboard':
                        updateSidebarAndBreadcrumb('/org-dashboard', 'Institutional Overview');
                        if (window.DF_PAGE_OA_OVERVIEW) {
                            window.DF_PAGE_OA_OVERVIEW.render(renderTarget);
                        }
                        break;

                    case '/org-profile':
                        updateSidebarAndBreadcrumb('/org-profile', 'Institution Profile');
                        if (window.DF_PAGE_OA_PROFILE) {
                            window.DF_PAGE_OA_PROFILE.render(renderTarget);
                        }
                        break;

                    case '/org-users':
                    case '/org-staff':
                        updateSidebarAndBreadcrumb('/org-users', 'Staff & Student Roster');
                        if (window.DF_PAGE_OA_STAFF) {
                            window.DF_PAGE_OA_STAFF.render(renderTarget);
                        }
                        break;

                    case '/org-consents':
                        updateSidebarAndBreadcrumb('/org-consents', 'Data Exchange & Consents');
                        if (window.DF_PAGE_OA_CONSENTS) {
                            window.DF_PAGE_OA_CONSENTS.render(renderTarget);
                        }
                        break;

                    case '/org-audit':
                        updateSidebarAndBreadcrumb('/org-audit', 'Institutional Audit Trail');
                        if (window.DF_PAGE_OA_AUDIT) {
                            window.DF_PAGE_OA_AUDIT.render(renderTarget);
                        }
                        break;

                    case '/org-keys':
                        updateSidebarAndBreadcrumb('/org-keys', 'Cryptographic Infrastructure');
                        if (window.DF_PAGE_OA_KEYS) {
                            window.DF_PAGE_OA_KEYS.render(renderTarget);
                        }
                        break;

                    default:
                        console.log(`[Router] Unmapped Org Admin route: ${path}, redirecting to /org-dashboard`);
                        navigate('/org-dashboard');
                        break;
                }
            }
        } catch (routeErr) {
            console.error(`[Router] Failed to render view for ${path}:`, routeErr);
            if (window.DF_UI && window.DF_UI.renderErrorState && renderTarget) {
                renderTarget.innerHTML = window.DF_UI.renderErrorState({
                    title: 'View Load Failure',
                    message: `An unexpected error occurred loading this page: ${routeErr.message}`,
                    onRetry: 'window.location.reload()'
                });
            }
        }
    }

    function init() {
        window.addEventListener('hashchange', resolveRoute);
        resolveRoute();
    }

    return {
        getHashPath,
        navigate,
        resolveRoute,
        init
    };
})();

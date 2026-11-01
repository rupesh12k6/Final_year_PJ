/**
 * ==============================================================================
 * DEPA COLLEGE B — MAIN APPLICATION CONTROLLER
 * Orchestrates sidebar, topbar, mobile drawer, active navigation state, and init.
 * ==============================================================================
 */

window.DF_APP = (function () {
    'use strict';

    function init() {
        console.log('College B Application Controller Initializing...');

        // Setup mobile sidebar toggle
        const toggleBtn = document.getElementById('df-sidebar-toggle');
        const sidebar = document.getElementById('df-sidebar');
        const backdrop = document.getElementById('df-sidebar-backdrop');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('show');
                if (backdrop) backdrop.classList.toggle('show');
            });
        }

        if (backdrop && sidebar) {
            backdrop.addEventListener('click', () => {
                sidebar.classList.remove('show');
                backdrop.classList.remove('show');
            });
        }

        // Initialize Router
        if (window.DF_ROUTER) {
            window.DF_ROUTER.init();
        }

        // Periodic health check
        checkNodeConnectivity();
        setInterval(checkNodeConnectivity, 45000);
    }

    async function checkNodeConnectivity() {
        const dotColB = document.getElementById('dot-col-b');
        const dotCm = document.getElementById('dot-cm');

        if (dotColB) {
            try {
                const res = await window.DF_API.cm.checkHealth();
                dotColB.className = 'health-dot online';
                dotColB.parentElement.title = `College B: UP (${res.status || 'Online'})`;
            } catch (e) {
                dotColB.className = 'health-dot offline';
                dotColB.parentElement.title = 'College B: Offline';
            }
        }

        if (dotCm) {
            try {
                const res = await window.DF_API.cm.getOrganizations();
                dotCm.className = 'health-dot online';
                dotCm.parentElement.title = 'Consent Manager: UP';
            } catch (e) {
                dotCm.className = 'health-dot offline';
                dotCm.parentElement.title = 'Consent Manager: Offline';
            }
        }
    }

    function syncUserUI() {
        const user = (window.DF_SESSION && window.DF_SESSION.getUser()) || {};
        const role = user.role || 'ORG_ADMIN';

        const avatarEl = document.getElementById('df-user-avatar');
        const nameEl = document.getElementById('df-user-name');
        const roleEl = document.getElementById('df-user-role');
        const breadcrumbEl = document.getElementById('df-topbar-breadcrumb');
        const emailEl = document.getElementById('topbar-user-email');
        const dropdownDisplayEl = document.getElementById('dropdown-user-display');

        const displayName = user.name || (role === 'ORG_ADMIN' ? 'Consumer Officer' : 'Enrolled Student');
        const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CB';

        if (avatarEl) avatarEl.textContent = initials;
        if (nameEl) nameEl.textContent = displayName;
        if (roleEl) roleEl.textContent = role === 'ORG_ADMIN' ? 'Consumer Inquirer Admin' : 'Student (Data Principal)';
        if (emailEl) emailEl.textContent = user.email || displayName;
        if (dropdownDisplayEl) dropdownDisplayEl.textContent = `${displayName} (${role})`;

        // Breadcrumb mapping
        if (breadcrumbEl) {
            const hash = window.location.hash || '';
            const breadcrumbMap = {
                '#/admin/overview': 'Consumer Overview',
                '#/admin/new-request': 'Initiate Request',
                '#/admin/requests': 'Track Requests',
                '#/admin/records': 'Retrieved Credentials',
                '#/admin/students': 'Student Registry',
                '#/admin/onboarding': 'Batch CSV Onboarding',
                '#/admin/profile': 'Institution & Keys',
                '#/admin/audit': 'Audit Trail',
                '#/student/profile': 'My Academic Dossier'
            };
            breadcrumbEl.textContent = breadcrumbMap[hash] || 'College B University Portal';
        }

        // Close mobile drawer on route sync
        const sidebar = document.getElementById('df-sidebar');
        const backdrop = document.getElementById('df-sidebar-backdrop');
        if (sidebar) sidebar.classList.remove('show');
        if (backdrop) backdrop.classList.remove('show');
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        init,
        syncUserUI,
        checkNodeConnectivity
    };
})();

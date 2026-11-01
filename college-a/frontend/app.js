/**
 * ==============================================================================
 * DEPA COLLEGE A — MAIN APPLICATION CONTROLLER
 * Orchestrates sidebar, topbar, mobile drawer, active navigation state, and init.
 * ==============================================================================
 */

window.DF_APP = (function () {
    'use strict';

    function init() {
        console.log('College A Application Controller Initializing...');

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
        const dotColA = document.getElementById('dot-col-a');
        const dotCm = document.getElementById('dot-cm');

        if (dotColA) {
            try {
                const res = await window.DF_API.health.checkCollegeA();
                dotColA.className = 'health-dot online';
                dotColA.parentElement.title = `College A: UP (${res.collegeName || 'Online'})`;
            } catch (e) {
                dotColA.className = 'health-dot offline';
                dotColA.parentElement.title = 'College A: Offline';
            }
        }

        if (dotCm) {
            try {
                const res = await window.DF_API.health.checkCm();
                dotCm.className = 'health-dot online';
                dotCm.parentElement.title = 'Consent Manager: UP';
            } catch (e) {
                dotCm.className = 'health-dot offline';
                dotCm.parentElement.title = 'Consent Manager: Offline';
            }
        }
    }

    function updateNav(hash, route) {
        const user = window.DF_SESSION.getUser() || {};
        const role = user.role || 'STUDENT';

        // Update User info in Topbar and Sidebar
        const avatarEl = document.getElementById('df-user-avatar');
        const nameEl = document.getElementById('df-user-name');
        const roleEl = document.getElementById('df-user-role');
        const breadcrumbEl = document.getElementById('df-topbar-breadcrumb');

        const displayName = user.name || (role === 'ORG_ADMIN' ? 'College Administrator' : 'Enrolled Student');
        const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CA';

        if (avatarEl) avatarEl.textContent = initials;
        if (nameEl) nameEl.textContent = displayName;
        if (roleEl) roleEl.textContent = role === 'ORG_ADMIN' ? 'College Registrar Admin' : 'Student (Data Principal)';
        if (breadcrumbEl && route) breadcrumbEl.textContent = route.title || 'College A University';

        // Render Sidebar Navigation based on Role
        const navContainer = document.getElementById('df-sidebar-nav');
        if (navContainer) {
            navContainer.innerHTML = (role === 'ORG_ADMIN')
                ? renderAdminSidebarNav(hash)
                : renderStudentSidebarNav(hash);
        }

        // Update pending badge for student if applicable
        if (role === 'STUDENT') {
            window.DF_API.student.getPendingConsents().then(list => {
                const count = Array.isArray(list) ? list.length : 0;
                const badge = document.getElementById('badge-student-pending-count');
                if (badge) {
                    if (count > 0) {
                        badge.textContent = count;
                        badge.style.display = 'inline-block';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }).catch(() => {});
        }

        // Close mobile drawer on route transition
        const sidebar = document.getElementById('df-sidebar');
        const backdrop = document.getElementById('df-sidebar-backdrop');
        if (sidebar) sidebar.classList.remove('show');
        if (backdrop) backdrop.classList.remove('show');
    }

    function renderAdminSidebarNav(activeHash) {
        return `
            <div class="df-nav-section-title">Registrar Management</div>

            <a href="#/admin/overview" class="df-sidebar-nav-item ${activeHash === '#/admin/overview' ? 'active' : ''}">
                <i class="bi bi-speedometer2"></i>
                <span>Registrar Overview</span>
            </a>

            <a href="#/admin/students" class="df-sidebar-nav-item ${activeHash === '#/admin/students' ? 'active' : ''}">
                <i class="bi bi-people-fill"></i>
                <span>Student Registry</span>
            </a>

            <a href="#/admin/onboarding" class="df-sidebar-nav-item ${activeHash === '#/admin/onboarding' ? 'active' : ''}">
                <i class="bi bi-file-earmark-spreadsheet-fill"></i>
                <span>CSV Bulk Onboarding</span>
            </a>

            <a href="#/admin/academic-data" class="df-sidebar-nav-item ${activeHash === '#/admin/academic-data' ? 'active' : ''}">
                <i class="bi bi-diagram-3-fill"></i>
                <span>Academic Schema</span>
            </a>

            <div class="df-nav-section-title mt-3">Inquirer Operations (Consumer)</div>

            <a href="#/admin/new-request" class="df-sidebar-nav-item ${activeHash === '#/admin/new-request' ? 'active' : ''}">
                <i class="bi bi-send-plus-fill"></i>
                <span>Initiate Data Request</span>
            </a>

            <a href="#/admin/requests" class="df-sidebar-nav-item ${activeHash === '#/admin/requests' ? 'active' : ''}">
                <i class="bi bi-send-check"></i>
                <span>Outbound Requests</span>
            </a>

            <a href="#/admin/records" class="df-sidebar-nav-item ${activeHash === '#/admin/records' ? 'active' : ''}">
                <i class="bi bi-archive-fill"></i>
                <span>Retrieved Records</span>
            </a>

            <div class="df-nav-section-title mt-3">Node Security & P2P</div>

            <a href="#/admin/monitor" class="df-sidebar-nav-item ${activeHash === '#/admin/monitor' ? 'active' : ''}">
                <i class="bi bi-broadcast"></i>
                <span>Inbound P2P Monitor</span>
            </a>

            <a href="#/admin/audit" class="df-sidebar-nav-item ${activeHash === '#/admin/audit' ? 'active' : ''}">
                <i class="bi bi-shield-check"></i>
                <span>Audit Activity</span>
            </a>
        `;
    }

    function renderStudentSidebarNav(activeHash) {
        return `
            <div class="df-nav-section-title">Student Self-Service</div>

            <a href="#/student/overview" class="df-sidebar-nav-item ${activeHash === '#/student/overview' ? 'active' : ''}">
                <i class="bi bi-speedometer2"></i>
                <span>Student Overview</span>
            </a>

            <a href="#/student/profile" class="df-sidebar-nav-item ${activeHash === '#/student/profile' ? 'active' : ''}">
                <i class="bi bi-mortarboard-fill"></i>
                <span>My Academic Dossier</span>
            </a>

            <a href="#/student/pending" class="df-sidebar-nav-item ${activeHash === '#/student/pending' ? 'active' : ''}">
                <i class="bi bi-inbox-fill"></i>
                <span>Consent Inbox</span>
                <span class="badge bg-warning text-dark ms-auto font-monospace rounded-pill" id="badge-student-pending-count" style="display:none; font-size: 0.72rem;">0</span>
            </a>

            <a href="#/student/history" class="df-sidebar-nav-item ${activeHash === '#/student/history' ? 'active' : ''}">
                <i class="bi bi-clock-history"></i>
                <span>Consent History & Revoke</span>
            </a>
        `;
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        init,
        updateNav,
        checkNodeConnectivity
    };
})();

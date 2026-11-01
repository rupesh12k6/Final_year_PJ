/**
 * ==============================================================================
 * DEPA COLLEGE A — AUTHENTICATION CONTROLLER
 * Handles login, logout, persona validation, and student token activation.
 * ==============================================================================
 */

window.DF_AUTH = (function () {
    'use strict';

    async function loginAdmin(email, password) {
        if (!email || !password) {
            throw new Error('Please enter both administrator email and password.');
        }

        const res = await window.DF_API.auth.login(email.trim(), password);

        // Verify that the backend returned ORG_ADMIN
        if (res.role !== 'ORG_ADMIN') {
            throw new Error('Access Denied: The provided credentials belong to a Student account. Please use the Student Portal Login.');
        }

        window.DF_SESSION.setUser({
            email: res.email,
            name: res.name || 'College A Administrator',
            role: 'ORG_ADMIN',
            organizationCode: res.organizationCode || 'COLLEGE_A',
            studentId: null
        }, res.accessToken);

        if (window.DF_ROUTER) {
            window.DF_ROUTER.navigate('#/admin/overview');
        }
        return res;
    }

    async function loginStudent(emailOrStudentId, password) {
        if (!emailOrStudentId || !password) {
            throw new Error('Please enter your Student ID or official college email, and password.');
        }

        const res = await window.DF_API.auth.login(emailOrStudentId.trim(), password);

        // Verify that the backend returned STUDENT
        if (res.role !== 'STUDENT') {
            throw new Error('Access Denied: The provided credentials belong to an Administrator account. Please use the College Admin Login.');
        }

        window.DF_SESSION.setUser({
            email: res.email,
            name: res.name || 'Enrolled Student',
            role: 'STUDENT',
            organizationCode: res.organizationCode || 'COLLEGE_A',
            studentId: res.studentId
        }, res.accessToken);

        if (window.DF_ROUTER) {
            window.DF_ROUTER.navigate('#/student/overview');
        }
        return res;
    }

    function logout() {
        const user = window.DF_SESSION.getUser();
        const role = user ? user.role : 'STUDENT';
        window.DF_SESSION.clear();

        if (window.DF_ROUTER) {
            if (role === 'ORG_ADMIN') {
                window.DF_ROUTER.navigate('#/login/admin');
            } else {
                window.DF_ROUTER.navigate('#/login/student');
            }
        } else {
            window.location.hash = '#/login/student';
            window.location.reload();
        }
    }

    return {
        loginAdmin,
        loginStudent,
        logout
    };
})();


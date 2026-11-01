/**
 * ==============================================================================
 * DEPA COLLEGE B — AUTHENTICATION CONTROLLER
 * Coordinates login form submissions, credentials verification, and session persistence.
 * ==============================================================================
 */

window.DF_AUTH = (function () {
    'use strict';

    async function loginAdmin(email, password) {
        if (!email || !password) {
            throw new Error('Please enter both institutional email and password.');
        }

        const data = await window.DF_API.auth.login(email, password);
        const role = (data.role || '').toUpperCase();

        if (role !== 'ORG_ADMIN' && role !== 'ADMIN') {
            throw new Error('Access Denied: This account is not authorized as a Consumer Inquirer Officer. Please use the Student Portal.');
        }

        const user = {
            id: data.userId || data.adminId,
            name: data.name || 'Consumer Officer',
            email: data.email || email,
            role: 'ORG_ADMIN',
            organizationCode: data.organizationCode || 'COLLEGE_B'
        };

        window.DF_SESSION.setSession(data.accessToken || data.token, user);
        return user;
    }

    async function loginStudent(emailOrId, password) {
        if (!emailOrId || !password) {
            throw new Error('Please enter your student email/ID and password.');
        }

        const data = await window.DF_API.auth.login(emailOrId, password);
        const role = (data.role || '').toUpperCase();

        if (role !== 'STUDENT') {
            throw new Error('Access Denied: Administrative accounts cannot sign in through the Student Portal.');
        }

        const user = {
            id: data.studentId || data.userId,
            studentId: data.studentId || data.userId,
            name: data.name || 'Student',
            email: data.email || emailOrId,
            role: 'STUDENT',
            organizationCode: data.organizationCode || 'COLLEGE_B'
        };

        window.DF_SESSION.setSession(data.accessToken || data.token, user);
        return user;
    }

    function logout() {
        const role = window.DF_SESSION.getRole();
        window.DF_SESSION.clearSession();
        if (role === 'STUDENT') {
            window.location.hash = '#/login-student';
        } else {
            window.location.hash = '#/login-admin';
        }
    }

    return {
        loginAdmin,
        loginStudent,
        logout
    };
})();


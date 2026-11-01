/**
 * DEPA Network Configuration for Distributed Multi-Server Deployment.
 * If deployed on separate servers:
 * - Server 1: Consent Manager (e.g. http://192.168.1.10:8095 or http://cm.depa.edu)
 * - Server 2: College A (e.g. http://192.168.1.11:8081 or http://collegea.edu)
 * - Server 3: College B (e.g. http://192.168.1.12:8082 or http://collegeb.edu)
 *
 * This configuration dynamically auto-detects current host port or reads from localStorage overrides.
 */

(function() {
    const port = window.location.port;
    const hostname = window.location.hostname;
    const origin = window.location.origin;

    // Detect if current webpage is hosted on CM or College server
    const isCmHost = port === '8095' || port === '3001' || hostname.includes('cm') || window.location.pathname.includes('/cm');
    const isColAHost = port === '8081' || port === '3002' || hostname.includes('collegea') || hostname.includes('college-a');
    const isColBHost = port === '8082' || port === '3003' || hostname.includes('collegeb') || hostname.includes('college-b');

    // Default to origin if running on that backend node, otherwise default to configured backend ports
    const defaultCm = (port === '8095') ? origin : (localStorage.getItem('depa_cm_url') || 'http://localhost:8095');
    const defaultColA = (port === '8081') ? origin : (localStorage.getItem('depa_college_a_url') || 'http://localhost:8081');
    const defaultColB = (port === '8082') ? origin : (localStorage.getItem('depa_college_b_url') || 'http://localhost:8082');

    window.DEPA_SERVERS = {
        CM_BASE_URL: localStorage.getItem('depa_cm_url') || defaultCm,
        COLLEGE_A_BASE_URL: localStorage.getItem('depa_college_a_url') || defaultColA,
        COLLEGE_B_BASE_URL: localStorage.getItem('depa_college_b_url') || defaultColB,

        setEndpoints: function(cmUrl, colAUrl, colBUrl) {
            if (cmUrl) {
                localStorage.setItem('depa_cm_url', cmUrl.trim());
                this.CM_BASE_URL = cmUrl.trim();
                window.CM_BASE_URL = cmUrl.trim();
            }
            if (colAUrl) {
                localStorage.setItem('depa_college_a_url', colAUrl.trim());
                this.COLLEGE_A_BASE_URL = colAUrl.trim();
                window.COLLEGE_A_BASE_URL = colAUrl.trim();
            }
            if (colBUrl) {
                localStorage.setItem('depa_college_b_url', colBUrl.trim());
                this.COLLEGE_B_BASE_URL = colBUrl.trim();
                window.COLLEGE_B_BASE_URL = colBUrl.trim();
            }
        },

        resetDefaults: function() {
            localStorage.removeItem('depa_cm_url');
            localStorage.removeItem('depa_college_a_url');
            localStorage.removeItem('depa_college_b_url');
            this.CM_BASE_URL = defaultCm;
            this.COLLEGE_A_BASE_URL = defaultColA;
            this.COLLEGE_B_BASE_URL = defaultColB;
            window.CM_BASE_URL = defaultCm;
            window.COLLEGE_A_BASE_URL = defaultColA;
            window.COLLEGE_B_BASE_URL = defaultColB;
        }
    };

    window.CM_BASE_URL = window.DEPA_SERVERS.CM_BASE_URL;
    window.COLLEGE_A_BASE_URL = window.DEPA_SERVERS.COLLEGE_A_BASE_URL;
    window.COLLEGE_B_BASE_URL = window.DEPA_SERVERS.COLLEGE_B_BASE_URL;
})();

/**
 * ==============================================================================
 * DEPA COLLEGE A — VOLATILE IN-MEMORY ACADEMIC DATA STORE
 * Strictly holds decrypted academic records in runtime JavaScript memory.
 * NEVER writes sensitive student academic data to sessionStorage, localStorage,
 * IndexedDB, cookies, or browser cache.
 * Automatically cleared on page reload, session expiry, or user logout.
 * ==============================================================================
 */

window.DF_RECORDS_STORE = (function () {
    'use strict';

    // Volatile in-memory array — strictly runtime memory, wiped on reload
    let inMemoryRecords = [];

    function addRecord(record) {
        if (!record) return;
        const reqId = record.dataRequestId || (record.data && record.data.dataRequestId);
        // Deduplicate by dataRequestId
        const exists = inMemoryRecords.some(r => r.dataRequestId === reqId);
        if (!exists) {
            inMemoryRecords.unshift(record);
        }
    }

    function getRecords() {
        return [...inMemoryRecords];
    }

    function clear() {
        inMemoryRecords = [];
        try {
            sessionStorage.removeItem('cola_retrieved_records');
            localStorage.removeItem('cola_retrieved_records');
        } catch (e) {}
    }

    return {
        addRecord,
        getRecords,
        clear
    };
})();


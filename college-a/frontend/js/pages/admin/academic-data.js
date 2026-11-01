/**
 * ==============================================================================
 * DEPA COLLEGE A — ADMIN: ACADEMIC DATA SCHEMA & LOCAL MAPPINGS
 * Displays canonical academic credential fields and their local database column mappings.
 * Decouples canonical network protocol requests from local PostgreSQL schemas.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_ACADEMIC = (function () {
    'use strict';

    function render(container) {
        if (!container) return;

        const fields = window.DF_API.canonicalFields || [];

        const schemaMappings = [
            {
                canonical: 'CGPA',
                dbColumn: 'students.cgpa',
                type: 'VARCHAR(64)',
                sample: '8.84 / 10.0 (First Class with Distinction)',
                desc: 'Cumulative grade point average extracted directly from verified student records.'
            },
            {
                canonical: 'TRANSCRIPT',
                dbColumn: 'students.transcript',
                type: 'VARCHAR(1024)',
                sample: 'Sem 1: 8.7 SGPA | Sem 2: 8.9 SGPA | Sem 3: 9.1 SGPA | Sem 4: 8.8 SGPA',
                desc: 'Detailed semester transcripts and credit completions sealed by registrar.'
            },
            {
                canonical: 'DEGREE_CERTIFICATE',
                dbColumn: 'students.degree_certificate',
                type: 'VARCHAR(512)',
                sample: 'Bachelor of Technology in Computer Science & Engineering (Verified Official)',
                desc: 'Official institutional graduation credential and branch award.'
            },
            {
                canonical: 'STUDY_CERTIFICATE',
                dbColumn: 'students.sc',
                type: 'VARCHAR(255)',
                sample: 'Valid - Enrolled in B.Tech Computer Science',
                desc: 'Institutional enrollment and bona fide study certificate.'
            },
            {
                canonical: 'ATTENDANCE',
                dbColumn: 'Calculated Function',
                type: 'DERIVED',
                sample: '89.5% Overall Attendance (Qualified)',
                desc: 'Official institutional attendance record computed from semester attendance logs.'
            },
            {
                canonical: 'CONDUCT_CERTIFICATE',
                dbColumn: 'Institutional Seal',
                type: 'ATTESTATION',
                sample: 'Exemplary Conduct - No Disciplinary Records',
                desc: 'Institutional character certification and disciplinary clearance.'
            },
            {
                canonical: 'ENROLLMENT_STATUS',
                dbColumn: 'students.status',
                type: 'VARCHAR(32)',
                sample: 'ACTIVE',
                desc: 'Account and enrollment status on official university register.'
            }
        ];

        const html = `
            <!-- Page Header -->
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                <div>
                    <h3 class="fw-bold text-dark mb-1">Academic Data Schema & Local Mappings</h3>
                    <p class="text-muted small mb-0">Canonical field registry decoupling DEPA network protocol contracts from College A database schemas.</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill font-monospace small">
                        <i class="bi bi-shield-lock-fill me-1"></i> ZERO RAW SQL EXPOSURE
                    </span>
                </div>
            </div>

            <!-- Architecture Info Card -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-body p-4">
                    <div class="row g-4 align-items-center">
                        <div class="col-lg-8">
                            <h5 class="fw-bold text-dark mb-2">Schema Decoupling & Field Extractor Registry</h5>
                            <p class="text-muted small mb-3" style="line-height: 1.6;">
                                External consumers (e.g. College B University) request standard canonical fields (such as <code>CGPA</code> or <code>TRANSCRIPT</code>) through the Consent Manager.
                                College A's <code>CollegeAFieldMappingRegistry</code> dynamically maps these canonical field identifiers to internal database columns and validated entity attributes.
                                <strong>Direct database access, raw SQL queries, and arbitrary database introspection are strictly prohibited.</strong>
                            </p>
                            <div class="d-flex flex-wrap gap-2">
                                <span class="badge bg-light text-dark border"><i class="bi bi-code-slash text-success me-1"></i> Java Function Extractors</span>
                                <span class="badge bg-light text-dark border"><i class="bi bi-check2-all text-primary me-1"></i> Dynamic Field Redaction</span>
                                <span class="badge bg-light text-dark border"><i class="bi bi-lock-fill text-danger me-1"></i> Injection Proof</span>
                            </div>
                        </div>

                        <div class="col-lg-4">
                            <div class="p-3 rounded-3" style="background: #F0FDF4; border: 1px solid #BBF7D0;">
                                <div class="text-success fw-bold small text-uppercase mb-2"><i class="bi bi-gear-fill me-1"></i> Provider Core Guarantee</div>
                                <p class="text-success small mb-0" style="font-size: 0.8rem; line-height: 1.5;">
                                    When an external institution presents a CM Access JWT, College A checks the authoritative approved fields from live CM introspection and extracts <em>only those specific fields</em>. All other student attributes remain completely unextracted and omitted from the encrypted peer-to-peer payload.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Schema Mappings Table Card -->
            <div class="card df-card border-0 shadow-sm mb-4" style="border-radius: var(--df-radius-lg);">
                <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-2">
                        <i class="bi bi-diagram-3-fill text-success fs-5"></i>
                        <h6 class="mb-0 fw-bold text-dark">Active Canonical Field Extractors (${schemaMappings.length} Fields)</h6>
                    </div>
                    <span class="badge bg-light text-dark border font-monospace small">Spring Component: CollegeAFieldMappingRegistry</span>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table df-table table-hover align-middle mb-0">
                            <thead class="table-light text-muted small text-uppercase">
                                <tr>
                                    <th class="ps-3">Canonical Field Name</th>
                                    <th>Local Column / Extractor</th>
                                    <th>Data Type</th>
                                    <th>Sample Evaluated Value</th>
                                    <th class="pe-3">Description & Security Scope</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${schemaMappings.map(item => `
                                    <tr>
                                        <td class="ps-3">
                                            <span class="badge bg-success-subtle text-success border border-success-subtle font-monospace px-2 py-1">
                                                ${window.DF_UI.escapeHtml(item.canonical)}
                                            </span>
                                        </td>
                                        <td class="font-monospace text-dark small fw-semibold">
                                            ${window.DF_UI.escapeHtml(item.dbColumn)}
                                        </td>
                                        <td>
                                            <span class="badge bg-light text-secondary border font-monospace small">
                                                ${window.DF_UI.escapeHtml(item.type)}
                                            </span>
                                        </td>
                                        <td class="small text-secondary font-monospace" style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${window.DF_UI.escapeHtml(item.sample)}">
                                            ${window.DF_UI.escapeHtml(item.sample)}
                                        </td>
                                        <td class="small text-muted pe-3">
                                            ${window.DF_UI.escapeHtml(item.desc)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    return { render };
})();


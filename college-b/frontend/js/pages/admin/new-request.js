/**
 * ==============================================================================
 * DEPA COLLEGE B — VIEW: INITIATE OUTGOING DATA REQUEST
 * Form for Consumer Inquirer Officers to initiate academic credential inquiries.
 * ==============================================================================
 */

window.DF_PAGE_ADMIN_NEW_REQUEST = (function () {
    'use strict';

    async function render(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="df-page-header mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <div>
                        <div class="d-flex align-items-center gap-2 mb-1">
                            <h2 class="h4 fw-bold text-slate-900 mb-0">Initiate Academic Data Request</h2>
                            <span class="badge bg-indigo-subtle text-indigo border border-indigo-subtle px-2 py-1 rounded-pill small" style="background:#EEF2FF; color:#4F46E5; border-color:#C7D2FE;">
                                Outbound Inquiry
                            </span>
                        </div>
                        <p class="text-muted small mb-0">Request verified academic credentials from an accredited provider node via Consent Manager.</p>
                    </div>
                    <div>
                        <a href="#/admin/requests" class="btn btn-sm btn-outline-secondary">
                            <i class="bi bi-arrow-left me-1"></i> Back to Outbound Tracker
                        </a>
                    </div>
                </div>
            </div>

            <div class="row justify-content-center">
                <div class="col-lg-9">
                    <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
                        <div class="card-header bg-white border-bottom py-3 px-4">
                            <div class="d-flex align-items-center">
                                <div class="p-2 rounded-3 me-3 text-white" style="background: #4F46E5;">
                                    <i class="bi bi-send-plus-fill fs-5"></i>
                                </div>
                                <div>
                                    <h6 class="fw-bold text-slate-900 mb-0">New Credential Inquiry Form</h6>
                                    <small class="text-muted">Consent Manager will forward this inquiry to the student for authorization</small>
                                </div>
                            </div>
                        </div>

                        <div class="card-body p-4">
                            <div id="request-alert" class="alert d-none py-2 px-3 small rounded-3 mb-4" role="alert"></div>

                            <form id="initiate-request-form">
                                <!-- Provider Organization Selection -->
                                <div class="mb-4">
                                    <label for="provider-select" class="form-label small fw-semibold text-slate-700">
                                        Data Provider Organization <span class="text-danger">*</span>
                                    </label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-bank"></i></span>
                                        <select class="form-select border-start-0" id="provider-select" required>
                                            <option value="" disabled selected>Loading accredited institutions...</option>
                                        </select>
                                    </div>
                                    <div class="form-text small text-muted">Select the institution that holds the student's authentic academic records.</div>
                                </div>

                                <!-- Student Identifier -->
                                <div class="mb-4">
                                    <label for="student-identifier-input" class="form-label small fw-semibold text-slate-700">
                                        Data Principal Identifier (Student ID) <span class="text-danger">*</span>
                                    </label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-person-badge"></i></span>
                                        <input type="text" class="form-control border-start-0 font-monospace" id="student-identifier-input" placeholder="e.g. STU-2023-001" value="STU-2023-001" required>
                                    </div>
                                    <div class="form-text small text-muted">The student's unique enrollment ID at the Provider institution (e.g. <code>STU-2023-001</code>).</div>
                                </div>

                                <!-- Purpose of Request -->
                                <div class="mb-4">
                                    <label for="purpose-input" class="form-label small fw-semibold text-slate-700">
                                        Purpose of Inquiry <span class="text-danger">*</span>
                                    </label>
                                    <div class="input-group">
                                        <span class="input-group-text bg-light border-end-0 text-muted"><i class="bi bi-chat-text"></i></span>
                                        <input type="text" class="form-control border-start-0" id="purpose-input" placeholder="e.g. Graduate Admission Evaluation & Transfer Credit Verification" value="Graduate Admission Evaluation & Transfer Credit Verification" required>
                                    </div>
                                    <div class="form-text small text-muted">Clearly describe why College B is requesting access. This purpose is presented to the student.</div>
                                </div>

                                <!-- Requested Canonical Academic Fields -->
                                <div class="mb-4">
                                    <label class="form-label small fw-semibold text-slate-700 mb-2">
                                        Requested Canonical Academic Fields <span class="text-danger">*</span>
                                    </label>
                                    <div class="row g-2" id="fields-container">
                                        <div class="col-md-6">
                                            <div class="p-3 border rounded-3 bg-light d-flex align-items-start">
                                                <input class="form-check-input me-3 mt-1 field-checkbox" type="checkbox" value="CGPA" id="field-cgpa" checked>
                                                <div>
                                                    <label class="form-check-label fw-bold text-dark small" for="field-cgpa">Cumulative GPA (CGPA)</label>
                                                    <div class="text-muted small">Standardized academic grade point average (/ 10.0 scale)</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="p-3 border rounded-3 bg-light d-flex align-items-start">
                                                <input class="form-check-input me-3 mt-1 field-checkbox" type="checkbox" value="DEGREE_CERTIFICATE" id="field-degree" checked>
                                                <div>
                                                    <label class="form-check-label fw-bold text-dark small" for="field-degree">Degree Certificate</label>
                                                    <div class="text-muted small">Official award verification and graduation confirmation</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="p-3 border rounded-3 bg-light d-flex align-items-start">
                                                <input class="form-check-input me-3 mt-1 field-checkbox" type="checkbox" value="PROGRAM" id="field-program" checked>
                                                <div>
                                                    <label class="form-check-label fw-bold text-dark small" for="field-program">Academic Program</label>
                                                    <div class="text-muted small">Degree title, department, and branch of study</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="p-3 border rounded-3 bg-light d-flex align-items-start">
                                                <input class="form-check-input me-3 mt-1 field-checkbox" type="checkbox" value="TRANSCRIPT" id="field-transcript">
                                                <div>
                                                    <label class="form-check-label fw-bold text-dark small" for="field-transcript">Official Transcript</label>
                                                    <div class="text-muted small">Detailed semester breakdown and course grades</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="p-3 border rounded-3 bg-light d-flex align-items-start">
                                                <input class="form-check-input me-3 mt-1 field-checkbox" type="checkbox" value="ATTENDANCE" id="field-attendance">
                                                <div>
                                                    <label class="form-check-label fw-bold text-dark small" for="field-attendance">Attendance Record</label>
                                                    <div class="text-muted small">Course attendance ratio and qualification compliance</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="p-3 border rounded-3 bg-light d-flex align-items-start">
                                                <input class="form-check-input me-3 mt-1 field-checkbox" type="checkbox" value="CONDUCT_CERTIFICATE" id="field-conduct">
                                                <div>
                                                    <label class="form-check-label fw-bold text-dark small" for="field-conduct">Conduct Certificate</label>
                                                    <div class="text-muted small">Institutional disciplinary record and standing</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="form-text small text-muted mt-2">Select only fields necessary for the declared purpose (Principle of Data Minimization).</div>
                                </div>

                                <div class="d-flex justify-content-end gap-2 pt-3 border-top">
                                    <a href="#/admin/requests" class="btn btn-outline-secondary px-4">Cancel</a>
                                    <button type="submit" class="btn btn-primary px-4 fw-semibold" id="btn-submit-request" style="background-color: #4F46E5; border-color: #4F46E5;">
                                        <span id="btn-request-text"><i class="bi bi-send-fill me-1"></i> Transmit Request to Consent Manager</span>
                                        <span id="btn-request-spinner" class="spinner-border spinner-border-sm ms-2 d-none" role="status"></span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const providerSelect = container.querySelector('#provider-select');
        const form = container.querySelector('#initiate-request-form');
        const studentIdInput = container.querySelector('#student-identifier-input');
        const purposeInput = container.querySelector('#purpose-input');
        const alertBox = container.querySelector('#request-alert');
        const btnSubmit = container.querySelector('#btn-submit-request');
        const btnText = container.querySelector('#btn-request-text');
        const btnSpinner = container.querySelector('#btn-request-spinner');

        // Populate Provider Organizations from CM
        try {
            const orgs = await window.DF_API.cm.getOrganizations();
            const activeOrgs = Array.isArray(orgs) ? orgs.filter(o => {
                const code = (o.organizationCode || o.code || '').toUpperCase();
                const status = (o.status || '').toUpperCase();
                return status === 'ACTIVE' && code !== 'COLLEGE_B';
            }) : [];

            if (activeOrgs.length > 0) {
                providerSelect.innerHTML = activeOrgs.map((o, idx) => {
                    const code = o.organizationCode || o.code;
                    const name = o.name || code;
                    const isSelected = idx === 0 || code === 'COLLEGE_A';
                    return `<option value="${window.DF_UI.escapeHtml(code)}" ${isSelected ? 'selected' : ''}>${window.DF_UI.escapeHtml(name)} (${window.DF_UI.escapeHtml(code)})</option>`;
                }).join('');
            } else {
                providerSelect.innerHTML = `<option value="COLLEGE_A" selected>College A University (COLLEGE_A)</option>`;
            }
        } catch (e) {
            console.error('Failed to load organizations from CM:', e);
            providerSelect.innerHTML = `<option value="COLLEGE_A" selected>College A University (COLLEGE_A)</option>`;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            alertBox.classList.add('d-none');

            const selectedProvider = providerSelect.value;
            if (!selectedProvider || selectedProvider === 'undefined') {
                alertBox.className = 'alert alert-warning py-2 px-3 small rounded-3 mb-4';
                alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>Please select a valid Data Provider organization from the list.';
                alertBox.classList.remove('d-none');
                return;
            }

            const selectedFields = Array.from(container.querySelectorAll('.field-checkbox:checked')).map(cb => cb.value);
            if (selectedFields.length === 0) {
                alertBox.className = 'alert alert-warning py-2 px-3 small rounded-3 mb-4';
                alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>Please select at least one academic field to request.';
                alertBox.classList.remove('d-none');
                return;
            }

            btnSubmit.disabled = true;
            btnText.textContent = 'Transmitting to Consent Manager...';
            btnSpinner.classList.remove('d-none');

            const payload = {
                dataPrincipalId: studentIdInput.value.trim(),
                providerOrganizationId: providerSelect.value,
                purpose: purposeInput.value.trim(),
                requestedFields: selectedFields
            };

            try {
                const res = await window.DF_API.consumer.initiateDataRequest(payload);
                const reqId = res.id || res.dataRequestId || 'REQ-' + Date.now();

                alertBox.className = 'alert alert-success py-3 px-4 rounded-3 mb-4';
                alertBox.innerHTML = `
                    <div class="d-flex align-items-center mb-1">
                        <i class="bi bi-check-circle-fill fs-5 me-2 text-success"></i>
                        <h6 class="fw-bold mb-0">Data Request Transmitted Successfully!</h6>
                    </div>
                    <div class="small mt-2">
                        Request ID: <code class="fw-bold text-dark">${window.DF_UI.escapeHtml(reqId)}</code> has been recorded at the Consent Manager.
                        The student (<code>${window.DF_UI.escapeHtml(payload.dataPrincipalId)}</code>) will be notified at College A to approve or reject the request.
                    </div>
                    <div class="mt-3">
                        <a href="#/admin/requests" class="btn btn-sm btn-success fw-semibold">
                            <i class="bi bi-list-check me-1"></i> Open Outbound Request Tracker
                        </a>
                    </div>
                `;
                alertBox.classList.remove('d-none');
                form.reset();
            } catch (err) {
                alertBox.className = 'alert alert-danger py-2 px-3 small rounded-3 mb-4';
                alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill me-2"></i>Failed to transmit request: ${window.DF_UI.escapeHtml(err.message)}`;
                alertBox.classList.remove('d-none');
            } finally {
                btnSubmit.disabled = false;
                btnText.innerHTML = '<i class="bi bi-send-fill me-1"></i> Transmit Request to Consent Manager';
                btnSpinner.classList.add('d-none');
            }
        });
    }

    return { render };
})();


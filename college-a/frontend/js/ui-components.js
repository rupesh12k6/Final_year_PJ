/**
 * ==============================================================================
 * DRIVEFLOW UI COMPONENT LIBRARY — COLLEGE A PROVIDER (PORT 3002)
 * Reusable UI Components based on DriveFlow Placement Management Portal
 * Supports Bootstrap 5.3.3 & Bootstrap Icons 1.11.3
 * ==============================================================================
 */

window.DF_UI = (function () {
    'use strict';

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function renderStatusBadge(status) {
        if (!status) return '<span class="df-badge df-badge-gray">—</span>';
        const s = String(status).toUpperCase();

        const badgeMap = {
            'ACTIVE':             { cls: 'df-badge-emerald', icon: 'bi-check-circle-fill', label: 'Active' },
            'APPROVED':           { cls: 'df-badge-emerald', icon: 'bi-patch-check-fill',  label: 'Approved' },
            'VERIFIED':           { cls: 'df-badge-emerald', icon: 'bi-shield-check',      label: 'Verified' },
            'READY':              { cls: 'df-badge-emerald', icon: 'bi-check2-all',        label: 'Ready' },
            'SUCCESS':            { cls: 'df-badge-emerald', icon: 'bi-check-circle',      label: 'Success' },

            'PENDING':            { cls: 'df-badge-amber',   icon: 'bi-clock-fill',        label: 'Pending' },
            'PENDING_ACTIVATION': { cls: 'df-badge-amber',   icon: 'bi-key-fill',          label: 'Pending Activation' },
            'REQUESTED':          { cls: 'df-badge-amber',   icon: 'bi-send-fill',         label: 'Requested' },
            'IN_PROCESS':         { cls: 'df-badge-amber',   icon: 'bi-arrow-repeat',      label: 'In Process' },

            'REVOKED':            { cls: 'df-badge-rose',    icon: 'bi-x-circle-fill',     label: 'Revoked' },
            'REJECTED':           { cls: 'df-badge-rose',    icon: 'bi-slash-circle-fill', label: 'Rejected' },
            'SUSPENDED':          { cls: 'df-badge-rose',    icon: 'bi-pause-circle-fill', label: 'Suspended' },
            'FAILED':             { cls: 'df-badge-rose',    icon: 'bi-exclamation-octagon', label: 'Failed' },

            'ELIGIBLE':           { cls: 'df-badge-indigo',  icon: 'bi-star-fill',         label: 'Eligible' },
            'CONSUMER':           { cls: 'df-badge-indigo',  icon: 'bi-building',          label: 'Consumer Node' },
            'PROVIDER':           { cls: 'df-badge-emerald', icon: 'bi-mortarboard',       label: 'Provider Node' },
            'REGULATORY':         { cls: 'df-badge-blue',    icon: 'bi-bank',              label: 'Regulatory Central' }
        };

        const item = badgeMap[s] || { cls: 'df-badge-gray', icon: 'bi-info-circle', label: status };
        return `<span class="df-badge ${item.cls}">
            <i class="bi ${item.icon}"></i>
            <span>${escapeHtml(item.label)}</span>
        </span>`;
    }

    function renderStatCard({ label, value, icon = 'bi-bar-chart-fill', color = 'emerald', trend = null }) {
        const trendHtml = trend ? `
            <div class="df-stat-trend">
                <i class="bi ${trend.direction === 'up' ? 'bi-arrow-up-right text-success' : 'bi-arrow-down-right text-danger'}"></i>
                <span>${escapeHtml(trend.text)}</span>
            </div>
        ` : '';

        return `
        <div class="df-stat-card">
            <div class="df-stat-card-header">
                <span class="df-stat-label">${escapeHtml(label)}</span>
                <div class="df-stat-icon-wrapper df-stat-icon-${escapeHtml(color)}">
                    <i class="bi ${escapeHtml(icon)}"></i>
                </div>
            </div>
            <p class="df-stat-value">${value == null ? '<span class="placeholder col-6"></span>' : escapeHtml(value)}</p>
            ${trendHtml}
        </div>`;
    }

    function renderShineButton({ id = '', text = 'Action', icon = '', variant = 'emerald', size = 'md', loading = false, disabled = false, extraClass = '' }) {
        const shineClass = variant === 'primary' ? 'df-btn-shine-emerald' : variant === 'indigo' ? 'df-btn-shine-indigo' : 'df-btn-shine-emerald';
        const spinner = loading ? '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' : '';
        const iconHtml = (icon && !loading) ? `<i class="bi ${escapeHtml(icon)} me-1"></i>` : '';

        return `
        <div class="df-btn-shine-wrapper ${shineClass} ${extraClass}">
            <button type="button" class="df-btn-shine-inner" id="${escapeHtml(id)}" ${disabled || loading ? 'disabled' : ''}>
                ${spinner}${iconHtml}<span>${escapeHtml(text)}</span>
            </button>
        </div>`;
    }

    function renderHeroBanner({ tag = 'ACADEMIC CREDENTIAL PROVIDER', title = 'Registrar Command Center', subtitle = 'College A University Node', metrics = [] }) {
        const metricsHtml = metrics.map(m => `
            <div class="df-hero-metric-item">
                <p class="df-hero-metric-val">${escapeHtml(m.value)}</p>
                <p class="df-hero-metric-lbl">${escapeHtml(m.label)}</p>
            </div>
        `).join('');

        return `
        <div class="df-hero-banner">
            <div class="df-hero-content">
                <p class="df-hero-tag">${escapeHtml(tag)}</p>
                <h2 class="df-hero-title">${escapeHtml(title)}</h2>
                <p class="df-hero-subtitle">${escapeHtml(subtitle)}</p>
            </div>
            ${metrics.length ? `<div class="df-hero-metrics d-none d-md-flex">${metricsHtml}</div>` : ''}
        </div>`;
    }

    function renderDataTable({ id = 'df-datatable', columns = [], data = [], onRowClick = null, emptyMsg = 'No records found', loading = false }) {
        if (loading) {
            return `<div class="df-card-table">${renderLoadingState('Loading student records...')}</div>`;
        }

        if (!data || data.length === 0) {
            return `
            <div class="df-card-table">
                ${renderEmptyState({ icon: 'bi-folder2-open', title: 'No Data Available', description: emptyMsg })}
            </div>`;
        }

        const thead = `
            <thead>
                <tr>
                    ${columns.map(c => `<th style="${c.width ? `width:${c.width};` : ''}">${escapeHtml(c.label)}</th>`).join('')}
                </tr>
            </thead>`;

        const tbody = `
            <tbody>
                ${data.map((row, rIndex) => `
                    <tr class="${onRowClick ? 'cursor-pointer' : ''}" data-row-index="${rIndex}">
                        ${columns.map(c => `
                            <td>${c.render ? c.render(row[c.key], row) : escapeHtml(row[c.key] ?? '—')}</td>
                        `).join('')}
                    </tr>
                `).join('')}
            </tbody>`;

        return `
        <div class="df-card-table" id="${escapeHtml(id)}">
            <div class="df-table-container">
                <table class="df-table">
                    ${thead}
                    ${tbody}
                </table>
            </div>
        </div>`;
    }

    function renderPagination({ page = 1, total = 0, perPage = 10, id = 'df-pagination' }) {
        const totalPages = Math.ceil(total / perPage);
        if (totalPages <= 1) return '';

        let buttons = '';
        const maxVisible = 5;
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        buttons += `
            <button class="df-page-btn" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} title="Previous Page">
                <i class="bi bi-chevron-left"></i>
            </button>`;

        for (let p = startPage; p <= endPage; p++) {
            buttons += `
                <button class="df-page-btn ${p === page ? 'active' : ''}" data-page="${p}">
                    ${p}
                </button>`;
        }

        buttons += `
            <button class="df-page-btn" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} title="Next Page">
                <i class="bi bi-chevron-right"></i>
            </button>`;

        return `
        <div class="df-pagination" id="${escapeHtml(id)}">
            ${buttons}
        </div>`;
    }

    function renderLoadingState(message = 'Loading data...') {
        return `
        <div class="df-state-box">
            <div class="spinner-border text-success mb-3" style="width: 2.5rem; height: 2.5rem;" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="df-state-title">${escapeHtml(message)}</p>
            <p class="df-state-desc">Retrieving records from institutional repository...</p>
        </div>`;
    }

    function renderEmptyState({ icon = 'bi-inbox', title = 'No items found', description = 'There are no active records in this directory.' }) {
        return `
        <div class="df-state-box">
            <div class="df-state-icon text-muted opacity-50">
                <i class="bi ${escapeHtml(icon)}"></i>
            </div>
            <h4 class="df-state-title">${escapeHtml(title)}</h4>
            <p class="df-state-desc">${escapeHtml(description)}</p>
        </div>`;
    }

    function renderErrorState({ title = 'Failed to load', message = 'An error occurred while communicating with the node.' }) {
        return `
        <div class="df-state-box">
            <div class="df-state-icon text-danger">
                <i class="bi bi-exclamation-triangle-fill"></i>
            </div>
            <h4 class="df-state-title text-danger">${escapeHtml(title)}</h4>
            <p class="df-state-desc">${escapeHtml(message)}</p>
        </div>`;
    }

    function showToast(message, type = 'info') {
        let container = document.getElementById('df-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'df-toast-container';
            container.className = 'df-toast-container';
            document.body.appendChild(container);
        }

        const iconMap = {
            success: 'bi-check-circle-fill text-success',
            error:   'bi-x-circle-fill text-danger',
            warning: 'bi-exclamation-triangle-fill text-warning',
            info:    'bi-info-circle-fill text-primary'
        };

        const icon = iconMap[type] || iconMap.info;
        const toast = document.createElement('div');
        toast.className = `df-toast df-toast-${type}`;
        toast.innerHTML = `
            <i class="bi ${icon} fs-5"></i>
            <span class="flex-grow-1">${escapeHtml(message)}</span>
            <button type="button" class="btn-close btn-close-sm ms-2" aria-label="Close"></button>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));

        const closeBtn = toast.querySelector('.btn-close');
        const dismiss = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        };

        if (closeBtn) closeBtn.onclick = dismiss;
        setTimeout(dismiss, 4000);
    }

    function showConfirmDialog({ title = 'Are you sure?', message = 'This action cannot be undone.', onConfirm, confirmText = 'Confirm', confirmVariant = 'danger' }) {
        let modalEl = document.getElementById('df-dynamic-confirm-modal');
        if (modalEl) modalEl.remove();

        const btnClass = confirmVariant === 'danger' ? 'btn-danger' : 'btn-success';
        const modalHtml = `
        <div class="modal fade" id="df-dynamic-confirm-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 440px;">
                <div class="modal-content df-modal-content text-center p-4">
                    <div class="mx-auto mb-3 d-flex align-items-center justify-content-center rounded-circle ${confirmVariant === 'danger' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'}" style="width: 56px; height: 56px; font-size: 1.6rem;">
                        <i class="bi ${confirmVariant === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-question-circle-fill'}"></i>
                    </div>
                    <h3 class="df-modal-title mb-2">${escapeHtml(title)}</h3>
                    <p class="text-muted small mb-4">${escapeHtml(message)}</p>
                    <div class="d-flex justify-content-center gap-3">
                        <button type="button" class="df-btn-pill-secondary px-4" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn ${btnClass} rounded-pill px-4 fw-medium" id="df-confirm-dialog-btn">${escapeHtml(confirmText)}</button>
                    </div>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('df-dynamic-confirm-modal');

        const bsModal = new bootstrap.Modal(modalEl, { backdrop: true });
        bsModal.show();

        const confirmBtn = document.getElementById('df-confirm-dialog-btn');
        confirmBtn.onclick = async () => {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...';
            try {
                if (onConfirm) await onConfirm();
                bsModal.hide();
            } catch (err) {
                showToast(err.message || 'Action failed', 'error');
            } finally {
                confirmBtn.disabled = false;
                confirmBtn.textContent = confirmText;
            }
        };

        modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    }

    function showModal({ id = 'df-dynamic-modal', title = 'Modal', contentHtml = '', footerHtml = '', size = 'lg' }) {
        let modalEl = document.getElementById(id);
        if (modalEl) modalEl.remove();

        const modalHtml = `
        <div class="modal fade" id="${escapeHtml(id)}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered modal-${escapeHtml(size)}">
                <div class="modal-content df-modal-content">
                    <div class="df-modal-header">
                        <h4 class="df-modal-title">${escapeHtml(title)}</h4>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="df-modal-body">
                        ${contentHtml}
                    </div>
                    ${footerHtml ? `<div class="df-modal-footer">${footerHtml}</div>` : ''}
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById(id);
        const bsModal = new bootstrap.Modal(modalEl, { backdrop: true });
        bsModal.show();
        return bsModal;
    }

    // ── Helper: Format Date/Time ───────────────────────────────────────────
    function formatDateTime(isoOrDateStr) {
        if (!isoOrDateStr) return '—';
        try {
            const d = new Date(isoOrDateStr);
            if (isNaN(d.getTime())) return String(isoOrDateStr);
            return d.toLocaleString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        } catch (_) {
            return String(isoOrDateStr);
        }
    }

    return {
        escapeHtml,
        formatDateTime,
        renderStatusBadge,
        renderStatCard,
        renderShineButton,
        renderHeroBanner,
        renderDataTable,
        renderPagination,
        renderLoadingState,
        renderEmptyState,
        renderErrorState,
        showToast,
        showConfirmDialog,
        showModal
    };
})();


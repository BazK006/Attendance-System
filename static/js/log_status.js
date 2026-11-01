// ==========================================
// 1. ระบบค้นหาและกรอง Audit Logs ทุกหน้า
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    const filterForm = document.getElementById('auditFilterForm');
    const tableBody = document.getElementById('auditLogBody');
    const searchInput = document.getElementById('auditSearchInput');
    const clearSearch = document.getElementById('auditClearSearch');
    const roleFilter = document.getElementById('auditRoleFilter');

    if (!tableBody) return;

    function normalizeText(value) {
        return String(value ?? '')
            .normalize('NFC')
            .toLocaleLowerCase()
            .trim();
    }

    let activeKeyword = normalizeText(searchInput?.value || '');
    let activeRole = String(roleFilter?.value || 'all')
        .trim()
        .toLowerCase();

    function updateClearButton() {
        if (!searchInput || !clearSearch) return;

        const hasKeyword = Boolean(searchInput.value.trim());

        clearSearch.style.display =
            hasKeyword ? 'inline-flex' : 'none';

        clearSearch.disabled = !hasKeyword;
    }

    function submitAuditSearch() {
        if (!filterForm) {
            console.error(
                'ไม่พบฟอร์ม auditFilterForm สำหรับค้นหา Audit Logs'
            );
            return;
        }

        filterForm.requestSubmit();
    }

    if (searchInput) {
        updateClearButton();

        searchInput.addEventListener('input', function () {
            updateClearButton();
        });
    }

    if (roleFilter) {
        roleFilter.addEventListener('change', function () {
            submitAuditSearch();
        });
    }

    if (clearSearch && searchInput) {
        clearSearch.addEventListener('click', function () {
            searchInput.value = '';
            updateClearButton();
            submitAuditSearch();
        });
    }

    function applyAuditFilters() {
        const liveRows = tableBody.querySelectorAll(
            'tr.log-row.realtime-row'
        );

        liveRows.forEach(function (row) {
            const rowRole = String(row.dataset.role || 'guest')
                .trim()
                .toLowerCase();

            const rowText = normalizeText(
                `${rowRole} ${row.textContent}`
            );

            const matchesKeyword =
                !activeKeyword || rowText.includes(activeKeyword);

            let matchesRole = activeRole === 'all';

            if (activeRole === 'admin' || activeRole === 'teacher') {
                matchesRole = rowRole === activeRole;
            } else if (activeRole === 'other') {
                matchesRole =
                    rowRole !== 'admin' && rowRole !== 'teacher';
            }

            row.hidden = !(matchesKeyword && matchesRole);
        });
    }

    window.applyAuditFilters = applyAuditFilters;

    updateClearButton();
    applyAuditFilters();
});


// 2. ระบบรับ Audit Logs แบบ Real-time
document.addEventListener('DOMContentLoaded', function () {
    const tableBody = document.getElementById('auditLogBody');
    const socketStatus = document.getElementById('auditSocketStatus');

    if (!tableBody || typeof io !== 'function') return;

    const socket = io();

    socket.on('connect', function () {
        if (!socketStatus) return;

        socketStatus.classList.add('connected');
        socketStatus.classList.remove('disconnected');

        const statusText = socketStatus.querySelector('span:last-child');

        if (statusText) {
            statusText.textContent = 'เชื่อมต่อเรียลไทม์แล้ว';
        }
    });

    socket.on('disconnect', function () {
        if (!socketStatus) return;

        socketStatus.classList.remove('connected');
        socketStatus.classList.add('disconnected');

        const statusText = socketStatus.querySelector('span:last-child');

        if (statusText) {
            statusText.textContent = 'ขาดการเชื่อมต่อ';
        }
    });

    socket.on('broadcast_log', function (data) {
        if (!data)
            return;

        const placeholder = document.getElementById('noDataPlaceholder');

        if (placeholder) {
            placeholder.remove();
        }

        const row = document.createElement('tr');

        row.className = 'log-row realtime-row';
        row.dataset.role = data.role || 'guest';

        function addCell(className, value) {
            const cell = document.createElement('td');

            if (className) {
                cell.className = className;
            }

            cell.textContent = value ?? '-';
            row.appendChild(cell);

            return cell;
        }

        const timeCell = document.createElement('td');
        timeCell.className = 'ps-4';

        const timeWrap = document.createElement('div');
        timeWrap.className = 'audit-time';

        const timeLine = document.createElement('div');
        const timeIcon = document.createElement('i');

        timeIcon.className = 'bi bi-clock me-1';

        timeLine.appendChild(timeIcon);
        timeLine.appendChild(
            document.createTextNode(data.created_at || '-')
        );

        timeWrap.appendChild(timeLine);
        timeCell.appendChild(timeWrap);
        row.appendChild(timeCell);

        addCell('audit-user', data.user_identifier || '-');

        const roleCell = document.createElement('td');
        const roleBadge = document.createElement('span');

        const role = String(data.role || 'guest').toLowerCase();

        if (role === 'admin') {
            roleBadge.className =
                'badge badge-admin px-3 py-2 rounded-3';
            roleBadge.textContent = 'ผู้ดูแลระบบ';
        } else if (role === 'teacher') {
            roleBadge.className =
                'badge badge-teacher px-3 py-2 rounded-3';
            roleBadge.textContent = 'คุณครู';
        } else {
            roleBadge.className =
                'badge badge-guest px-3 py-2 rounded-3';
            roleBadge.textContent = data.role || 'ไม่ระบุ';
        }

        roleCell.appendChild(roleBadge);
        row.appendChild(roleCell);

        const actionCell = document.createElement('td');
        const actionBadge = document.createElement('span');

        actionBadge.className = 'audit-action';
        actionBadge.textContent = data.action || '-';

        actionCell.appendChild(actionBadge);
        row.appendChild(actionCell);

        addCell('audit-details', data.details || '-');

        const ipCell = document.createElement('td');
        ipCell.className = 'text-center';

        const ipSpan = document.createElement('span');
        ipSpan.className = 'audit-ip';

        const ipIcon = document.createElement('i');
        ipIcon.className = 'bi bi-pc-display me-1';

        ipSpan.appendChild(ipIcon);
        ipSpan.appendChild(
            document.createTextNode(data.ip_address || 'Unknown')
        );

        ipCell.appendChild(ipSpan);
        row.appendChild(ipCell);

        tableBody.insertBefore(row, tableBody.firstChild);

        if (typeof window.applyAuditFilters === 'function') {
            window.applyAuditFilters();
        }
    });
});

// AUDIT LOGS - LOADING SYSTEM
// ==========================================
// AUDIT LOGS - LOADING SYSTEM
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("auditFilterForm");
    const tbody = document.getElementById("auditLogBody");
    const loadingRow = document.getElementById("auditLoadingRow");

    const submitButton = document.getElementById("auditSearchSubmit");

    const roleFilter = document.getElementById("auditRoleFilter");
    const roleSpinner = document.getElementById("auditRoleSpinner");
    const roleFilterWrapper = document.getElementById("auditRoleFilterWrapper");

    if (!form || !tbody || !loadingRow) return;

    // ระบุว่าการโหลดเกิดจากการเปลี่ยน Role Filter หรือไม่
    let isRoleFilterLoading = false;


    // ==========================================
    // แสดง Loading
    // ==========================================

    function showAuditLoading() {

        form.setAttribute("aria-busy", "true");

        // ซ่อนแถวข้อมูลเดิม
        tbody.querySelectorAll("tr").forEach(row => {
            if (row !== loadingRow) {
                row.classList.add("d-none");
            }
        });

        // แสดง Spinner กลางตาราง
        loadingRow.classList.remove("d-none");

        // ปิดปุ่มค้นหาชั่วคราว
        if (submitButton) {
            submitButton.disabled = true;
        }

        // แสดง Spinner Dropdown เฉพาะเมื่อเปลี่ยน Role
        if (isRoleFilterLoading) {

            if (roleSpinner) {
                roleSpinner.classList.remove("d-none");
            }

            if (roleFilter) {
                roleFilter.disabled = true;
            }

            if (roleFilterWrapper) {
                roleFilterWrapper.classList.add("is-loading");
            }
        }
    }


    // ==========================================
    // Submit ค้นหาข้อความ
    // ==========================================

    form.addEventListener("submit", function () {
        showAuditLoading();
    });


    // ==========================================
    // เปลี่ยน Role Filter
    // ==========================================

    if (roleFilter) {
        roleFilter.addEventListener("change", function () {

            isRoleFilterLoading = true;

            if (typeof form.requestSubmit === "function") {
                form.requestSubmit();
            } else {
                showAuditLoading();
                form.submit();
            }

        });
    }


    // ==========================================
    // คืนสถานะเมื่อกลับมาหน้าเว็บ
    // ==========================================

    window.addEventListener("pageshow", function () {

        form.removeAttribute("aria-busy");

        isRoleFilterLoading = false;

        // ซ่อน Spinner กลางตาราง
        loadingRow.classList.add("d-none");

        // คืนการแสดงผลของแถวเดิม
        tbody.querySelectorAll("tr").forEach(row => {
            if (row !== loadingRow) {
                row.classList.remove("d-none");
            }
        });

        // คืนปุ่มค้นหา
        if (submitButton) {
            submitButton.disabled = false;
        }

        // คืน Dropdown
        if (roleSpinner) {
            roleSpinner.classList.add("d-none");
        }

        if (roleFilter) {
            roleFilter.disabled = false;
        }

        if (roleFilterWrapper) {
            roleFilterWrapper.classList.remove("is-loading");
        }

    });

});
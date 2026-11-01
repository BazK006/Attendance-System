let countdownInterval;
let dataRefreshInterval;
let lastDataFingerprint = "";

window.onload = function () {
    const dataNode = document.getElementById('server-data');
    if (!dataNode) return;

    const config = JSON.parse(dataNode.textContent);
    const sessionId = config.sessionId;
    const isTeacher = config.isTeacher === true;

    if (config.status === 'closed') {
        handleClosedSession();
    } else {
        countdownInterval = setInterval(updateCountdown, 1000);
        updateCountdown();
    }

    loadAttendees(sessionId, isTeacher);

    dataRefreshInterval = setInterval(() => {
        loadAttendees(sessionId, isTeacher);
    }, 3000);

    const searchInput = document.getElementById('searchAttendee');
    const filterSelect = document.getElementById('filterSelect');

    if (searchInput) {
        searchInput.addEventListener('input', () => loadAttendees(sessionId, isTeacher));
    }
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            lastDataFingerprint = "";
            loadAttendees(sessionId, isTeacher);
        });
    }
};

// ฟังก์ชันอัปเดตเวลานับถอยหลัง 
function updateCountdown() {
    const el = document.getElementById('timer');
    if (!el) return;

    const startAttr = el.getAttribute('data-start');
    const minsAttr = el.getAttribute('data-minutes');
    if (!startAttr || !minsAttr) return;

    const expireTime = new Date(startAttr).getTime() + (parseInt(minsAttr) * 60000);
    const diff = expireTime - Date.now();
    const expireDate = new Date(expireTime);
    const timeStr = `${expireDate.getHours().toString().padStart(2, '0')}:${expireDate.getMinutes().toString().padStart(2, '0')}`;

    if (diff <= 0) {
        if (typeof countdownInterval !== 'undefined') clearInterval(countdownInterval);

        el.innerHTML = `<span class="text-danger fw-bold">หมดเวลาเมื่อ ${timeStr} น.</span>`;

        const icon = el.previousElementSibling;
        if (icon && icon.classList.contains('bi-clock-history')) {
            icon.classList.remove('text-primary');
            icon.classList.add('text-danger');
        }

        handleClosedSession();

        const dataNode = document.getElementById('server-data');
        if (dataNode) {
            const config = JSON.parse(dataNode.textContent);
            lastDataFingerprint = "";
            loadAttendees(config.sessionId, config.isTeacher === true);
        }
        return;
    }

    const diffM = Math.floor(diff / 60000);
    const diffS = Math.floor((diff % 60000) / 1000);
    const countdownStr = `${diffM}:${diffS < 10 ? '0' : ''}${diffS}`;

    el.innerHTML = `
        <span class="text-primary fw-bold" style="font-size: 20px;">(เหลือเวลา ${countdownStr})</span>
    `;
}

function handleClosedSession() {
    const el = document.getElementById('timer');
    const btnClose = document.getElementById('btnCloseSession');
    const statusTextArea = document.getElementById('status-text-area');

    if (countdownInterval) {
        clearInterval(countdownInterval); countdownInterval = null;
    }

    if (dataRefreshInterval) {
        clearInterval(dataRefreshInterval); dataRefreshInterval = null;
    }

    if (btnClose) {
        btnClose.disabled = true;
        btnClose.innerHTML = `<i class="bi bi-lock-fill me-1"></i> ห้องเรียนปิดแล้ว`;
    }
    if (statusTextArea) {

        statusTextArea.innerHTML = `
            <i class="bi bi-circle-fill text-danger me-2 small"></i>
            <span class="text-danger fw-bold">ปิดรับเช็คชื่อ</span>
        `;
    }
    if (el) {
        const start = el.getAttribute('data-start');
        const mins = el.getAttribute('data-minutes');
        if (start && mins) {
            const expire = new Date(new Date(start).getTime() + (parseInt(mins) * 60000));
            el.innerHTML = `<span class="text-danger fw-bold">ปิดห้องเรียนเมื่อ ${expire.getHours().toString().padStart(2, '0')}:${expire.getMinutes().toString().padStart(2, '0')} น.</span>`;
        }
    }
}

if (typeof lastSearchTerm === 'undefined') window.lastSearchTerm = "";
if (typeof lastFilter === 'undefined') window.lastFilter = "all";

// ฟังก์ชันโหลดข้อมูลใส่ตารางหน้าข้อมูลนักเรียน
function loadAttendees(sessionId, isTeacher) {
    const dataNode = document.getElementById('server-data');
    if (!dataNode) return;

    const serverData = JSON.parse(dataNode.textContent);
    const allStudents = serverData.allStudents || [];
    const searchInput = document.getElementById('searchAttendee');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const filterSelect = document.getElementById('filterSelect');
    const activeFilter = filterSelect ? filterSelect.value : 'all';

    const isUserTriggered = (searchTerm !== lastSearchTerm || activeFilter !== lastFilter);
    lastSearchTerm = searchTerm;
    lastFilter = activeFilter;

    const listPre = document.getElementById('attendance-list');

    if (listPre && (listPre.innerHTML.trim() === "" || isUserTriggered)) {
        listPre.innerHTML = `
            <tr>
                <td colspan="${isTeacher ? 8 : 6}" class="text-center py-5">
                    <div class="spinner-border text-primary mb-2" role="status"></div>
                    <p class="text-muted small mb-0">กำลังค้นหา...</p>
                </td>
            </tr>`;
    }

    const apiUrl = isTeacher === true
        ? `/session/api/attendees/${sessionId}`
        : `/session/api/room/attendees/${sessionId}`;

    fetch(`${apiUrl}?t=${new Date().getTime()}`)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            return res.json();
        })
        .then(resData => {
            const data = Array.isArray(resData)
                ? resData
                : resData.attendees;

            if (!Array.isArray(data)) {
                throw new Error("รูปแบบข้อมูลรายชื่อไม่ถูกต้อง");
            }
            const list = document.getElementById('attendance-list');
            if (!list)
                return;

            const countdownEl = document.getElementById('countdown');
            const isRoomTimeOut = countdownEl ? (countdownEl.innerText.trim() === "00:00" || countdownEl.innerText.includes("หมดเวลา")) : false;

            let sessionStatus = resData.status || serverData.status;

            if (isRoomTimeOut || sessionStatus === 'closed') {
                sessionStatus = 'closed';

                if (typeof handleClosedSession === 'function') {
                    handleClosedSession();
                }
            }

            const currentFingerprint = JSON.stringify(data) + activeFilter + searchTerm + isTeacher + sessionStatus;

            if (currentFingerprint === lastDataFingerprint && !list.innerHTML.includes('spinner-border')) return;
            lastDataFingerprint = currentFingerprint;

            const stats = {
                all: allStudents.length,
                present: data.filter(a => a.status === 'present').length,
                absent: allStudents.length - data.filter(a => a.status !== 'absent').length,
                late: data.filter(a => a.status === 'late').length,
                leave: data.filter(a => a.status === 'leave').length,
            };

            if (filterSelect) {
                const absentLabel = (sessionStatus === 'active') ? `⏳ ยังไม่เช็คชื่อ` : `❌ ขาดเรียน`;
                filterSelect.options[0].text = `ทั้งหมด ${stats.all} คน`;
                filterSelect.options[1].text = `✅ มาเรียน ${stats.present} คน`;
                filterSelect.options[2].text = `${absentLabel} ${stats.absent} คน`;
                filterSelect.options[3].text = `⏳ มาสาย ${stats.late} คน`;
                filterSelect.options[4].text = `📝 ลา ${stats.leave} คน`;
            }

            const countBadge = document.getElementById('count-badge');
            if (countBadge) {
                countBadge.innerText = data.length;
            }

            const attendedMap = new Map(data.map(a => [String(a.student_id), a]));

            const finalHtml = allStudents.map((std) => {
                const id = String(std.student_id);
                const attendedData = attendedMap.get(id);
                let isCheckedIn = !!attendedData;
                let currentStatus = attendedData ? attendedData.status : 'absent';

                const isMatchSearch = std.full_name.toLowerCase().includes(searchTerm) || id.includes(searchTerm);
                if (!isMatchSearch) return "";

                if (isTeacher === true) {
                    let isMatchFilter = (activeFilter === 'all') ||
                        (activeFilter === 'absent' && currentStatus === 'absent') ||
                        (currentStatus === activeFilter && isCheckedIn);

                    if (!isMatchFilter) return "";
                } else {
                    const isVisibleStatus = currentStatus === 'present' || currentStatus === 'late';
                    if (!isCheckedIn || !isVisibleStatus)
                        return "";
                }

                const roomName = (() => {
                    let raw = isCheckedIn ? (attendedData.room || '') : (std.room_display || '');
                    if (!raw && std.student_level) { raw = `${std.student_level}/${std.student_room}`; }
                    if (raw && typeof raw === 'string' && !raw.includes('ม.') && !raw.includes('ป.')) {
                        let prefix = (std.education_level === 'ประถมศึกษา') ? 'ป.' : 'ม.';
                        return `${prefix}${raw.trim()}`;
                    }
                    return raw;
                })();

                const statusConfig = {
                    'present': { class: 'bg-success text-success', label: 'มาเรียน' },
                    'late': { class: 'bg-warning text-warning', label: 'มาสาย' },
                    'leave': { class: 'bg-info text-info', label: 'ลา' },
                    'absent': { class: 'bg-danger text-danger', label: 'ขาดเรียน' }
                };

                const cur = statusConfig[currentStatus] || { class: 'bg-secondary text-secondary', label: currentStatus };

                let manageColumn = "";
                let updatedAtColumn = "";

                if (isTeacher === true) {
                    let displayUpdateTime = "-";
                    if (isCheckedIn && attendedData) {
                        displayUpdateTime = attendedData.updated_at || attendedData.time || "-";
                    }

                    if (displayUpdateTime !== "-") {
                        updatedAtColumn = `
                            <td class="text-center align-middle">
                                <span class="badge bg-light text-dark border rounded-pill px-3 py-2">
                                    ${displayUpdateTime}
                                </span>
                            </td>`;
                    } else {
                        updatedAtColumn = `
                            <td class="text-center align-middle">
                                <span class="badge bg-light text-muted border border-dashed rounded-pill px-4 py-2 opacity-50">
                                    <div class="small fw-medium">-</div>
                                </span>
                            </td>`;
                    }

                    if (isCheckedIn) {
                        manageColumn = `
                        <td class="text-center align-middle">
                            <div class="d-flex justify-content-center gap-2">
                                <button
                                    class="btn btn-sm btn-outline-warning rounded-circle shadow-sm"
                                    onclick="showEditStatus(${attendedData.id}, '${attendedData.name}')"
                                    title="แก้ไขสถานะ">
                                    <i class="bi bi-pencil-fill"></i>
                                </button>
                            </div>
                        </td>`;
                    } else {
                        manageColumn = `
                            <td class="text-center align-middle">
                                <div class="d-flex justify-content-center gap-2">
                                    <button class="btn btn-sm btn-outline-warning rounded-circle shadow-sm"
                                        onclick="showQuickEdit('${id}', '${std.full_name}', ${std.student_number})"
                                        title="เช็คชื่อด่วน">
                                        <i class="bi bi-pencil-fill"></i>
                                    </button>
                                </div>
                            </td>
                        `;
                    }
                } else {
                    updatedAtColumn = "";
                    manageColumn = "";
                }

                if (isCheckedIn) {
                    let displayUpdateHtml = "-";
                    if (attendedData.updated_at && attendedData.updated_at !== "-") {
                        const parts = attendedData.updated_at.split(" ");
                        const uDate = parts[0] || "";
                        const uTime = parts[1] || "";

                        displayUpdateHtml = `
                            <span class="badge bg-light text-dark border rounded-pill px-3 py-2">
                                <div class="fw-semibold text-dark mb-1" style="font-size: 0.75rem;">${uDate}</div>
                                <div class="small opacity-75">${uTime} น.</div>
                            </span>`;
                    } else {
                        displayUpdateHtml = `
                            <span class="badge bg-light text-muted border border-dashed rounded-pill px-4 py-2 opacity-50">
                                <div class="small fw-medium">-</div>
                            </span>`;
                    }

                    if (isTeacher === true) {
                        updatedAtColumn = `
                            <td class="text-center align-middle">
                                ${displayUpdateHtml}
                            </td>`;
                    }

                    const checkInDate = attendedData.date_only || "-";
                    const checkInTime = attendedData.time || "-";

                    return `
                        <tr class="fade-in-row">
                            <td class="ps-4 text-primary fw-bold">${attendedData.no}</td>
                            <td class="text-muted small">${id}</td>
                            <td class="fw-bold">${attendedData.name}</td>
                            <td><span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary px-3 py-2">${roomName}</span></td>
                            <td class="text-center"><span class="badge ${cur.class} bg-opacity-10 px-3 py-2 rounded-pill fw-semibold">${cur.label}</span></td>
                            
                            <td class="text-center">
                                <span class="badge bg-light text-dark border rounded-pill px-3 py-2">
                                    <div class="fw-semibold text-dark mb-1" style="font-size: 0.75rem;">${checkInDate}</div>
                                    <div class="small opacity-75">${checkInTime}</div>
                                </span>
                            </td>

                            ${updatedAtColumn}
                            
                            ${manageColumn} 
                        </tr>`;
                } else {
                    let absentBadge = '';
                    let timeText = '';

                    if (sessionStatus === 'active') {
                        absentBadge = `<span class="badge bg-secondary bg-opacity-10 text-muted px-3 py-2 rounded-pill fw-semibold"><i class="bi bi-dash-circle me-1"></i> ยังไม่เช็คชื่อ</span>`;
                        timeText = `<span class="text-muted small">รอการเช็คชื่อ</span>`;
                    } else {
                        absentBadge = `<span class="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill fw-semibold"><i class="bi bi-x-circle-fill me-1"></i> ขาดเรียน</span>`;
                        timeText = `<span class="text-danger small fw-semibold">ขาดเรียน</span>`;
                    }

                    return `
                        <tr class="fade-in-row opacity-75">
                            <td class="ps-4 text-muted">${std.student_number}</td>
                            <td class="text-muted small">${id}</td>
                            <td class="text-muted">${std.full_name}</td>
                            <td><span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary px-3 py-2">${roomName}</span></td>
                            <td class="text-center">${absentBadge}</td>
                            <td class="text-center">${timeText}</td>
                            ${updatedAtColumn}
                            ${manageColumn}
                        </tr>`;
                }
            }).join('');

            if (finalHtml === "") {
                const isSearch = (searchTerm !== "");
                const bootstrapIcon = isSearch ? "bi-search" : "bi-clipboard-x";
                const message = isSearch ? "ไม่พบข้อมูลนักเรียนที่ค้นหา" : "ยังไม่มีข้อมูลรายชื่อในขณะนี้";

                list.innerHTML = `
                    <tr>
                        <td colspan="${isTeacher ? 8 : 6}" class="text-center py-5">
                            <i class="bi ${bootstrapIcon} d-block display-4 text-muted mb-3"></i>
                            <p class="text-muted mb-0 fw-semibold small">${message}</p>
                        </td>
                    </tr>`;
            } else {
                list.innerHTML = finalHtml;
            }
        })
        .catch(error => {
            console.error("ไม่สามารถโหลดรายชื่อได้:", error);

            const list = document.getElementById('attendance-list');

            if (list) {
                list.innerHTML = `
                    <tr>
                        <td colspan="${isTeacher ? 8 : 6}" class="text-center py-5">
                            <i class="bi bi-exclamation-circle text-danger display-5 mb-3"></i>
                            <p class="text-danger fw-semibold mb-1">
                                ไม่สามารถโหลดข้อมูลรายชื่อได้
                            </p>
                            <p class="text-muted small mb-0">
                                กรุณาลองรีเฟรชหน้าอีกครั้ง
                            </p>
                        </td>
                    </tr>`;
            }
        });
}

document.addEventListener('DOMContentLoaded', function () {
    const dataNode = document.getElementById('server-data');
    if (!dataNode) return;
    const config = JSON.parse(dataNode.textContent);

    loadAttendees(config.sessionId, config.isTeacher);

    const searchInput = document.getElementById('searchAttendee');
    if (searchInput) {
        searchInput.addEventListener('input', () => loadAttendees(config.sessionId, config.isTeacher));
    }

    const filterSelect = document.getElementById('filterSelect');
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            lastDataFingerprint = "";
            loadAttendees(config.sessionId, config.isTeacher);
        });
    }

    // setInterval(() => loadAttendees(config.sessionId, config.isTeacher), 3000);
});

const statusLabels = {
    'present': 'มาเรียน',
    'late': 'มาสาย',
    'leave': 'ลา',
    'absent': 'ขาดเรียน'
};

// --- ฟังก์ชันแก้ไขสถานะนักเรียน ---
function updateStatus(id, status) {
    fetch(`/session/attendance/update_status/${id}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('input[name="csrf_token"]').value
        },
        body: JSON.stringify({ status: status })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const thaiStatus = statusLabels[status] || 'อัปเดตแล้ว';

                Swal.fire({
                    icon: 'success',
                    title: 'อัปเดตสถานะสำเร็จ!',
                    text: `เปลี่ยนสถานะเป็น "${thaiStatus}" เรียบร้อยแล้ว`,
                    showConfirmButton: true,
                    confirmButtonText: 'รับทราบ!',
                    confirmButtonColor: '#0d6efd',
                    customClass: {
                        popup: 'rounded-4 shadow-lg border-0',
                        title: 'fw-bold text-success',
                        confirmButton: 'btn btn-primary rounded-3 px-4 py-2'
                    },
                    buttonsStyling: false
                }).then(() => {
                    if (typeof loadAttendees === "function") {
                        const sessionId = document.getElementById('server-data')
                            ? JSON.parse(document.getElementById('server-data').textContent).id
                            : null;

                        if (sessionId) {
                            loadAttendees(sessionId, true);
                        } else {
                            location.reload();
                        }
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: data.error || 'ไม่สามารถอัปเดตข้อมูลได้ โปรดลองใหม่อีกครั้ง',
                    confirmButtonColor: '#0d6efd',
                    confirmButtonText: 'รับทราบ!',
                    customClass: { popup: 'rounded-4 shadow-lg border-0' }
                });
            }
        })
        .catch(error => {
            Swal.fire({
                icon: 'warning',
                title: 'การเชื่อมต่อขัดข้อง',
                text: 'กรุณาตรวจสอบอินเทอร์เน็ตของคุณ',
                confirmButtonColor: '#ffc107',
                confirmButtonText: 'ตกลง',
                customClass: { popup: 'rounded-4 shadow-lg border-0' }
            });
        });
}

// // --- ฟังก์ชันลบรายชื่อ (สำหรับครู) ---
// function deleteAttendance(id) {
//     Swal.fire({
//         title: 'ยืนยันการลบรายชื่อ?',
//         text: "ข้อมูลนี้จะหายไปจากตารางเช็คชื่อ",
//         icon: 'warning',
//         showCancelButton: true,
//         confirmButtonColor: '#d33',
//         cancelButtonColor: '#6c757d',
//         confirmButtonText: 'ลบข้อมูล',
//         cancelButtonText: 'ยกเลิก',
//         reverseButtons: true
//     }).then((result) => {
//         if (result.isConfirmed) {
//             fetch(`/session/attendance/delete/${id}`, { method: 'POST' })
//                 .then(res => res.json())
//                 .then(data => {
//                     if (data.success) {
//                         Swal.fire('ลบแล้ว!', 'ข้อมูลถูกลบเรียบร้อย', 'success');
//                     }
//                 });
//         }
//     });
// }

// --- ฟังก์ชันแสดง Pop-up เลือกสถานะ ---
function showEditStatus(id, studentName) {
    Swal.fire({
        title: 'แก้ไขสถานะ',
        text: `เปลี่ยนสถานะของ: ${studentName}`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'อัปเดต',
        cancelButtonText: 'ยกเลิก',
        input: 'select',
        inputOptions: {
            'present': 'มาเรียน',
            'late': 'มาสาย',
            'leave': 'ลา',
            'absent': 'ขาดเรียน'
        },
        inputPlaceholder: 'เลือกสถานะ',
        reverseButtons: true,
        inputValidator: (value) => {
            if (!value) return 'กรุณาเลือกสถานะก่อนครับ'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            updateStatus(id, result.value);
        }
    });
}

// ปรับปรุงฟังก์ชันยืนยันการปิดห้อง 
function confirmCloseSession(buttonElement) {
    const form = buttonElement.closest('form');
    const actionUrl = form.getAttribute('action');

    const presentCount = document.querySelectorAll('.badge-success').length;
    const lateCount = document.querySelectorAll('.badge-warning').length;
    const leaveCount = document.querySelectorAll('.badge-info').length;

    const totalNode = document.getElementById('total-student-count');
    const totalStudents = totalNode ? parseInt(totalNode.innerText) : 0;

    const absentCount = totalStudents - (presentCount + lateCount + leaveCount);
    const finalAbsent = absentCount < 0 ? 0 : absentCount;

    Swal.fire({
        title: 'ยืนยันการปิดห้องเรียน?',
        text: "ระบบจะสรุปยอดและบันทึกนักเรียนที่ไม่ได้เช็คชื่อว่า 'ขาดเรียน'",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f44336',
        confirmButtonText: 'ใช่ ปิดห้องเรียนเลย!',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            buttonElement.disabled = true;
            buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> กำลังปิด...`;

            fetch(actionUrl, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': document.querySelector('input[name="csrf_token"]').value
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const p = data.data.present;
                        const l = data.data.late;
                        const v = data.data.leave;
                        const a = data.data.absent;
                        const total = data.data.total;

                        const summaryHtml = `
                                <div style="text-align: center; font-size: 1.2rem; line-height: 1.8;">
                                    <div style="margin-bottom: 10px; font-weight: bold; color: #555;">สรุปยอดคาบนี้</div>
                                    <div style="display: inline-block; text-align: left;">
                                        <span class="text-success" style="display: block;">✅ <b>มาเรียน:</b> ${p} คน</span>
                                        <span class="text-warning" style="display: block;">⏰ <b>มาสาย:</b> ${l} คน</span>
                                        <span class="text-info" style="display: block;">📝 <b>ลา:</b> ${v} คน</span>
                                        <span style="display: block; color: #f44336;">❌ <b>ขาดเรียน:</b> ${a} คน</span>
                                    </div>
                                    <hr style="margin: 10px 0;">
                                    <div style="font-size: 0.9rem; color: #888;">(รวมทั้งหมด ${total} คน)</div>
                                </div>
                            `;
                        Swal.fire({
                            icon: 'success',
                            title: '<strong style="font-size: 1.5rem;">ปิดห้องเรียนสำเร็จ!</strong>',
                            html: summaryHtml,
                            showConfirmButton: true,
                            confirmButtonText: 'รับทราบ',
                            confirmButtonColor: '#28a745',
                        }).then(() => {
                            if (typeof countdownInterval !== 'undefined') {
                                clearInterval(countdownInterval);
                            }

                            handleClosedSession();


                            const dataNode = document.getElementById('server-data');
                            const config = JSON.parse(dataNode.textContent);
                            lastDataFingerprint = "";
                            loadAttendees(config.sessionId, config.isTeacher);
                        });
                    } else {
                        buttonElement.disabled = false;
                        buttonElement.innerHTML = `<i class="bi bi-power me-1"></i> ปิดห้อง`;
                        Swal.fire('เกิดข้อผิดพลาด', data.message, 'error');
                    }
                })
                .catch(err => {
                    buttonElement.disabled = false;
                    buttonElement.innerHTML = `<i class="bi bi-power me-1"></i> ปิดห้อง`;
                    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                });
        }
    });
}

// --- ฟังก์ชันเช็คชื่อให้นักเรียนโดยตรง ---
/* [โค้ดสำรอง - ไม่ได้ถูกใช้งานหน้าบ้าน]
ฟังก์ชันเช็คชื่อด่วนแบบ Present ทันที (ไม่ได้ใช้เพราะหน้างานใช้โหมดเลือกสถานะ showQuickEdit แทน)

function quickCheckIn(stdId, name, no) {
    const dataNode = document.getElementById('server-data');
    if (!dataNode) return;
    const config = JSON.parse(dataNode.textContent);

    Swal.fire({
        title: 'ยืนยันการเช็คชื่อ',
        text: `คุณต้องการเช็คชื่อให้ "${name}" ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#198754',
        confirmButtonText: 'ใช่ เช็คชื่อเลย',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.showLoading();

            fetch('/session/api/quick_attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('input[name="csrf_token"]').value
                },
                body: JSON.stringify({
                    student_id: stdId,
                    student_name: name,
                    student_number: no,
                    session_id: config.sessionId
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'สำเร็จ!',
                            text: `เช็คชื่อให้ ${name} เรียบร้อยแล้ว`,
                            timer: 1500,
                            showConfirmButton: false
                        }).then(() => {
                            if (typeof loadAttendees === "function") {
                                loadAttendees(config.sessionId, config.isTeacher);
                            } else {
                                location.reload();
                            }
                        });
                    } else {
                        Swal.fire('ผิดพลาด', data.message || 'บันทึกข้อมูลไม่สำเร็จ', 'error');
                    }
                })
                .catch(err => {
                    console.error("Quick Check-in Error:", err);
                    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
                });
        }
    });
}*/

// ฟังก์ชันสำหรับบันทึกชื่อย้อนหลังพร้อมเลือกสถานะ 
function showQuickEdit(stdId, name, no) {
    const dataNode = document.getElementById('server-data');
    const config = JSON.parse(dataNode.textContent);

    Swal.fire({
        title: 'บันทึกสถานะย้อนหลัง',
        text: `เลือกสถานะสำหรับ: ${name}`,
        icon: 'question',
        input: 'select',
        inputOptions: {
            'present': 'มาเรียน',
            'late': 'มาสาย',
            'leave': 'ลา',
            'absent': 'ขาดเรียน'
        },
        inputPlaceholder: 'เลือกสถานะ',
        showCancelButton: true,
        confirmButtonText: 'บันทึกข้อมูล',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        inputValidator: (value) => {
            if (!value) return 'กรุณาเลือกสถานะก่อนครับ'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.showLoading();
            fetch('/session/api/quick_attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('input[name="csrf_token"]').value
                },
                body: JSON.stringify({
                    student_id: stdId,
                    student_name: name,
                    student_number: no,
                    session_id: config.sessionId,
                    status: result.value
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'สำเร็จ!',
                            text: 'บันทึกข้อมูลย้อนหลังเรียบร้อย',
                            timer: 1500,
                            showConfirmButton: false
                        }).then(() => {
                            if (typeof loadAttendees === "function") {
                                loadAttendees(config.sessionId, config.isTeacher);
                            } else {
                                location.reload();
                            }
                        });
                    } else {
                        Swal.fire(
                            'ผิดพลาด',
                            data.message,
                            'error'
                        );
                    }
                });
        }
    });
}

// --- ระบบ Search & Filter ---
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchAttendee');
    const filterSelect = document.getElementById('filterSelect');
    const configNode = document.getElementById('server-data');

    if (searchInput && filterSelect && configNode) {
        const config = JSON.parse(configNode.textContent);

        searchInput.addEventListener('input', () => {
            loadAttendees(config.sessionId, config.isTeacher);
        });

        filterSelect.addEventListener('change', () => {
            loadAttendees(config.sessionId, config.isTeacher);
        });
    }
});
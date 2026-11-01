if (window.dashboardInterval) {
    clearInterval(window.dashboardInterval);
}

let lastTableKeyCycle = 0;

function runDashboardTick() {
    const now = new Date().getTime();
    const timers = document.querySelectorAll('.countdown-timer');

    timers.forEach(timerEl => {
        const row = timerEl.closest('tr');
        if (!row) return;

        const statusBadge = row.querySelector('[id^="status-badge-"]');
        const keyEl = row.querySelector('.dynamic-secret-key');

        const startStr = timerEl.getAttribute('data-start');
        const minutes = parseInt(timerEl.getAttribute('data-minutes'), 10);
        if (!startStr || isNaN(minutes)) return;

        const startTime = new Date(startStr).getTime();
        const expireTime = startTime + (minutes * 60 * 1000);
        const distance = expireTime - now;

        const isClosed = (statusBadge && statusBadge.innerText.trim().includes('ปิดรับแล้ว')) || distance < 0;

        if (isClosed) {
            const closedHTML = `<div class="d-inline-flex align-items-center px-3 py-1 rounded-pill bg-light text-muted border" style="white-space: nowrap;">
                                    <i class="bi bi-x-circle me-2"></i>
                                    <span class="fw-bold" style="font-size: 12px;">หมดเวลา</span>
                                </div>`;
            if (timerEl.innerHTML !== closedHTML) {
                timerEl.innerHTML = closedHTML;
                timerEl.className = "countdown-timer";
            }

            if (keyEl && !keyEl.innerHTML.includes('ปิดใช้งาน')) {
                keyEl.innerHTML = `<i class="bi bi-lock-fill me-1"></i> ปิดใช้งาน`;
                keyEl.className = "dynamic-secret-key badge bg-light text-muted border px-3 py-2 rounded-pill opacity-50";
                keyEl.style.letterSpacing = "normal";
            }

            if (statusBadge && !statusBadge.innerText.trim().includes('ปิดรับแล้ว')) {
                statusBadge.className = "badge px-3 py-2 rounded-pill bg-danger bg-opacity-10 text-danger";
                statusBadge.innerHTML = `<i class='bi bi-x-circle me-1'></i> ปิดรับแล้ว`;

                if (keyEl) {
                    const sessionId = keyEl.getAttribute('data-session-id');
                    const csrfTokenEl = document.querySelector('input[name="csrf_token"]');
                    const csrfToken = csrfTokenEl ? csrfTokenEl.value : '';

                    if (sessionId) {
                        fetch(`/session/close/${sessionId}`, {
                            method: 'POST',
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest',
                                'X-CSRFToken': csrfToken
                            }
                        })
                            .then(res => res.json())
                            .then(data => {
                                if (data.success) {
                                    console.log(`[Auto-Close] Session ${sessionId} closed in DB.`);
                                }
                            })
                            .catch(err => console.error("Auto-Close Error:", err));
                    }
                }
            }

            return;
        }

        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        const timeString = `<div class="d-inline-flex align-items-center px-3 py-1 rounded-pill bg-danger-subtle text-danger border border-danger-subtle" style="white-space: nowrap;">
                                <i class="bi bi-stopwatch me-2"></i>
                                <span class="fw-bold" style="font-size: 12px;">เหลือเวลา ${m}:${s < 10 ? '0' : ''}${s} น.</span>
                            </div>`;

        if (timerEl.innerHTML !== timeString) {
            timerEl.innerHTML = timeString;
            timerEl.className = "countdown-timer";
        }
    });

    const currentCycle = Math.floor(now / 30000);
    if (currentCycle !== lastTableKeyCycle) {
        lastTableKeyCycle = currentCycle;
        if (typeof updateTableKeys === 'function') {
            updateTableKeys();
        }
    }
}

window.dashboardInterval = setInterval(runDashboardTick, 1000);
runDashboardTick();

function updateTableKeys() {
    document.querySelectorAll('.dynamic-secret-key').forEach(el => {
        const row = el.closest('tr');
        const sessionId = el.getAttribute('data-session-id');
        const statusBadge = row.querySelector(`#status-badge-${sessionId}`);

        let isClosed = !statusBadge || statusBadge.innerText.includes('ปิดรับ');

        if (isClosed) {
            if (!el.innerHTML.includes('ปิดใช้งาน')) {
                el.innerHTML = `<i class="bi bi-lock-fill me-1"></i> ปิดใช้งาน`;
                el.className = "fw-semibold bg-dark bg-opacity-10 px-3 py-1.5 rounded-pill text-muted dynamic-secret-key opacity-50";
                el.style.letterSpacing = "normal";
                el.style.fontFamily = "inherit";
            }
            return;
        }

        fetch(`/session/get_current_key/${sessionId}`)
            .then(res => res.json())
            .then(data => {
                if (isClosed) return;

                if (el.innerText !== data.current_key) {
                    el.innerText = data.current_key;
                    el.className = "fw-semibold bg-dark bg-opacity-10 px-3 py-1.5 rounded-pill text-primary dynamic-secret-key";
                    el.style.letterSpacing = "1px";
                    el.style.fontFamily = "inherit";
                }
            })
            .catch(() => console.log("Key Sync Error"));
    });
}

// --- ฟังก์ชันแสดง QR Code ---
let qrTimerInterval;

function showQRCode(sessionId, roomName, startStr, minutes, roomUrl, prefix) {
    const levelPrefix = prefix || '';

    const checkinUrl = `${window.location.origin}/checkin/${sessionId}`;
    const qrUrl = `/session/generate_qr?data=${encodeURIComponent(checkinUrl)}`;

    Swal.fire({
        title: `<span style="color:#1a237e">ห้องเรียน ${levelPrefix}${roomName}</span>`,
        html: `
            <div class="bg-dark text-warning p-3 mb-3 rounded-4 shadow-sm border border-secondary">
                <small class="text-white-50 d-block mb-1">รหัสยืนยันสำหรับเข้าเช็คชื่อ (เปลี่ยนทุก 30 วิ)</small>
                <h1 id="swal-key-display" class="display-4 fw-bold mb-0" style="letter-spacing:8px; font-family: "Sarabun";">------</h1>
            </div>
            <div class="progress mb-2" style="height: 8px; width: 250px; margin: 0 auto; border-radius:10px; background-color: #e9ecef;">
                <div id="qr-progress-bar" class="progress-bar progress-bar-striped progress-bar-animated bg-primary" style="width: 100%"></div>
            </div>
            <p class="text-muted small mt-2"><i class="bi bi-info-circle me-1"></i> ให้นักเรียนสแกน QR Code และกรอกรหัสยืนยันเพื่อเช็คชื่อ</p>
        `,
        imageUrl: qrUrl,
        imageWidth: 280,
        imageHeight: 280,
        imageAlt: 'QR Code สำหรับเช็คชื่อ',
        didOpen: () => {
            const fetchKey = () => {
                fetch(`/session/get_current_key/${sessionId}`)
                    .then(res => res.json())
                    .then(data => {
                        const el = document.getElementById('swal-key-display');
                        if (el) el.innerText = data.current_key;
                    })
                    .catch(err => console.error("Error fetching key:", err));
            };

            fetchKey();

            qrTimerInterval = setInterval(() => {
                const now = Date.now();
                const secondsInCycle = Math.floor((now / 1000) % 30);
                const pb = document.getElementById('qr-progress-bar');

                if (pb) {
                    const remainingPercent = ((30 - secondsInCycle) / 30 * 100);
                    pb.style.width = remainingPercent + '%';

                    if (30 - secondsInCycle <= 10) {
                        pb.classList.remove('bg-primary');
                        pb.classList.add('bg-danger');
                    } else {
                        pb.classList.remove('bg-danger');
                        pb.classList.add('bg-primary');
                    }
                }

                if (secondsInCycle === 0) fetchKey();
            }, 100);
        },
        willClose: () => {
            if (qrTimerInterval) clearInterval(qrTimerInterval);
        }
    });
}

function generateRandomKey(inputId) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const el = document.getElementById(inputId);
    if (el) el.value = result;
}

function openEditModal(btn) {
    const sessionId = btn.dataset.sessionId;
    const idSubject = btn.dataset.idSubject;
    const subjectName = btn.dataset.subjectName;
    const actionUrl = btn.dataset.actionUrl;

    const csrfToken = document.querySelector('input[name="csrf_token"]')?.value
        || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
        || '';

    const esc = (value) =>
        String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));

    Swal.fire({
        html: `
            <!-- HEADER -->
            <div class="d-flex align-items-center justify-content-center gap-3 mb-4 mt-2">
                <div class="d-flex align-items-center justify-content-center rounded-4 flex-shrink-0"
                    style="width:46px; height:46px; background:linear-gradient(135deg, #fef3c7, #fde68a); color:#d97706;">
                    <i class="bi bi-pencil-square" style="font-size:1.35rem;"></i>
                </div>
                <div class="text-start">
                    <div class="fw-bold" style="color:#1e293b; font-size:1.15rem; line-height:1.3;">
                        แก้ไขข้อมูลห้องเรียน
                    </div>
                    <div class="fw-normal" style="color:#64748b; font-size:.78rem;">
                        ปรับปรุงรหัสวิชาและชื่อรายวิชา
                    </div>
                </div>
            </div>

            <!-- FORM -->
            <form id="editClassForm-${esc(sessionId)}" action="${esc(actionUrl)}" method="POST" class="text-start">
                <input type="hidden" name="csrf_token" value="${esc(csrfToken)}">

                <!-- Section Heading -->
                <div class="d-flex align-items-center gap-2 mb-3">
                    <i class="bi bi-card-list" style="color:#d97706; font-size:1.05rem;"></i>
                    <span class="fw-bold" style="color:#334155; font-size:.85rem;">รายละเอียดรายวิชา</span>
                    <div class="flex-grow-1" style="border-top:1px solid #e2e8f0;"></div>
                </div>

                <!-- Subject Code -->
                <div class="mb-3">
                    <label for="swal-id-subject" class="form-label d-flex align-items-center gap-1 mb-2 fw-semibold" style="color:#334155; font-size:.84rem;">
                        รหัสวิชา
                        <span style="color:#e11d48;">*</span>
                    </label>
                    <div class="input-group">
                        <span class="input-group-text border-end-0" style="background:#f8fafc; border-color:#e2e8f0; color:#d97706; border-radius:12px 0 0 12px; padding-inline:14px;">
                            <i class="bi bi-bookmark-fill" style="color:#d97706;"></i>
                        </span>
                        <input type="text" id="swal-id-subject" name="id_subject" class="form-control border-start-0 shadow-none"
                            value="${esc(idSubject)}" required placeholder="ตัวอย่าง: CS101"
                            style="min-height:46px; border-color:#e2e8f0; border-radius:0 12px 12px 0; color:#1e293b; font-size:.92rem; font-weight:600;">
                    </div>
                    <div class="mt-2 d-flex align-items-center gap-1" style="color:#64748b; font-size:.73rem;">
                        <i class="bi bi-info-circle"></i>
                        <span>ระบุรหัสวิชาที่ใช้ในระบบ</span>
                    </div>
                </div>

                <!-- Subject Name -->
                <div class="mb-3">
                    <label for="swal-subject-name" class="form-label d-flex align-items-center gap-1 mb-2 fw-semibold" style="color:#334155; font-size:.84rem;">
                        ชื่อวิชา
                        <span style="color:#e11d48;">*</span>
                    </label>
                    <div class="input-group">
                        <span class="input-group-text border-end-0" style="background:#f8fafc; border-color:#e2e8f0; color:#d97706; border-radius:12px 0 0 12px; padding-inline:14px;">
                            <i class="bi bi-journal-text" style="color:#d97706;"></i>
                        </span>
                        <input type="text" id="swal-subject-name" name="subject_name" class="form-control border-start-0 shadow-none"
                            value="${esc(subjectName)}" required placeholder="ตัวอย่าง: Data Structures"
                            style="min-height:46px; border-color:#e2e8f0; border-radius:0 12px 12px 0; color:#1e293b; font-size:.92rem; font-weight:500;">
                    </div>
                </div>

                <!-- Footer Hint -->
                <div class="d-flex align-items-start gap-2 mt-4 p-3 rounded-3" style="background:#fffbeb; border:1px solid #fde68a;">
                    <i class="bi bi-shield-check" style="color:#d97706; font-size:1rem;"></i>
                    <div style="color:#64748b; font-size:.78rem; line-height:1.6;">
                        ตรวจสอบข้อมูลให้ถูกต้องก่อนกดบันทึก
                    </div>
                </div>
            </form>
        `,

        showCancelButton: true,
        confirmButtonText: '<i class="bi bi-cloud-check-fill me-1"></i> บันทึกข้อมูล',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true,
        buttonsStyling: false,
        focusConfirm: false,

        width: '480px',
        padding: '1.35rem',
        background: '#ffffff',
        color: '#1e293b',

        customClass: {
            popup: 'rounded-4 border shadow-lg',
            htmlContainer: 'm-0 p-0',
            actions: 'gap-2 mt-3',
            confirmButton: 'btn rounded-pill px-4 py-2 fw-semibold',
            cancelButton: 'btn btn-light rounded-pill px-4 py-2 fw-medium border'
        },

        didOpen: (popup) => {
            popup.style.borderColor = '#e2e8f0';
            popup.style.boxShadow = '0 18px 50px rgba(79,70,229,.12)';
            popup.style.maxWidth = 'calc(100% - 24px)';

            const confirmBtn = popup.querySelector('.swal2-confirm');
            if (confirmBtn) {
                confirmBtn.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)';
                confirmBtn.style.color = '#ffffff';
                confirmBtn.style.border = 'none';
                confirmBtn.style.boxShadow = '0 4px 14px rgba(217, 119, 6, 0.35)';
                confirmBtn.style.transition = 'all .2s ease';

                confirmBtn.addEventListener('mouseenter', () => {
                    confirmBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)';
                    confirmBtn.style.boxShadow = '0 6px 18px rgba(217, 119, 6, 0.45)';
                    confirmBtn.style.transform = 'translateY(-0px)';
                });
                confirmBtn.addEventListener('mouseleave', () => {
                    confirmBtn.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)';
                    confirmBtn.style.boxShadow = '0 4px 14px rgba(217, 119, 6, 0.35)';
                    confirmBtn.style.transform = 'translateY(0)';
                });
            }

            const cancelBtn = popup.querySelector('.swal2-cancel');
            if (cancelBtn) {
                cancelBtn.style.background = '#ffffff';
                cancelBtn.style.color = '#475569';
                cancelBtn.style.border = '1px solid #e2e8f0';
                cancelBtn.style.transition = 'all .2s ease-in-out';

                // Hover Effect (เปลี่ยนเป็นสีเทาอ่อนละมุนๆ)
                cancelBtn.addEventListener('mouseenter', () => {
                    cancelBtn.style.background = '#f1f5f9';
                    cancelBtn.style.color = '#1e293b';
                    cancelBtn.style.borderColor = '#cbd5e1';
                });
                cancelBtn.addEventListener('mouseleave', () => {
                    cancelBtn.style.background = '#ffffff';
                    cancelBtn.style.color = '#475569';
                    cancelBtn.style.borderColor = '#e2e8f0';
                });
            }
        },

        preConfirm: () => {
            const idSub = document.getElementById('swal-id-subject').value.trim();
            const subName = document.getElementById('swal-subject-name').value.trim();

            if (!idSub || !subName) {
                Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
                return false;
            }

            document.getElementById(`editClassForm-${sessionId}`).submit();
        }
    });
}

function confirmDelete(sessionId, roomName, idSubject, subjectName) {
    const esc = (value) =>
        String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));

    Swal.fire({
        title: 'ยืนยันการลบห้องเรียน',
        icon: 'warning',
        iconColor: '#e11d48',

        html: `
            <div class="text-start px-1">

                <!-- 1. ข้อมูลห้องเรียน -->
                <div class="rounded-4 p-3 mb-3"
                    style="
                        background: linear-gradient(135deg, #f8faff 0%, #f5f3ff 100%);
                        border: 1px solid #e0e7ff;
                    ">

                    <!-- Metadata -->
                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                        <span class="d-inline-flex align-items-center gap-1 rounded-pill"
                            style="
                                background:#e0e7ff;
                                color:#4338ca;
                                font-size:.76rem;
                                font-weight:600;
                                padding: 4px 10px;
                                white-space: nowrap;
                            ">
                            <i class="bi bi-bookmark-fill" style="font-size: .72rem;"></i>
                            <span>${esc(idSubject)}</span>
                        </span>

                        <span class="text-secondary" style="font-size:.75rem;">
                            Session ID: ${esc(sessionId)}
                        </span>
                    </div>

                    <!-- Subject (รายวิชา - ปรับกล่องไอคอน 42x42px บาลานซ์กับห้องเรียน) -->
                    <div class="d-flex align-items-center gap-3 mb-3">
                        <div class="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                            style="
                                width:42px;
                                height:42px;
                                background:#e0e7ff;
                                color:#4f46e5;
                            ">
                            <i class="bi bi-journal-bookmark-fill" style="font-size:1.2rem;"></i>
                        </div>

                        <div class="flex-grow-1" style="min-width:0;">
                            <div class="text-secondary mb-1" style="font-size:.78rem;">
                                รายวิชา
                            </div>
                            <div class="fw-bold text-dark"
                                style="
                                    font-size:.98rem;
                                    line-height:1.4;
                                    overflow-wrap:anywhere;
                                ">
                                ${esc(subjectName)}
                            </div>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div style="border-top:1px solid #e0e7ff;" class="mb-3"></div>

                    <!-- Room (ห้องเรียนที่ต้องการลบ) -->
                    <div class="d-flex align-items-center gap-3">
                        <div class="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                            style="
                                width:42px;
                                height:42px;
                                background:#dbeafe;
                                color:#1d4ed8;
                            ">
                            <i class="bi bi-door-open-fill" style="font-size:1.2rem;"></i>
                        </div>

                        <div class="flex-grow-1" style="min-width:0;">
                            <div class="text-secondary mb-1" style="font-size:.78rem;">
                                ห้องเรียนที่ต้องการลบ
                            </div>
                            <div class="fw-bold text-dark"
                                style="
                                    font-size:.98rem;
                                    overflow-wrap:anywhere;
                                ">
                                ${esc(roomName)}
                            </div>
                        </div>
                    </div>

                </div>

                <!-- 2. Warning Box -->
                <div class="d-flex align-items-start gap-2 p-3 rounded-3"
                    style="
                        background:#fff1f2;
                        border:1px solid #ffe4e6;
                    ">
                    <i class="bi bi-exclamation-triangle-fill mt-1"
                    style="
                        color:#e11d48;
                        font-size:1.1rem;
                    "></i>

                    <div>
                        <div class="fw-bold mb-1" style="color:#9f1239; font-size:.88rem;">
                            การลบนี้ไม่สามารถย้อนกลับได้
                        </div>
                        <div style="color:#9f1239; font-size:.8rem; line-height:1.6;">
                            ข้อมูลห้องเรียนและประวัติการเช็คชื่อทั้งหมดจะถูกลบอย่างถาวร
                        </div>
                    </div>
                </div>

            </div>
        `,

        // 3. Action Buttons
        showCancelButton: true,
        showCloseButton: false,

        confirmButtonText: `
            <i class="bi bi-trash3-fill me-1"></i>
            ยืนยันการลบ
        `,
        cancelButtonText: `
            ยกเลิก
        `,

        reverseButtons: true,
        buttonsStyling: false,
        focusCancel: true,

        width: '460px',
        padding: '1.25rem',
        background: '#ffffff',

        customClass: {
            popup: 'rounded-4 border shadow-lg',
            title: 'fw-bold',
            htmlContainer: 'mt-2',
            actions: 'gap-2 mt-3',
            confirmButton:
                'btn btn-danger rounded-pill px-4 py-2 fw-semibold',
            cancelButton:
                'btn btn-light rounded-pill px-4 py-2 fw-medium border'
        },

        didOpen: (popup) => {
            popup.style.borderColor = '#f1f5f9';
            popup.style.boxShadow =
                '0 16px 48px rgba(15, 23, 42, 0.12)';
            popup.style.maxWidth = 'calc(100% - 24px)';

            const confirmBtn = popup.querySelector('.swal2-confirm');
            if (confirmBtn) {
                confirmBtn.style.background = 'linear-gradient(135deg, #fb7185, #e11d48)';
                confirmBtn.style.border = 'none';
                confirmBtn.style.boxShadow = '0 4px 12px rgba(225, 29, 72, 0.3)';
            }

            confirmBtn.onmouseenter = () => {
                confirmBtn.style.background = 'linear-gradient(135deg, #e11d48, #be123c)';
                confirmBtn.style.boxShadow = '0 6px 16px rgba(225, 29, 72, 0.4)';
            };
            confirmBtn.onmouseleave = () => {
                confirmBtn.style.background = 'linear-gradient(135deg, #fb7185, #e11d48)';
                confirmBtn.style.boxShadow = '0 4px 12px rgba(225, 29, 72, 0.3)';
            };

            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = '#f1f5f9';
                cancelBtn.style.color = '#1e293b';
                cancelBtn.style.borderColor = '#cbd5e1';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = '#ffffff';
                cancelBtn.style.color = '#475569';
                cancelBtn.style.borderColor = '#e2e8f0';
            });
        }

    }).then((result) => {
        if (result.isConfirmed) {
            const form = document.getElementById(
                'delete-form-' + sessionId
            );

            if (form) form.submit();
        }

    });
}

window.showDashboardAlert = function (category, message) {
    let titleText = 'การแจ้งเตือน';
    let iconType = 'info';
    let titleColor = '#1e3a8a';
    const messageText = String(message ?? '');
    let subText = messageText;

    const escapeHtml = (value) =>
        String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));

    if (category === 'success') {
        iconType = 'success';
        titleColor = '#15803d';

        if (messageText.includes('ยกเลิก')) {
            titleText = 'ยกเลิกรายการเรียบร้อย!';
            iconType = 'info';
            titleColor = '#2563eb';
        }
        else if (messageText.includes('ตั้งค่าโปรไฟล์สำเร็จ')) {
            titleText = 'ตั้งค่าโปรไฟล์สำเร็จ!';
        }
        else if (
            messageText.includes('เข้าสู่ระบบ') ||
            messageText.includes('ยินดีต้อนรับ')
        ) {
            titleText = 'เข้าสู่ระบบสำเร็จ!';
        }
        else if (messageText.includes('ออกจากระบบ')) {
            titleText = 'ออกจากระบบเรียบร้อย';
        }
        else if (messageText.includes('สร้าง')) {
            titleText = 'สร้างห้องเรียนสำเร็จ!';
        }
        else if (messageText.includes('ลบ')) {
            titleText = 'ลบห้องเรียนสำเร็จ!';
        }
        else if (
            messageText.includes('แก้ไข') ||
            messageText.includes('อัปเดต')
        ) {
            titleText = 'แก้ไขข้อมูลสำเร็จ!';
        }
        else {
            titleText = 'ดำเนินการสำเร็จ!';
        }

    } else if (category === 'danger' || category === 'error') {
        iconType = 'error';
        titleColor = '#b91c1c';
        titleText = 'เกิดข้อผิดพลาด!';

    } else if (category === 'warning') {
        iconType = 'warning';
        titleColor = '#c2410c';
        titleText = 'คำเตือน!';

    } else if (category === 'info') {
        iconType = 'info';
        titleColor = '#2563eb';

        if (messageText.includes('ยกเลิก')) {
            titleText = 'ยกเลิกรายการเรียบร้อย';
        } else {
            titleText = 'แจ้งเพื่อทราบ';
        }
    }

    Swal.fire({
        icon: iconType,

        html: `
            <div class="py-2">
                <h2 style="font-size: 1.5rem; font-weight: 800; color: ${titleColor}; margin-bottom: 8px;">
                    ${titleText}
                </h2>

                <p class="mt-3" style="font-size: 1.05rem; color: #64748b; font-weight: 400; margin: 0;">
                    ${escapeHtml(subText)}
                </p>
            </div>
        `,

        confirmButtonColor: '#6a9cff',
        confirmButtonText: 'เข้าใจแล้ว',
        timer: false,
        timerProgressBar: true,

        showClass: {
            popup: 'animate__animated animate__zoomIn animate__faster'
        },

        hideClass: {
            popup: 'animate__animated animate__fadeOut animate__faster'
        },

        customClass: {
            popup: 'rounded-4 shadow-lg border-0'
        }
    });
};

// Flatpickr และระบบกรองข้อมูลค้นหา
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const startParam = urlParams.get('start');
    const endParam = urlParams.get('end');

    const searchInput = document.getElementById('searchSession');
    const applyBtn = document.getElementById('applyFilter');
    const emptyRow = document.getElementById('emptyStateRow');
    const loader = document.getElementById('searchLoading');
    const message = document.getElementById('searchMessage');
    const rows = document.querySelectorAll('.session-row');

    let searchTimeout;

    const fpInstance = flatpickr("#dateRangePicker", {
        mode: "range",
        dateFormat: "Y-m-d",
        locale: "th",
        altInput: true,
        altFormat: "j M Y",
        defaultDate: startParam && endParam ? [startParam, endParam] : null,
        onReady: function (selectedDates, dateStr, instance) {
            if (!dateStr) instance.altInput.value = "เลือกช่วงวันที่...";
        }
    });

    function setUIState(mode) {
        if (mode === 'loading') {
            emptyRow?.classList.remove('d-none');
            loader?.classList.remove('d-none');
            message?.classList.add('d-none');
            rows.forEach(r => r.style.display = "none");
        } else if (mode === 'empty') {
            emptyRow?.classList.remove('d-none');
            loader?.classList.add('d-none');
            message?.classList.remove('d-none');
            rows.forEach(r => r.style.display = "none");
        } else {
            emptyRow?.classList.add('d-none');
            loader?.classList.add('d-none');
        }
    }

    function updateMessage(isSearch) {
        const icon = document.getElementById('stateIcon');
        const header = document.getElementById('stateHeader');
        const sub = document.getElementById('stateSubtext');

        if (isSearch) {
            if (icon)
                icon.className = "bi bi-search fs-1 d-block mb-3 text-primary";
            if (header)
                header.innerText = "ไม่พบข้อมูลห้องเรียนที่คุณค้นหา";
            if (sub)
                sub.innerText = "ลองตรวจสอบตัวสะกด หรือค้นหาด้วยชื่อวิชาดูอีกครั้ง";
        } else {
            if (icon)
                icon.className = "bi bi-inboxes fs-1 d-block mb-3 text-light";
            if (header)
                header.innerText = "ยังไม่มีห้องเรียนในระบบ";
            if (sub)
                sub.innerText = "กดปุ่ม 'สร้างห้องเช็คชื่อใหม่' เพื่อเริ่มต้นใช้งาน";
        }
    }

    searchInput?.addEventListener('keyup', function () {
        const filter = this.value.toLowerCase();
        setUIState('loading');
        clearTimeout(searchTimeout);

        searchTimeout = setTimeout(() => {
            let found = 0;
            rows.forEach(row => {
                const match = row.textContent.toLowerCase().includes(filter);
                if (match) {
                    row.style.display = "";
                    found++;
                }
            });

            if (found === 0) {
                updateMessage(filter.length > 0);
                setUIState('empty');
            } else {
                setUIState('show');
            }
        }, 400);
    });

    applyBtn?.addEventListener('click', function () {
        const selectedDates = fpInstance.selectedDates;
        if (selectedDates.length === 2) {
            setUIState('loading');
            Swal.fire({
                title: 'กำลังกรองข้อมูล...',
                html: 'ระบบกำลังดึงข้อมูล กรูณารอสักครู่',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const start = fpInstance.formatDate(selectedDates[0], "Y-m-d");
            const end = fpInstance.formatDate(selectedDates[1], "Y-m-d");
            window.location.href = `?start=${start}&end=${end}`;
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'เลือกวันที่ไม่ครบ!',
                text: 'โปรดเลือกวันที่เริ่มต้น และวันที่สิ้นสุดให้เรียบร้อย',
                confirmButtonText: 'รับทราบ',
                confirmButtonColor: '#0d6efd'
            });
        }
    });
});

// ระบบค้นหาและตัวกรองต่างๆ
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchSession');
    const clearBtn = document.getElementById('clearSearchSession');
    const applyBtn = document.getElementById('applyFilter');
    const emptyRow = document.getElementById('emptyStateRow');
    const loader = document.getElementById('searchLoading');
    const message = document.getElementById('searchMessage');
    const rows = document.querySelectorAll('.session-row');

    let searchTimeout;

    function setUIState(mode) {
        if (mode === 'loading') {
            emptyRow?.classList.remove('d-none');
            loader?.classList.remove('d-none');
            message?.classList.add('d-none');
            rows.forEach(r => r.style.display = "none");
        } else if (mode === 'empty') {
            emptyRow?.classList.remove('d-none');
            loader?.classList.add('d-none');
            message?.classList.remove('d-none');
            rows.forEach(r => r.style.display = "none");
        } else {
            emptyRow?.classList.add('d-none');
            loader?.classList.add('d-none');
        }
    }

    function updateMessage(isSearch) {
        const icon = document.getElementById('stateIcon');
        const header = document.getElementById('stateHeader');
        const sub = document.getElementById('stateSubtext');

        if (isSearch) {
            if (icon) icon.className = "bi bi-search fs-1 d-block mb-3 text-primary";
            if (header) header.innerText = "ไม่พบข้อมูลห้องเรียนที่คุณค้นหา";
            if (sub) sub.innerText = "โปรดตรวจสอบตัวสะกด หรือลองค้นหาด้วยรหัสวิชาอีกครั้งนะ";
        } else {
            if (icon) icon.className = "bi bi-inboxes fs-1 d-block mb-3 text-light";
            if (header) header.innerText = "ยังไม่มีห้องเรียนในระบบ";
            if (sub) sub.innerText = "กดปุ่ม 'สร้างห้องเช็คชื่อใหม่' เพื่อเริ่มต้นใช้งาน";
        }
    }

    function executeSearch() {
        const filter = searchInput ? searchInput.value.toLowerCase().trim() : '';

        if (clearBtn) {
            clearBtn.style.visibility = filter.length > 0 ? 'visible' : 'hidden';
        }

        setUIState('loading');
        clearTimeout(searchTimeout);

        const delay = filter === '' ? 0 : 300;

        searchTimeout = setTimeout(() => {
            let found = 0;
            rows.forEach(row => {
                const match = row.textContent.toLowerCase().includes(filter);
                if (match) {
                    row.style.display = "";
                    found++;
                } else {
                    row.style.display = "none";
                }
            });

            if (found === 0) {
                updateMessage(filter.length > 0);
                setUIState('empty');
            } else {
                setUIState('show');
            }
        }, delay);
    }

    if (searchInput) {
        searchInput.addEventListener('input', executeSearch);
    }

    if (clearBtn && searchInput) {
        clearBtn.addEventListener('mousedown', function (e) {
            e.preventDefault(); // ห้ามไม่ให้ช่องค้นหาหลุด Focus
            searchInput.value = '';
            executeSearch(); // รันค้นหาคืนค่าเดิมทันที
            searchInput.focus();
        });
    }

    applyBtn?.addEventListener('click', function () {
        const selectedDates = fp.selectedDates;
        if (selectedDates.length === 2) {
            setUIState('loading');
            Swal.fire({
                title: 'กำลังกรองข้อมูล...',
                html: 'ระบบกำลังดึงข้อมูลจ กรูณารอสักครู่',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const start = fp.formatDate(selectedDates[0], "Y-m-d");
            const end = fp.formatDate(selectedDates[1], "Y-m-d");
            window.location.href = `?start=${start}&end=${end}`;
        }
    });
});

if (!document.getElementById('dashboard-styles')) {
    const style = document.createElement('style');
    style.id = 'dashboard-styles';
    style.innerHTML = `
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .table tbody tr { transition: opacity 0.2s ease; }
    `;
    document.head.appendChild(style);
}


function setCheckinTime(mins) {
    const timeInput = document.getElementById('allowedMinutesInput');
    if (timeInput) timeInput.value = mins;
}

document.getElementById('createClassForm')?.addEventListener('submit', function (e) {
    const btn = document.getElementById('submitCreateClassBtn');
    const text = document.getElementById('btnTextClass');
    const spinner = document.getElementById('btnSpinnerClass');

    if (this.checkValidity()) {
        btn.disabled = true;
        text.textContent = "กำลังสร้าง...";
        spinner.classList.remove('d-none');
    }
});

function showQuickDetail(studentId, sessionId) {
    Swal.fire({
        title: 'กำลังดึงข้อมูล...',
        allowOutsideClick: false,
        showCloseButton: false,
        didOpen: () => Swal.showLoading()
    });

    fetch(`/api/student_quick_view/${studentId}/${sessionId}`)
        .then(res => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.json();
        })
        .then(data => {
            const esc = (value) =>
                String(value ?? '').replace(/[&<>"']/g, char => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[char]));

            const statusConfig = {
                present: {
                    label: 'มาเรียน',
                    color: '#15803d',
                    bgLight: '#f0fdf4',
                    accentBg: '#dcfce7',
                    textColor: '#166534',
                    icon: 'bi-check-circle-fill'
                },
                late: {
                    label: 'มาสาย',
                    color: '#b45309',
                    bgLight: '#fffbeb',
                    accentBg: '#fef3c7',
                    textColor: '#92400e',
                    icon: 'bi-clock-fill'
                },
                leave: {
                    label: 'ลา',
                    color: '#0e7490',
                    bgLight: '#ecfeff',
                    accentBg: '#cffafe',
                    textColor: '#155e75',
                    icon: 'bi-envelope-paper-fill'
                },
                absent: {
                    label: 'ขาดเรียน',
                    color: '#be123c',
                    bgLight: '#fff1f2',
                    accentBg: '#ffe4e6',
                    textColor: '#9f1239',
                    icon: 'bi-x-circle-fill'
                }
            };

            const currentStatus = statusConfig[data.status] || {
                label: 'ไม่ระบุ',
                color: '#4b5563',
                bgLight: '#f9fafb',
                accentBg: '#e5e7eb',
                textColor: '#374151',
                icon: 'bi-question-circle-fill'
            };

            const html = `
                <div class="quick-detail text-start"
                     style="
                        color:#1e293b;
                        font-size:.9rem;
                        font-family:inherit;
                     ">

                    <div class="d-flex align-items-center gap-3 p-3 rounded-4 mb-3"
                         style="
                            background:linear-gradient(
                                135deg,
                                #eff6ff 0%,
                                #f5f3ff 55%,
                                #faf5ff 100%
                            );
                            border:1px solid #dbeafe;
                            box-shadow:0 3px 12px rgba(99,102,241,.045);
                         ">

                        <div class="d-flex align-items-center justify-content-center
                                    rounded-4 flex-shrink-0"
                             style="
                                width:56px;
                                height:56px;
                                background:linear-gradient(
                                    135deg,
                                    #3b82f6,
                                    #6366f1,
                                    #8b5cf6
                                );
                                color:#ffffff;
                                box-shadow:0 5px 14px rgba(99,102,241,.22);
                             ">
                            <i class="bi bi-person-fill"
                               style="font-size:1.8rem;"></i>
                        </div>

                        <div class="flex-grow-1" style="min-width:0;">

                            <div class="fw-bold mb-2 text-break"
                                 style="
                                    font-size:1.05rem;
                                    line-height:1.5;
                                    color:#1e1b4b;
                                 ">
                                ${esc(data.full_name)}
                            </div>

                            <div class="d-flex flex-wrap gap-2">

                                <span class="d-inline-flex align-items-center gap-1
                                             px-2 py-1 rounded-pill"
                                      style="
                                        background:#ffffff;
                                        border:1px solid #dbeafe;
                                        color:#1d4ed8;
                                        font-size:.76rem;
                                      ">
                                    <i class="bi bi-credit-card"></i>
                                    ${esc(data.id)}
                                </span>

                                <span class="d-inline-flex align-items-center gap-1
                                             px-2 py-1 rounded-pill"
                                      style="
                                        background:#ffffff;
                                        border:1px solid #e0e7ff;
                                        color:#4338ca;
                                        font-size:.76rem;
                                      ">
                                    <i class="bi bi-door-open-fill"
                                       style="font-size:1.15rem;"></i>
                                    ${esc(data.student_room_info)}
                                </span>

                                <span class="d-inline-flex align-items-center gap-1
                                             px-2 py-1 rounded-pill"
                                      style="
                                        background:#ffffff;
                                        border:1px solid #e9d5ff;
                                        color:#7e22ce;
                                        font-size:.76rem;
                                      ">
                                    <i class="bi bi-list-ol"></i>
                                    เลขที่ ${esc(data.number)}
                                </span>

                            </div>
                        </div>
                    </div>

                    <div class="d-flex align-items-center gap-2 mb-2 px-1">

                        <div class="d-flex align-items-center justify-content-center
                                    rounded-3"
                             style="
                                width:32px;
                                height:32px;
                                background:#eef2ff;
                                color:#4f46e5;
                             ">
                            <i class="bi bi-grid-1x2-fill"></i>
                        </div>

                        <div>
                            <div class="fw-bold"
                                 style="font-size:.9rem;color:#1e293b;">
                                รายละเอียดการเรียน
                            </div>
                            <div style="font-size:.73rem;color:#94a3b8;">
                                ข้อมูลรายวิชาและการเข้าเรียน
                            </div>
                        </div>
                    </div>


                    <div class="p-3 rounded-4 mb-2"
                         style="
                            background:linear-gradient(
                                115deg,
                                #ffffff,
                                #f8faff
                            );
                            border:1px solid #e2e8f0;
                            box-shadow:0 2px 8px rgba(15,23,42,.025);
                         ">

                        <div class="d-flex align-items-center gap-3">

                            <div class="d-flex align-items-center justify-content-center
                                        rounded-4 flex-shrink-0"
                                 style="
                                    width:46px;
                                    height:46px;
                                    background:#eef2ff;
                                    color:#4f46e5;
                                    border:1px solid #e0e7ff;
                                 ">
                                <i class="bi bi-journal-bookmark-fill"
                                   style="font-size:1.25rem;"></i>
                            </div>

                            <div class="flex-grow-1" style="min-width:0;">

                                <div class="d-flex align-items-center gap-1 mb-1"
                                     style="font-size:.76rem;color:#64748b;">
                                    <i class="bi bi-book"></i>
                                    วิชาที่เรียน
                                </div>

                                <div class="fw-bold text-break"
                                     style="
                                        font-size:.95rem;
                                        line-height:1.55;
                                        color:#1e293b;
                                     ">
                                    ${esc(data.subject)}
                                </div>

                            </div>
                        </div>
                    </div>


                    <div class="row g-2 mb-3">

                        <!-- Classroom -->
                        <div class="col-6">
                            <div class="p-3 rounded-4 h-100"
                                 style="
                                    background:linear-gradient(
                                        145deg,
                                        #ffffff,
                                        #f0fdfa
                                    );
                                    border:1px solid #ccfbf1;
                                 ">

                                <div class="d-flex align-items-center
                                            justify-content-center
                                            rounded-3 mb-2"
                                     style="
                                        width:40px;
                                        height:40px;
                                        background:#ccfbf1;
                                        color:#0f766e;
                                     ">
                                    <i class="bi bi-door-open-fill"
                                       style="font-size:1.15rem;"></i>
                                </div>

                                <div class="mb-1"
                                     style="
                                        font-size:.75rem;
                                        color:#64748b;
                                     ">
                                    ห้องเรียน
                                </div>

                                <div class="fw-bold text-break"
                                     style="
                                        font-size:.9rem;
                                        line-height:1.5;
                                        color:#134e4a;
                                     ">
                                    ${esc(data.session_room)}
                                </div>
                            </div>
                        </div>

                        <div class="col-6">
                            <div class="p-3 rounded-4 h-100"
                                 style="
                                    background:linear-gradient(
                                        145deg,
                                        #ffffff,
                                        #fff7ed
                                    );
                                    border:1px solid #fed7aa;
                                 ">

                                <div class="d-flex align-items-center
                                            justify-content-center
                                            rounded-3 mb-2"
                                     style="
                                        width:40px;
                                        height:40px;
                                        background:#ffedd5;
                                        color:#c2410c;
                                     ">
                                    <i class="bi bi-person-badge-fill"
                                       style="font-size:1.15rem;"></i>
                                </div>

                                <div class="mb-1"
                                     style="
                                        font-size:.75rem;
                                        color:#64748b;
                                     ">
                                    ครูผู้สอน
                                </div>

                                <div class="fw-bold text-break"
                                     style="
                                        font-size:.9rem;
                                        line-height:1.5;
                                        color:#7c2d12;
                                     ">
                                    ${esc(data.teacher)}
                                </div>
                            </div>
                        </div>

                    </div>

                    <div class="rounded-4 p-3"
                         style="
                            background:linear-gradient(
                                135deg,
                                ${currentStatus.bgLight} 0%,
                                #ffffff 125%
                            );
                            border:1px solid ${currentStatus.color}40;
                            box-shadow:0 4px 16px rgba(15,23,42,.035);
                         ">

                        <!-- Status Heading -->
                        <div class="d-flex align-items-center gap-2 mb-3">

                            <div class="d-flex align-items-center
                                        justify-content-center rounded-3"
                                 style="
                                    width:34px;
                                    height:34px;
                                    background:${currentStatus.accentBg};
                                    color:${currentStatus.textColor};
                                 ">
                                <i class="bi bi-calendar2-check-fill"></i>
                            </div>

                            <div class="flex-grow-1">
                                <div class="fw-bold"
                                     style="
                                        font-size:.88rem;
                                        color:#1e293b;
                                     ">
                                    ผลการบันทึกเวลาเรียน
                                </div>

                                <div style="
                                    font-size:.73rem;
                                    color:#64748b;
                                ">
                                    สถานะการเข้าเรียนของนักเรียน
                                </div>
                            </div>

                            <i class="bi bi-patch-check-fill"
                               style="
                                    color:${currentStatus.color};
                                    font-size:1.15rem;
                               "></i>
                        </div>

                        <div class="text-center rounded-4 py-3 px-2"
                             style="
                                background:rgba(255,255,255,.78);
                                border:1px solid ${currentStatus.color}25;
                             ">

                            <div class="d-inline-flex align-items-center
                                        justify-content-center gap-2
                                        px-4 py-2 rounded-pill mb-3"
                                 style="
                                    background:${currentStatus.accentBg};
                                    border:1px solid ${currentStatus.color}30;
                                    color:${currentStatus.textColor};
                                 ">

                                <i class="bi ${currentStatus.icon}"
                                   style="font-size:1.25rem;"></i>

                                <span class="fw-bold"
                                      style="font-size:1.3rem;">
                                    ${currentStatus.label}
                                </span>
                            </div>

                            <div>
                                <span class="d-inline-flex
                                             align-items-center
                                             justify-content-center
                                             flex-wrap gap-2
                                             px-3 py-2 rounded-3"
                                      style="
                                        background:#ffffff;
                                        border:1px solid #e2e8f0;
                                        color:#475569;
                                        font-size:.8rem;
                                      ">

                                    <span class="d-inline-flex align-items-center gap-1">
                                        <i class="bi bi-clock-history"
                                           style="
                                                color:#7c3aed;
                                                font-size:.95rem;
                                           "></i>

                                        เวลาบันทึก
                                    </span>

                                    <span class="fw-bold"
                                          style="color:#1e293b;">
                                        ${esc(data.check_time)}
                                    </span>
                                </span>
                            </div>

                        </div>

                    </div>

                    <!-- Footer -->
                    <div 
                    class="d-flex align-items-center
                    justify-content-center gap-1 mt-3"
                        style="
                        font-size:.72rem;
                        color:#94a3b8;
                        ">
                        <i class="bi bi-shield-check"
                        style="color:#64748b;"></i>
                        ข้อมูลการบันทึกเข้าเรียน
                    </div>

                </div>
            `;

            Swal.fire({
                html: html,

                width: '620px',
                padding: '1.25rem',
                background: '#ffffff',
                color: '#1e293b',
                showCloseButton: false,

                showConfirmButton: true,
                confirmButtonText: `
                    ปิดหน้าต่าง
                `,

                buttonsStyling: false,

                customClass: {
                    popup: 'rounded-4 border shadow-lg',
                    htmlContainer: 'mt-0',
                    confirmButton:
                        'btn rounded-pill px-4 py-2 mt-3 fw-semibold'
                },

                didOpen: (popup) => {
                    popup.style.border = '1px solid #e0e7ff';
                    popup.style.boxShadow =
                        '0 18px 55px rgba(79,70,229,.13)';
                    popup.style.maxWidth = 'calc(100% - 24px)';

                    const btn = popup.querySelector('.swal2-confirm');

                    if (btn) {
                        btn.style.background =
                            'linear-gradient(135deg, #4f46e5, #7c3aed)';
                        btn.style.color = '#ffffff';
                        btn.style.border = 'none';
                        btn.style.boxShadow =
                            '0 5px 14px rgba(99,102,241,.25)';
                        btn.style.transition = 'all .2s ease';
                    }
                }
            });
        })
        .catch(err => {
            console.error('Quick detail error:', err);

            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง',

                showCloseButton: false,
                confirmButtonText: 'ตกลง',
                buttonsStyling: false,

                customClass: {
                    popup: 'rounded-4 border-0 shadow-lg',
                    confirmButton:
                        'btn rounded-pill px-4 py-2 fw-semibold'
                },

                didOpen: (popup) => {
                    popup.style.border = '1px solid #ffe4e6';

                    const btn = popup.querySelector('.swal2-confirm');

                    if (btn) {
                        btn.style.background =
                            'linear-gradient(135deg, #e11d48, #f43f5e)';
                        btn.style.color = '#ffffff';
                        btn.style.border = 'none';
                    }
                }
            });
        });
}

// Function Name ......
document.addEventListener('DOMContentLoaded', function () {
    const dateInput = document.getElementById('history-date-picker');
    const searchInput = document.getElementById('history-search-input');
    const tbody = document.getElementById('history-table-body');
    const calendarWrapper = document.getElementById('calendar-wrapper');

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted fw-medium">
                    <i class="bi bi-calendar-range fs-3 d-block mb-2 text-primary opacity-75"></i>
                    โปรดเลือกช่วงวันที่ด้านบน เพื่อเรียกดูประวัติการเข้าเรียนย้อนหลัง
                </td>
            </tr>
        `;
    }

    if (!dateInput || !tbody) return;

    const currentSessionId = tbody.getAttribute('data-session-id') || 1;
    const currentRoomTag = tbody.getAttribute('data-room-tag') || '-';

    let cachedAttendees = [];
    let searchTimeout = null;

    // ฟังก์ชันเลือกช่วงวันที่ต่างๆ
    if (calendarWrapper && dateInput) {
        flatpickr(calendarWrapper, {
            wrap: true,
            locale: 'th',
            mode: 'range',
            dateFormat: 'Y-m-d',
            conjunction: ' ถึง ',

            defaultDate: [new Date(), new Date()],

            onReady: function (selectedDates, dateStr, instance) {
                const clearBtn = document.getElementById('calendar-clear-btn');
                if (selectedDates.length > 0) {
                    const startDay = selectedDates[0].getDate();
                    const startMonth = instance.l10n.months.longhand[selectedDates[0].getMonth()];
                    const startYear = selectedDates[0].getFullYear() + 543;

                    dateInput.value = `${startDay} ${startMonth} ${startYear}`;

                    if (clearBtn) clearBtn.classList.add('d-none');

                    const startDate = instance.formatDate(selectedDates[0], 'Y-m-d');
                    fetchHistoryRangeData(startDate, startDate);
                }
            },

            onChange: function (selectedDates, dateStr, instance) {
                const clearBtn = document.getElementById('calendar-clear-btn');

                if (selectedDates.length === 2) {
                    if (searchInput) searchInput.value = '';

                    const startDate = instance.formatDate(selectedDates[0], 'Y-m-d');
                    const endDate = instance.formatDate(selectedDates[1], 'Y-m-d');
                    fetchHistoryRangeData(startDate, endDate);

                    const startDay = selectedDates[0].getDate();
                    const startMonth = instance.l10n.months.longhand[selectedDates[0].getMonth()];
                    const startYear = selectedDates[0].getFullYear() + 543;

                    const endDay = selectedDates[1].getDate();
                    const endMonth = instance.l10n.months.longhand[selectedDates[1].getMonth()];
                    const endYear = selectedDates[1].getFullYear() + 543;

                    let finalThaiText = '';

                    if (startDate === endDate) {
                        finalThaiText = `${startDay} ${startMonth} ${startYear}`;
                        if (clearBtn) clearBtn.classList.add('d-none');
                    } else {
                        finalThaiText = `${startDay} ${startMonth} ${startYear} ถึง ${endDay} ${endMonth} ${endYear}`;
                        if (clearBtn) clearBtn.classList.remove('d-none');
                    }

                    setTimeout(() => {
                        dateInput.value = finalThaiText;
                    }, 10);
                }

                else if (selectedDates.length === 0) {
                    if (searchInput) searchInput.value = '';
                    cachedAttendees = [];
                    if (clearBtn) clearBtn.classList.add('d-none');

                    instance.setDate([new Date(), new Date()], false);

                    const todayObj = new Date();
                    const tDay = todayObj.getDate();
                    const tMonth = instance.l10n.months.longhand[todayObj.getMonth()];
                    const tYear = todayObj.getFullYear() + 543;
                    const fallbackThaiText = `${tDay} ${tMonth} ${tYear}`;

                    const todayStr = instance.formatDate(todayObj, 'Y-m-d');
                    fetchHistoryRangeData(todayStr, todayStr);

                    setTimeout(() => {
                        dateInput.value = fallbackThaiText;
                    }, 15);
                }
            }
        });
    }

    function fetchHistoryRangeData(start, end) {
        const calLoader = document.getElementById('calendar-loader');

        if (calLoader) calLoader.classList.remove('d-none');

        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5 text-muted">
                    <div class="spinner-border text-primary mb-2" role="status" style="width: 2rem; height: 2rem;"></div>
                    <div class="small fw-semibold">กำลังคำนวณและดึงข้อมูลประวัติช่วงเวลา...</div>
                </td>
            </tr>
        `;

        const hostUrl = window.location.origin;
        const finalApiUrl = `${hostUrl}/api/history/${currentSessionId}?start_date=${start}&end_date=${end}`;

        fetch(finalApiUrl)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (calLoader) calLoader.classList.add('d-none');

                if (!data.success) {
                    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">❌ เกิดข้อผิดพลาดจากระบบ: ${data.error}</td></tr>`;
                    return;
                }

                cachedAttendees = data.attendees || [];
                renderTable(cachedAttendees, start, end);
            })
            .catch(error => {
                console.error('Fetch Error:', error);

                if (calLoader) calLoader.classList.add('d-none');
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้</td></tr>`;
            });
    }

    function renderTable(studentsList, start, end) {
        if (!tbody) return;

        if (studentsList && studentsList.length > 0) {
            studentsList.sort((a, b) => {
                const idA = parseInt(a.student_id, 10) || 0;
                const idB = parseInt(b.student_id, 10) || 0;
                return idA - idB;
            });
        }

        if (studentsList.length === 0) {
            const todayObj = new Date();
            const yyyy = todayObj.getFullYear();
            const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
            const dd = String(todayObj.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;

            const thaiMonthsFull = [
                "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
                "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
            ];
            const currentThaiTextToday = `${todayObj.getDate()} ${thaiMonthsFull[todayObj.getMonth()]} ${yyyy + 543}`;

            if (start === todayStr || dateInput.value.includes(currentThaiTextToday)) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-5 text-muted" style="font-family: 'Inter', 'Sarabun', sans-serif;">
                            <i class="bi bi-calendar-check fs-3 d-block mb-2 text-secondary opacity-50"></i>
                            <div class="fw-semibold text-dark mb-1" style="font-size: 0.9rem;">ยังไม่มีข้อมูลการบันทึกในวันนี้</div>
                            <div class="text-muted italic opacity-75" style="font-size: 0.75rem;">
                                เลือกช่วงวันที่ใน<strong>ปฏิทินด้านบน</strong>เพื่อตรวจสอบประวัติข้อมูลย้อนหลังได้ทันที
                            </div>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-5 text-muted" style="font-family: 'Inter', 'Sarabun', sans-serif;">
                            <i class="bi bi-calendar-x fs-3 d-block mb-2 text-secondary opacity-75"></i>
                            ไม่พบบันทึกการอัปเดตสถานะล่าสุดในช่วงเวลาดังกล่าว
                        </td>
                    </tr>
                `;
            }
            return;
        }

        let rowsHtml = '';
        studentsList.forEach(student => {
            let badgeClass = 'bg-secondary';
            if (student.status === 'present') badgeClass = 'bg-success-subtle text-success border border-success-subtle';
            else if (student.status === 'late') badgeClass = 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
            else if (student.status === 'leave') badgeClass = 'bg-info-subtle text-info-emphasis border border-info-subtle';
            else if (student.status === 'absent') badgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';

            const displayRoom = student.room_tag || currentRoomTag || '-';

            rowsHtml += `
                <tr class="align-middle">
                    <td class="text-center fw-semibold" style="font-family: 'Inter', 'Sarabun', sans-serif;">${student.no}</td>
                    <td class="text-center small" style="font-family: 'Inter', 'Sarabun', sans-serif;">${student.student_id}</td>
                    <td class="fw-medium" style="font-family: 'Inter', 'Sarabun', sans-serif;">${student.name}</td>
                    <td class="text-center text-secondary small fw-bold" style="font-family: 'Inter', 'Sarabun', sans-serif;">${displayRoom}</td>
                    
                    <td class="text-center" style="font-family: 'Inter', 'Sarabun', sans-serif;">
                        <span class="badge rounded-pill px-3 py-1.5 ${badgeClass}" style="font-size: 0.8rem;">
                            ${translateStatus(student.status)}
                        </span>
                    </td>

                    <td class="text-center text-muted" style="font-family: 'Inter', 'Sarabun', sans-serif;">
                        <div class="fw-semibold text-dark" style="font-size: 0.8rem; letter-spacing: -0.01em;">${student.date_only}</div>
                        <div style="font-size: 0.75rem; letter-spacing: 0.02em;">${student.check_in_time}</div>
                    </td>

                    <td class="text-center text-nowrap text-muted" style="font-family: 'Inter', 'Sarabun', sans-serif;">
                        <div class="fw-semibold text-dark" style="font-size: 0.8rem; letter-spacing: -0.01em;">${student.updated_date_only}</div>
                        <div style="font-size: 0.75rem; letter-spacing: 0.02em;">${student.updated_time}</div>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = rowsHtml;
    }

    if (searchInput) {
        const searchClearBtn = document.getElementById('search-clear-btn');

        searchInput.addEventListener('input', function () {
            const keyword = this.value.toLowerCase().trim();
            const rawDates = dateInput.value.split(' ถึง ');
            const startStr = rawDates[0] || '';
            const endStr = rawDates[1] || startStr;

            if (keyword.length > 0) {
                if (searchClearBtn) searchClearBtn.classList.remove('d-none');
            } else {
                if (searchClearBtn) searchClearBtn.classList.add('d-none');
            }

            clearTimeout(searchTimeout);

            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5 text-muted">
                        <div class="spinner-border text-secondary mb-2" role="status" style="width: 1.5rem; height: 1.5rem;"></div>
                        <div class="small italic text-opacity-75">กำลังค้นหาบันทึกเวลาล่าสุด...</div>
                    </td>
                </tr>
            `;

            searchTimeout = setTimeout(() => {
                if (startStr === '' && cachedAttendees.length === 0 && keyword !== '') {
                    const hostUrl = window.location.origin;
                    const finalApiUrl = `${hostUrl}/api/history/${currentSessionId}?start_date=&end_date=`;

                    fetch(finalApiUrl)
                        .then(response => response.json())
                        .then(data => {
                            if (data.success) {
                                cachedAttendees = data.attendees || [];
                                const filteredStudents = cachedAttendees.filter(student => {
                                    return student.name.toLowerCase().includes(keyword) ||
                                        student.student_id.toString().includes(keyword);
                                });
                                renderTable(filteredStudents, startStr, endStr);
                            } else {
                                renderTable([], startStr, endStr);
                            }
                        })
                        .catch(() => renderTable([], startStr, endStr));
                }
                else {
                    const filteredStudents = cachedAttendees.filter(student => {
                        return student.name.toLowerCase().includes(keyword) ||
                            student.student_id.toString().includes(keyword);
                    });
                    renderTable(filteredStudents, startStr, endStr);
                }
            }, 300);
        });

        if (searchClearBtn) {
            searchClearBtn.addEventListener('click', function () {
                searchInput.value = '';
                this.classList.add('d-none');
                searchInput.focus();

                const rawDates = dateInput.value.split(' ถึง ');
                const startStr = rawDates[0] || '';
                const endStr = rawDates[1] || startStr;

                if (startStr === '') {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center py-5 text-muted fw-medium">
                                <i class="bi bi-calendar-range fs-3 d-block mb-2 text-primary opacity-75"></i>
                                โปรดเลือกช่วงวันที่ด้านบน เพื่อเรียกดูประวัติการเข้าเรียนย้อนหลัง
                            </td>
                        </tr>
                    `;
                } else {
                    renderTable(cachedAttendees, startStr, endStr);
                }
            });
        }
    }

    function translateStatus(status) {
        const mapping = { 'present': 'มาเรียน', 'late': 'มาสาย', 'leave': 'ลา', 'absent': 'ขาดเรียน' };
        return mapping[status] || status;
    }

    function formatThaiDate(dateStr) {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        } catch {
            return dateStr;
        }
    }
});
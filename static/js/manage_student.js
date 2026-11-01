document.addEventListener("DOMContentLoaded", function () {
    const openAddStudentBtn = document.getElementById("openAddStudentAlert");
    const classFilter = document.getElementById("classFilter");

    if (!openAddStudentBtn) return;

    function getSelectedClassDefaults() {
        const selectedClass = classFilter?.value || "all";

        let studentLevel = "";
        let studentRoom = "";
        let educationLevel = "มัธยมศึกษา";

        if (selectedClass !== "all") {
            const match = selectedClass.match(
                /(\d+)\s*\/\s*([A-Za-z0-9ก-๙]+)/
            );

            if (match) {
                studentLevel = match[1];
                studentRoom = match[2];
            }

            if (
                selectedClass.includes("ป.") ||
                selectedClass.includes("ประถม")
            ) {
                educationLevel = "ประถมศึกษา";
            }
        }

        return {
            studentLevel,
            studentRoom,
            educationLevel
        };
    }

    function addHiddenField(form, name, value) {
        const input = document.createElement("input");

        input.type = "hidden";
        input.name = name;
        input.value = String(value ?? "");

        form.appendChild(input);
    }

    openAddStudentBtn.addEventListener("click", async function () {
        const actionUrl = this.dataset.url;
        const defaults = getSelectedClassDefaults();

        if (!actionUrl) {
            console.error(
                "Missing add-student URL on #openAddStudentAlert."
            );

            await Swal.fire({
                icon: "error",
                title: "ไม่สามารถเปิดฟอร์มได้",
                text: "ไม่พบปลายทางสำหรับบันทึกข้อมูลนักเรียน",
                confirmButtonText: "ตกลง"
            });

            return;
        }

        const result = await Swal.fire({
            title: ``,

            html: `
            <div class="text-start"
                style="font-family:'Sarabun',sans-serif;">

                <div class="d-flex align-items-center justify-content-start gap-2 mb-4 w-100">
                    <span
                        class="d-inline-flex align-items-center justify-content-center rounded-3"
                        style="
                            width:42px;
                            height:42px;
                            background:#eef2ff;
                            color:#4f46e5;
                            flex-shrink:0;
                        ">
                        <i class="bi bi-person-plus-fill fs-5"></i>
                    </span>

                    <span class="fw-bold text-dark" style="font-size:1.25rem;">
                        เพิ่มข้อมูลนักเรียน
                    </span>
                </div>

                <div
                    class="text-start"
                    style="font-family:'Sarabun',sans-serif;">

                    <div class="mb-3">
                        <label
                            for="swalAddStudentName"
                            class="form-label small fw-semibold text-secondary">
                            ชื่อ-นามสกุล
                        </label>

                        <input
                            id="swalAddStudentName"
                            class="form-control"
                            type="text"
                            maxlength="150"
                            placeholder="เช่น เด็กชายมานะ ใจดี"
                            autocomplete="name">
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-7">
                            <label
                                for="swalAddStudentId"
                                class="form-label small fw-semibold text-secondary">
                                รหัสนักเรียน
                            </label>

                            <input
                                id="swalAddStudentId"
                                class="form-control"
                                type="text"
                                maxlength="6"
                                placeholder="เช่น 12345"
                                inputmode="numeric">
                        </div>

                        <div class="col-5">
                            <label
                                for="swalAddStudentNumber"
                                class="form-label small fw-semibold text-secondary">
                                เลขที่
                            </label>

                            <input
                                id="swalAddStudentNumber"
                                class="form-control"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="เช่น 1">
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-5">
                            <label
                                for="swalAddEducationLevel"
                                class="form-label small fw-semibold text-secondary">
                                ระดับการศึกษา
                            </label>

                            <select
                                id="swalAddEducationLevel"
                                class="form-select">

                                <option value="มัธยมศึกษา">
                                    มัธยมศึกษา (ม.)
                                </option>

                                <option value="ประถมศึกษา">
                                    ประถมศึกษา (ป.)
                                </option>
                            </select>
                        </div>

                        <div class="col-3">
                            <label
                                for="swalAddStudentLevel"
                                class="form-label small fw-semibold text-secondary">
                                ชั้น
                            </label>

                            <input
                                id="swalAddStudentLevel"
                                class="form-control"
                                type="text"
                                maxlength="20"
                                placeholder="เช่น 6">
                        </div>

                        <div class="col-4">
                            <label
                                for="swalAddStudentRoom"
                                class="form-label small fw-semibold text-secondary">
                                ห้อง
                            </label>

                            <input
                                id="swalAddStudentRoom"
                                class="form-control"
                                type="text"
                                maxlength="20"
                                placeholder="เช่น 2">
                        </div>
                    </div>

                    <div class="mb-2">
                        <label
                            for="swalAddStudentSchool"
                            class="form-label small fw-semibold text-secondary">
                            ชื่อสถานศึกษา
                        </label>

                        <input
                            id="swalAddStudentSchool"
                            class="form-control"
                            type="text"
                            maxlength="150"
                            placeholder="เช่น โรงเรียนใจดี">
                    </div>

                    <div class="small text-secondary mt-3">
                        <i class="bi bi-info-circle me-1"></i>

                        ${classFilter && classFilter.value !== "all"
                    ? "ระบบเติมระดับชั้นและห้องตามตัวกรองที่เลือกไว้ให้แล้ว"
                    : "กรอกข้อมูลให้ครบถ้วนก่อนบันทึก"
                }
                    </div>
                </div>
            </div>
            `,

            width: "620px",
            padding: "1.5rem",

            showCancelButton: true,
            showCloseButton: true,

            confirmButtonText:
                '<i class="bi bi-check2-circle me-1"></i> บันทึกข้อมูล',

            cancelButtonText: "ยกเลิก",
            reverseButtons: true,
            buttonsStyling: false,
            focusConfirm: false,

            customClass: {
                popup: "rounded-4 border-0 shadow-lg",
                title: "mb-3",
                htmlContainer: "mt-0",
                actions: "gap-2 mt-3",

                confirmButton:
                    "btn btn-primary rounded-pill px-4 py-2 fw-semibold",

                cancelButton:
                    "btn btn-light rounded-pill px-4 py-2 fw-semibold border",

                closeButton: "shadow-none"
            },

            didOpen: (popup) => {
                popup.style.maxWidth = "calc(100% - 24px)";
                popup.style.fontFamily = "'Sarabun', sans-serif";
                popup.style.border = "1px solid #e2e8f0";

                const levelInput = popup.querySelector(
                    "#swalAddStudentLevel"
                );

                const roomInput = popup.querySelector(
                    "#swalAddStudentRoom"
                );

                const educationSelect = popup.querySelector(
                    "#swalAddEducationLevel"
                );

                if (levelInput) {
                    levelInput.value = defaults.studentLevel;
                }

                if (roomInput) {
                    roomInput.value = defaults.studentRoom;
                }

                if (educationSelect) {
                    educationSelect.value = defaults.educationLevel;
                }

                popup.querySelector(
                    "#swalAddStudentName"
                )?.focus();
            },

            preConfirm: () => {
                const fullName = document
                    .getElementById("swalAddStudentName")
                    .value.trim();

                const studentId = document
                    .getElementById("swalAddStudentId")
                    .value.trim();

                const studentNumberRaw = document
                    .getElementById("swalAddStudentNumber")
                    .value.trim();

                const educationLevel = document
                    .getElementById("swalAddEducationLevel")
                    .value;

                const studentLevel = document
                    .getElementById("swalAddStudentLevel")
                    .value.trim();

                const studentRoom = document
                    .getElementById("swalAddStudentRoom")
                    .value.trim();

                const schoolName = document
                    .getElementById("swalAddStudentSchool")
                    .value.trim();

                if (
                    !fullName ||
                    !studentId ||
                    !studentNumberRaw ||
                    !studentLevel ||
                    !studentRoom ||
                    !schoolName
                ) {
                    Swal.showValidationMessage(
                        "กรุณากรอกข้อมูลให้ครบถ้วน"
                    );

                    return false;
                }

                if (studentId.length > 6) {
                    Swal.showValidationMessage(
                        "รหัสนักเรียนต้องไม่เกิน 6 ตัวอักษร"
                    );

                    return false;
                }

                const studentNumber = Number(studentNumberRaw);

                if (
                    !Number.isInteger(studentNumber) ||
                    studentNumber < 1
                ) {
                    Swal.showValidationMessage(
                        "เลขที่ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป"
                    );

                    return false;
                }

                return {
                    full_name: fullName,
                    student_id: studentId,
                    student_number: String(studentNumber),
                    education_level: educationLevel,
                    student_level: studentLevel,
                    student_room: studentRoom,
                    school_name: schoolName
                };
            }
        });

        if (!result.isConfirmed || !result.value) {
            return;
        }

        try {
            sessionStorage.setItem(
                "highlight_student",
                result.value.student_id
            );
        } catch (error) {
            console.warn(
                "Could not save student highlight in sessionStorage:",
                error
            );
        }

        const csrfMeta = document.querySelector(
            'meta[name="csrf-token"]'
        );

        const csrfToken = csrfMeta?.getAttribute("content");

        if (!csrfToken) {
            await Swal.fire({
                icon: "error",
                title: "ไม่พบ CSRF Token",
                text: "ไม่สามารถส่งข้อมูลได้ กรุณารีเฟรชหน้าเว็บแล้วลองใหม่",
                confirmButtonText: "ตกลง"
            });

            return;
        }

        const form = document.createElement("form");

        form.method = "POST";
        form.action = actionUrl;
        form.style.display = "none";

        addHiddenField(
            form,
            "csrf_token",
            csrfToken
        );

        Object.entries(result.value).forEach(
            ([name, value]) => {
                addHiddenField(form, name, value);
            }
        );

        document.body.appendChild(form);
        form.submit();
    });
});



// SweetAlert2: แก้ไขข้อมูลนักเรียน
(function () {
    'use strict';

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function normalizeEducationLevel(value) {
        const level = String(value ?? '').trim();

        if (['ป', 'ประถมศึกษา', 'ประถม'].includes(level)) {
            return 'ประถมศึกษา';
        }

        return 'มัธยมศึกษา';
    }

    // กดปุ่มแก้ไขนักเรียน
    document.addEventListener('click', async function (event) {
        const button = event.target.closest('.edit-student-alert');

        if (!button) return;

        const data = button.dataset;
        const educationLevel = normalizeEducationLevel(
            data.educationLevel
        );

        const result = await Swal.fire({
            title: '',
            width: 680,
            padding: '1.5rem',
            html: `
                <div class="text-start">
                    <div class="d-flex align-items-center justify-content-start gap-2 mb-4 w-100 text-start"
                        style="margin-top: 0;">

                        <i class="bi bi-pencil-square"
                        style="
                            font-size: 1.6rem;
                            color: #f59e0b;
                            flex-shrink: 0;
                        ">
                        </i>

                        <span class="fw-bold text-dark"
                            style="font-size: 1.25rem; line-height: 1.5;">
                            แก้ไขข้อมูลนักเรียน
                        </span>
                    </div>

                    <div class="mb-3">
                        <label for="edit-student-full-name"
                            class="form-label small fw-bold text-secondary">
                            ชื่อ-นามสกุล
                        </label>
                        <input
                            id="edit-student-full-name"
                            type="text"
                            class="form-control"
                            value="${escapeHtml(data.fullName)}"
                            required
                            style="border-radius: 12px;">
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-7">
                            <label for="edit-student-id"
                                class="form-label small fw-bold text-secondary">
                                รหัสนักเรียน
                            </label>
                            <input
                                id="edit-student-id"
                                type="text"
                                class="form-control"
                                value="${escapeHtml(data.studentId)}"
                                required
                                style="border-radius: 12px;">
                        </div>

                        <div class="col-5">
                            <label for="edit-student-number"
                                class="form-label small fw-bold text-secondary">
                                เลขที่
                            </label>
                            <input
                                id="edit-student-number"
                                type="number"
                                class="form-control"
                                value="${escapeHtml(data.studentNumber)}"
                                required
                                style="border-radius: 12px;">
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-5">
                            <label for="edit-education-level"
                                class="form-label small fw-bold text-secondary">
                                ระดับชั้น
                            </label>
                            <select
                                id="edit-education-level"
                                class="form-select"
                                style="border-radius: 12px;">

                                <option value="มัธยมศึกษา"
                                    ${educationLevel === 'มัธยมศึกษา'
                    ? 'selected' : ''}>
                                    มัธยมศึกษา (ม.)
                                </option>

                                <option value="ประถมศึกษา"
                                    ${educationLevel === 'ประถมศึกษา'
                    ? 'selected' : ''}>
                                    ประถมศึกษา (ป.)
                                </option>
                            </select>
                        </div>

                        <div class="col-3">
                            <label for="edit-student-level"
                                class="form-label small fw-bold text-secondary">
                                ชั้น
                            </label>
                            <input
                                id="edit-student-level"
                                type="text"
                                class="form-control"
                                value="${escapeHtml(data.studentLevel)}"
                                required
                                style="border-radius: 12px;">
                        </div>

                        <div class="col-4">
                            <label for="edit-student-room"
                                class="form-label small fw-bold text-secondary">
                                ห้อง
                            </label>
                            <input
                                id="edit-student-room"
                                type="text"
                                class="form-control"
                                value="${escapeHtml(data.studentRoom)}"
                                required
                                style="border-radius: 12px;">
                        </div>
                    </div>

                    <div class="mb-2">
                        <label for="edit-school-name"
                            class="form-label small fw-bold text-secondary">
                            ชื่อสถานศึกษา
                        </label>
                        <input
                            id="edit-school-name"
                            type="text"
                            class="form-control"
                            value="${escapeHtml(data.schoolName)}"
                            required
                            style="border-radius: 12px;">
                    </div>

                </div>
            `,

            showCancelButton: true,
            confirmButtonText:
                '<i class="bi bi-check2-circle me-1"></i> บันทึกการแก้ไข',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true,
            focusConfirm: false,
            buttonsStyling: false,

            customClass: {
                popup: 'edit-student-swal-popup',
                confirmButton: 'btn btn-primary px-4 py-2 fw-bold',
                cancelButton: 'btn btn-light px-4 py-2 me-2'
            },

            didOpen: () => {
                const popup = Swal.getPopup();

                if (popup) {
                    popup.style.borderRadius = '24px';
                }

                document
                    .getElementById('edit-student-full-name')
                    ?.focus();
            },

            preConfirm: () => {
                const values = {
                    full_name: document.getElementById(
                        'edit-student-full-name'
                    ).value,

                    student_id: document.getElementById(
                        'edit-student-id'
                    ).value,

                    student_number: document.getElementById(
                        'edit-student-number'
                    ).value,

                    education_level: document.getElementById(
                        'edit-education-level'
                    ).value,

                    student_level: document.getElementById(
                        'edit-student-level'
                    ).value,

                    student_room: document.getElementById(
                        'edit-student-room'
                    ).value,

                    school_name: document.getElementById(
                        'edit-school-name'
                    ).value
                };

                const requiredValues = [
                    values.full_name,
                    values.student_id,
                    values.student_number,
                    values.student_level,
                    values.student_room,
                    values.school_name
                ];

                if (requiredValues.some(value => !value.trim())) {
                    Swal.showValidationMessage(
                        'กรุณากรอกข้อมูลให้ครบทุกช่อง'
                    );
                    return false;
                }

                const studentNumberInput = document.getElementById(
                    'edit-student-number'
                );

                if (!studentNumberInput.checkValidity()) {
                    Swal.showValidationMessage(
                        'กรุณากรอกเลขที่ให้ถูกต้อง'
                    );
                    return false;
                }

                return values;
            }
        });

        if (!result.isConfirmed || !result.value) {
            return;
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.action;
        form.style.display = 'none';

        const payload = {
            csrf_token: data.csrf,
            ...result.value
        };

        Object.entries(payload).forEach(([name, value]) => {
            const input = document.createElement('input');

            input.type = 'hidden';
            input.name = name;
            input.value = value ?? '';

            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
    });
})();


/* =========================================
    SweetAlert2: ยืนยันการลบข้อมูล
   ========================================= */

document.addEventListener("click", function (event) {
    const button = event.target.closest(".delete-btn");

    if (!button) return;

    event.preventDefault();

    const name = button.getAttribute("data-name") || "รายการนี้";
    const formUrl = button.getAttribute("data-url");

    if (!formUrl) {
        console.error("Delete URL is missing.");
        return;
    }

    function escapeDeleteHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    Swal.fire({
        title: "ยืนยันการลบข้อมูล?",
        html: `
            <div class="text-center">
                <p class="mb-2">
                    ต้องการลบ <strong>${escapeDeleteHtml(name)}</strong> ใช่ไหม?
                </p>

                <small class="text-danger">
                    <i class="bi bi-info-circle me-1"></i>
                    เมื่อลบแล้วจะไม่สามารถกู้คืนข้อมูลได้
                </small>
            </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "#e2e8f0",
        confirmButtonText: "ยืนยันลบข้อมูล",
        cancelButtonText: '<span class="text-dark">ยกเลิก</span>',
        reverseButtons: true,

        customClass: {
            popup: "border-0 shadow-lg",
            confirmButton: "rounded-3 fw-bold px-4",
            cancelButton: "rounded-3 fw-bold px-4"
        },

        background: "rgba(255, 255, 255, 0.98)",
        backdrop: "rgba(0,0,0,0.4)"

    }).then(function (result) {
        if (!result.isConfirmed) return;

        const tempForm = document.createElement("form");
        tempForm.method = "POST";
        tempForm.action = formUrl;
        tempForm.style.display = "none";

        const csrfMeta = document.querySelector(
            'meta[name="csrf-token"]'
        );

        const existingToken = document.querySelector(
            'input[name="csrf_token"]'
        );

        const csrfToken = csrfMeta
            ? csrfMeta.getAttribute("content")
            : existingToken?.value;

        if (csrfToken) {
            const csrfInput = document.createElement("input");
            csrfInput.type = "hidden";
            csrfInput.name = "csrf_token";
            csrfInput.value = csrfToken;
            tempForm.appendChild(csrfInput);
        }

        document.body.appendChild(tempForm);
        tempForm.submit();
    });
});


// ระบบค้นหานักเรียน พร้อม Spinner
document.addEventListener('DOMContentLoaded', function () {
    const searchStudent = document.getElementById('searchStudentInput');
    const clearStudentBtn = document.getElementById('clearStudentSearch');

    if (!searchStudent) return;

    let studentTimeout = null;

    const statusRow = document.getElementById('studentStatusRow');
    const loadingBox = document.getElementById('studentSearchLoading');
    const noDataBox = document.getElementById('studentNoData');
    const noDataRow = document.getElementById('noDataRow');

    function normalizeStudentSearch(value) {
        return String(value ?? '')
            .normalize('NFC')
            .toLocaleLowerCase()
            .replace(/[^\p{L}\p{N}\p{M}]/gu, '');
    }

    function setStudentRowVisible(row, visible) {
        if (!row) return;

        if (visible) {
            row.style.removeProperty('display');
        } else {
            row.style.setProperty('display', 'none', 'important');
        }
    }


    function setStudentBoxVisible(box, visible) {
        if (!box) return;
        box.style.display = visible ? 'block' : 'none';
    }

    function hideStudentSearchStatus() {
        setStudentRowVisible(statusRow, false);
        setStudentBoxVisible(loadingBox, false);
        setStudentBoxVisible(noDataBox, false);
    }

    function searchStudents() {
        clearTimeout(studentTimeout);

        const rawTerm = searchStudent.value.trim();
        const searchTerm = normalizeStudentSearch(rawTerm);

        const studentRows = Array.from(
            document.querySelectorAll(
                '#studentTableBody .student-row'
            )
        );

        if (clearStudentBtn) {
            clearStudentBtn.style.setProperty(
                'display',
                rawTerm ? 'inline-block' : 'none',
                'important'
            );
        }

        if (!searchTerm) {
            studentRows.forEach(row => {
                setStudentRowVisible(row, true);
            });

            hideStudentSearchStatus();

            setStudentRowVisible(
                noDataRow,
                studentRows.length === 0
            );

            return;
        }

        studentRows.forEach(row => {
            setStudentRowVisible(row, false);
        });

        setStudentRowVisible(noDataRow, false);

        setStudentRowVisible(statusRow, true);
        setStudentBoxVisible(loadingBox, true);
        setStudentBoxVisible(noDataBox, false);

        studentTimeout = setTimeout(function () {
            try {
                const currentRows = Array.from(
                    document.querySelectorAll(
                        '#studentTableBody .student-row'
                    )
                );

                let hasResults = false;

                currentRows.forEach(row => {
                    const rowText = normalizeStudentSearch(
                        row.textContent
                    );

                    const matches = rowText.includes(searchTerm);

                    setStudentRowVisible(row, matches);

                    if (matches) {
                        hasResults = true;
                    }
                });

                setStudentBoxVisible(loadingBox, false);

                if (hasResults) {
                    setStudentRowVisible(statusRow, false);
                    setStudentBoxVisible(noDataBox, false);
                } else {
                    setStudentRowVisible(statusRow, true);
                    setStudentBoxVisible(noDataBox, true);
                }
            } catch (error) {
                console.error(
                    'เกิดข้อผิดพลาดในการค้นหานักเรียน:',
                    error
                );

                hideStudentSearchStatus();
            }
        }, 300);
    }

    searchStudent.addEventListener('input', searchStudents);

    if (clearStudentBtn) {
        clearStudentBtn.addEventListener('click', function () {
            clearTimeout(studentTimeout);

            searchStudent.value = '';
            searchStudents();
            searchStudent.focus();
        });
    }

    searchStudents();
});


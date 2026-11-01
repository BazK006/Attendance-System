(function () {
    "use strict";

    const TEACHER_DEPARTMENTS = [
        "วิทยาศาสตร์และเทคโนโลยี",
        "คณิตศาสตร์",
        "ภาษาต่างประเทศ",
        "ภาษาไทย",
        "สังคมศึกษา ศาสนา และวัฒนธรรม",
        "ศิลปะ",
        "การงานอาชีพ",
        "สุขศึกษาและพลศึกษา"
    ];

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getCsrfToken() {
        return document.querySelector(
            'meta[name="csrf-token"]'
        )?.getAttribute("content") || "";
    }

    function submitPost(url, values = {}) {
        if (!url) {
            console.error("Form action URL is missing.");
            return;
        }

        const form = document.createElement("form");

        form.method = "POST";
        form.action = url;
        form.style.display = "none";

        const token = getCsrfToken();

        const payload = {
            ...values
        };

        // เพิ่ม CSRF Token เมื่อพบ Token ในหน้าเว็บ
        if (token) {
            payload.csrf_token = token;
        }

        Object.entries(payload).forEach(([name, value]) => {
            const input = document.createElement("input");

            input.type = "hidden";
            input.name = name;
            input.value = value ?? "";

            form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
    }

    // 📝 สร้าง Input Field พร้อมปุ่มเปิด/ปิดรหัสผ่าน
    function teacherField(
        id,
        label,
        type,
        value = "",
        required = false,
        column = "col-md-6",
        readonly = false
    ) {
        const placeholders = {
            "teacher-id": "ระบบสร้างรหัสให้อัตโนมัติ",
            "teacher-email": "เช่น teacher@school.ac.th",
            "teacher-full-name": "กรอกชื่อและนามสกุล",
            "teacher-school-name": "เช่น โรงเรียนตัวอย่าง",
            "teacher-password": "กรอกรหัสผ่าน",
            "teacher-confirm-password": "กรอกรหัสผ่านอีกครั้ง"
        };

        const placeholder = escapeHtml(
            placeholders[id] || `กรอก${label}`
        );

        const isPassword = type === "password";

        return `
            <div class="${column}">
                <label for="${id}"
                    class="form-label small fw-bold text-secondary">

                    ${label}

                    ${readonly ? `
                        <i class="bi bi-lock-fill ms-1 text-secondary"></i>
                    ` : ""}
                </label>
                ${isPassword ? `
                    <div class="position-relative">
                        <input
                            id="${id}"
                            type="password"
                            class="form-control"
                            value="${escapeHtml(value)}"
                            placeholder="${placeholder}"
                            ${required ? "required" : ""}
                            autocomplete="new-password"
                            style="
                                border-radius: 12px;
                                padding-right: 3rem;
                            ">

                        <button
                            type="button"
                            class="toggle-password position-absolute top-50 end-0 translate-middle-y
                                border-0 bg-transparent text-secondary p-2"
                            data-target="${id}"
                            aria-label="แสดงรหัสผ่าน"
                            aria-pressed="false"
                            title="แสดงรหัสผ่าน"
                            style="
                                z-index: 5;
                                line-height: 1;
                                font-size: 1.1rem;
                                margin-right: 5px;
                                cursor: pointer;
                                box-shadow: none;
                            ">

                            <i class="bi bi-eye"></i>
                        </button>
                    </div>
                ` : `
                    <input
                        id="${id}"
                        type="${type}"
                        class="form-control"
                        value="${escapeHtml(value)}"
                        placeholder="${placeholder}"
                        ${required ? "required" : ""}
                        ${readonly ? `
                            readonly
                            aria-readonly="true"
                            title="ระบบสร้างรหัสให้อัตโนมัติ"
                        ` : ""}
                        autocomplete="off"
                        style="
                            border-radius: 12px;
                            ${readonly
                ? "background-color: #f1f5f9; cursor: not-allowed;"
                : ""}
                        ">
                `}
            </div>
        `;
    }

    // 🎨 Header ของ Popup
    function teacherHeader(isEdit) {
        const icon = isEdit
            ? "bi-pencil-square"
            : "bi-person-plus-fill";

        const color = isEdit
            ? "#f59e0b"
            : "#0891b2";

        const title = isEdit
            ? "แก้ไขข้อมูลคุณครู"
            : "เพิ่มข้อมูลคุณครูใหม่";

        return `
            <div class="
                d-flex
                align-items-center
                justify-content-start
                gap-2
                mb-4
                w-100
                text-start
            ">
                <i class="bi ${icon}"
                    style="
                        font-size: 1.6rem;
                        color: ${color};
                        flex-shrink: 0;
                    ">
                </i>

                <span class="fw-bold text-dark"
                    style="font-size: 1.25rem;">
                    ${title}
                </span>
            </div>
        `;
    }

    function teacherDepartmentField(savedValue = "") {
        const savedDepartment = String(
            savedValue ?? ""
        ).trim();

        const isStandardDepartment =
            TEACHER_DEPARTMENTS.includes(savedDepartment);

        const isOtherDepartment =
            savedDepartment !== "" && !isStandardDepartment;

        const departmentOptions = TEACHER_DEPARTMENTS
            .map(department => `
                <option
                    value="${escapeHtml(department)}"
                    ${savedDepartment === department
                    ? "selected"
                    : ""}>
                    ${escapeHtml(department)}
                </option>
            `)
            .join("");

        return `
            <div class="col-12">
                <div class="mb-1">
                    <label for="teacher-department"
                        class="form-label small fw-bold text-secondary">
                        กลุ่มสาระการเรียนรู้
                    </label>

                    <select
                        class="form-select"
                        id="teacher-department"
                        aria-controls="teacher-other-department-wrapper"
                        required
                        style="border-radius: 12px;">

                        <option
                            value=""
                            disabled
                            ${!savedDepartment ? "selected" : ""}>
                            -- กรุณาเลือกกลุ่มสาระ --
                        </option>

                        ${departmentOptions}

                        <option
                            value="อื่นๆ"
                            ${isOtherDepartment ? "selected" : ""}>
                            อื่น ๆ (โปรดระบุ)
                        </option>
                    </select>
                </div>

                <div
                    id="teacher-other-department-wrapper"
                    class="mt-3 ${isOtherDepartment ? "" : "d-none"}">

                    <label
                        for="teacher-other-department"
                        class="form-label small fw-bold text-secondary">

                        โปรดระบุกลุ่มสาระการเรียนรู้
                        <span class="text-danger">*</span>
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="teacher-other-department"
                        maxlength="150"
                        placeholder="กรอกชื่อกลุ่มสาระการเรียนรู้"
                        aria-describedby="teacher-other-department-help"
                        value="${escapeHtml(
            isOtherDepartment ? savedDepartment : ""
        )}"
                        ${isOtherDepartment ? "required" : ""}
                        ${isOtherDepartment ? "" : "disabled"}
                        style="border-radius: 12px;">

                    <div
                        id="teacher-other-department-help"
                        class="text-secondary small mt-2">

                        <i class="bi bi-info-circle me-1"></i>
                        กรุณาระบุข้อมูลในช่องนี้ก่อนบันทึก
                    </div>
                </div>
            </div>
        `;
    }

    function teacherFormHtml(isEdit, data = {}) {
        const isGoogleAccount = isEdit &&
            String(data.authProvider || "")
                .trim()
                .toLowerCase() === "google";

        return `
        ${teacherHeader(isEdit)}

        <div class="row g-3 text-start">

            ${teacherField(
            "teacher-id",
            "รหัสประจำตัว",
            "text",
            data.teacherId || "",
            true,
            "col-md-6",
            true
        )}

            ${teacherField(
            "teacher-email",
            "อีเมล",
            "email",
            data.email || "",
            true,
            "col-md-6",
            isGoogleAccount
        )}

            ${teacherField(
            "teacher-full-name",
            "ชื่อ-นามสกุล",
            "text",
            data.fullName || "",
            true,
            "col-12"
        )}

            ${teacherDepartmentField(
            data.department || ""
        )}

            ${teacherField(
            "teacher-school-name",
            "ชื่อสถานศึกษา",
            "text",
            data.schoolName || "",
            false,
            "col-12"
        )}

            <div class="col-12">
                <hr class="mt-0 mb-2 mt-3">
            </div>

            ${isGoogleAccount ? `
                <div class="col-12">

                    <div class="d-flex align-items-center gap-2 mb-3">
                        <i class="bi bi-google"
                            style="
                                font-size: 1.6rem;
                                color: #4285F4;
                                flex-shrink: 0;
                            ">
                        </i>

                        <span class="fw-bold text-dark"
                            style="
                                font-size: 1.25rem;
                                line-height: 1.5;
                            ">
                            การเข้าสู่ระบบด้วย Google
                        </span>
                    </div>

                    <div class="d-flex align-items-start gap-2 p-3 rounded-3 border"
                        style="background-color: #f8fafc;">

                        <i class="bi bi-info-circle-fill text-primary mt-1"></i>

                        <div class="small text-secondary">
                            บัญชีนี้เข้าสู่ระบบผ่าน Google
                            จึงไม่ใช้รหัสผ่านของระบบนี้
                            หากต้องการจัดการรหัสผ่าน
                            กรุณาดำเนินการผ่านบัญชี Google โดยตรง
                        </div>
                    </div>

                </div>
            ` : `
                <div class="col-12">

                    <div class="d-flex align-items-center gap-2 mb-3">

                        <i class="bi bi-shield-lock-fill"
                            style="
                                font-size: 1.6rem;
                                color: #0891b2;
                                flex-shrink: 0;
                            ">
                        </i>

                        <span class="fw-bold text-dark"
                            style="
                                font-size: 1.25rem;
                                line-height: 1.5;
                            ">
                            ${isEdit
                ? "เปลี่ยนรหัสผ่าน"
                : "กำหนดรหัสผ่านเริ่มต้น"}
                        </span>

                        ${isEdit ? `
                            <span class="badge rounded-pill bg-light text-secondary border ms-1">
                                ไม่บังคับ
                            </span>
                        ` : ""}
                    </div>
                </div>

                ${teacherField(
                    "teacher-password",
                    "รหัสผ่าน",
                    "password",
                    "",
                    !isEdit
                )}

                ${teacherField(
                    "teacher-confirm-password",
                    "ยืนยันรหัสผ่าน",
                    "password",
                    "",
                    !isEdit
                )}

                ${isEdit ? `
                    <div class="col-12">
                        <small class="text-secondary">
                            <i class="bi bi-info-circle me-1"></i>
                            เว้นรหัสผ่านว่างไว้ หากไม่ต้องการเปลี่ยนรหัสผ่าน
                        </small>
                    </div>
                ` : ""}
            `}

        </div>
    `;
    }

    async function fetchNextTeacherId(url) {
        if (!url) {
            throw new Error("Next teacher ID URL is missing.");
        }

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Cannot generate teacher ID.");
        }

        const data = await response.json();

        if (!data.teacher_id) {
            throw new Error("Teacher ID is missing.");
        }

        return data.teacher_id;
    }


    async function openTeacherForm(isEdit, data = {}) {
        if (!isEdit) {
            try {
                data.teacherId = await fetchNextTeacherId(
                    data.nextIdUrl
                );

            } catch (error) {
                console.error(
                    "Generate teacher ID failed:",
                    error
                );

                await Swal.fire({
                    icon: "error",
                    title: "ไม่สามารถสร้างรหัสคุณครูได้",
                    text: "กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง",
                    confirmButtonText: "ตกลง"
                });

                return;
            }
        }

        const result = await Swal.fire({
            title: "",
            html: teacherFormHtml(isEdit, data),
            width: 720,
            padding: "1.5rem",

            showCancelButton: true,

            confirmButtonText: isEdit
                ? '<i class="bi bi-check2-circle me-1"></i> บันทึกการแก้ไข'
                : '<i class="bi bi-person-plus-fill me-1"></i> เพิ่มคุณครู',

            cancelButtonText: "ยกเลิก",
            reverseButtons: true,
            focusConfirm: false,
            buttonsStyling: false,

            customClass: {
                popup: "border-0 shadow-lg",
                actions: "w-100 justify-content-end",
                confirmButton:
                    "btn btn-primary px-4 py-2 fw-bold mt-3",
                cancelButton:
                    "btn px-4 py-2 me-2 mt-3",
            },

            didOpen: () => {
                const popup = Swal.getPopup();

                if (!popup) return;

                popup.style.borderRadius = "24px";

                popup.querySelectorAll(
                    ".toggle-password"
                ).forEach(button => {

                    button.addEventListener("click", function () {
                        const targetId = this.dataset.target;

                        const input = popup.querySelector(
                            `#${targetId}`
                        );

                        if (!input) return;

                        const icon = this.querySelector("i");

                        const isHidden = input.type === "password";

                        input.type = isHidden ? "text" : "password";

                        if (icon) {
                            icon.classList.toggle(
                                "bi-eye",
                                !isHidden
                            );

                            icon.classList.toggle(
                                "bi-eye-slash",
                                isHidden
                            );
                        }

                        const label = isHidden
                            ? "ซ่อนรหัสผ่าน"
                            : "แสดงรหัสผ่าน";

                        this.setAttribute("aria-label", label);
                        this.setAttribute("title", label);
                        this.setAttribute(
                            "aria-pressed",
                            String(isHidden)
                        );
                    });
                });

                const departmentSelect = popup.querySelector(
                    "#teacher-department"
                );

                const otherWrapper = popup.querySelector(
                    "#teacher-other-department-wrapper"
                );

                const otherInput = popup.querySelector(
                    "#teacher-other-department"
                );

                function updateOtherDepartment() {
                    if (
                        !departmentSelect ||
                        !otherWrapper ||
                        !otherInput
                    ) {
                        return;
                    }

                    const isOther =
                        departmentSelect.value === "อื่นๆ";

                    otherWrapper.classList.toggle(
                        "d-none",
                        !isOther
                    );

                    otherInput.disabled = !isOther;
                    otherInput.required = isOther;

                    if (!isOther) {
                        otherInput.value = "";
                    }
                }

                if (departmentSelect) {
                    departmentSelect.addEventListener(
                        "change",
                        updateOtherDepartment
                    );

                    updateOtherDepartment();
                }


                popup.querySelector(
                    isEdit
                        ? "#teacher-id"
                        : "#teacher-full-name"
                )?.focus();
            },

            preConfirm: () => {
                const getValue = id => {
                    return document.getElementById(id)?.value.trim() || "";
                };

                const teacherId = getValue("teacher-id");
                const email = getValue("teacher-email");
                const fullName = getValue("teacher-full-name");
                const schoolName = getValue("teacher-school-name");

                const departmentChoice = getValue(
                    "teacher-department"
                );

                const otherDepartment = getValue(
                    "teacher-other-department"
                );

                const password = document.getElementById(
                    "teacher-password"
                )?.value || "";

                const confirmPassword = document.getElementById(
                    "teacher-confirm-password"
                )?.value || "";

                if (!teacherId || !email || !fullName) {
                    Swal.showValidationMessage(
                        "กรุณากรอกรหัสประจำตัว อีเมล และชื่อ-นามสกุล"
                    );
                    return false;
                }

                const emailInput = document.getElementById(
                    "teacher-email"
                );

                if (!emailInput.checkValidity()) {
                    Swal.showValidationMessage(
                        "กรุณากรอกอีเมลให้ถูกต้อง"
                    );
                    return false;
                }


                // ตรวจกลุ่มสาระ
                if (!departmentChoice) {
                    Swal.showValidationMessage(
                        "กรุณาเลือกกลุ่มสาระการเรียนรู้"
                    );
                    return false;
                }

                if (
                    departmentChoice === "อื่นๆ" &&
                    !otherDepartment
                ) {
                    Swal.showValidationMessage(
                        "กรุณาระบุกลุ่มสาระการเรียนรู้"
                    );
                    return false;
                }

                if (
                    departmentChoice === "อื่นๆ" &&
                    otherDepartment.length > 150
                ) {
                    Swal.showValidationMessage(
                        "ชื่อกลุ่มสาระต้องไม่เกิน 150 ตัวอักษร"
                    );
                    return false;
                }

                const department =
                    departmentChoice === "อื่นๆ"
                        ? otherDepartment
                        : departmentChoice;

                if (
                    !isEdit &&
                    (!password || !confirmPassword)
                ) {
                    Swal.showValidationMessage(
                        "กรุณากรอกรหัสผ่านและยืนยันรหัสผ่าน"
                    );
                    return false;
                }

                if (
                    password !== confirmPassword &&
                    (!isEdit || password || confirmPassword)
                ) {
                    Swal.showValidationMessage(
                        "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน"
                    );
                    return false;
                }

                return {
                    teacher_id: teacherId,
                    email: email,
                    full_name: fullName,
                    department: department,
                    school_name: schoolName,
                    password: password,
                    confirm_password: confirmPassword
                };
            }
        });

        if (!result.isConfirmed || !result.value) {
            return;
        }
        submitPost(data.url, result.value);
    }

    // 🖱️ Event Delegation: ปุ่มเพิ่ม / แก้ไข / ลบ
    document.addEventListener("click", async function (event) {
        if (!(event.target instanceof Element)) {
            return;
        }

        const addButton = event.target.closest(
            "#openAddTeacherAlert"
        );

        if (addButton) {
            event.preventDefault();

            await openTeacherForm(false, {
                url: addButton.dataset.url,
                nextIdUrl: addButton.dataset.nextIdUrl
            });

            return;
        }

        const editButton = event.target.closest(
            ".edit-teacher-alert"
        );

        if (editButton) {
            event.preventDefault();

            await openTeacherForm(true, {
                url: editButton.dataset.url,
                teacherId: editButton.dataset.teacherId,
                email: editButton.dataset.email,
                fullName: editButton.dataset.fullName,
                department: editButton.dataset.department,
                schoolName: editButton.dataset.schoolName,
                authProvider: editButton.dataset.authProvider || "local"
            });

            return;
        }

        const deleteButton = event.target.closest(
            ".delete-btn"
        );

        if (!deleteButton) {
            return;
        }

        event.preventDefault();

        const name =
            deleteButton.dataset.name || "คุณครูรายการนี้";

        const formUrl = deleteButton.dataset.url;

        if (!formUrl) {
            console.error("Delete URL is missing.");
            return;
        }

        const result = await Swal.fire({
            title: "ยืนยันการลบข้อมูล?",

            html: `
                <div class="text-center">
                    <p class="mb-2">
                        ต้องการลบ
                        <strong>${escapeHtml(name)}</strong>
                        ใช่ไหม?
                    </p>

                    <small class="text-secondary">
                        <i class="bi bi-info-circle me-1"></i>
                        เมื่อลบแล้วจะไม่สามารถกู้คืนข้อมูลได้
                    </small>
                </div>
            `,

            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "ยืนยันลบข้อมูล",
            cancelButtonText: "ยกเลิก",
            reverseButtons: true,
            buttonsStyling: false,

            customClass: {
                popup: "border-0 shadow-lg",
                confirmButton:
                    "btn btn-danger rounded-3 fw-bold px-4",
                cancelButton:
                    "btn btn-light rounded-3 fw-bold px-4 me-2"
            },

            background: "rgba(255, 255, 255, 0.98)",
            backdrop: "rgba(0,0,0,0.4)"
        });

        if (result.isConfirmed) {
            submitPost(formUrl);
        }
    });

})();


// ระบบค้นหารายชื่อครู
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchTeacherInput");

    if (!searchInput)
        return;

    const loadingRow = document.getElementById("teacherSearchLoadingRow");
    let searchTimer = null;

    function normalizeSearchText(value) {
        return String(value ?? "")
            .normalize("NFC")
            .toLocaleLowerCase()
            .replace(/[^\p{L}\p{N}\p{M}]/gu, "");
    }

    const tables = Array.from(document.querySelectorAll("table"));

    const teacherTable = tables.find(function (table) {
        const headers = Array.from(
            table.querySelectorAll("thead th")
        ).map(th => th.textContent.trim());

        const hasIdColumn = headers.some(text =>
            text.includes("รหัส") || /\bid\b/i.test(text)
        );

        const hasNameColumn = headers.some(text =>
            text.includes("ชื่อ") || /\bname\b/i.test(text)
        );

        return hasIdColumn && hasNameColumn;
    });

    if (!teacherTable) {
        console.warn("ไม่พบตารางรายชื่อคุณครู");
        return;
    }

    const tbody = teacherTable.tBodies[0];

    if (!tbody) {
        console.warn("ไม่พบ tbody ของตารางคุณครู");
        return;
    }

    const headers = Array.from(
        teacherTable.querySelectorAll("thead th")
    );

    const actionIndexes = headers
        .map((th, index) => ({
            index,
            label: th.textContent.trim()
        }))
        .filter(item =>
            /จัดการ|แก้ไข|ลบ|actions?|manage|edit|delete/i.test(item.label)
        )
        .map(item => item.index);

    const searchableIndexes = headers
        .map((_, index) => index)
        .filter(index => !actionIndexes.includes(index));

    const emptyRow = document.getElementById("teacherSearchEmptyRow");
    const emptyTitle = document.getElementById("teacherSearchEmptyTitle");
    const emptyMessage = document.getElementById("teacherSearchEmptyMessage");
    const emptyHint = document.getElementById("teacherSearchEmptyHint");

    if (
        !emptyRow ||
        !emptyTitle ||
        !emptyMessage ||
        !emptyHint ||
        emptyRow.parentElement !== tbody
    ) {
        console.warn(
            "ไม่พบ Empty State ของตารางคุณครู กรุณาตรวจสอบ HTML"
        );
        return;
    }

    function searchTeachers() {
        const keywords = searchInput.value
            .trim()
            .split(/\s+/)
            .map(normalizeSearchText)
            .filter(Boolean);

        const rows = Array.from(tbody.querySelectorAll("tr"))
            .filter(row =>
                row.id !== "teacherSearchEmptyRow" &&
                row.cells.length > 1 &&
                !row.querySelector("[colspan]")
            );

        let visibleCount = 0;

        rows.forEach(function (row) {
            // รวมข้อความจากคอลัมน์ข้อมูลที่ค้นหาได้
            const searchableText = searchableIndexes
                .map(index => row.cells[index]?.textContent || "")
                .join(" ");

            const normalizedText = normalizeSearchText(searchableText);

            const matches = keywords.every(keyword =>
                normalizedText.includes(keyword)
            );

            row.hidden = !matches;

            if (matches) {
                visibleCount++;
            }
        });

        const hasResults = visibleCount > 0;
        emptyRow.hidden = hasResults;

        if (hasResults) return;

        if (keywords.length > 0) {
            emptyTitle.textContent = "ไม่พบข้อมูลคุณครูที่ค้นหา";

            emptyMessage.textContent =
                `ไม่พบรายชื่อที่ตรงกับ "${searchInput.value.trim()}" ` +
                "ลองค้นหาด้วยชื่อ รหัส อีเมล หรือข้อมูลอื่น";

            emptyHint.innerHTML =
                '<i class="bi bi-search me-1"></i>' +
                "ลองเปลี่ยนคำค้นหา";
        } else {
            emptyTitle.textContent = "ยังไม่มีข้อมูลคุณครู";

            emptyMessage.textContent =
                "ยังไม่มีบัญชีคุณครูในระบบ " +
                "เริ่มต้นเพิ่มข้อมูลคุณครูได้เลย";

            emptyHint.innerHTML =
                '<i class="bi bi-person-plus-fill me-1"></i>' +
                "เพิ่มคุณครูเพื่อเริ่มต้นใช้งาน";
        }
    }

    searchTeachers();
    searchInput.addEventListener("input", searchTeachers);


    searchInput.addEventListener("input", function () {

        clearTimeout(searchTimer);
        if (loadingRow) {
            loadingRow.hidden = false;
        }

        if (emptyRow) {
            emptyRow.hidden = true;
        }

        const rows = Array.from(tbody.querySelectorAll("tr"))
            .filter(row =>
                row.id !== "teacherSearchEmptyRow" &&
                row.id !== "teacherSearchLoadingRow" &&
                row.cells.length > 1 &&
                !row.querySelector("[colspan]")
            );

        rows.forEach(row => {
            row.hidden = true;
        });

        searchTimer = setTimeout(function () {
            try {
                searchTeachers();
            } finally {
                if (loadingRow) {
                    loadingRow.hidden = true;
                }
            }
        }, 300);
    });
});

// toggle password visibility
document.addEventListener('click', function (event) {
    const button = event.target.closest('.toggle-password');

    if (!button)
        return;

    const targetId = button.getAttribute('data-target');
    const passwordInput = document.getElementById(targetId);
    const icon = button.querySelector('i');

    if (passwordInput && icon) {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
        }
    }
});

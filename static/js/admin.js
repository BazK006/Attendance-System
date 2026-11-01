document.addEventListener("DOMContentLoaded", function () {
    function showElement(element) {
        if (element) {
            element.style.removeProperty("display");
        }
    }

    function hideElement(element) {
        if (element) {
            element.style.setProperty("display", "none", "important");
        }
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (char) {
            return {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[char];
        });
    }

    const classFilter = document.getElementById("classFilter");
    const studentSearch = document.getElementById("searchStudentInput");
    const clearStudentBtn = document.getElementById("clearStudentSearch");

    const studentRows = Array.from(
        document.querySelectorAll("#studentTableBody .student-row")
    );

    const studentStatusRow = document.getElementById("studentStatusRow");
    const studentLoading = document.getElementById("studentSearchLoading");
    const studentNoData = document.getElementById("studentNoData");
    const studentRoomNoData = document.getElementById("noDataRow");

    let studentSearchTimer = null;

    if (classFilter && studentRows.length > 0) {
        Array.from(classFilter.options).forEach(function (option) {
            if (option.value !== "all") {
                option.remove();
            }
        });

        const uniqueClasses = new Set();

        studentRows.forEach(function (row) {
            const className = row.getAttribute("data-class");

            if (className) {
                uniqueClasses.add(className);
            }
        });

        const sortedClasses = Array.from(uniqueClasses).sort(
            (a, b) => a.localeCompare(b, "th", { numeric: true })
        );

        sortedClasses.forEach(function (className) {
            const option = document.createElement("option");

            option.value = className;
            option.textContent = className;

            classFilter.appendChild(option);
        });
    }

    function applyStudentFilters() {

        const searchTerm = (studentSearch?.value || "")
            .trim()
            .toLocaleLowerCase();

        const selectedClass = classFilter?.value || "all";

        let visibleCount = 0;

        studentRows.forEach(function (row) {

            const rowText = row.textContent.toLocaleLowerCase();
            const rowClass = row.getAttribute("data-class");

            const matchesSearch =
                searchTerm === "" || rowText.includes(searchTerm);

            const matchesClass =
                selectedClass === "all" || rowClass === selectedClass;

            const shouldShow = matchesSearch && matchesClass;

            if (shouldShow) {
                showElement(row);
                visibleCount++;
            } else {
                hideElement(row);
            }
        });

        hideElement(studentLoading);

        if (searchTerm !== "") {
            hideElement(studentRoomNoData);

            if (visibleCount === 0) {
                showElement(studentStatusRow);
                showElement(studentNoData);
            } else {
                hideElement(studentStatusRow);
                hideElement(studentNoData);
            }

        } else {
            hideElement(studentStatusRow);
            hideElement(studentNoData);

            if (studentRoomNoData) {
                if (visibleCount === 0) {
                    showElement(studentRoomNoData);
                } else {
                    hideElement(studentRoomNoData);
                }
            }
        }
    }

    function scheduleStudentSearch() {
        clearTimeout(studentSearchTimer);

        const searchTerm = (studentSearch?.value || "").trim();

        if (clearStudentBtn) {
            if (searchTerm !== "") {
                showElement(clearStudentBtn);
            } else {
                hideElement(clearStudentBtn);
            }
        }

        if (searchTerm === "") {
            applyStudentFilters();
            return;
        }

        studentRows.forEach(hideElement);

        hideElement(studentRoomNoData);
        hideElement(studentNoData);

        showElement(studentStatusRow);
        showElement(studentLoading);

        studentSearchTimer = setTimeout(function () {
            applyStudentFilters();
        }, 300);
    }

    if (studentSearch) {
        studentSearch.addEventListener("input", scheduleStudentSearch);
    }

    if (classFilter) {
        classFilter.addEventListener("change", function () {
            clearTimeout(studentSearchTimer);

            if (clearStudentBtn && studentSearch) {
                if (studentSearch.value.trim() !== "") {
                    showElement(clearStudentBtn);
                } else {
                    hideElement(clearStudentBtn);
                }
            }

            applyStudentFilters();
        });
    }

    if (clearStudentBtn && studentSearch) {
        clearStudentBtn.addEventListener("click", function () {

            clearTimeout(studentSearchTimer);

            studentSearch.value = "";

            hideElement(clearStudentBtn);

            applyStudentFilters();

            studentSearch.focus();
        });
    }

    if (studentRows.length > 0) {
        applyStudentFilters();
    }

    const teacherSearch = document.getElementById("searchTeacherInput");
    const clearTeacherBtn = document.getElementById("clearTeacherSearch");

    const teacherRows = Array.from(
        document.querySelectorAll("#teacherTableBody .teacher-row")
    );

    const teacherStatusRow = document.getElementById("teacherStatusRow");
    const teacherLoading = document.getElementById("teacherSearchLoading");
    const teacherNoData = document.getElementById("teacherNoData");
    const teacherEmptyRow = document.getElementById("teacherEmptyRow");

    let teacherSearchTimer = null;

    function applyTeacherSearch() {
        const searchTerm = (teacherSearch?.value || "")
            .trim()
            .toLocaleLowerCase();

        let visibleCount = 0;

        teacherRows.forEach(function (row) {

            const matches =
                searchTerm === "" ||
                row.textContent.toLocaleLowerCase().includes(searchTerm);

            if (matches) {
                showElement(row);
                visibleCount++;
            } else {
                hideElement(row);
            }
        });

        hideElement(teacherLoading);

        if (searchTerm !== "") {

            hideElement(teacherEmptyRow);

            if (visibleCount === 0) {
                showElement(teacherStatusRow);
                showElement(teacherNoData);
            } else {
                hideElement(teacherStatusRow);
                hideElement(teacherNoData);
            }

        } else {

            hideElement(teacherStatusRow);
            hideElement(teacherNoData);

            if (teacherEmptyRow && teacherRows.length === 0) {
                showElement(teacherEmptyRow);
            }
        }
    }


    function scheduleTeacherSearch() {

        clearTimeout(teacherSearchTimer);

        const searchTerm = (teacherSearch?.value || "").trim();

        if (clearTeacherBtn) {
            if (searchTerm !== "") {
                showElement(clearTeacherBtn);
            } else {
                hideElement(clearTeacherBtn);
            }
        }

        if (searchTerm === "") {
            applyTeacherSearch();
            return;
        }

        hideElement(teacherEmptyRow);

        teacherRows.forEach(hideElement);

        hideElement(teacherNoData);

        showElement(teacherStatusRow);
        showElement(teacherLoading);

        teacherSearchTimer = setTimeout(function () {
            applyTeacherSearch();
        }, 300);
    }


    if (teacherSearch) {
        teacherSearch.addEventListener("input", scheduleTeacherSearch);
    }

    if (clearTeacherBtn && teacherSearch) {
        clearTeacherBtn.addEventListener("click", function () {

            clearTimeout(teacherSearchTimer);

            teacherSearch.value = "";

            hideElement(clearTeacherBtn);

            applyTeacherSearch();

            teacherSearch.focus();
        });
    }

    if (teacherRows.length > 0) {
        applyTeacherSearch();
    }

    // const addStudentModal = document.getElementById("addStudentModal");
    // if (addStudentModal) {
    //     addStudentModal.addEventListener("show.bs.modal", function () {
    //         const filterValue = classFilter?.value || "all";

    //         const inputEduLevel = document.getElementById(
    //             "add_education_level"
    //         );

    //         const inputStudentLevel = document.getElementById(
    //             "add_student_level"
    //         );

    //         const inputStudentRoom = document.getElementById(
    //             "add_student_room"
    //         );

    //         let studentLevel = "";
    //         let studentRoom = "";
    //         let isPrathom = false;

    //         if (filterValue !== "all") {

    //             const match = filterValue.match(
    //                 /(\d+)\s*\/\s*([A-Za-z0-9ก-๙]+)/
    //             );

    //             if (match) {
    //                 studentLevel = match[1];
    //                 studentRoom = match[2];
    //             }

    //             isPrathom = (
    //                 filterValue.includes("ป.") ||
    //                 filterValue.includes("ประถม")
    //             );
    //         }

    //         if (inputStudentLevel) {
    //             inputStudentLevel.value = studentLevel;
    //         }

    //         if (inputStudentRoom) {
    //             inputStudentRoom.value = studentRoom;
    //         }

    //         if (inputEduLevel) {
    //             inputEduLevel.value = isPrathom
    //                 ? "ประถมศึกษา"
    //                 : "มัธยมศึกษา";
    //         }
    //     });
    // }

    // const addStudentForm = document.querySelector(
    //     "#addStudentModal form"
    // );

    // if (addStudentForm) {
    //     addStudentForm.addEventListener("submit", function () {
    //         const studentIdInput = this.querySelector(
    //             'input[name="student_id"]'
    //         );

    //         if (studentIdInput && studentIdInput.value.trim()) {
    //             sessionStorage.setItem(
    //                 "highlight_student",
    //                 studentIdInput.value.trim()
    //             );
    //         }
    //     });
    // }


    document.addEventListener("click", function (event) {
        const button = event.target.closest(".toggle-password");
        if (!button) {
            return;
        }

        const targetId = button.getAttribute("data-target");
        const passwordInput = document.getElementById(targetId);
        const icon = button.querySelector("i");

        if (!passwordInput || !icon) {
            return;
        }

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            icon.classList.remove("bi-eye-slash");
            icon.classList.add("bi-eye");

        } else {
            passwordInput.type = "password";
            icon.classList.remove("bi-eye");
            icon.classList.add("bi-eye-slash");
        }
    });


    window.addEventListener("beforeunload", function () {
        sessionStorage.setItem("scrollPos", window.scrollY);
        document.querySelectorAll(".filter-select").forEach(
            function (filter) {
                if (filter.id) {
                    sessionStorage.setItem(
                        "savedFilter_" + filter.id,
                        filter.value
                    );
                }
            }
        );
    });

    window.addEventListener("load", function () {
        document.querySelectorAll(".filter-select").forEach(
            function (filter) {
                if (!filter.id) {
                    return;
                }

                const savedValue = sessionStorage.getItem(
                    "savedFilter_" + filter.id
                );

                if (savedValue !== null) {
                    const optionExists = Array.from(filter.options).some(
                        option => option.value === savedValue
                    );

                    if (optionExists) {
                        filter.value = savedValue;

                        filter.dispatchEvent(
                            new Event("change", { bubbles: true })
                        );
                    }
                }
            }
        );

        const highlightId = sessionStorage.getItem("highlight_student");
        if (highlightId) {
            sessionStorage.removeItem("highlight_student");
            sessionStorage.removeItem("scrollPos");

            const targetRow = document.getElementById(
                "row-" + highlightId
            );

            if (targetRow) {
                showElement(targetRow);

                targetRow.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                targetRow.style.transition = "background-color 1.5s ease";
                targetRow.style.backgroundColor = "#d1e7dd";

                setTimeout(function () {
                    targetRow.style.backgroundColor = "";
                }, 2000);
            }

        } else {

            const savedScroll = sessionStorage.getItem("scrollPos");

            if (savedScroll !== null) {

                window.scrollTo(
                    0,
                    Number.parseInt(savedScroll, 10) || 0
                );

                sessionStorage.removeItem("scrollPos");
            }
        }
    });

});


document.addEventListener('DOMContentLoaded', function () {
    const addStudentModalEl = document.getElementById('addStudentModal');

    if (addStudentModalEl) {
        addStudentModalEl.addEventListener('show.bs.modal', function () {
            const classFilterEl = document.getElementById('classFilter');
            if (!classFilterEl) return;

            const filterValue = classFilterEl.value;

            const inputEduLevel = document.getElementById('add_education_level');
            const inputStuLevel = document.getElementById('add_student_level');
            const inputStuRoom = document.getElementById('add_student_room');

            let stuLevel = '';
            let stuRoom = '';
            let isPrathom = false;

            if (filterValue && filterValue !== 'all') {
                const match = filterValue.match(/(\d+)\s*\/\s*([A-Za-z0-9ก-๙]+)/);
                if (match) {
                    stuLevel = match[1];
                    stuRoom = match[2];
                }

                if (filterValue.includes('ป.') || filterValue.includes('ประถม')) {
                    isPrathom = true;
                }
            }

            if (inputStuLevel) inputStuLevel.value = stuLevel;
            if (inputStuRoom) inputStuRoom.value = stuRoom;

            if (inputEduLevel) {
                for (let i = 0; i < inputEduLevel.options.length; i++) {
                    const optionText = inputEduLevel.options[i].text;
                    if (isPrathom && (optionText.includes('ประถม') || optionText.includes('ป.'))) {
                        inputEduLevel.selectedIndex = i;
                        break;
                    } else if (!isPrathom && (optionText.includes('มัธยม') || optionText.includes('ม.'))) {
                        inputEduLevel.selectedIndex = i;
                        break;
                    }
                }
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', function () {
    const addStudentForm = document.querySelector('form[action*="add_student"]');
    if (addStudentForm) {
        addStudentForm.addEventListener('submit', function () {

            const studentIdInput = this.querySelector('input[name="student_id"]');
            if (studentIdInput && studentIdInput.value) {
                sessionStorage.setItem('highlight_student', studentIdInput.value);
            }
        });
    }
});

window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('scrollPos', window.scrollY);

    const allFilters = document.querySelectorAll('.filter-select');
    allFilters.forEach(filter => {
        if (filter.id) sessionStorage.setItem('savedFilter_' + filter.id, filter.value);
    });
});

window.addEventListener('load', () => {
    const allFilters = document.querySelectorAll('.filter-select');
    allFilters.forEach(filter => {
        if (filter.id) {
            const savedValue = sessionStorage.getItem('savedFilter_' + filter.id);
            if (savedValue) {
                filter.value = savedValue;
                filter.dispatchEvent(new Event('change'));
            }
        }
    });

    const highlightId = sessionStorage.getItem('highlight_student');

    if (highlightId) {
        sessionStorage.removeItem('scrollPos');

        setTimeout(() => {
            const targetRow = document.getElementById('row-' + highlightId);

            if (targetRow) {
                targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

                targetRow.style.backgroundColor = '#d1e7dd';
                targetRow.style.transition = 'background-color 1.5s ease';

                setTimeout(() => {
                    targetRow.style.backgroundColor = '';
                }, 2000);
            }
            sessionStorage.removeItem('highlight_student');
        }, 100);

    } else {
        const pos = sessionStorage.getItem('scrollPos');
        if (pos !== null) {
            window.scrollTo(0, parseInt(pos, 10));
            sessionStorage.removeItem('scrollPos');
        }
    }
});

window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('scrollPos', window.scrollY);

    const allFilters = document.querySelectorAll('.filter-select');
    allFilters.forEach(filter => {
        if (filter.id) {
            sessionStorage.setItem('savedFilter_' + filter.id, filter.value);
        }
    });
});

// ฟังก์ชันโหลดหน้าตั้งค่าเซ็ตเดิม
window.addEventListener('load', () => {
    const pos = sessionStorage.getItem('scrollPos');
    if (pos !== null) {
        window.scrollTo(0, parseInt(pos, 10));
        sessionStorage.removeItem('scrollPos');
    }

    const allFilters = document.querySelectorAll('.filter-select');
    allFilters.forEach(filter => {
        if (filter.id) {
            const savedValue = sessionStorage.getItem('savedFilter_' + filter.id);
            if (savedValue) {
                filter.value = savedValue;

                filter.dispatchEvent(new Event('change'));
            }
        }
    });
});

/* ==================================================
    ระบบสถิติใน Admin Dashboard
================================================== */
(() => {
    'use strict';

    function initDashboardFilters() {
        const form = document.getElementById('dashboardFilterForm');
        const periodInput = document.getElementById('periodInput');

        if (!form || !periodInput) {
            console.warn('ไม่พบ Dashboard Filter Form');
            return;
        }

        const controls = {
            day: {
                wrap: document.getElementById('dateFilterWrap'),
                input: document.getElementById('dateFilter')
            },
            month: {
                wrap: document.getElementById('monthFilterWrap'),
                input: document.getElementById('monthFilter')
            },
            year: {
                wrap: document.getElementById('yearFilterWrap'),
                input: document.getElementById('yearFilter')
            },
            range: {
                wrap: document.getElementById('rangeFilterWrap'),
                input: document.getElementById('rangeDatePicker')
            }
        };

        const startInput = document.getElementById('startDateFilter');
        const endInput = document.getElementById('endDateFilter');
        const rangeHint = document.getElementById('rangePickerHint');
        const monthValueInput = document.getElementById('monthFilterValue');

        const queryParams = new URLSearchParams(window.location.search);

        if (startInput && queryParams.has('start_date')) {
            startInput.value = queryParams.get('start_date') || '';
        }

        if (endInput && queryParams.has('end_date')) {
            endInput.value = queryParams.get('end_date') || '';
        }

        const periodButtons = document.querySelectorAll(
            '.admin-analytics .period-btn'
        );

        function parseISODate(value) {
            if (!value) return null;

            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

            if (!match) return null;

            const year = Number(match[1]);
            const month = Number(match[2]);
            const day = Number(match[3]);

            const parsed = new Date(year, month - 1, day);

            if (
                parsed.getFullYear() !== year ||
                parsed.getMonth() !== month - 1 ||
                parsed.getDate() !== day
            ) {
                return null;
            }

            return parsed;
        }

        function parseYearMonth(value) {
            if (!value)
                return null;

            const match = /^(\d{4})-(\d{2})$/.exec(value);

            if (!match) return null;

            const year = Number(match[1]);
            const month = Number(match[2]);

            if (month < 1 || month > 12) return null;

            return new Date(year, month - 1, 1);
        }

        function formatISODate(date, picker) {
            return picker.formatDate(date, 'Y-m-d');
        }

        const dayInput = controls.day.input;

        let dayPicker = null;

        if (
            typeof window.flatpickr === 'function' &&
            dayInput
        ) {
            dayPicker = window.flatpickr(dayInput, {
                dateFormat: 'Y-m-d',

                altInput: true,
                altFormat: 'j F Y',
                altInputClass: 'form-control filter-input',

                defaultDate: parseISODate(dayInput.value) || undefined,

                locale: window.flatpickr.l10ns?.th || 'default',

                disableMobile: true,
                allowInput: false,
                clickOpens: true,

                appendTo: document.body,
                position: 'auto',

                onReady(selectedDates, dateString, instance) {
                    instance.calendarContainer.classList.add(
                        'admin-day-picker'
                    );

                    if (instance.altInput) {
                        instance.altInput.readOnly = true;
                    }
                }
            });

        } else {
            console.error(
                'ไม่สามารถสร้าง Date Picker ได้ กรุณาตรวจสอบ Flatpickr'
            );
        }

        function updateRangeHint(selectedDates, picker) {
            if (!rangeHint) return;

            if (selectedDates.length === 0) {
                rangeHint.textContent =
                    'คลิกวันที่เริ่มต้น แล้วคลิกวันที่สิ้นสุดในปฏิทิน';
                return;
            }

            if (selectedDates.length === 1) {
                const start = picker.formatDate(
                    selectedDates[0],
                    'd/m/Y'
                );

                rangeHint.textContent =
                    `เลือกวันเริ่มต้น ${start} แล้ว กรุณาเลือกวันสิ้นสุด`;

                return;
            }

            const start = picker.formatDate(
                selectedDates[0],
                'd/m/Y'
            );

            const end = picker.formatDate(
                selectedDates[1],
                'd/m/Y'
            );

            rangeHint.textContent =
                `เลือกช่วงวันที่ ${start} ถึง ${end} แล้ว`;
        }

        const monthInput = controls.month.input;

        if (
            typeof window.flatpickr === 'function' &&
            typeof window.monthSelectPlugin === 'function' &&
            monthInput &&
            monthValueInput
        ) {
            window.flatpickr(monthInput, {
                defaultDate: parseYearMonth(monthValueInput.value) || undefined,

                locale: window.flatpickr.l10ns?.th || 'default',

                disableMobile: true,
                allowInput: false,
                clickOpens: true,

                appendTo: document.body,
                position: 'auto',

                plugins: [
                    new window.monthSelectPlugin({
                        shorthand: false,
                        dateFormat: 'F Y',
                        altFormat: 'F Y',
                        theme: 'light'
                    })
                ],

                onChange(selectedDates, dateString, instance) {
                    monthValueInput.value = selectedDates.length
                        ? instance.formatDate(selectedDates[0], 'Y-m')
                        : '';
                }
            });

        } else {
            console.error(
                'ไม่สามารถสร้าง Month Picker ได้ กรุณาตรวจสอบ Flatpickr และ Month Select Plugin'
            );
        }

        let rangePicker = null;

        const rangeInput = controls.range.input;

        if (
            typeof window.flatpickr === 'function' &&
            rangeInput &&
            startInput &&
            endInput
        ) {
            const defaultStart = parseISODate(startInput.value);
            const defaultEnd = parseISODate(endInput.value);

            const validDefaultRange =
                defaultStart !== null &&
                defaultEnd !== null &&
                startInput.value <= endInput.value;

            const defaultRange = validDefaultRange
                ? [defaultStart, defaultEnd]
                : [];

            if (!validDefaultRange) {
                startInput.value = '';
                endInput.value = '';
            }

            const thaiLocale =
                window.flatpickr.l10ns?.th || {};

            rangePicker = window.flatpickr(rangeInput, {
                mode: 'range',

                dateFormat: 'd/m/Y',

                locale: {
                    ...thaiLocale,
                    rangeSeparator: ' ถึง '
                },

                defaultDate: defaultRange,
                disableMobile: true,
                allowInput: false,
                clickOpens: true,
                appendTo: document.body,
                position: 'auto',

                onReady(selectedDates, dateString, instance) {
                    updateRangeHint(selectedDates, instance);
                },

                onOpen(selectedDates, dateString, instance) {
                    const targetDate =
                        selectedDates[0] || new Date();

                    instance.jumpToDate(targetDate);
                },

                onChange(selectedDates, dateString, instance) {
                    if (selectedDates.length === 0) {
                        startInput.value = '';
                        endInput.value = '';
                    } else {
                        startInput.value = formatISODate(
                            selectedDates[0],
                            instance
                        );
                        endInput.value =
                            selectedDates.length >= 2
                                ? formatISODate(
                                    selectedDates[1],
                                    instance
                                )
                                : '';
                    }

                    updateRangeHint(selectedDates, instance);
                }
            });

        } else {
            console.error(
                'ไม่สามารถสร้างปฏิทินช่วงวันที่ได้ กรุณาตรวจสอบ Flatpickr และช่องวันที่'
            );
        }

        function syncPeriod() {
            const period = periodInput.value;
            const isRange = period === 'range';

            Object.entries(controls).forEach(([key, control]) => {
                if (!control.wrap || !control.input) return;

                const active = key === period;

                control.wrap.hidden = !active;
                control.input.disabled = !active;
            });

            if (startInput) {
                startInput.disabled = !isRange;
            }

            if (endInput) {
                endInput.disabled = !isRange;
            }

            if (rangeHint) {
                rangeHint.hidden = !isRange;
            }

            if (monthValueInput) {
                monthValueInput.disabled = period !== 'month';
            }

            if (dayPicker?.altInput) {
                dayPicker.altInput.disabled = period !== 'day';
            }

            periodButtons.forEach(button => {
                const active = button.dataset.period === period;

                button.classList.toggle('active', active);

                button.setAttribute(
                    'aria-pressed',
                    active ? 'true' : 'false'
                );
            });
        }

        periodButtons.forEach(button => {
            button.addEventListener('click', () => {
                const nextPeriod = button.dataset.period;

                if (
                    !['day', 'month', 'year', 'range'].includes(nextPeriod)
                ) {
                    return;
                }

                periodInput.value = nextPeriod;

                syncPeriod();
            });
        });

        form.addEventListener('submit', event => {
            if (periodInput.value !== 'range') {
                return;
            }

            if (!rangePicker) {
                event.preventDefault();

                if (rangeHint) {
                    rangeHint.textContent =
                        'ไม่สามารถเปิดปฏิทินได้ กรุณารีเฟรชหน้าเว็บ';
                }

                return;
            }

            if (!startInput.value || !endInput.value) {
                event.preventDefault();

                if (rangeHint) {
                    rangeHint.textContent =
                        'กรุณาคลิกเลือกวันเริ่มต้น แล้วเลือกวันสิ้นสุดให้ครบ';
                }

                rangePicker.open();
                return;
            }

            const startDate = parseISODate(startInput.value);
            const endDate = parseISODate(endInput.value);

            if (!startDate || !endDate) {
                event.preventDefault();

                if (rangeHint) {
                    rangeHint.textContent =
                        'วันที่ไม่ถูกต้อง กรุณาเลือกช่วงวันที่ใหม่';
                }

                rangePicker.open();
                return;
            }

            if (startInput.value > endInput.value) {
                event.preventDefault();

                if (rangeHint) {
                    rangeHint.textContent =
                        'วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น';
                }

                rangePicker.open();
                return;
            }

            const startUTC = Date.UTC(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate()
            );

            const endUTC = Date.UTC(
                endDate.getFullYear(),
                endDate.getMonth(),
                endDate.getDate()
            );

            const differenceDays = Math.round(
                (endUTC - startUTC) / 86400000
            );

            if (differenceDays > 365) {
                event.preventDefault();

                if (rangeHint) {
                    rangeHint.textContent =
                        'เลือกช่วงวันที่ได้สูงสุด 366 วันต่อครั้ง';
                }

                rangePicker.open();
            }
        });

        syncPeriod();
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initDashboardFilters,
            { once: true }
        );
    } else {
        initDashboardFilters();
    }
})();


/* ==========================================
    ADMIN DASHBOARD — CHART.JS
========================================== */
(() => {
    'use strict';

    function initAdminDashboardCharts() {
        const dataElement = document.getElementById(
            'adminDashboardData'
        );

        if (!dataElement) {
            console.warn(
                'ไม่พบข้อมูลกราฟ #adminDashboardData'
            );
            return;
        }

        let dashboardData;

        try {
            dashboardData = JSON.parse(
                dataElement.textContent || '{}'
            );
        } catch (error) {
            console.error(
                'อ่านข้อมูลกราฟจาก Flask ไม่สำเร็จ:',
                error
            );
            return;
        }

        const chartLabels = dashboardData.chartLabels ?? [];
        const rawLoginCounts = dashboardData.loginCounts ?? [];

        const rawStudentCreatedCounts =
            dashboardData.studentCreatedCounts ?? [];

        const rawTeacherCreatedCounts =
            dashboardData.teacherCreatedCounts ?? [];

        const departmentLabels =
            dashboardData.departmentLabels ?? [];

        const rawDepartmentCounts =
            dashboardData.departmentCounts ?? [];

        function normalizeSeries(values, expectedLength) {
            const source = Array.isArray(values) ? values : [];

            return Array.from(
                { length: expectedLength },
                (_, index) => {
                    const value = Number(source[index] ?? 0);

                    return Number.isFinite(value) && value >= 0
                        ? value
                        : 0;
                }
            );
        }

        const safeChartLabels = Array.isArray(chartLabels)
            ? chartLabels
            : [];

        const safeDepartmentLabels =
            Array.isArray(departmentLabels)
                ? departmentLabels
                : [];

        const loginCounts = normalizeSeries(
            rawLoginCounts,
            safeChartLabels.length
        );

        const studentCreatedCounts = normalizeSeries(
            rawStudentCreatedCounts,
            safeChartLabels.length
        );

        const teacherCreatedCounts = normalizeSeries(
            rawTeacherCreatedCounts,
            safeChartLabels.length
        );

        const departmentCounts = normalizeSeries(
            rawDepartmentCounts,
            safeDepartmentLabels.length
        );

        if (typeof window.Chart === 'undefined') {
            console.error(
                'ไม่พบ Chart.js กรุณาตรวจสอบการโหลดไลบรารี'
            );
            return;
        }

        const ChartJS = window.Chart;

        ChartJS.defaults.font.family =
            'Sarabun, Inter, sans-serif';

        ChartJS.defaults.color = '#8790a3';
        ChartJS.defaults.animation.duration = 900;
        ChartJS.defaults.animation.easing = 'easeOutBounce';

        ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
        ChartJS.defaults.plugins.legend.labels.boxWidth = 8;
        ChartJS.defaults.plugins.legend.labels.padding = 16;
        ChartJS.defaults.plugins.legend.labels.pointStyleWidth = 16;

        function createCommonScales() {
            return {
                x: {
                    grid: {
                        display: false
                    },

                    border: {
                        display: false
                    },

                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12
                    }
                },

                y: {
                    beginAtZero: true,

                    grid: {
                        color: 'rgba(148,163,184,.16)'
                    },

                    border: {
                        display: false
                    },

                    ticks: {
                        precision: 0,
                        padding: 8
                    }
                }
            };
        }

        function createDashboardChart(canvasId, config) {
            const canvas = document.getElementById(canvasId);

            if (!canvas) {
                console.warn(`ไม่พบ Canvas: ${canvasId}`);
                return null;
            }

            const existingChart = ChartJS.getChart(canvas);

            if (existingChart) {
                existingChart.destroy();
            }

            return new ChartJS(canvas, config);
        }

        createDashboardChart('loginActivityChart', {
            type: 'bar',

            data: {
                labels: safeChartLabels,

                datasets: [{
                    label: 'บัญชีที่มี Login ล่าสุด',
                    data: loginCounts,

                    backgroundColor: 'rgba(99,102,241,.78)',
                    hoverBackgroundColor: '#4f46e5',

                    borderRadius: 7,
                    borderSkipped: false,
                    maxBarThickness: 28
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    intersect: false,
                    mode: 'index'
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        displayColors: false
                    }
                },

                scales: createCommonScales()
            }
        });

        createDashboardChart('userGrowthChart', {
            type: 'line',
            data: {
                labels: safeChartLabels,

                datasets: [
                    {
                        label: 'นักเรียนใหม่',
                        data: studentCreatedCounts,

                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,.10)',

                        fill: true,
                        tension: 0.35,

                        pointRadius: 2.5,
                        pointHoverRadius: 5,
                        borderWidth: 2.5
                    },

                    {
                        label: 'คุณครูใหม่',
                        data: teacherCreatedCounts,

                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99,102,241,.08)',

                        fill: true,
                        tension: 0.35,

                        pointRadius: 2.5,
                        pointHoverRadius: 5,
                        borderWidth: 2.5
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    intersect: false,
                    mode: 'index'
                },

                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },

                scales: createCommonScales()
            }
        });

        createDashboardChart('teacherDepartmentChart', {
            type: 'doughnut',
            data: {
                labels: safeDepartmentLabels,

                datasets: [{
                    data: departmentCounts,

                    backgroundColor: [
                        '#6366f1',
                        '#06b6d4',
                        '#10b981',
                        '#f59e0b',
                        '#f97316',
                        '#ec4899',
                        '#8b5cf6',
                        '#94a3b8'
                    ],

                    borderColor: '#ffffff',
                    borderWidth: 4,
                    hoverOffset: 6
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                animation: {
                    duration: 1100,
                    easing: 'easeOutCubic',
                    animateRotate: true,
                    animateScale: true
                },

                cutout: '68%',

                plugins: {
                    legend: {
                        position: 'bottom'
                    },

                    tooltip: {
                        callbacks: {
                            label(context) {
                                const label = context.label || '';
                                const value = Number(context.parsed || 0);

                                return `${label}: ${value.toLocaleString('th-TH')} คน`;
                            }
                        }
                    }
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            initAdminDashboardCharts,
            { once: true }
        );
    } else {
        initAdminDashboardCharts();
    }
})();

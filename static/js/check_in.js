// ระบบนับถอยหลัง และ Lock Card เมื่อหมดเวลา
function updateCountdown() {
    const el = document.getElementById('timer');
    const card = document.getElementById('checkin-card');
    const start = new Date(el.getAttribute('data-start')).getTime();
    const mins = parseInt(el.getAttribute('data-minutes'));
    const expireTime = start + (mins * 60000);
    const diff = expireTime - Date.now();

    if (diff <= 0) {
        el.innerHTML = `<span class="text-danger">หมดเวลาแล้ว</span>`;
        document.getElementById('status-container').innerHTML = `<i class="bi bi-circle-fill text-danger me-2 small"></i><span class="text-danger fw-bold">ปิดรับเช็คชื่อแล้ว</span>`;

        if (card) card.classList.add('card-expired');

        const btn = document.getElementById('submitBtn');
        if (btn) {
            btn.disabled = true;
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
            document.getElementById('btnText').innerText = "หมดเวลาเช็คชื่อแล้ว";
        }
        return;
    }

    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.innerHTML = `เหลือเวลา ${m}:${s < 10 ? '0' : ''}${s} นาที`;
}

const timerInterval = setInterval(updateCountdown, 1000);
updateCountdown();

// API URLs
const API_URLS = {
    getStudent: (sid) => {
        const baseUrl = window.API_CONFIG ? window.API_CONFIG.getStudent : '';
        return baseUrl + sid;
    },
    get submit() { return window.API_CONFIG ? window.API_CONFIG.submit : ''; },
    get redirect() { return window.API_CONFIG ? window.API_CONFIG.redirect : ''; }
};

// ฟังก์ชันดึงชื่อนักเรียนอัตโนมัติ 
document.getElementById('student_id').addEventListener('blur', function () {
    const studentId = this.value.trim();
    if (studentId.length < 3) return;

    const nameInput = document.getElementById('student_name');
    const infoDisplay = document.getElementById('student_info_display');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');

    nameInput.placeholder = "กำลังค้นหารายชื่อ...";

    fetch(API_URLS.getStudent(studentId))
        .then(response => {
            if (!response.ok) throw new Error('ติดต่อเซิร์ฟเวอร์ไม่ได้');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                nameInput.value = data.full_name;
                document.getElementById('student_level').value = data.level;
                document.getElementById('student_room').value = data.room;
                document.getElementById('student_number').value = data.number;

                infoDisplay.style.display = 'block';
                infoDisplay.className = "small mt-2 text-success fw-bold";
                infoDisplay.innerHTML = `<i class="bi bi-check-circle-fill"></i> ${data.level}/${data.room} เลขที่ ${data.number}`;

                submitBtn.disabled = false;
                btnText.innerText = "บันทึกการเช็คชื่อ";

                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: `พบข้อมูล: ${data.full_name}`, showConfirmButton: false, timer: 1500
                });

            } else {
                nameInput.value = "";
                infoDisplay.style.display = 'block';
                submitBtn.disabled = true;

                if (data.is_already_checked) {
                    nameInput.placeholder = "เช็คชื่อไปแล้ว!";
                    infoDisplay.className = "small mt-2 text-danger fw-bold";
                    infoDisplay.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ${data.message}`;
                    //btnText.innerText = "เช็คชื่อไปแล้ว";

                    Swal.fire('เช็คชื่อไปแล้ว!', data.message, 'error');
                } else {
                    nameInput.placeholder = "ไม่พบรายชื่อในกลุ่มเรียนนี้";
                    infoDisplay.className = "small mt-2 text-warning fw-bold";
                    infoDisplay.innerHTML = `<i class="bi bi-x-circle-fill"></i> ${data.message}`;
                    //btnText.innerText = "ไม่พบข้อมูลนักเรียน";

                    Swal.fire('ไม่พบสิทธิ์การเช็คชื่อ!', data.message, 'warning');
                }
            }
        })
        .catch(err => {
            console.error("Fetch error:", err);
            nameInput.placeholder = "มีข้อผิดพลาดในการเชื่อมต่อ";
        });
});

// ส่งข้อมูล (Submit Form)
document.getElementById('checkinForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const btn = document.getElementById('submitBtn');
    const btnIcon = document.getElementById('btnIcon');
    const btnText = document.getElementById('btnText');

    const originalIcon = btnIcon.className;
    const originalText = btnText.innerText;

    btnIcon.className = "spinner-border spinner-border-sm me-2";
    btnText.innerText = 'กำลังบันทึก...';
    btn.disabled = true;

    fetch(API_URLS.submit, {
        method: 'POST',
        headers: { 'X-CSRFToken': window.API_CONFIG.csrfToken },
        body: new FormData(this)
    })
        .then(async res => {
            const data = await res.json();
            if (!res.ok) throw data;
            return data;
        })
        .then(data => {
            if (data.success) {
                Swal.fire({
                    icon: 'success', title: 'เช็คชื่อสำเร็จ!',
                    text: 'กำลังแสดงหน้ารายชื่อ...', timer: 1500, showConfirmButton: false
                }).then(() => {
                    window.location.href = API_URLS.redirect;
                });
            }
        })
        .catch((err) => {
            console.error("Submit error:", err);
            Swal.fire('ล้มเหลว', err.message || 'รหัสยืนยันไม่ถูกต้องหรือห้องเรียนปิดแล้ว', 'error');
            btnIcon.className = originalIcon;
            btnText.innerText = originalText;
            btn.disabled = false;
        });
});

window.addEventListener('pageshow', function (event) {
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
        window.location.reload();
    }
});
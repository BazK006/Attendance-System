document.addEventListener('DOMContentLoaded', function () {
    const roomFilter = document.getElementById('roomFilter');
    const nameSearch = document.getElementById('nameSearch');
    const clearSearch = document.getElementById('clearSearch');
    const studentItems = document.querySelectorAll('.student-item');
    const studentContainer = document.getElementById('studentContainer');
    const noDataMessage = document.getElementById('noDataMessage');
    const totalCountLabel = document.getElementById('total-student-count');

    window.refreshStudentList = function masterFilter() {
        const selectedValue = roomFilter.value;
        const searchText = nameSearch.value.toLowerCase().trim();
        let visibleCount = 0;

        localStorage.setItem('selectedRoom', selectedValue);

        studentItems.forEach(item => {
            const edu = item.getAttribute('data-education');
            const lvl = item.getAttribute('data-level');
            const rm = item.getAttribute('data-room');

            const prefix = (edu === 'มัธยมศึกษา') ? 'ม.' : (edu === 'ประถมศึกษา' ? 'ป.' : '');
            const currentFullRoom = `${prefix}${lvl}/${rm}`;

            const studentName = item.querySelector('h6').textContent.toLowerCase();
            const studentId = item.querySelector('.text-muted').textContent.toLowerCase();

            const matchRoom = (selectedValue === 'all' || currentFullRoom === selectedValue);

            const matchSearch = studentName.includes(searchText) ||
                studentId.includes(searchText) ||
                currentFullRoom.includes(searchText);

            if (matchRoom && matchSearch) {
                item.style.display = 'block';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        if (totalCountLabel) {
            totalCountLabel.textContent = visibleCount;
        }

        if (visibleCount === 0) {
            studentContainer.classList.add('d-none');
            noDataMessage.style.display = 'block';
        } else {
            studentContainer.classList.remove('d-none');
            studentContainer.classList.add('d-flex');
            noDataMessage.style.display = 'none';
        }

        if (clearSearch) {
            clearSearch.style.visibility = searchText.length > 0 ? 'visible' : 'hidden';
        }
    };

    if (roomFilter) roomFilter.addEventListener('change', window.refreshStudentList);
    if (nameSearch) nameSearch.addEventListener('input', window.refreshStudentList);

    if (clearSearch) {
        clearSearch.addEventListener('mousedown', function (e) {
            e.preventDefault(); 
            nameSearch.value = '';
            window.refreshStudentList();
            nameSearch.focus(); 
        });
    }

    const savedRoom = localStorage.getItem('selectedRoom');
    if (savedRoom && roomFilter) {
        roomFilter.value = savedRoom;
    }

    window.refreshStudentList();
});

function prepareAddModal() {
    const roomFilter = document.getElementById('roomFilter');
    const levelInput = document.getElementById('input_level');
    const roomInput = document.getElementById('input_room');
    const eduSelect = document.getElementById('edu_select');

    if (roomFilter && roomFilter.value !== 'all') {
        const val = roomFilter.value;
        const prefix = val.charAt(0);

        if (eduSelect) {
            if (prefix === 'ม') {
                eduSelect.value = 'มัธยมศึกษา';
            } else if (prefix === 'ป') {
                eduSelect.value = 'ประถมศึกษา';
            }
        }

        const numberPart = val.substring(2);
        const parts = numberPart.split('/');

        if (levelInput) levelInput.value = parts[0] || '';
        if (roomInput) roomInput.value = parts[1] || '';

    } else {
        if (levelInput) levelInput.value = '';
        if (roomInput) roomInput.value = '';
    }
}

// ฟังก์ชันยืนยันการลบนักเรียน 
function confirmDelete(studentId, fullName) {
    Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `คุณกำลังจะลบข้อมูลของ "${fullName}" ซึ่งไม่สามารถกู้คืนได้`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ใช่ ลบเลย!',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/students/delete/${studentId}`;
        }
    });
}


// ฟังก์ชันล้างการกรองทั้งหมด 
function fullReset() {
    const roomFilter = document.getElementById('roomFilter');
    const nameSearch = document.getElementById('nameSearch');

    if (roomFilter) roomFilter.value = 'all';
    if (nameSearch) nameSearch.value = '';

    localStorage.removeItem('selectedRoom');
    window.refreshStudentList();
}

document.querySelector('#addStudentModal form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const modalElement = document.getElementById('addStudentModal');
    const modalInstance = bootstrap.Modal.getInstance(modalElement);

    try {
        const response = await fetch(this.action, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (modalInstance) {
            modalInstance.hide();
        }

        if (result.status === 'success') {
            Swal.fire({
                title: 'สร้างข้อมูลสำเร็จ!',
                text: result.message,
                icon: 'success',
                showConfirmButton: true,
                confirmButtonText: 'รับทราบ!',
                confirmButtonColor: '#0d6efd',
                customClass: {
                    popup: 'rounded-4 shadow-lg border-0',
                    confirmButton: 'btn btn-primary rounded-3 px-4 py-2'
                },
                //backdrop: `rgba(0,0,123,0.1) `,
                heightAuto: false
            }).then((result) => {
                if (result.isConfirmed) {
                    location.reload();
                }
            });
        } else {
            Swal.fire({
                title: 'เกิดข้อผิดพลาด!',
                text: result.message,
                icon: 'error',
                confirmButtonText: 'รับทราบ'
            });
        }
    } catch (error) {
        if (modalInstance) modalInstance.hide();
        Swal.fire(
            'ข้อมูลนักเรียนซ้ำ!',
            'นักเรียนคนนี้มีอยู่ในระบบแล้ว ลองตรวจสอบใหม่อีกครั้ง',
            'error'
        );
    }
});

document.getElementById('editProfileForm').addEventListener('submit', function (e) {
    e.preventDefault();

    Swal.fire({
        title: '<span style="font-family: \'Sarabun\', sans-serif;">ยืนยันการแก้ไขข้อมูล?</span>',
        html: '<span style="font-family: \'Sarabun\', sans-serif;">ระบบจะทำการอัปเดตข้อมูลโปรไฟล์ของคุณ</span>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4e73df',
        cancelButtonColor: '#f1f5f9',
        confirmButtonText: '<span style="font-family: \'Sarabun\', sans-serif; font-weight: 600;">ใช่, บันทึกเลย!</span>',
        cancelButtonText: '<span style="font-family: \'Sarabun\', sans-serif; font-weight: 600; color: #475569;">ยกเลิก</span>',
        reverseButtons: true,
        customClass: {
            popup: 'rounded-4'
        }
    }).then((result) => {
        if (result.isConfirmed) {

            const formData = new FormData(this);

            fetch("{{ url_for('teacher.edit_profile') }}", {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        Swal.fire({
                            icon: 'success',
                            title: '<span style="font-family: \'Sarabun\', sans-serif;">บันทึกสำเร็จ!</span>',
                            html: `<span style="font-family: 'Sarabun', sans-serif;">ข้อมูลของ <b>${data.teacher_name}</b> ถูก${data.message}</span>`,
                            showConfirmButton: false,
                            timer: false,
                            customClass: {
                                popup: 'rounded-4'
                            }
                        }).then(() => {
                            window.location.href = "{{ url_for('dashboard.dashboard') }}";
                        });
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire({
                        icon: 'error',
                        title: '<span style="font-family: \'Sarabun\', sans-serif;">เกิดข้อผิดพลาด!</span>',
                        html: '<span style="font-family: \'Sarabun\', sans-serif;">ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง</span>',
                        confirmButtonColor: '#4e73df',
                        customClass: { popup: 'rounded-4' }
                    });
                });
        }
    });
});
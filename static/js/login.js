const swalConfig = {
    confirmButtonColor: '#6a9cff',
    confirmButtonText: 'ตกลง',
    showClass: {
        popup: 'animate__animated animate__zoomIn animate__faster'
    },
    hideClass: {
        popup: 'animate__animated animate__fadeOut animate__faster'
    }
};

window.showAlert = function (category, message) {
    let iconType = 'info';
    let titleText = 'แจ้งเพื่อทราบ';
    let footerText = message;

    if (category === 'danger' || category === 'error') {
        iconType = 'error';
        titleText = 'เข้าสู่ระบบไม่สำเร็จ!';
    }
    else if (category === 'success') {
        iconType = 'success';
        titleText = 'ทำรายการสำเร็จ!';

        if (
            message.includes('เข้าสู่ระบบ') ||
            message.includes('ยินดีต้อนรับผู้ดูแลระบบ')
        ) {
            titleText = 'เข้าสู่ระบบสำเร็จ!';

            if (!message.includes('ยินดีต้อนรับผู้ดูแลระบบ')) {
                footerText = 'ยินดีต้อนรับเข้าสู่ระบบเช็คชื่อนักเรียน!';
            }
        }
        else if (message.includes('ออกจากระบบ')) {
            titleText = 'ออกจากระบบเรียบร้อย';
            footerText = 'ขอบคุณที่ใช้งานระบบเช็คชื่อครับ';
        }
    }
    else if (category === 'info') {
        iconType = 'info';
        if (message.includes('ยกเลิก')) {
            titleText = 'ยกเลิกรายการเรียบร้อย';
        } else {
            titleText = 'แจ้งเพื่อทราบ';
        }
    }

    Swal.fire({
        icon: iconType,
        title: `<span style="font-size: 1.5rem; font-weight: 800;">${titleText}</span>`,
        text: footerText,
        confirmButtonColor: '#6a9cff',
        confirmButtonText: 'เข้าใจแล้ว',
        customClass: {
            popup: 'rounded-4 shadow-lg border-0',
            title: 'text-primary-emphasis',
            htmlContainer: 'text-muted'
        }
    });
};

document.addEventListener("DOMContentLoaded", function () {
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");

    if (!passwordInput || !togglePassword) return;

    togglePassword.addEventListener("click", function () {
        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";

        this.classList.toggle("bi-eye", isPassword);
        this.classList.toggle("bi-eye-slash", !isPassword);
    });
});
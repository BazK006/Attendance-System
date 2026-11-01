document.addEventListener('DOMContentLoaded', function () {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
    const timeBadge = document.getElementById('pageLoadTime');
    if (timeBadge) {
        timeBadge.textContent = timeStr;
    }
});


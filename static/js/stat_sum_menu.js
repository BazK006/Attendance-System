document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('smartSearch');
    const cards = document.querySelectorAll('.subject-item');
    const noResults = document.getElementById('noResults');

    if (!searchInput)
        return;

    searchInput.addEventListener('input', function () {
        const searchTerm = searchInput.value.toLowerCase().trim();
        let hasFound = false;

        cards.forEach(card => {
            const searchData = card.getAttribute('data-search') || card.innerText;
            const cardText = searchData.toLowerCase();

            if (cardText.includes(searchTerm)) {
                card.classList.remove('d-none');
                card.classList.add('animate__animated', 'animate__fadeIn');
                hasFound = true;
            } else {
                card.classList.add('d-none');
                card.classList.remove('animate__animated', 'animate__fadeIn');
            }
        });

        if (noResults) {
            if (hasFound || searchTerm === '') {
                noResults.classList.add('d-none');
            } else {
                noResults.classList.remove('d-none');
            }
        }
    });
});

function clearSearch() {
    const searchInput = document.getElementById('smartSearch');
    if (searchInput) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const smartSearch = document.getElementById('smartSearch');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    if (smartSearch && clearSearchBtn) {
        function toggleClearBtn() {
            if (smartSearch.value.trim().length > 0) {
                clearSearchBtn.style.visibility = 'visible';
            } else {
                clearSearchBtn.style.visibility = 'hidden';
            }
        }

        smartSearch.addEventListener('input', function () {
            toggleClearBtn();
        });

        clearSearchBtn.addEventListener('mousedown', function (e) {
            e.preventDefault();

            smartSearch.value = '';
            toggleClearBtn();

            if (typeof filterSubjects === 'function') {
                filterSubjects();
            } else if (typeof clearSearch === 'function') {
                clearSearch();
            }

            smartSearch.focus();
        });
    }
});

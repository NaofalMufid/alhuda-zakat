/**
 * Page navigation
 */

function showPage(pageName) {
    document.querySelectorAll('.page-content').forEach(el => {
        el.classList.add('d-none');
    });
    
    document.getElementById(`page-${pageName}`).classList.remove('d-none');
    
    document.querySelectorAll('#mainNav .nav-link').forEach((link, index) => {
        link.classList.remove('active');
        if ((pageName === 'fitrah' && index === 0) ||
            (pageName === 'mal' && index === 1) ||
            (pageName === 'laporan' && index === 2)) {
            link.classList.add('active');
        }
    });
    
    if (pageName === 'laporan') {
        loadLaporan();
    }
}

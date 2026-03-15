/**
 * Page navigation
 */

// Halaman default saat pertama kali load
const DEFAULT_PAGE = 'laporan';

function showPage(pageName) {
    // Cek jika halaman protected dan user belum login
    const protectedPages = ['fitrah', 'mal', 'penduduk'];
    if (protectedPages.includes(pageName) && typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
        showToast('info', 'Silakan login untuk mengakses halaman tersebut');
        showLoginModal();
        return;
    }

    // Hide all pages
    document.querySelectorAll('.page-content').forEach(el => {
        el.classList.add('d-none');
    });
    
    // Show target page
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.remove('d-none');
    }
    
    // Update active state in navigation
    updateActiveNav(pageName);
    
    // Update URL hash untuk bookmark
    window.location.hash = pageName;
    
    // Load data berdasarkan halaman
    if (pageName === 'laporan') {
        loadLaporan();
    } else if (pageName === 'penduduk') {
        loadPendudukList();
        // Reset to list tab when navigating to penduduk page
        const listTab = document.querySelector('#pendudukSubNav [data-tab="list"]');
        if (listTab) showPendudukTab('list', listTab);
    } else if (pageName === 'fitrah' || pageName === 'mal') {
        // Load transaksi list jika tab list aktif
        const tabList = document.getElementById(`${pageName}-tab-list`);
        if (tabList && !tabList.classList.contains('d-none')) {
            loadTransaksiList();
        }
    }
}

/**
 * Update active navigation state
 */
function updateActiveNav(pageName) {
    document.querySelectorAll('#mainNav .nav-link').forEach(link => {
        link.classList.remove('active');
        const linkPage = link.getAttribute('data-page');
        if (linkPage === pageName) {
            link.classList.add('active');
        }
    });
}

/**
 * Initialize navigation on page load
 */
function initNavigation() {
    // Cek URL hash untuk direct link
    const hash = window.location.hash.replace('#', '');
    const validPages = ['fitrah', 'mal', 'laporan', 'penduduk'];
    
    if (hash && validPages.includes(hash)) {
        // Cek akses untuk protected pages
        const protectedPages = ['fitrah', 'mal', 'penduduk'];
        if (protectedPages.includes(hash) && typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
            showPage('laporan');
        } else {
            showPage(hash);
        }
    } else {
        // Default ke laporan
        showPage(DEFAULT_PAGE);
    }
}

/**
 * Show fitrah sub tab
 */
function showFitrahTab(tabName, clickedElement) {
    if (typeof event !== 'undefined') event.preventDefault();
    
    document.querySelectorAll('.fitrah-tab-content').forEach(el => {
        el.classList.add('d-none');
    });
    
    document.getElementById(`fitrah-tab-${tabName}`).classList.remove('d-none');
    
    // Update active state
    document.querySelectorAll('#fitrahSubNav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    if (clickedElement) {
        clickedElement.classList.add('active');
    }
    
    if (tabName === 'list') {
        loadTransaksiList();
    }
}

/**
 * Show mal sub tab
 */
function showMalTab(tabName, clickedElement) {
    if (typeof event !== 'undefined') event.preventDefault();
    
    document.querySelectorAll('.mal-tab-content').forEach(el => {
        el.classList.add('d-none');
    });
    
    document.getElementById(`mal-tab-${tabName}`).classList.remove('d-none');
    
    // Update active state
    document.querySelectorAll('#malSubNav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    if (clickedElement) {
        clickedElement.classList.add('active');
    }
    
    if (tabName === 'list') {
        loadTransaksiList();
    }
}

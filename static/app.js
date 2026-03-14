/**
 * Zakat Web App - Frontend JavaScript
 * Features: LocalStorage caching, Debounced search, Real-time calculations
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
    API_BASE_URL: '', // Same origin
    CACHE_KEY: 'zakat_cache',
    CACHE_TTL_MINUTES: 60,
    DEBOUNCE_DELAY: 300
};

// ==================== STATE MANAGEMENT ====================
const state = {
    penduduk: [],
    opsiPembayaran: [],
    amil: [],
    selectedPenduduk: null,
    cacheLoaded: false
};

// ==================== LOCALSTORAGE CACHE ====================
const Cache = {
    get() {
        try {
            const data = localStorage.getItem(CONFIG.CACHE_KEY);
            if (!data) return null;
            
            const cache = JSON.parse(data);
            const cacheTime = new Date(cache.cached_at);
            const now = new Date();
            const diffMinutes = (now - cacheTime) / (1000 * 60);
            
            // Check if cache is expired
            if (diffMinutes > CONFIG.CACHE_TTL_MINUTES) {
                localStorage.removeItem(CONFIG.CACHE_KEY);
                return null;
            }
            
            return cache;
        } catch (e) {
            console.error('Cache error:', e);
            return null;
        }
    },
    
    set(penduduk, opsiPembayaran, amil) {
        const cache = {
            penduduk,
            opsi_pembayaran: opsiPembayaran,
            amil,
            cached_at: new Date().toISOString()
        };
        localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify(cache));
    },
    
    clear() {
        localStorage.removeItem(CONFIG.CACHE_KEY);
    }
};

// ==================== API CLIENT ====================
const API = {
    async get(endpoint) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },
    
    async post(endpoint, data) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return response.json();
    }
};

// ==================== DATA LOADING ====================
async function loadMasterData() {
    showLoading(true);
    
    try {
        // Try cache first
        const cache = Cache.get();
        
        if (cache) {
            console.log('Using cached data');
            state.penduduk = cache.penduduk || [];
            state.opsiPembayaran = cache.opsi_pembayaran || [];
            state.amil = cache.amil || [];
            state.cacheLoaded = true;
        } else {
            console.log('Fetching fresh data from API');
            
            // Fetch all master data in parallel
            const [penduduk, opsiPembayaran, amil] = await Promise.all([
                API.get('/api/penduduk'),
                API.get('/api/master/opsi-pembayaran'),
                API.get('/api/master/amil')
            ]);
            
            state.penduduk = penduduk || [];
            state.opsiPembayaran = opsiPembayaran || [];
            state.amil = amil || [];
            
            // Save to cache
            Cache.set(state.penduduk, state.opsiPembayaran, state.amil);
            state.cacheLoaded = true;
        }
        
        // Populate dropdowns
        populateOpsiPembayaran();
        populateAmilDropdowns();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showToast('Gagal memuat data. Silakan refresh halaman.', 'error');
    } finally {
        showLoading(false);
    }
}

function populateOpsiPembayaran() {
    const select = document.getElementById('jenisBayar');
    if (!select) return;
    
    // Keep the first option
    select.innerHTML = '<option value="">Pilih jenis pembayaran...</option>';
    
    state.opsiPembayaran.forEach(opsi => {
        const option = document.createElement('option');
        option.value = opsi.kategori;
        
        // Format display text
        let displayText = opsi.kategori;
        if (opsi.nilai) {
            if (opsi.satuan === 'kg') {
                displayText += ` (${opsi.nilai} ${opsi.satuan})`;
            } else {
                displayText += ` (${formatRupiah(opsi.nilai)})`;
            }
        }
        
        option.textContent = displayText;
        option.dataset.nilai = opsi.nilai;
        option.dataset.satuan = opsi.satuan;
        select.appendChild(option);
    });
}

function populateAmilDropdowns() {
    const selects = [
        document.getElementById('amilPenerima'),
        document.getElementById('amilPenerimaMal')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        
        // Keep the first option
        select.innerHTML = '<option value="">Pilih amil...</option>';
        
        state.amil.forEach(amil => {
            if (!amil.nama) return;
            const option = document.createElement('option');
            option.value = amil.nama;
            option.textContent = amil.tugas ? `${amil.nama} (${amil.tugas})` : amil.nama;
            select.appendChild(option);
        });
    });
}

// ==================== PAGE NAVIGATION ====================
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(el => {
        el.classList.add('d-none');
    });
    
    // Show selected page
    document.getElementById(`page-${pageName}`).classList.remove('d-none');
    
    // Update nav active state
    document.querySelectorAll('#mainNav .nav-link').forEach((link, index) => {
        link.classList.remove('active');
        if ((pageName === 'fitrah' && index === 0) ||
            (pageName === 'mal' && index === 1) ||
            (pageName === 'laporan' && index === 2)) {
            link.classList.add('active');
        }
    });
    
    // Load data if needed
    if (pageName === 'laporan') {
        loadLaporan();
    }
}

// ==================== SEARCH FUNCTIONALITY ====================
let searchTimeout;

function initSearch() {
    const searchInput = document.getElementById('searchKK');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            hideSearchResults();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            performSearch(query);
        }, CONFIG.DEBOUNCE_DELAY);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSearchResults();
        }
    });
}

function performSearch(query) {
    const results = state.penduduk.filter(p => 
        p.nama_kk.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10); // Limit to 10 results
    
    displaySearchResults(results);
}

function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = '<div class="search-item text-muted">Tidak ditemukan</div>';
        container.classList.add('show');
        return;
    }
    
    container.innerHTML = results.map(p => `
        <div class="search-item" onclick="selectPenduduk('${escapeHtml(p.nama_kk)}')">
            <div class="name">${escapeHtml(p.nama_kk)}</div>
            <div class="info">
                <span class="badge-golongan ${p.golongan || 'G'}">${p.golongan || '-'}</span>
                <span class="ms-2">${p.rt || '-'} • ${p.jumlah_jiwa} jiwa</span>
            </div>
        </div>
    `).join('');
    
    container.classList.add('show');
}

function hideSearchResults() {
    const container = document.getElementById('searchResults');
    if (container) container.classList.remove('show');
}

function selectPenduduk(namaKK) {
    const penduduk = state.penduduk.find(p => p.nama_kk === namaKK);
    if (!penduduk) return;
    
    state.selectedPenduduk = penduduk;
    
    // Update UI
    document.getElementById('searchKK').value = penduduk.nama_kk;
    document.getElementById('selectedKK').value = penduduk.nama_kk;
    document.getElementById('jumlahJiwa').value = penduduk.jumlah_jiwa || 1;
    
    // Show info
    document.getElementById('infoNamaKK').textContent = penduduk.nama_kk;
    document.getElementById('infoGolongan').textContent = penduduk.golongan || '-';
    document.getElementById('infoGolongan').className = `badge-golongan ${penduduk.golongan || 'G'}`;
    document.getElementById('infoAlamat').textContent = penduduk.rt || '-';
    document.getElementById('infoJumlahJiwa').textContent = penduduk.jumlah_jiwa || 0;
    document.getElementById('infoKK').classList.remove('d-none');
    
    hideSearchResults();
    calculateTotal();
}

// ==================== CALCULATIONS ====================
function onJenisChange() {
    calculateTotal();
}

function calculateTotal() {
    const select = document.getElementById('jenisBayar');
    const jumlahJiwa = parseInt(document.getElementById('jumlahJiwa')?.value) || 0;
    
    if (!select || !select.value) {
        updateTotalDisplay(0, '');
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const nilai = parseFloat(selectedOption.dataset.nilai) || 0;
    const satuan = selectedOption.dataset.satuan;
    
    let total = 0;
    let displayText = '';
    
    if (satuan === 'kg') {
        // Beras
        total = nilai * jumlahJiwa;
        displayText = `${total} kg`;
        document.getElementById('jumlahBayar').value = '';
        document.getElementById('jumlahBayar').disabled = true;
    } else {
        // Uang
        total = nilai * jumlahJiwa;
        displayText = formatRupiah(total);
        document.getElementById('jumlahBayar').disabled = false;
    }
    
    updateTotalDisplay(total, displayText, satuan);
}

function updateTotalDisplay(total, displayText, satuan = '') {
    const el = document.getElementById('totalKewajiban');
    if (!el) return;
    
    el.textContent = displayText || formatRupiah(total);
    el.dataset.total = total;
    el.dataset.satuan = satuan;
}

function calculateKelebihan() {
    const jumlahBayar = parseFloat(document.getElementById('jumlahBayar')?.value) || 0;
    const totalEl = document.getElementById('totalKewajiban');
    const totalKewajiban = parseFloat(totalEl?.dataset.total) || 0;
    const satuan = totalEl?.dataset.satuan;
    
    if (satuan === 'kg' || totalKewajiban === 0) {
        document.getElementById('kelebihanSection')?.classList.add('d-none');
        return;
    }
    
    const kelebihan = jumlahBayar - totalKewajiban;
    
    if (kelebihan > 0) {
        document.getElementById('kelebihanSection').classList.remove('d-none');
        document.getElementById('jumlahKelebihan').textContent = formatRupiah(kelebihan);
    } else {
        document.getElementById('kelebihanSection').classList.add('d-none');
    }
}

// ==================== FORM SUBMISSIONS ====================
async function submitFitrah(event) {
    event.preventDefault();
    
    if (!state.selectedPenduduk) {
        showToast('Silakan pilih nama kepala keluarga', 'warning');
        return;
    }
    
    const jenisBayar = document.getElementById('jenisBayar').value;
    if (!jenisBayar) {
        showToast('Silakan pilih jenis pembayaran', 'warning');
        return;
    }
    
    const totalEl = document.getElementById('totalKewajiban');
    const satuan = totalEl.dataset.satuan;
    const totalKewajiban = parseFloat(totalEl.dataset.total) || 0;
    
    let jumlahBeras = 0;
    let jumlahUang = 0;
    let kelebihanDikembalikan = 0;
    let kelebihanAmal = 0;
    
    if (satuan === 'kg') {
        jumlahBeras = totalKewajiban;
    } else {
        jumlahUang = totalKewajiban;
        
        const jumlahBayar = parseFloat(document.getElementById('jumlahBayar').value) || 0;
        const kelebihan = jumlahBayar - totalKewajiban;
        
        if (kelebihan > 0) {
            const pengalihan = document.getElementById('pengalihanKelebihan').value;
            if (pengalihan === 'dikembalikan') {
                kelebihanDikembalikan = kelebihan;
            } else {
                kelebihanAmal = kelebihan;
            }
            jumlahUang = jumlahBayar; // Total yang dibayarkan
        }
    }
    
    const data = {
        nama_kk: state.selectedPenduduk.nama_kk,
        jumlah_jiwa: parseInt(document.getElementById('jumlahJiwa').value) || 1,
        jenis_zakat: 'fitrah',
        kategori: jenisBayar,
        jumlah_beras_kg: jumlahBeras,
        jumlah_uang: jumlahUang,
        kelebihan_dikembalikan: kelebihanDikembalikan,
        kelebihan_amal: kelebihanAmal,
        amil_penerima: document.getElementById('amilPenerima').value
    };
    
    try {
        showLoading(true);
        await API.post('/api/transaksi', data);
        
        showToast('Transaksi zakat fitrah berhasil disimpan!', 'success');
        resetFormFitrah();
        
        // Clear cache to refresh data
        Cache.clear();
        
    } catch (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function submitMal(event) {
    event.preventDefault();
    
    const data = {
        nama_kk: document.getElementById('namaMuzaki').value,
        jumlah_jiwa: 1,
        jenis_zakat: 'mal',
        kategori: document.getElementById('keteranganMal').value || 'mal',
        jumlah_beras_kg: 0,
        jumlah_uang: parseFloat(document.getElementById('jumlahZakatMal').value) || 0,
        kelebihan_dikembalikan: 0,
        kelebihan_amal: 0,
        amil_penerima: document.getElementById('amilPenerimaMal').value
    };
    
    if (!data.jumlah_uang || data.jumlah_uang <= 0) {
        showToast('Silakan masukkan jumlah zakat mal', 'warning');
        return;
    }
    
    try {
        showLoading(true);
        await API.post('/api/transaksi', data);
        
        showToast('Zakat mal berhasil disimpan!', 'success');
        resetFormMal();
        
        // Clear cache
        Cache.clear();
        
    } catch (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function resetFormFitrah() {
    document.getElementById('formFitrah').reset();
    document.getElementById('infoKK').classList.add('d-none');
    document.getElementById('kelebihanSection').classList.add('d-none');
    state.selectedPenduduk = null;
    updateTotalDisplay(0, 'Rp 0');
}

function resetFormMal() {
    document.getElementById('formMal').reset();
}

// ==================== LAPORAN ====================
async function loadLaporan() {
    showLoading(true);
    
    try {
        const [kewajiban, total, gabungan] = await Promise.all([
            API.get('/api/laporan/kewajiban'),
            API.get('/api/laporan/total'),
            API.get('/api/laporan/gabungan')
        ]);
        
        renderLaporanKewajiban(kewajiban);
        renderLaporanTotal(total);
        renderDetailKategori(kewajiban);
        
        // Update stat cards
        document.getElementById('statTotalKK').textContent = gabungan.jumlah_kk_muzaki || 0;
        document.getElementById('statTotalJiwa').textContent = gabungan.total_jiwa || 0;
        document.getElementById('statTotalUang').textContent = formatRupiahShort(gabungan.total_uang || 0);
        document.getElementById('statTotalAmal').textContent = formatRupiahShort(gabungan.total_amal || 0);
        
    } catch (error) {
        showToast('Gagal memuat laporan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function renderLaporanKewajiban(data) {
    const container = document.getElementById('laporanKewajiban');
    
    let html = `
        <div class="row g-3">
            <div class="col-6">
                <div class="text-muted small">Total Beras</div>
                <div class="h5 mb-0">${data.total_beras_kg || 0} kg</div>
            </div>
            <div class="col-6">
                <div class="text-muted small">Total Uang</div>
                <div class="h5 mb-0">${formatRupiah(data.total_uang || 0)}</div>
            </div>
            <div class="col-6">
                <div class="text-muted small">Total Jiwa</div>
                <div class="h5 mb-0">${data.total_jiwa || 0}</div>
            </div>
            <div class="col-6">
                <div class="text-muted small">Jumlah KK</div>
                <div class="h5 mb-0">${data.jumlah_kk || 0}</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderLaporanTotal(data) {
    const container = document.getElementById('laporanTotal');
    
    let html = `
        <div class="row g-3">
            <div class="col-6">
                <div class="text-muted small">Total Beras</div>
                <div class="h5 mb-0">${data.total_beras_kg || 0} kg</div>
            </div>
            <div class="col-6">
                <div class="text-muted small">Total Uang</div>
                <div class="h5 mb-0">${formatRupiah(data.total_uang || 0)}</div>
            </div>
            <div class="col-6">
                <div class="text-muted small">Kelebihan Dikembalikan</div>
                <div class="h5 mb-0">${formatRupiah(data.total_kelebihan_uang || 0)}</div>
            </div>
            <div class="col-6">
                <div class="text-muted small">Total Amal</div>
                <div class="h5 mb-0">${formatRupiah(data.total_amal || 0)}</div>
            </div>
            <div class="col-12">
                <div class="text-muted small">Jumlah Transaksi</div>
                <div class="h5 mb-0">${data.jumlah_transaksi || 0}</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

function renderDetailKategori(data) {
    const container = document.getElementById('detailKategori');
    
    let html = '<div class="row g-3">';
    
    // Detail Beras
    if (data.detail_beras && Object.keys(data.detail_beras).length > 0) {
        html += '<div class="col-md-6"><h6 class="mb-2">Detail Beras</h6>';
        for (const [kategori, jumlah] of Object.entries(data.detail_beras)) {
            if (jumlah > 0) {
                html += `
                    <div class="d-flex justify-content-between py-2 border-bottom">
                        <span>${kategori}</span>
                        <strong>${jumlah} kg</strong>
                    </div>
                `;
            }
        }
        html += '</div>';
    }
    
    // Detail Uang
    if (data.detail_uang && Object.keys(data.detail_uang).length > 0) {
        html += '<div class="col-md-6"><h6 class="mb-2">Detail Uang</h6>';
        for (const [kategori, jumlah] of Object.entries(data.detail_uang)) {
            if (jumlah > 0) {
                html += `
                    <div class="d-flex justify-content-between py-2 border-bottom">
                        <span>${kategori}</span>
                        <strong>${formatRupiah(jumlah)}</strong>
                    </div>
                `;
            }
        }
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function refreshLaporan() {
    loadLaporan();
}

// ==================== UTILITY FUNCTIONS ====================
function formatRupiah(amount) {
    if (amount === 0 || amount === null || amount === undefined) return 'Rp 0';
    return 'Rp ' + amount.toLocaleString('id-ID');
}

function formatRupiahShort(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'jt';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'rb';
    }
    return amount.toString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('d-none', !show);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toastId = 'toast-' + Date.now();
    
    const bgClass = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning text-dark',
        info: 'bg-info text-dark'
    }[type] || 'bg-info';
    
    const icon = {
        success: 'check-circle-fill',
        error: 'exclamation-circle-fill',
        warning: 'exclamation-triangle-fill',
        info: 'info-circle-fill'
    }[type] || 'info-circle-fill';
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${bgClass} text-white border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi bi-${icon} me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                    data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    container.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Load master data
    loadMasterData();
    
    // Initialize search
    initSearch();
    
    console.log('🕌 Zakat Web App initialized');
});

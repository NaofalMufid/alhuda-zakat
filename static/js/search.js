/**
 * Search functionality for penduduk
 */

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
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            hideSearchResults();
        }
    });
}

function performSearch(query) {
    const results = state.penduduk.filter(p => 
        p.nama_kk.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    
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
    
    document.getElementById('searchKK').value = penduduk.nama_kk;
    document.getElementById('selectedKK').value = penduduk.nama_kk;
    document.getElementById('jumlahJiwa').value = penduduk.jumlah_jiwa || 1;
    
    document.getElementById('infoNamaKK').textContent = penduduk.nama_kk;
    document.getElementById('infoGolongan').textContent = penduduk.golongan || '-';
    document.getElementById('infoGolongan').className = `badge-golongan ${penduduk.golongan || 'G'}`;
    document.getElementById('infoAlamat').textContent = penduduk.rt || '-';
    document.getElementById('infoJumlahJiwa').textContent = penduduk.jumlah_jiwa || 0;
    document.getElementById('infoKK').classList.remove('d-none');
    
    hideSearchResults();
    calculateTotal();
}

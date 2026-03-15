/**
 * Data Penduduk CRUD Module
 */

let isLoadingPenduduk = false;
let cachedPendudukData = []; // Cache data penduduk untuk rangkuman

/**
 * Load penduduk list from API
 */
async function loadPendudukList(forceRefresh = false) {
    if (isLoadingPenduduk) return;
    
    // Cek cache dulu kalau tidak force refresh
    if (!forceRefresh && typeof Cache !== 'undefined' && Cache.get) {
        const cached = Cache.get('penduduk_list');
        if (cached && cached.data) {
            console.log('Using cached penduduk data');
            cachedPendudukData = cached.data;
            renderPendudukTable(cached.data);
            renderRangkuman(cached.data);
            return;
        }
    }
    
    isLoadingPenduduk = true;
    
    try {
        const penduduk = await API.get('/api/penduduk');
        cachedPendudukData = penduduk || [];
        
        // Simpan ke cache
        if (typeof Cache !== 'undefined' && Cache.set) {
            Cache.set('penduduk_list', penduduk);
        }
        
        renderPendudukTable(penduduk);
        renderRangkuman(penduduk);
    } catch (error) {
        showToast('Gagal memuat data penduduk: ' + error.message, 'error');
    } finally {
        isLoadingPenduduk = false;
    }
}

/**
 * Render penduduk table
 */
function renderPendudukTable(penduduk) {
    const tbody = document.getElementById('tablePenduduk');
    if (!tbody) return;
    
    const searchInput = document.getElementById('searchPenduduk');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    const displayData = searchTerm 
        ? penduduk.filter(p => p.nama_kk.toLowerCase().includes(searchTerm))
        : penduduk;
    
    if (displayData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                    ${searchTerm ? 'Tidak ada data yang cocok dengan pencarian' : 'Tidak ada data penduduk'}
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = displayData.map((p, index) => {
        const golonganBadge = getGolonganBadgeSimple(p.golongan);
        return `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(p.nama_kk)}</strong></td>
                <td>${p.jumlah_jiwa}</td>
                <td>${escapeHtml(p.rt) || '-'}</td>
                <td>${golonganBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick='editPenduduk(${p.row_index})'>
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick='hapusPenduduk(${p.row_index}, "${escapeHtml(p.nama_kk)}")'>
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Get golongan badge HTML - Simple version (G/M/F only)
 */
function getGolonganBadgeSimple(golongan) {
    const badges = {
        'G': '<span class="badge" style="background:#e3f2fd;color:#1565c0;font-weight:600;">G</span>',
        'M': '<span class="badge" style="background:#fff3e0;color:#e65100;font-weight:600;">M</span>',
        'F': '<span class="badge" style="background:#fce4ec;color:#c2185b;font-weight:600;">F</span>'
    };
    return badges[golongan] || '<span class="badge bg-secondary">-</span>';
}

/**
 * Calculate and render rangkuman per RT
 */
function renderRangkuman(penduduk) {
    if (!penduduk || penduduk.length === 0) return;
    
    // Group by RT/Alamat
    const perRT = {};
    let totalKK = 0;
    let totalJiwa = 0;
    let totalKKG = 0, totalKKM = 0, totalKKF = 0;
    let totalJiwaG = 0, totalJiwaM = 0, totalJiwaF = 0;
    
    penduduk.forEach(p => {
        const rt = p.rt || 'Tidak Diketahui';
        
        if (!perRT[rt]) {
            perRT[rt] = {
                kk: 0,
                jiwa: 0,
                kkG: 0, kkM: 0, kkF: 0,
                jiwaG: 0, jiwaM: 0, jiwaF: 0
            };
        }
        
        // Total per RT
        perRT[rt].kk++;
        perRT[rt].jiwa += p.jumlah_jiwa || 0;
        
        // Per golongan
        if (p.golongan === 'G') {
            perRT[rt].kkG++;
            perRT[rt].jiwaG += p.jumlah_jiwa || 0;
            totalKKG++;
            totalJiwaG += p.jumlah_jiwa || 0;
        } else if (p.golongan === 'M') {
            perRT[rt].kkM++;
            perRT[rt].jiwaM += p.jumlah_jiwa || 0;
            totalKKM++;
            totalJiwaM += p.jumlah_jiwa || 0;
        } else if (p.golongan === 'F') {
            perRT[rt].kkF++;
            perRT[rt].jiwaF += p.jumlah_jiwa || 0;
            totalKKF++;
            totalJiwaF += p.jumlah_jiwa || 0;
        }
        
        // Total keseluruhan
        totalKK++;
        totalJiwa += p.jumlah_jiwa || 0;
    });
    
    // Update summary cards
    document.getElementById('totalKKSeluruh').textContent = totalKK.toLocaleString('id-ID');
    document.getElementById('totalJiwaSeluruh').textContent = totalJiwa.toLocaleString('id-ID');
    document.getElementById('totalRT').textContent = Object.keys(perRT).length;
    document.getElementById('rataJiwa').textContent = totalKK > 0 ? (totalJiwa / totalKK).toFixed(1) : '0';
    
    // Update golongan cards
    document.getElementById('totalKKG').textContent = totalKKG.toLocaleString('id-ID');
    document.getElementById('totalJiwaG').textContent = totalJiwaG.toLocaleString('id-ID');
    document.getElementById('totalKKM').textContent = totalKKM.toLocaleString('id-ID');
    document.getElementById('totalJiwaM').textContent = totalJiwaM.toLocaleString('id-ID');
    document.getElementById('totalKKF').textContent = totalKKF.toLocaleString('id-ID');
    document.getElementById('totalJiwaF').textContent = totalJiwaF.toLocaleString('id-ID');
    
    // Sort RT alphabetically
    const sortedRT = Object.keys(perRT).sort();
    
    // Render table
    const tbody = document.getElementById('tableRangkumanRT');
    if (sortedRT.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                    Tidak ada data
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = sortedRT.map(rt => {
        const data = perRT[rt];
        return `
            <tr>
                <td class="text-start fw-bold">${escapeHtml(rt)}</td>
                <td>${data.kk}</td>
                <td>${data.jiwa}</td>
                <td>${data.kkG || '-'}</td>
                <td>${data.jiwaG || '-'}</td>
                <td>${data.kkM || '-'}</td>
                <td>${data.jiwaM || '-'}</td>
                <td>${data.kkF || '-'}</td>
                <td>${data.jiwaF || '-'}</td>
            </tr>
        `;
    }).join('');
    
    // Update footer totals
    document.getElementById('footTotalKK').textContent = totalKK;
    document.getElementById('footTotalJiwa').textContent = totalJiwa;
    document.getElementById('footTotalKKG').textContent = totalKKG || '-';
    document.getElementById('footTotalJiwaG').textContent = totalJiwaG || '-';
    document.getElementById('footTotalKKM').textContent = totalKKM || '-';
    document.getElementById('footTotalJiwaM').textContent = totalJiwaM || '-';
    document.getElementById('footTotalKKF').textContent = totalKKF || '-';
    document.getElementById('footTotalJiwaF').textContent = totalJiwaF || '-';
}

/**
 * Filter penduduk table
 */
function filterPenduduk() {
    if (typeof Cache !== 'undefined' && Cache.get) {
        const cached = Cache.get('penduduk_list');
        if (cached && cached.data) {
            renderPendudukTable(cached.data);
            return;
        }
    }
    loadPendudukList();
}

/**
 * Show penduduk tab (List | Rangkuman)
 */
function showPendudukTab(tabName, clickedElement) {
    if (typeof event !== 'undefined') event.preventDefault();
    
    // Hide all tabs
    document.querySelectorAll('.penduduk-tab-content').forEach(el => {
        el.classList.add('d-none');
    });
    
    // Show selected tab
    document.getElementById(`penduduk-tab-${tabName}`).classList.remove('d-none');
    
    // Update active state
    document.querySelectorAll('#pendudukSubNav .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    if (clickedElement) {
        clickedElement.classList.add('active');
    }
    
    // Load data if needed
    if (tabName === 'rangkuman' && cachedPendudukData.length === 0) {
        loadPendudukList();
    }
}

/**
 * Show penduduk modal for add
 */
function showPendudukModal() {
    // Reset form
    document.getElementById('pendudukForm').reset();
    document.getElementById('pendudukRowIndex').value = '';
    document.getElementById('pendudukModalTitle').innerHTML = '<i class="bi bi-person-plus-fill text-primary me-2"></i>Tambah Penduduk';
    document.getElementById('btnSubmitPenduduk').innerHTML = '<i class="bi bi-check-circle me-1"></i>Simpan';
    
    const modal = new bootstrap.Modal(document.getElementById('pendudukModal'));
    modal.show();
}

/**
 * Edit penduduk
 */
async function editPenduduk(rowIndex) {
    try {
        // Get current penduduk data
        const penduduk = await API.get('/api/penduduk');
        const p = penduduk.find(item => item.row_index === rowIndex);
        
        if (!p) {
            showToast('Data penduduk tidak ditemukan', 'error');
            return;
        }
        
        // Fill form
        document.getElementById('pendudukRowIndex').value = rowIndex;
        document.getElementById('pendudukNamaKK').value = p.nama_kk;
        document.getElementById('pendudukJumlahJiwa').value = p.jumlah_jiwa;
        document.getElementById('pendudukRT').value = p.rt || '';
        document.getElementById('pendudukGolongan').value = p.golongan || '';
        
        // Update modal title
        document.getElementById('pendudukModalTitle').innerHTML = '<i class="bi bi-pencil-fill text-primary me-2"></i>Edit Penduduk';
        document.getElementById('btnSubmitPenduduk').innerHTML = '<i class="bi bi-check-circle me-1"></i>Update';
        
        const modal = new bootstrap.Modal(document.getElementById('pendudukModal'));
        modal.show();
    } catch (error) {
        showToast('Gagal memuat data: ' + error.message, 'error');
    }
}

/**
 * Handle penduduk form submit (Create/Update)
 */
async function handlePendudukSubmit(event) {
    event.preventDefault();
    
    const rowIndex = document.getElementById('pendudukRowIndex').value;
    const isEdit = rowIndex !== '';
    
    const data = {
        nama_kk: document.getElementById('pendudukNamaKK').value.trim(),
        jumlah_jiwa: parseInt(document.getElementById('pendudukJumlahJiwa').value) || 1,
        rt: document.getElementById('pendudukRT').value.trim(),
        golongan: document.getElementById('pendudukGolongan').value
    };
    
    try {
        showLoading(true);
        
        if (isEdit) {
            await API.put(`/api/penduduk/${rowIndex}`, data);
            showToast('Data penduduk berhasil diperbarui', 'success');
        } else {
            await API.post('/api/penduduk', data);
            showToast('Data penduduk berhasil ditambahkan', 'success');
        }
        
        // Close modal
        const modalEl = document.getElementById('pendudukModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        
        // Refresh data
        if (typeof Cache !== 'undefined' && Cache.invalidate) {
            Cache.invalidate('penduduk_list');
        }
        cachedPendudukData = []; // Clear local cache
        await loadPendudukList(true);
        
        // Also refresh master data (karena penduduk digunakan di fitrah)
        if (typeof loadMasterData === 'function') {
            loadMasterData();
        }
        
    } catch (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Delete penduduk
 */
async function hapusPenduduk(rowIndex, nama) {
    if (!confirm(`Apakah Anda yakin ingin menghapus data "${nama}"?`)) {
        return;
    }
    
    try {
        showLoading(true);
        await API.delete(`/api/penduduk/${rowIndex}`);
        
        showToast('Data penduduk berhasil dihapus', 'success');
        
        // Refresh data
        if (typeof Cache !== 'undefined' && Cache.invalidate) {
            Cache.invalidate('penduduk_list');
        }
        cachedPendudukData = []; // Clear local cache
        await loadPendudukList(true);
        
        // Also refresh master data
        if (typeof loadMasterData === 'function') {
            loadMasterData();
        }
        
    } catch (error) {
        showToast('Gagal menghapus: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Invalidate penduduk cache when needed
 */
function invalidatePendudukCache() {
    if (typeof Cache !== 'undefined' && Cache.invalidate) {
        Cache.invalidate('penduduk_list');
    }
    cachedPendudukData = [];
}

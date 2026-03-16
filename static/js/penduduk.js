/**
 * Data Penduduk CRUD Module
 */

let isLoadingPenduduk = false;
let cachedPendudukData = []; // Cache data penduduk untuk rangkuman
let currentSortField = 'nama';
let currentSortDirection = 'asc';
let komparasiData = []; // Data hasil komparasi
let filteredKomparasiData = []; // Data hasil komparasi yang sudah difilter

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
            updateAlamatFilterOptions(cached.data);
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
        
        updateAlamatFilterOptions(penduduk);
        renderPendudukTable(penduduk);
        renderRangkuman(penduduk);
    } catch (error) {
        showToast('Gagal memuat data penduduk: ' + error.message, 'error');
    } finally {
        isLoadingPenduduk = false;
    }
}

/**
 * Update alamat filter options based on data
 */
function updateAlamatFilterOptions(penduduk) {
    const alamatSet = new Set();
    penduduk.forEach(p => {
        if (p.rt && p.rt.trim()) {
            alamatSet.add(p.rt.trim());
        }
    });
    
    const sortedAlamat = Array.from(alamatSet).sort();
    
    // Update filter di tab list
    const filterAlamat = document.getElementById('filterAlamatPenduduk');
    if (filterAlamat) {
        const currentValue = filterAlamat.value;
        filterAlamat.innerHTML = '<option value="">Semua Alamat/RT</option>';
        sortedAlamat.forEach(alamat => {
            filterAlamat.innerHTML += `<option value="${escapeHtml(alamat)}">${escapeHtml(alamat)}</option>`;
        });
        filterAlamat.value = currentValue;
    }
    
    // Update filter di tab komparasi
    const filterAlamatKomparasi = document.getElementById('filterAlamatKomparasi');
    if (filterAlamatKomparasi) {
        const currentValue = filterAlamatKomparasi.value;
        filterAlamatKomparasi.innerHTML = '<option value="">Semua Alamat/RT</option>';
        sortedAlamat.forEach(alamat => {
            filterAlamatKomparasi.innerHTML += `<option value="${escapeHtml(alamat)}">${escapeHtml(alamat)}</option>`;
        });
        filterAlamatKomparasi.value = currentValue;
    }
}

/**
 * Get filtered and sorted penduduk data
 */
function getFilteredPendudukData(penduduk) {
    const searchInput = document.getElementById('searchPenduduk');
    const filterAlamat = document.getElementById('filterAlamatPenduduk');
    const filterGolongan = document.getElementById('filterGolonganPenduduk');
    const sortSelect = document.getElementById('sortPenduduk');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const alamatFilter = filterAlamat ? filterAlamat.value : '';
    const golonganFilter = filterGolongan ? filterGolongan.value : '';
    const sortField = sortSelect ? sortSelect.value : currentSortField;
    
    // Filter data
    let filtered = penduduk.filter(p => {
        const matchSearch = !searchTerm || p.nama_kk.toLowerCase().includes(searchTerm);
        const matchAlamat = !alamatFilter || (p.rt && p.rt.trim() === alamatFilter);
        const matchGolongan = !golonganFilter || p.golongan === golonganFilter;
        return matchSearch && matchAlamat && matchGolongan;
    });
    
    // Sort data
    filtered.sort((a, b) => {
        let valA, valB;
        switch (sortField) {
            case 'nama':
                valA = (a.nama_kk || '').toLowerCase();
                valB = (b.nama_kk || '').toLowerCase();
                break;
            case 'alamat':
                valA = (a.rt || '').toLowerCase();
                valB = (b.rt || '').toLowerCase();
                break;
            case 'golongan':
                valA = a.golongan || '';
                valB = b.golongan || '';
                break;
            case 'jiwa':
                valA = a.jumlah_jiwa || 0;
                valB = b.jumlah_jiwa || 0;
                return currentSortDirection === 'asc' ? valA - valB : valB - valA;
            default:
                valA = (a.nama_kk || '').toLowerCase();
                valB = (b.nama_kk || '').toLowerCase();
        }
        
        if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    return filtered;
}

/**
 * Render penduduk table
 */
function renderPendudukTable(penduduk) {
    const tbody = document.getElementById('tablePenduduk');
    if (!tbody) return;
    
    const displayData = getFilteredPendudukData(penduduk);
    
    if (displayData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                    Tidak ada data yang cocok dengan filter
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
 * Sort penduduk by field (untuk header table click)
 */
function sortPendudukBy(field) {
    if (currentSortField === field) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDirection = 'asc';
    }
    
    // Update sort select
    const sortSelect = document.getElementById('sortPenduduk');
    if (sortSelect) {
        sortSelect.value = field;
    }
    
    filterPenduduk();
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
    if (cachedPendudukData.length > 0) {
        renderPendudukTable(cachedPendudukData);
    } else if (typeof Cache !== 'undefined' && Cache.get) {
        const cached = Cache.get('penduduk_list');
        if (cached && cached.data) {
            cachedPendudukData = cached.data;
            renderPendudukTable(cached.data);
        } else {
            loadPendudukList();
        }
    } else {
        loadPendudukList();
    }
}

/**
 * Show penduduk tab (List | Rangkuman | Komparasi)
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
    
    // Load komparasi data when opening komparasi tab
    if (tabName === 'komparasi' && komparasiData.length === 0) {
        loadKomparasiData();
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

// ==================== KOMPARASI DATA (BELUM BAYAR ZAKAT) ====================

/**
 * Load data komparasi antara penduduk dan transaksi fitrah
 */
async function loadKomparasiData() {
    showLoading(true);
    
    try {
        // Load both penduduk and transaksi data
        const [penduduk, transaksi] = await Promise.all([
            API.get('/api/penduduk'),
            API.get('/api/transaksi')
        ]);
        
        // Filter transaksi fitrah only
        const transaksiFitrah = (transaksi || []).filter(t => t.jenis_zakat === 'fitrah');
        
        // Build map of nama_kk to transaksi (handle multiple transaksi for same KK)
        const transaksiMap = new Map();
        transaksiFitrah.forEach(t => {
            const namaKK = t.nama_kk ? t.nama_kk.toLowerCase().trim() : '';
            if (!namaKK) return;
            
            if (!transaksiMap.has(namaKK)) {
                transaksiMap.set(namaKK, []);
            }
            transaksiMap.get(namaKK).push(t);
        });
        
        // Create komparasi data
        komparasiData = [];
        
        (penduduk || []).forEach(p => {
            const namaKKLower = p.nama_kk ? p.nama_kk.toLowerCase().trim() : '';
            const transaksiList = transaksiMap.get(namaKKLower) || [];
            
            // Sum total jiwa from all transaksi for this KK
            const totalJiwaTransaksi = transaksiList.reduce((sum, t) => sum + (t.jumlah_jiwa || 0), 0);
            const jumlahJiwaPenduduk = p.jumlah_jiwa || 0;
            
            let status, selisih, keterangan;
            
            if (transaksiList.length === 0) {
                status = 'belum';
                selisih = jumlahJiwaPenduduk;
                keterangan = 'Belum melakukan pembayaran zakat fitrah';
            } else if (totalJiwaTransaksi < jumlahJiwaPenduduk) {
                status = 'kurang';
                selisih = jumlahJiwaPenduduk - totalJiwaTransaksi;
                keterangan = `Bayar untuk ${totalJiwaTransaksi} jiwa, kurang ${selisih} jiwa`;
            } else if (totalJiwaTransaksi === jumlahJiwaPenduduk) {
                status = 'lunas';
                selisih = 0;
                keterangan = 'Lunas sesuai jumlah jiwa';
            } else {
                status = 'lunas';
                selisih = totalJiwaTransaksi - jumlahJiwaPenduduk;
                keterangan = `Bayar untuk ${totalJiwaTransaksi} jiwa (lebihan ${selisih} jiwa)`;
            }
            
            komparasiData.push({
                nama_kk: p.nama_kk,
                rt: p.rt || '-',
                golongan: p.golongan || '-',
                jumlah_jiwa_penduduk: jumlahJiwaPenduduk,
                jumlah_jiwa_transaksi: totalJiwaTransaksi,
                selisih: selisih,
                status: status,
                keterangan: keterangan,
                transaksi_list: transaksiList
            });
        });
        
        // Also check for transaksi without matching penduduk
        transaksiFitrah.forEach(t => {
            const namaKKLower = t.nama_kk ? t.nama_kk.toLowerCase().trim() : '';
            if (!namaKKLower) return;
            
            const foundInPenduduk = (penduduk || []).some(p => 
                p.nama_kk && p.nama_kk.toLowerCase().trim() === namaKKLower
            );
            
            if (!foundInPenduduk) {
                komparasiData.push({
                    nama_kk: t.nama_kk,
                    rt: t.alamat || '-',
                    golongan: '-',
                    jumlah_jiwa_penduduk: 0,
                    jumlah_jiwa_transaksi: t.jumlah_jiwa || 0,
                    selisih: -(t.jumlah_jiwa || 0),
                    status: 'tidak_terdaftar',
                    keterangan: 'KK tidak terdaftar di data penduduk',
                    transaksi_list: [t]
                });
            }
        });
        
        // Update summary
        const totalPenduduk = penduduk ? penduduk.length : 0;
        const sudahBayar = komparasiData.filter(k => k.status === 'lunas').length;
        const belumBayar = komparasiData.filter(k => k.status === 'belum' || k.status === 'kurang').length;
        
        document.getElementById('komparasiTotalPenduduk').textContent = totalPenduduk;
        document.getElementById('komparasiSudahBayar').textContent = sudahBayar;
        document.getElementById('komparasiBelumBayar').textContent = belumBayar;
        
        // Update alamat filter options
        const alamatSet = new Set();
        komparasiData.forEach(k => {
            if (k.rt && k.rt !== '-') alamatSet.add(k.rt);
        });
        const filterAlamat = document.getElementById('filterAlamatKomparasi');
        if (filterAlamat) {
            const currentValue = filterAlamat.value;
            filterAlamat.innerHTML = '<option value="">Semua Alamat/RT</option>';
            Array.from(alamatSet).sort().forEach(alamat => {
                filterAlamat.innerHTML += `<option value="${escapeHtml(alamat)}">${escapeHtml(alamat)}</option>`;
            });
            filterAlamat.value = currentValue;
        }
        
        // Render table
        filterKomparasi();
        
        showToast('Data komparasi berhasil dimuat', 'success');
    } catch (error) {
        showToast('Gagal memuat data komparasi: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Filter and render komparasi table
 */
function filterKomparasi() {
    const searchInput = document.getElementById('searchKomparasi');
    const filterAlamat = document.getElementById('filterAlamatKomparasi');
    const filterStatus = document.getElementById('filterStatusKomparasi');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const alamatValue = filterAlamat ? filterAlamat.value : '';
    const statusValue = filterStatus ? filterStatus.value : '';
    
    filteredKomparasiData = komparasiData.filter(k => {
        const matchSearch = !searchTerm || k.nama_kk.toLowerCase().includes(searchTerm);
        const matchAlamat = !alamatValue || k.rt === alamatValue;
        const matchStatus = !statusValue || k.status === statusValue;
        return matchSearch && matchAlamat && matchStatus;
    });
    
    renderKomparasiTable();
}

/**
 * Render komparasi table
 */
function renderKomparasiTable() {
    const tbody = document.getElementById('tableKomparasi');
    if (!tbody) return;
    
    if (filteredKomparasiData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                    Tidak ada data yang cocok dengan filter
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredKomparasiData.map((k, index) => {
        const statusBadge = getKomparasiStatusBadge(k.status);
        const selisihClass = k.selisih > 0 ? 'text-danger fw-bold' : (k.selisih < 0 ? 'text-success' : 'text-muted');
        const selisihText = k.selisih > 0 ? `+${k.selisih}` : (k.selisih < 0 ? `${k.selisih}` : '-');
        
        return `
            <tr class="${k.status === 'belum' || k.status === 'kurang' ? 'table-warning' : ''}">
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(k.nama_kk)}</strong></td>
                <td>${escapeHtml(k.rt)}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">${k.jumlah_jiwa_penduduk}</td>
                <td class="text-center">${k.jumlah_jiwa_transaksi || '-'}</td>
                <td class="text-center ${selisihClass}">${selisihText}</td>
                <td><small class="text-muted">${escapeHtml(k.keterangan)}</small></td>
            </tr>
        `;
    }).join('');
}

/**
 * Get status badge for komparasi
 */
function getKomparasiStatusBadge(status) {
    const badges = {
        'belum': '<span class="badge bg-danger"><i class="bi bi-x-circle me-1"></i>Belum Bayar</span>',
        'kurang': '<span class="badge bg-warning text-dark"><i class="bi bi-exclamation-circle me-1"></i>Kurang</span>',
        'lunas': '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Lunas</span>',
        'tidak_terdaftar': '<span class="badge bg-secondary"><i class="bi bi-question-circle me-1"></i>Tidak Terdaftar</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">-</span>';
}

/**
 * Export komparasi data to CSV
 */
function exportKomparasiToCSV() {
    if (filteredKomparasiData.length === 0) {
        showToast('Tidak ada data untuk diexport', 'warning');
        return;
    }
    
    const headers = ['No', 'Nama KK', 'Alamat/RT', 'Status', 'Jiwa Penduduk', 'Jiwa Transaksi', 'Selisih', 'Keterangan'];
    const rows = filteredKomparasiData.map((k, index) => [
        index + 1,
        k.nama_kk,
        k.rt,
        k.status === 'belum' ? 'Belum Bayar' : (k.status === 'kurang' ? 'Kurang' : (k.status === 'lunas' ? 'Lunas' : 'Tidak Terdaftar')),
        k.jumlah_jiwa_penduduk,
        k.jumlah_jiwa_transaksi,
        k.selisih,
        k.keterangan
    ]);
    
    let csv = '\uFEFF'; // BOM for Excel
    csv += headers.join(';') + '\n';
    rows.forEach(row => {
        csv += row.join(';') + '\n';
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `komparasi_zakat_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    showToast('Data berhasil diexport ke CSV', 'success');
}

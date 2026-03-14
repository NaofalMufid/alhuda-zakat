/**
 * Laporan page logic dengan caching
 */

// Flag untuk mencegah multiple concurrent requests
let isLoadingLaporan = false;

async function loadLaporan(forceRefresh = false) {
    if (isLoadingLaporan) return;
    
    // Cek cache dulu kalau tidak force refresh
    if (!forceRefresh) {
        const cached = Cache.getLaporan();
        if (cached) {
            console.log('Using cached laporan data');
            renderLaporan(cached.kewajiban, cached.total, cached.gabungan);
            updateCacheInfo();
            return;
        }
    }
    
    isLoadingLaporan = true;
    showLoading(true);
    
    try {
        const [kewajiban, total, gabungan] = await Promise.all([
            API.get('/api/laporan/kewajiban'),
            API.get('/api/laporan/total'),
            API.get('/api/laporan/gabungan')
        ]);
        
        // Simpan ke cache
        Cache.setLaporan(kewajiban, total, gabungan);
        
        renderLaporan(kewajiban, total, gabungan);
        updateCacheInfo();
        
    } catch (error) {
        showToast('Gagal memuat laporan: ' + error.message, 'error');
    } finally {
        showLoading(false);
        isLoadingLaporan = false;
    }
}

function renderLaporan(kewajiban, total, gabungan) {
    renderLaporanKewajiban(kewajiban);
    renderLaporanTotal(total);
    renderDetailKategori(kewajiban);
    
    document.getElementById('statTotalKK').textContent = gabungan.jumlah_kk_muzaki || 0;
    document.getElementById('statTotalJiwa').textContent = gabungan.total_jiwa || 0;
    document.getElementById('statTotalUang').textContent = formatRupiahShort(gabungan.total_uang || 0);
    document.getElementById('statTotalAmal').textContent = formatRupiahShort(gabungan.total_amal || 0);
}

function renderLaporanKewajiban(data) {
    const container = document.getElementById('laporanKewajiban');
    if (!container) return;
    
    // Format beras dengan aktual vs kewajiban
    const berasKewajiban = data.total_beras_kg || 0;
    const berasAktual = data.total_beras_aktual || berasKewajiban;
    const selisihBeras = data.selisih_beras || 0;
    
    let berasDisplay = `${berasKewajiban} kg`;
    if (selisihBeras !== 0) {
        const badgeClass = selisihBeras > 0 ? 'bg-success' : 'bg-warning text-dark';
        const sign = selisihBeras > 0 ? '+' : '';
        berasDisplay = `
            <span class="text-decoration-line-through text-muted">${berasKewajiban}</span>
            <span class="h5 mb-0"> ${berasAktual} kg</span>
            <span class="badge ${badgeClass} ms-1">${sign}${selisihBeras} kg</span>
        `;
    }
    
    container.innerHTML = `
        <div class="row g-3">
            <div class="col-6">
                <div class="text-muted small">Total Beras</div>
                <div>${berasDisplay}</div>
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
}

function renderLaporanTotal(data) {
    const container = document.getElementById('laporanTotal');
    if (!container) return;
    
    // Format beras dengan aktual vs kewajiban
    const berasKewajiban = data.total_beras_kg || 0;
    const berasAktual = data.total_beras_aktual || berasKewajiban;
    const selisihBeras = data.selisih_beras || 0;
    
    let berasDisplay = `<div class="h5 mb-0">${berasKewajiban} kg</div>`;
    if (selisihBeras !== 0) {
        const badgeClass = selisihBeras > 0 ? 'bg-success' : 'bg-warning text-dark';
        const sign = selisihBeras > 0 ? '+' : '';
        berasDisplay = `
            <div class="h5 mb-0">
                <span class="text-decoration-line-through text-muted">${berasKewajiban}</span>
                ${berasAktual} kg
                <span class="badge ${badgeClass} ms-1">${sign}${selisihBeras} kg</span>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div class="row g-3">
            <div class="col-6">
                <div class="text-muted small">Total Beras (Kewajiban)</div>
                ${berasDisplay}
            </div>
            <div class="col-6">
                <div class="text-muted small">Total Uang</div>
                <div class="h5 mb-0">${formatRupiah(data.total_uang || 0)}</div>
            </div>
            <div class="col-6">
                <div class="text-muted small">Total Uang Fitrah</div>
                <div class="h5 mb-0 text-primary">${formatRupiah(data.total_uang_fitrah || 0)}</div>
            </div>
            <div class="col-6">
                <div class="text-muted small">Total Uang Mal</div>
                <div class="h5 mb-0 text-success">${formatRupiah(data.total_uang_mal || 0)}</div>
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
                <div class="h5 mb-0">
                    ${data.jumlah_transaksi || 0} 
                    <small class="text-muted">(Fitrah: ${data.jumlah_transaksi_fitrah || 0}, Mal: ${data.jumlah_transaksi_mal || 0})</small>
                </div>
            </div>
        </div>
    `;
}

function renderDetailKategori(data) {
    const container = document.getElementById('detailKategori');
    if (!container) return;
    
    let html = '<div class="row g-3">';
    
    // Detail Beras dengan perbandingan Kewajiban vs Aktual
    if (data.detail_beras && Object.keys(data.detail_beras).length > 0) {
        html += '<div class="col-md-6"><h6 class="mb-2">Detail Beras</h6>';
        for (const [kategori, jumlahKewajiban] of Object.entries(data.detail_beras)) {
            if (jumlahKewajiban > 0) {
                const jumlahAktual = data.detail_beras_aktual?.[kategori] || jumlahKewajiban;
                const selisih = jumlahAktual - jumlahKewajiban;
                
                let aktualDisplay = '';
                if (selisih !== 0) {
                    const badgeClass = selisih > 0 ? 'bg-success' : 'bg-warning text-dark';
                    const sign = selisih > 0 ? '+' : '';
                    aktualDisplay = `<span class="text-decoration-line-through text-muted">${jumlahKewajiban}</span> <strong class="text-success">${jumlahAktual}</strong> <span class="badge ${badgeClass}">${sign}${selisih.toFixed(1)}</span> kg`;
                } else {
                    aktualDisplay = `<strong>${jumlahKewajiban}</strong> kg`;
                }
                
                html += `
                    <div class="d-flex justify-content-between py-2 border-bottom">
                        <span>${kategori}</span>
                        <span>${aktualDisplay}</span>
                    </div>
                `;
            }
        }
        html += '</div>';
    }
    
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
    showToast('Memuat data terbaru...', 'info');
    loadLaporan(true);
}

// Update info cache di UI
function updateCacheInfo() {
    const info = Cache.getCacheInfo();
    const infoEl = document.getElementById('cacheInfoLaporan');
    if (!infoEl) return;
    
    if (info.laporan) {
        const date = new Date(info.laporan.cached_at);
        infoEl.innerHTML = `<small class="text-muted"><i class="bi bi-clock-history me-1"></i>Diperbarui: ${date.toLocaleString('id-ID')}</small>`;
    } else {
        infoEl.innerHTML = '<small class="text-muted"><i class="bi bi-exclamation-circle me-1"></i>Belum ada cache</small>';
    }
}

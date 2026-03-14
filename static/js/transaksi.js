/**
 * Transaksi list, edit, and delete functionality dengan caching
 * 
 * Strategi:
 * - Load dari cache saat pertama kali buka tab list
 * - Manual refresh dengan button untuk update dari API
 * - Invalidate cache saat create/update/delete transaksi
 */

let isLoadingTransaksi = false;

async function loadTransaksiList(forceRefresh = false) {
    if (isLoadingTransaksi) return;
    
    // Cek cache dulu kalau tidak force refresh
    if (!forceRefresh) {
        const cached = Cache.getTransaksi();
        if (cached && cached.data) {
            console.log('Using cached transaksi data, count:', cached.count);
            state.transaksi = cached.data;
            renderTransaksiTable('fitrah');
            renderTransaksiTable('mal');
            updateTransaksiCacheInfo();
            return;
        }
    }
    
    isLoadingTransaksi = true;
    showLoading(true);
    
    try {
        const transaksi = await API.get('/api/transaksi');
        state.transaksi = transaksi || [];
        
        // Simpan ke cache
        Cache.setTransaksi(state.transaksi);
        
        renderTransaksiTable('fitrah');
        renderTransaksiTable('mal');
        updateTransaksiCacheInfo();
        
    } catch (error) {
        showToast('Gagal memuat data transaksi: ' + error.message, 'error');
    } finally {
        showLoading(false);
        isLoadingTransaksi = false;
    }
}

function renderTransaksiTable(jenis) {
    const tbody = document.getElementById(`tableTransaksi${jenis.charAt(0).toUpperCase() + jenis.slice(1)}`);
    if (!tbody) return;
    
    const filtered = state.transaksi.filter(t => t.jenis_zakat === jenis);
    
    const searchInput = document.getElementById(`searchTransaksi${jenis.charAt(0).toUpperCase() + jenis.slice(1)}`);
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    const displayData = searchTerm 
        ? filtered.filter(t => t.nama_kk.toLowerCase().includes(searchTerm))
        : filtered;
    
    displayData.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    if (displayData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="${jenis === 'fitrah' ? 9 : 6}" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                    Tidak ada data transaksi
                </td>
            </tr>
        `;
        return;
    }
    
    if (jenis === 'fitrah') {
        tbody.innerHTML = displayData.map(t => {
            const tanggal = t.tanggal ? new Date(t.tanggal).toLocaleDateString('id-ID') : '-';
            const kelebihan = t.kelebihan_dikembalikan > 0 
                ? `Dikembalikan: ${formatRupiah(t.kelebihan_dikembalikan)}`
                : t.kelebihan_amal > 0 
                    ? `Amal: ${formatRupiah(t.kelebihan_amal)}`
                    : '-';
            
            // Format beras display dengan aktual vs kewajiban
            let berasDisplay = '-';
            if (t.jumlah_beras_kg > 0) {
                const aktual = t.jumlah_beras_aktual || t.jumlah_beras_kg;
                if (aktual !== t.jumlah_beras_kg) {
                    berasDisplay = `<span class="text-decoration-line-through text-muted">${t.jumlah_beras_kg}</span> <strong class="text-success">${aktual} kg</strong>`;
                } else {
                    berasDisplay = `${t.jumlah_beras_kg} kg`;
                }
            }
            
            return `
                <tr>
                    <td>${tanggal}</td>
                    <td><strong>${escapeHtml(t.nama_kk)}</strong></td>
                    <td>${t.jumlah_jiwa}</td>
                    <td><span class="badge bg-secondary">${escapeHtml(t.kategori)}</span></td>
                    <td>${berasDisplay}</td>
                    <td>${t.jumlah_uang > 0 ? formatRupiah(t.jumlah_uang) : '-'}</td>
                    <td><small class="text-muted">${kelebihan}</small></td>
                    <td><small>${escapeHtml(t.amil_penerima) || '-'}</small></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick='editTransaksi(${t.row_index}, "fitrah")'>
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-action" onclick='hapusTransaksi(${t.row_index}, "${escapeHtml(t.nama_kk)}")'>
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        tbody.innerHTML = displayData.map(t => {
            const tanggal = t.tanggal ? new Date(t.tanggal).toLocaleDateString('id-ID') : '-';
            
            return `
                <tr>
                    <td>${tanggal}</td>
                    <td><strong>${escapeHtml(t.nama_kk)}</strong></td>
                    <td class="text-success fw-bold">${formatRupiah(t.jumlah_uang)}</td>
                    <td><small class="text-muted">${escapeHtml(t.kategori) || '-'}</small></td>
                    <td><small>${escapeHtml(t.amil_penerima) || '-'}</small></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick='editTransaksi(${t.row_index}, "mal")'>
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-action" onclick='hapusTransaksi(${t.row_index}, "${escapeHtml(t.nama_kk)}")'>
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function filterTransaksi(jenis) {
    renderTransaksiTable(jenis);
}

// Manual refresh untuk daftar transaksi
function refreshTransaksiList() {
    showToast('Memuat data transaksi terbaru...', 'info');
    loadTransaksiList(true);
}

async function editTransaksi(rowIndex, jenis) {
    const transaksi = state.transaksi.find(t => t.row_index === rowIndex);
    if (!transaksi) {
        showToast('Data transaksi tidak ditemukan', 'error');
        return;
    }
    
    state.editingTransaksi = transaksi;
    
    if (jenis === 'fitrah') {
        document.getElementById('fitrah-tab-list').classList.add('d-none');
        document.getElementById('fitrah-tab-form').classList.remove('d-none');
        
        document.querySelectorAll('#fitrahSubNav .nav-link').forEach((link, idx) => {
            link.classList.toggle('active', idx === 0);
        });
        
        document.getElementById('editRowIndex').value = rowIndex;
        document.getElementById('searchKK').value = transaksi.nama_kk;
        document.getElementById('searchKK').disabled = true;
        document.getElementById('selectedKK').value = transaksi.nama_kk;
        document.getElementById('jumlahJiwa').value = transaksi.jumlah_jiwa;
        document.getElementById('jenisBayar').value = transaksi.kategori;
        document.getElementById('amilPenerima').value = transaksi.amil_penerima;
        
        document.getElementById('infoNamaKK').textContent = transaksi.nama_kk;
        document.getElementById('infoGolongan').textContent = '-';
        document.getElementById('infoGolongan').className = 'badge-golongan G';
        document.getElementById('infoAlamat').textContent = '-';
        document.getElementById('infoJumlahJiwa').textContent = transaksi.jumlah_jiwa;
        document.getElementById('infoKK').classList.remove('d-none');
        
        if (transaksi.jumlah_beras_kg > 0) {
            updateTotalDisplay(transaksi.jumlah_beras_kg, `${transaksi.jumlah_beras_kg} kg`, 'kg');
            document.getElementById('jumlahBayar').value = '';
            document.getElementById('jumlahBayar').disabled = true;
            
            // Tampilkan dan isi jumlah beras aktual
            showBerasAktualSection(transaksi.jumlah_beras_kg);
            const berasAktual = transaksi.jumlah_beras_aktual || transaksi.jumlah_beras_kg;
            document.getElementById('jumlahBerasAktual').value = berasAktual;
            calculateSelisihBeras();
        } else {
            updateTotalDisplay(transaksi.jumlah_uang, formatRupiah(transaksi.jumlah_uang), 'rupiah');
            document.getElementById('jumlahBayar').disabled = false;
            
            const kelebihan = transaksi.kelebihan_dikembalikan + transaksi.kelebihan_amal;
            if (kelebihan > 0) {
                document.getElementById('jumlahBayar').value = transaksi.jumlah_uang;
                document.getElementById('kelebihanSection').classList.remove('d-none');
                document.getElementById('jumlahKelebihan').textContent = formatRupiah(kelebihan);
                document.getElementById('pengalihanKelebihan').value = transaksi.kelebihan_dikembalikan > 0 ? 'dikembalikan' : 'amal';
            }
        }
        
        document.getElementById('btnSubmitFitrah').innerHTML = '<i class="bi bi-check-circle me-2"></i>Update Transaksi';
        document.getElementById('btnCancelEdit').classList.remove('d-none');
        
    } else {
        document.getElementById('mal-tab-list').classList.add('d-none');
        document.getElementById('mal-tab-form').classList.remove('d-none');
        
        document.querySelectorAll('#malSubNav .nav-link').forEach((link, idx) => {
            link.classList.toggle('active', idx === 0);
        });
        
        document.getElementById('editRowIndexMal').value = rowIndex;
        document.getElementById('namaMuzaki').value = transaksi.nama_kk;
        document.getElementById('jumlahZakatMal').value = transaksi.jumlah_uang;
        document.getElementById('keteranganMal').value = transaksi.kategori === 'mal' ? '' : transaksi.kategori;
        document.getElementById('amilPenerimaMal').value = transaksi.amil_penerima;
        
        document.getElementById('btnSubmitMal').innerHTML = '<i class="bi bi-check-circle me-2"></i>Update Zakat Mal';
        document.getElementById('btnCancelEditMal').classList.remove('d-none');
    }
}

async function hapusTransaksi(rowIndex, nama) {
    if (!confirm(`Apakah Anda yakin ingin menghapus transaksi dari "${nama}"?`)) {
        return;
    }
    
    try {
        showLoading(true);
        await API.delete(`/api/transaksi/${rowIndex}`);
        
        showToast('Transaksi berhasil dihapus', 'success');
        
        // Invalidate cache dan reload
        Cache.invalidateTransaksi();
        await loadTransaksiList(true);
        
    } catch (error) {
        showToast('Gagal menghapus: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Update info cache di UI
function updateTransaksiCacheInfo() {
    const info = Cache.getCacheInfo();
    
    // Update fitrah cache info
    const infoFitrah = document.getElementById('cacheInfoTransaksiFitrah');
    if (infoFitrah) {
        if (info.transaksi) {
            const date = new Date(info.transaksi.cached_at);
            infoFitrah.innerHTML = `<small class="text-muted"><i class="bi bi-clock-history me-1"></i>${date.toLocaleTimeString('id-ID')}</small>`;
        } else {
            infoFitrah.innerHTML = '';
        }
    }
    
    // Update mal cache info
    const infoMal = document.getElementById('cacheInfoTransaksiMal');
    if (infoMal) {
        if (info.transaksi) {
            const date = new Date(info.transaksi.cached_at);
            infoMal.innerHTML = `<small class="text-muted"><i class="bi bi-clock-history me-1"></i>${date.toLocaleTimeString('id-ID')}</small>`;
        } else {
            infoMal.innerHTML = '';
        }
    }
}

/**
 * Zakat Fitrah page logic
 */

function onJenisChange() {
    calculateTotal();
}

function calculateTotal() {
    const select = document.getElementById('jenisBayar');
    const jumlahJiwa = parseInt(document.getElementById('jumlahJiwa')?.value) || 0;
    
    if (!select || !select.value) {
        updateTotalDisplay(0, '');
        hideBerasAktualSection();
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const nilai = parseFloat(selectedOption.dataset.nilai) || 0;
    const satuan = selectedOption.dataset.satuan;
    
    let total = 0;
    let displayText = '';
    
    if (satuan === 'kg') {
        total = nilai * jumlahJiwa;
        displayText = `${total} kg`;
        document.getElementById('jumlahBayar').value = '';
        document.getElementById('jumlahBayar').disabled = true;
        // Tampilkan section beras aktual
        showBerasAktualSection(total);
    } else {
        total = nilai * jumlahJiwa;
        displayText = formatRupiah(total);
        document.getElementById('jumlahBayar').disabled = false;
        // Sembunyikan section beras aktual
        hideBerasAktualSection();
    }
    
    updateTotalDisplay(total, displayText, satuan);
}

function showBerasAktualSection(kewajibanBeras) {
    const section = document.getElementById('berasAktualSection');
    if (section) {
        section.classList.remove('d-none');
        document.getElementById('kewajibanBerasDisplay').textContent = kewajibanBeras;
        // Set default value ke kewajiban
        const inputAktual = document.getElementById('jumlahBerasAktual');
        if (!inputAktual.value) {
            inputAktual.value = kewajibanBeras;
        }
        calculateSelisihBeras();
    }
}

function hideBerasAktualSection() {
    const section = document.getElementById('berasAktualSection');
    if (section) {
        section.classList.add('d-none');
        document.getElementById('jumlahBerasAktual').value = '';
    }
}

function calculateSelisihBeras() {
    const kewajiban = parseFloat(document.getElementById('totalKewajiban')?.dataset.total) || 0;
    const aktual = parseFloat(document.getElementById('jumlahBerasAktual')?.value) || 0;
    const selisih = aktual - kewajiban;
    
    const displayEl = document.getElementById('selisihBerasDisplay');
    if (selisih > 0) {
        displayEl.innerHTML = `<span class="badge bg-success">+${selisih} kg (lebih)</span>`;
    } else if (selisih < 0) {
        displayEl.innerHTML = `<span class="badge bg-warning text-dark">${selisih} kg (kurang)</span>`;
    } else {
        displayEl.innerHTML = `<span class="badge bg-secondary">Sesuai</span>`;
    }
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

async function submitFitrah(event) {
    event.preventDefault();
    
    // Cek autentikasi
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
        showToast('Silakan login terlebih dahulu', 'warning');
        showLoginModal();
        return;
    }
    
    if (!state.selectedPenduduk && !state.editingTransaksi) {
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
    
    let jumlahBerasAktual = 0;
    
    if (satuan === 'kg') {
        jumlahBeras = totalKewajiban;
        // Ambil jumlah beras aktual dari input (jika kosong, gunakan kewajiban)
        jumlahBerasAktual = parseFloat(document.getElementById('jumlahBerasAktual').value) || jumlahBeras;
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
            jumlahUang = jumlahBayar;
        }
    }
    
    const data = {
        nama_kk: state.selectedPenduduk ? state.selectedPenduduk.nama_kk : document.getElementById('searchKK').value,
        jumlah_jiwa: parseInt(document.getElementById('jumlahJiwa').value) || 1,
        jenis_zakat: 'fitrah',
        kategori: jenisBayar,
        jumlah_beras_kg: jumlahBeras,
        jumlah_beras_aktual: jumlahBerasAktual,
        jumlah_uang: jumlahUang,
        kelebihan_dikembalikan: kelebihanDikembalikan,
        kelebihan_amal: kelebihanAmal,
        amil_penerima: document.getElementById('amilPenerima').value
    };
    
    try {
        showLoading(true);
        
        const editRowIndex = document.getElementById('editRowIndex').value;
        if (editRowIndex) {
            await API.put(`/api/transaksi/${editRowIndex}`, data);
            showToast('Transaksi zakat fitrah berhasil diperbarui!', 'success');
        } else {
            await API.post('/api/transaksi', data);
            showToast('Transaksi zakat fitrah berhasil disimpan!', 'success');
        }
        
        resetFormFitrah();
        
        // Invalidate cache transaksi dan laporan karena ada data baru/berubah
        Cache.invalidateTransaksi();
        
        // Refresh list jika sedang terbuka
        if (!document.getElementById('fitrah-tab-list').classList.contains('d-none')) {
            loadTransaksiList(true);
        }
        
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
    document.getElementById('editRowIndex').value = '';
    document.getElementById('btnSubmitFitrah').innerHTML = '<i class="bi bi-check-circle me-2"></i>Simpan Transaksi';
    document.getElementById('btnCancelEdit').classList.add('d-none');
    document.getElementById('searchKK').disabled = false;
    state.selectedPenduduk = null;
    state.editingTransaksi = null;
    updateTotalDisplay(0, 'Rp 0');
}

function cancelEdit() {
    resetFormFitrah();
}

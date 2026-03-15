/**
 * Zakat Mal page logic
 */

async function submitMal(event) {
    event.preventDefault();
    
    // Cek autentikasi
    if (typeof Auth !== 'undefined' && !Auth.isLoggedIn()) {
        showToast('Silakan login terlebih dahulu', 'warning');
        showLoginModal();
        return;
    }
    
    const jumlahUang = parseFloat(document.getElementById('jumlahZakatMal').value) || 0;
    if (!jumlahUang || jumlahUang <= 0) {
        showToast('Silakan masukkan jumlah zakat mal', 'warning');
        return;
    }
    
    const data = {
        nama_kk: document.getElementById('namaMuzaki').value,
        jumlah_jiwa: 1,
        jenis_zakat: 'mal',
        kategori: document.getElementById('keteranganMal').value || 'mal',
        jumlah_beras_kg: 0,
        jumlah_uang: jumlahUang,
        kelebihan_dikembalikan: 0,
        kelebihan_amal: 0,
        amil_penerima: document.getElementById('amilPenerimaMal').value
    };
    
    try {
        showLoading(true);
        
        const editRowIndex = document.getElementById('editRowIndexMal').value;
        if (editRowIndex) {
            await API.put(`/api/transaksi/${editRowIndex}`, data);
            showToast('Zakat mal berhasil diperbarui!', 'success');
        } else {
            await API.post('/api/transaksi', data);
            showToast('Zakat mal berhasil disimpan!', 'success');
        }
        
        resetFormMal();
        
        // Invalidate cache transaksi dan laporan karena ada data baru/berubah
        Cache.invalidateTransaksi();
        
        // Refresh list jika sedang terbuka
        if (!document.getElementById('mal-tab-list').classList.contains('d-none')) {
            loadTransaksiList(true);
        }
        
    } catch (error) {
        showToast('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function resetFormMal() {
    document.getElementById('formMal').reset();
    document.getElementById('editRowIndexMal').value = '';
    document.getElementById('btnSubmitMal').innerHTML = '<i class="bi bi-check-circle me-2"></i>Simpan Zakat Mal';
    document.getElementById('btnCancelEditMal').classList.add('d-none');
    state.editingTransaksi = null;
}

function cancelEditMal() {
    resetFormMal();
}

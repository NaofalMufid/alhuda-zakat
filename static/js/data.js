/**
 * Data loading and management
 */

async function loadMasterData() {
    showLoading(true);
    
    try {
        const cache = Cache.getMaster();
        
        if (cache) {
            console.log('Using cached master data');
            state.penduduk = cache.penduduk || [];
            state.opsiPembayaran = cache.opsi_pembayaran || [];
            state.amil = cache.amil || [];
            state.cacheLoaded = true;
        } else {
            console.log('Fetching fresh master data from API');
            
            const [penduduk, opsiPembayaran, amil] = await Promise.all([
                API.get('/api/penduduk'),
                API.get('/api/master/opsi-pembayaran'),
                API.get('/api/master/amil')
            ]);
            
            state.penduduk = penduduk || [];
            state.opsiPembayaran = opsiPembayaran || [];
            state.amil = amil || [];
            
            Cache.setMaster(state.penduduk, state.opsiPembayaran, state.amil);
            state.cacheLoaded = true;
        }
        
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
    
    select.innerHTML = '<option value="">Pilih jenis pembayaran...</option>';
    
    state.opsiPembayaran.forEach(opsi => {
        const option = document.createElement('option');
        option.value = opsi.kategori;
        
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

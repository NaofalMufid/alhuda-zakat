/**
 * LocalStorage Cache Management dengan strategi:
 * 1. Master data (penduduk, opsi, amil) - cache dengan TTL
 * 2. Transaksi list - cache sampai ada transaksi baru/edit/hapus
 * 3. Laporan - cache sampai ada transaksi baru/edit/hapus
 */

const CACHE_KEYS = {
    MASTER: 'zakat_cache_master',
    TRANSAKSI: 'zakat_cache_transaksi',
    LAPORAN: 'zakat_cache_laporan',
    LAST_UPDATE: 'zakat_last_update'
};

const Cache = {
    // ========== MASTER DATA CACHE (dengan TTL) ==========
    getMaster() {
        try {
            const data = localStorage.getItem(CACHE_KEYS.MASTER);
            if (!data) return null;
            
            const cache = JSON.parse(data);
            const cacheTime = new Date(cache.cached_at);
            const now = new Date();
            const diffMinutes = (now - cacheTime) / (1000 * 60);
            
            if (diffMinutes > CONFIG.CACHE_TTL_MINUTES) {
                localStorage.removeItem(CACHE_KEYS.MASTER);
                return null;
            }
            
            return cache;
        } catch (e) {
            console.error('Cache master error:', e);
            return null;
        }
    },
    
    setMaster(penduduk, opsiPembayaran, amil) {
        const cache = {
            penduduk,
            opsi_pembayaran: opsiPembayaran,
            amil,
            cached_at: new Date().toISOString()
        };
        localStorage.setItem(CACHE_KEYS.MASTER, JSON.stringify(cache));
    },
    
    // ========== TRANSAKSI CACHE (invalidate saat ada perubahan) ==========
    getTransaksi() {
        try {
            const data = localStorage.getItem(CACHE_KEYS.TRANSAKSI);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.error('Cache transaksi error:', e);
            return null;
        }
    },
    
    setTransaksi(transaksi) {
        const cache = {
            data: transaksi,
            cached_at: new Date().toISOString(),
            count: transaksi.length
        };
        localStorage.setItem(CACHE_KEYS.TRANSAKSI, JSON.stringify(cache));
        this.setLastUpdate();
    },
    
    // ========== LAPORAN CACHE (invalidate saat ada perubahan) ==========
    getLaporan() {
        try {
            const data = localStorage.getItem(CACHE_KEYS.LAPORAN);
            if (!data) return null;
            return JSON.parse(data);
        } catch (e) {
            console.error('Cache laporan error:', e);
            return null;
        }
    },
    
    setLaporan(kewajiban, total, gabungan) {
        const cache = {
            kewajiban,
            total,
            gabungan,
            cached_at: new Date().toISOString()
        };
        localStorage.setItem(CACHE_KEYS.LAPORAN, JSON.stringify(cache));
        this.setLastUpdate();
    },
    
    // ========== LAST UPDATE TRACKING ==========
    setLastUpdate() {
        localStorage.setItem(CACHE_KEYS.LAST_UPDATE, new Date().toISOString());
    },
    
    getLastUpdate() {
        return localStorage.getItem(CACHE_KEYS.LAST_UPDATE);
    },
    
    // ========== INVALIDATION ==========
    clearMaster() {
        localStorage.removeItem(CACHE_KEYS.MASTER);
    },
    
    clearTransaksi() {
        localStorage.removeItem(CACHE_KEYS.TRANSAKSI);
    },
    
    clearLaporan() {
        localStorage.removeItem(CACHE_KEYS.LAPORAN);
    },
    
    // Invalidate semua cache terkait transaksi (dipanggil saat create/update/delete)
    invalidateTransaksi() {
        this.clearTransaksi();
        this.clearLaporan();
        this.setLastUpdate();
        console.log('Cache transaksi dan laporan diinvalidate');
    },
    
    clearAll() {
        localStorage.removeItem(CACHE_KEYS.MASTER);
        localStorage.removeItem(CACHE_KEYS.TRANSAKSI);
        localStorage.removeItem(CACHE_KEYS.LAPORAN);
        localStorage.removeItem(CACHE_KEYS.LAST_UPDATE);
    },
    
    // ========== UTILITY ==========
    getCacheInfo() {
        const master = this.getMaster();
        const transaksi = this.getTransaksi();
        const laporan = this.getLaporan();
        const lastUpdate = this.getLastUpdate();
        
        return {
            master: master ? {
                cached_at: master.cached_at,
                expired: new Date(master.cached_at).getTime() + (CONFIG.CACHE_TTL_MINUTES * 60 * 1000) < Date.now()
            } : null,
            transaksi: transaksi ? {
                cached_at: transaksi.cached_at,
                count: transaksi.count
            } : null,
            laporan: laporan ? {
                cached_at: laporan.cached_at
            } : null,
            last_update: lastUpdate
        };
    }
};

/**
 * Konfigurasi aplikasi
 */
const CONFIG = {
    API_BASE_URL: '',
    CACHE_KEY: 'zakat_cache',
    CACHE_TTL_MINUTES: 60,
    DEBOUNCE_DELAY: 300
};

// State global
const state = {
    penduduk: [],
    opsiPembayaran: [],
    amil: [],
    selectedPenduduk: null,
    cacheLoaded: false,
    transaksi: [],
    editingTransaksi: null,
    currentUser: null,
    isLoggedIn: false
};

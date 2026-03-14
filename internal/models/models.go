package models

import "time"

// Penduduk represents data from sheet "penduduk"
type Penduduk struct {
	NamaKK     string `json:"nama_kk"`
	JumlahJiwa int    `json:"jumlah_jiwa"`
	RT         string `json:"rt"`
	Golongan   string `json:"golongan"` // G: Ghani, M: Miskin, F: Fakir
}

// OpsiPembayaran represents data from sheet "opsi_pembayaran"
type OpsiPembayaran struct {
	Kategori string  `json:"kategori"` // beras, uang 1, uang 2
	Nilai    float64 `json:"nilai"`
	Satuan   string  `json:"satuan"` // kg atau rupiah
}

// Amil represents data from sheet "amil"
type Amil struct {
	Nama  string `json:"nama"`
	Tugas string `json:"tugas"`
}

// Transaksi represents data from sheet "transaksi"
type Transaksi struct {
	Tanggal               time.Time `json:"tanggal"`
	NamaKK                string    `json:"nama_kk"`
	JumlahJiwa            int       `json:"jumlah_jiwa"`
	JenisZakat            string    `json:"jenis_zakat"` // fitrah / mal
	Kategori              string    `json:"kategori"`
	JumlahBerasKg         float64   `json:"jumlah_beras_kg"`
	JumlahUang            float64   `json:"jumlah_uang"`
	KelebihanDikembalikan float64   `json:"kelebihan_dikembalikan"`
	KelebihanAmal         float64   `json:"kelebihan_amal"`
	AmilPenerima          string    `json:"amil_penerima"`
}

// TransaksiInput for creating new transaction
type TransaksiInput struct {
	NamaKK                string  `json:"nama_kk"`
	JumlahJiwa            int     `json:"jumlah_jiwa"`
	JenisZakat            string  `json:"jenis_zakat"`
	Kategori              string  `json:"kategori"`
	JumlahBerasKg         float64 `json:"jumlah_beras_kg"`
	JumlahUang            float64 `json:"jumlah_uang"`
	KelebihanDikembalikan float64 `json:"kelebihan_dikembalikan"`
	KelebihanAmal         float64 `json:"kelebihan_amal"`
	AmilPenerima          string  `json:"amil_penerima"`
}

// LaporanKewajiban report structure
type LaporanKewajiban struct {
	TotalBerasKg float64            `json:"total_beras_kg"`
	DetailBeras  map[string]float64 `json:"detail_beras"` // per kategori
	TotalUang    float64            `json:"total_uang"`
	DetailUang   map[string]float64 `json:"detail_uang"` // per kategori
	TotalJiwa    int                `json:"total_jiwa"`
	JumlahKK     int                `json:"jumlah_kk"`
}

// LaporanTotal report structure
type LaporanTotal struct {
	TotalBerasKg       float64 `json:"total_beras_kg"`
	TotalUang          float64 `json:"total_uang"`
	TotalKelebihanUang float64 `json:"total_kelebihan_uang"`
	TotalAmal          float64 `json:"total_amal"`
	JumlahTransaksi    int     `json:"jumlah_transaksi"`
}

// LaporanGabungan report structure
type LaporanGabungan struct {
	TotalBerasKg    float64 `json:"total_beras_kg"`
	TotalUang       float64 `json:"total_uang"` // fitrah + mal
	TotalAmal       float64 `json:"total_amal"`
	JumlahKKMuzaki  int     `json:"jumlah_kk_muzaki"`
	TotalJiwa       int     `json:"total_jiwa"`
	JumlahTransaksi int     `json:"jumlah_transaksi"`
}

// CacheData structure for localStorage caching
type CacheData struct {
	Penduduk       []Penduduk       `json:"penduduk"`
	OpsiPembayaran []OpsiPembayaran `json:"opsi_pembayaran"`
	Amil           []Amil           `json:"amil"`
	CachedAt       time.Time        `json:"cached_at"`
}

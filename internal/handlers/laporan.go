package handlers

import (
	"net/http"
	"strings"

	"zakat-web-app/internal/models"
	"zakat-web-app/internal/sheets"

	"github.com/go-chi/chi/v5"
)

// LaporanHandler handles laporan-related requests
type LaporanHandler struct {
	client *sheets.Client
}

// NewLaporanHandler creates a new LaporanHandler
func NewLaporanHandler(client *sheets.Client) *LaporanHandler {
	return &LaporanHandler{client: client}
}

// Routes returns the router for laporan endpoints
func (h *LaporanHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/kewajiban", h.Kewajiban)
	r.Get("/total", h.Total)
	r.Get("/gabungan", h.Gabungan)
	return r
}

// Kewajiban generates laporan kewajiban (tanpa kelebihan)
func (h *LaporanHandler) Kewajiban(w http.ResponseWriter, r *http.Request) {
	transaksi, err := h.client.GetTransaksi()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	laporan := models.LaporanKewajiban{
		DetailBeras: make(map[string]float64),
		DetailUang:  make(map[string]float64),
	}

	kkMap := make(map[string]bool)

	for _, t := range transaksi {
		if t.JenisZakat != "fitrah" {
			continue
		}

		laporan.TotalJiwa += t.JumlahJiwa
		kkMap[t.NamaKK] = true

		// Calculate based on kategori
		if strings.Contains(strings.ToLower(t.Kategori), "beras") {
			laporan.TotalBerasKg += t.JumlahBerasKg
			laporan.DetailBeras[t.Kategori] += t.JumlahBerasKg
		} else {
			// Kewajiban = jumlah_uang - kelebihan
			kewajiban := t.JumlahUang - t.KelebihanDikembalikan - t.KelebihanAmal
			if kewajiban < 0 {
				kewajiban = 0
			}
			laporan.TotalUang += kewajiban
			laporan.DetailUang[t.Kategori] += kewajiban
		}
	}

	laporan.JumlahKK = len(kkMap)

	JSONResponse(w, http.StatusOK, laporan)
}

// Total generates laporan total penerimaan (termasuk kelebihan)
func (h *LaporanHandler) Total(w http.ResponseWriter, r *http.Request) {
	transaksi, err := h.client.GetTransaksi()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	var laporan models.LaporanTotal

	for _, t := range transaksi {
		laporan.TotalBerasKg += t.JumlahBerasKg
		laporan.TotalUang += t.JumlahUang
		laporan.TotalKelebihanUang += t.KelebihanDikembalikan
		laporan.TotalAmal += t.KelebihanAmal
	}

	laporan.JumlahTransaksi = len(transaksi)

	JSONResponse(w, http.StatusOK, laporan)
}

// Gabungan generates laporan gabungan
func (h *LaporanHandler) Gabungan(w http.ResponseWriter, r *http.Request) {
	transaksi, err := h.client.GetTransaksi()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	var laporan models.LaporanGabungan
	kkMap := make(map[string]bool)

	for _, t := range transaksi {
		laporan.TotalBerasKg += t.JumlahBerasKg
		laporan.TotalUang += t.JumlahUang
		laporan.TotalAmal += t.KelebihanAmal
		laporan.TotalJiwa += t.JumlahJiwa
		kkMap[t.NamaKK] = true
	}

	laporan.JumlahKKMuzaki = len(kkMap)
	laporan.JumlahTransaksi = len(transaksi)

	JSONResponse(w, http.StatusOK, laporan)
}

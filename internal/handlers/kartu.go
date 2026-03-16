package handlers

import (
	"net/http"
	"sort"
	"strings"

	"zakat-web-app/internal/models"
	"zakat-web-app/internal/sheets"

	"github.com/go-chi/chi/v5"
)

// KartuHandler handles kartu pengambilan zakat-related requests
type KartuHandler struct {
	client *sheets.Client
}

// NewKartuHandler creates a new KartuHandler
func NewKartuHandler(client *sheets.Client) *KartuHandler {
	return &KartuHandler{client: client}
}

// Routes returns the router for kartu endpoints
func (h *KartuHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/penduduk", h.GetPendudukForKartu)
	return r
}

// GetPendudukForKartu returns all penduduk with kategori != 'G' sorted by alamat, kategori, nama
func (h *KartuHandler) GetPendudukForKartu(w http.ResponseWriter, r *http.Request) {
	penduduk, err := h.client.GetPenduduk()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Filter: only kategori != 'G' (not Ghani)
	var filtered []models.Penduduk
	for _, p := range penduduk {
		if strings.ToUpper(p.Golongan) != "G" {
			filtered = append(filtered, p)
		}
	}

	// Sort by: alamat (RT) ASC, kategori ASC, nama ASC
	sort.Slice(filtered, func(i, j int) bool {
		// Compare RT/Alamat
		rtCompare := strings.Compare(filtered[i].RT, filtered[j].RT)
		if rtCompare != 0 {
			return rtCompare < 0
		}
		// Compare Golongan/Kategori
		golCompare := strings.Compare(filtered[i].Golongan, filtered[j].Golongan)
		if golCompare != 0 {
			return golCompare < 0
		}
		// Compare Nama
		return strings.Compare(filtered[i].NamaKK, filtered[j].NamaKK) < 0
	})

	JSONResponse(w, http.StatusOK, filtered)
}

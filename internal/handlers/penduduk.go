package handlers

import (
	"net/http"

	"zakat-web-app/internal/sheets"

	"github.com/go-chi/chi/v5"
)

// PendudukHandler handles penduduk-related requests
type PendudukHandler struct {
	client *sheets.Client
}

// NewPendudukHandler creates a new PendudukHandler
func NewPendudukHandler(client *sheets.Client) *PendudukHandler {
	return &PendudukHandler{client: client}
}

// Routes returns the router for penduduk endpoints
func (h *PendudukHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.GetAll)
	r.Get("/search", h.Search)
	return r
}

// GetAll returns all penduduk data
func (h *PendudukHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	penduduk, err := h.client.GetPenduduk()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	JSONResponse(w, http.StatusOK, penduduk)
}

// Search searches penduduk by nama_kk
func (h *PendudukHandler) Search(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	penduduk, err := h.client.SearchPenduduk(query)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	JSONResponse(w, http.StatusOK, penduduk)
}

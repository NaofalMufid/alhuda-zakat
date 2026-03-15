package handlers

import (
	"net/http"

	"zakat-web-app/internal/sheets"

	"github.com/go-chi/chi/v5"
)

// MasterHandler handles master data requests (opsi_pembayaran, amil)
type MasterHandler struct {
	client *sheets.Client
}

// NewMasterHandler creates a new MasterHandler
func NewMasterHandler(client *sheets.Client) *MasterHandler {
	return &MasterHandler{client: client}
}

// Routes returns the router for master data endpoints
func (h *MasterHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/opsi-pembayaran", h.GetOpsiPembayaran)
	r.Get("/amil", h.GetAmil)
	return r
}

// GetOpsiPembayaran returns all payment options
func (h *MasterHandler) GetOpsiPembayaran(w http.ResponseWriter, r *http.Request) {
	opsi, err := h.client.GetOpsiPembayaran()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	JSONResponse(w, http.StatusOK, opsi)
}

// GetAmil returns all amil data
func (h *MasterHandler) GetAmil(w http.ResponseWriter, r *http.Request) {
	amil, err := h.client.GetAmil()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	JSONResponse(w, http.StatusOK, amil)
}

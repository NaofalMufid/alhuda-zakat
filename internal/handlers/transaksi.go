package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"zakat-web-app/internal/models"
	"zakat-web-app/internal/sheets"

	"github.com/go-chi/chi/v5"
)

// TransaksiHandler handles transaksi-related requests
type TransaksiHandler struct {
	client *sheets.Client
}

// NewTransaksiHandler creates a new TransaksiHandler
func NewTransaksiHandler(client *sheets.Client) *TransaksiHandler {
	return &TransaksiHandler{client: client}
}

// Routes returns the router for transaksi endpoints
func (h *TransaksiHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.GetAll)
	r.Post("/", h.Create)
	r.Put("/{rowIndex}", h.Update)
	r.Delete("/{rowIndex}", h.Delete)
	return r
}

// GetAll returns all transaksi data
func (h *TransaksiHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	transaksi, err := h.client.GetTransaksi()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	JSONResponse(w, http.StatusOK, transaksi)
}

// Create creates a new transaksi
func (h *TransaksiHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.TransaksiInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validation
	if input.NamaKK == "" {
		ErrorResponse(w, http.StatusBadRequest, "nama_kk is required")
		return
	}
	if input.JenisZakat == "" {
		ErrorResponse(w, http.StatusBadRequest, "jenis_zakat is required (fitrah/mal)")
		return
	}
	if input.JenisZakat != "fitrah" && input.JenisZakat != "mal" {
		ErrorResponse(w, http.StatusBadRequest, "jenis_zakat must be 'fitrah' or 'mal'")
		return
	}

	if err := h.client.AddTransaksi(input); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"status":  "success",
		"message": "Transaksi berhasil disimpan",
	})
}

// Update updates an existing transaksi
func (h *TransaksiHandler) Update(w http.ResponseWriter, r *http.Request) {
	rowIndexStr := chi.URLParam(r, "rowIndex")
	rowIndex, err := strconv.Atoi(rowIndexStr)
	if err != nil || rowIndex < 2 {
		ErrorResponse(w, http.StatusBadRequest, "row_index tidak valid")
		return
	}

	var input models.TransaksiInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validation
	if input.NamaKK == "" {
		ErrorResponse(w, http.StatusBadRequest, "nama_kk wajib diisi")
		return
	}
	if input.JenisZakat == "" {
		ErrorResponse(w, http.StatusBadRequest, "jenis_zakat wajib diisi (fitrah/mal)")
		return
	}
	if input.JenisZakat != "fitrah" && input.JenisZakat != "mal" {
		ErrorResponse(w, http.StatusBadRequest, "jenis_zakat harus 'fitrah' atau 'mal'")
		return
	}

	if err := h.client.UpdateTransaksi(rowIndex, input); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Transaksi berhasil diperbarui",
	})
}

// Delete deletes a transaksi
func (h *TransaksiHandler) Delete(w http.ResponseWriter, r *http.Request) {
	rowIndexStr := chi.URLParam(r, "rowIndex")
	rowIndex, err := strconv.Atoi(rowIndexStr)
	if err != nil || rowIndex < 2 {
		ErrorResponse(w, http.StatusBadRequest, "row_index tidak valid")
		return
	}

	if err := h.client.DeleteTransaksi(rowIndex); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Transaksi berhasil dihapus",
	})
}

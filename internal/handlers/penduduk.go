package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"zakat-web-app/internal/models"
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
	r.Post("/", h.Create)
	r.Put("/{rowIndex}", h.Update)
	r.Delete("/{rowIndex}", h.Delete)
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

// Create creates a new penduduk
func (h *PendudukHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.PendudukInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validation
	if input.NamaKK == "" {
		ErrorResponse(w, http.StatusBadRequest, "nama_kk wajib diisi")
		return
	}
	if input.JumlahJiwa <= 0 {
		ErrorResponse(w, http.StatusBadRequest, "jumlah_jiwa harus lebih dari 0")
		return
	}

	if err := h.client.AddPenduduk(input); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSONResponse(w, http.StatusCreated, map[string]interface{}{
		"status":  "success",
		"message": "Data penduduk berhasil ditambahkan",
	})
}

// Update updates an existing penduduk
func (h *PendudukHandler) Update(w http.ResponseWriter, r *http.Request) {
	rowIndexStr := chi.URLParam(r, "rowIndex")
	rowIndex, err := strconv.Atoi(rowIndexStr)
	if err != nil || rowIndex < 2 {
		ErrorResponse(w, http.StatusBadRequest, "row_index tidak valid")
		return
	}

	var input models.PendudukInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validation
	if input.NamaKK == "" {
		ErrorResponse(w, http.StatusBadRequest, "nama_kk wajib diisi")
		return
	}
	if input.JumlahJiwa <= 0 {
		ErrorResponse(w, http.StatusBadRequest, "jumlah_jiwa harus lebih dari 0")
		return
	}

	if err := h.client.UpdatePenduduk(rowIndex, input); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Data penduduk berhasil diperbarui",
	})
}

// Delete deletes a penduduk
func (h *PendudukHandler) Delete(w http.ResponseWriter, r *http.Request) {
	rowIndexStr := chi.URLParam(r, "rowIndex")
	rowIndex, err := strconv.Atoi(rowIndexStr)
	if err != nil || rowIndex < 2 {
		ErrorResponse(w, http.StatusBadRequest, "row_index tidak valid")
		return
	}

	if err := h.client.DeletePenduduk(rowIndex); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "success",
		"message": "Data penduduk berhasil dihapus",
	})
}

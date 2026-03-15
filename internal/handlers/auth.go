package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"zakat-web-app/internal/auth"
	"zakat-web-app/internal/middleware"
	"zakat-web-app/internal/models"
	"zakat-web-app/internal/sheets"
)

// AuthHandler handles authentication-related requests
type AuthHandler struct {
	client *sheets.Client
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(client *sheets.Client) *AuthHandler {
	return &AuthHandler{client: client}
}

// Routes returns the router for auth endpoints
func (h *AuthHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Post("/login", h.Login)
	r.With(middleware.AuthMiddleware).Get("/me", h.Me)
	return r
}

// Login handles user login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input models.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Invalid request body: "+err.Error())
		return
	}

	// Validation
	if input.Username == "" {
		ErrorResponse(w, http.StatusBadRequest, "username wajib diisi")
		return
	}
	if input.Password == "" {
		ErrorResponse(w, http.StatusBadRequest, "password wajib diisi")
		return
	}

	// Get user from database
	user, err := h.client.GetUserByUsername(input.Username)
	if err != nil {
		ErrorResponse(w, http.StatusUnauthorized, "Username atau password salah")
		return
	}

	// Check if user is active
	if !user.Aktif {
		ErrorResponse(w, http.StatusUnauthorized, "Akun tidak aktif")
		return
	}

	// Verify password
	if !auth.CheckPasswordHash(input.Password, user.PasswordHash) {
		ErrorResponse(w, http.StatusUnauthorized, "Username atau password salah")
		return
	}

	// Generate JWT token
	token, err := auth.GenerateToken(user.Username, user.NamaLengkap)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Gagal membuat token: "+err.Error())
		return
	}

	// Return response
	response := models.LoginResponse{
		Token:       token,
		Username:    user.Username,
		NamaLengkap: user.NamaLengkap,
	}

	JSONResponse(w, http.StatusOK, response)
}

// Me returns current user info
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.GetUserFromContext(r.Context())
	if !ok {
		ErrorResponse(w, http.StatusUnauthorized, "User tidak ditemukan dalam context")
		return
	}

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"username":     user.Username,
		"nama_lengkap": user.NamaLengkap,
		"role":         "admin",
	})
}

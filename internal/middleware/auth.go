package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"zakat-web-app/internal/auth"
	"zakat-web-app/internal/models"
)

// errorResponse sends JSON error response
func errorResponse(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

// AuthMiddleware validates JWT token from Authorization header
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Get Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			errorResponse(w, http.StatusUnauthorized, "Token autentikasi diperlukan")
			return
		}

		// Extract Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			errorResponse(w, http.StatusUnauthorized, "Format token tidak valid. Gunakan: Bearer <token>")
			return
		}

		tokenString := parts[1]

		// Validate token
		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			errorResponse(w, http.StatusUnauthorized, "Token tidak valid atau sudah expired")
			return
		}

		// Store user info in context
		user := &models.User{
			Username:    claims.Username,
			NamaLengkap: claims.NamaLengkap,
			Aktif:       true,
		}
		ctx := context.WithValue(r.Context(), models.UserContextKey, user)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetUserFromContext retrieves user from request context
func GetUserFromContext(ctx context.Context) (*models.User, bool) {
	user, ok := ctx.Value(models.UserContextKey).(*models.User)
	return user, ok
}

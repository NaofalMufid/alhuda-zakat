package handlers

import (
	"encoding/json"
	"net/http"
)

// JSON response helper
func JSONResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// Error response helper
func ErrorResponse(w http.ResponseWriter, status int, message string) {
	JSONResponse(w, status, map[string]string{"error": message})
}

// Success response helper
func SuccessResponse(w http.ResponseWriter, message string) {
	JSONResponse(w, http.StatusOK, map[string]string{"status": "success", "message": message})
}

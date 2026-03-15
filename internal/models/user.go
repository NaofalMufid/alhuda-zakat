package models

// User represents a user in the system
type User struct {
	Username    string `json:"username"`
	PasswordHash string `json:"-"` // Never expose in JSON
	NamaLengkap string `json:"nama_lengkap"`
	Aktif       bool   `json:"aktif"`
}

// LoginInput represents login request
type LoginInput struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginResponse represents login response
type LoginResponse struct {
	Token       string `json:"token"`
	Username    string `json:"username"`
	NamaLengkap string `json:"nama_lengkap"`
}

// UserContextKey is the key for storing user in request context
const UserContextKey = "user"

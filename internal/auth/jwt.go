package auth

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	// JWTSecret is loaded from environment variable
	JWTSecret = []byte(getJWTSecret())
	// TokenExpiration is 24 hours
	TokenExpiration = 24 * time.Hour
)

func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Default secret for development (should be changed in production)
		return "zakat-app-default-secret-change-in-production"
	}
	return secret
}

// Claims represents JWT claims
type Claims struct {
	Username    string `json:"username"`
	NamaLengkap string `json:"nama_lengkap"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token for user
func GenerateToken(username, namaLengkap string) (string, error) {
	claims := Claims{
		Username:    username,
		NamaLengkap: namaLengkap,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(TokenExpiration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}

// ValidateToken validates and parses JWT token
func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return JWTSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token claims")
}

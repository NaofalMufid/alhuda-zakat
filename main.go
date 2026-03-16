package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"zakat-web-app/internal/handlers"
	"zakat-web-app/internal/middleware"
	"zakat-web-app/internal/sheets"

	"github.com/go-chi/chi/v5"
	chiMiddleware "github.com/go-chi/chi/v5/middleware"
)

func main() {
	// Load environment variables
	sheets.LoadEnv()

	// Get configuration
	spreadsheetID := os.Getenv("SPREADSHEET_ID")
	if spreadsheetID == "" {
		log.Fatal("❌ SPREADSHEET_ID environment variable is required. Please set it in .env file")
	}

	credentialsPath := os.Getenv("GOOGLE_CREDENTIALS_PATH")
	credsFromEnv := os.Getenv("GOOGLE_CREDENTIALS_JSON")
	
	if credsFromEnv != "" {
		fmt.Println("📁 Using credentials from GOOGLE_CREDENTIALS_JSON environment variable")
	} else if credentialsPath != "" {
		fmt.Printf("📁 Using credentials from file: %s\n", credentialsPath)
		// Check credentials file exists
		if _, err := os.Stat(credentialsPath); os.IsNotExist(err) {
			log.Fatalf("❌ Credentials file not found at: %s", credentialsPath)
		}
	} else {
		// Default path
		credentialsPath = "credentials/service-account.json"
		fmt.Printf("📁 Using default credentials path: %s\n", credentialsPath)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Initialize Google Sheets client
	fmt.Println("🔄 Connecting to Google Sheets...")
	client, err := sheets.NewClient(credentialsPath, spreadsheetID)
	if err != nil {
		log.Fatalf("❌ Failed to create sheets client: %v", err)
	}
	fmt.Println("✅ Connected to Google Sheets")

	// Ensure sheets exist (transaksi and users)
	fmt.Println("🔄 Checking sheets structure...")
	if err := client.EnsureSheetsExist(); err != nil {
		log.Printf("⚠️  Warning: %v", err)
	}

	// Initialize handlers
	pendudukHandler := handlers.NewPendudukHandler(client)
	masterHandler := handlers.NewMasterHandler(client)
	transaksiHandler := handlers.NewTransaksiHandler(client)
	laporanHandler := handlers.NewLaporanHandler(client)
	authHandler := handlers.NewAuthHandler(client)

	// Setup router
	r := chi.NewRouter()

	// Global Middleware
	r.Use(chiMiddleware.Logger)
	r.Use(chiMiddleware.Recoverer)
	r.Use(chiMiddleware.Timeout(30 * time.Second))
	r.Use(corsMiddleware)
	r.Use(jsonContentTypeMiddleware)

	// Static files
	r.Get("/", serveStatic("static/index.html"))
	r.Get("/static/*", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/static/")
		http.ServeFile(w, r, "static/"+path)
	})

	// ============================================
	// API ROUTES
	// ============================================
	r.Route("/api", func(r chi.Router) {
		// Auth endpoints (public)
		r.Mount("/auth", authHandler.Routes())

		// Reports - Public access
		r.Mount("/laporan", laporanHandler.Routes())

		// Transactions - GET only (public)
		r.Get("/transaksi", transaksiHandler.GetAll)

		// ============================================
		// PROTECTED ENDPOINTS (Admin only)
		// ============================================
		r.Group(func(r chi.Router) {
			// Require authentication for all routes in this group
			r.Use(middleware.AuthMiddleware)

			// Master data (admin only)
			r.Mount("/penduduk", pendudukHandler.Routes())
			r.Mount("/master", masterHandler.Routes())

			// Transactions - POST/PUT/DELETE (admin only)
			r.Post("/transaksi", transaksiHandler.Create)
			r.Put("/transaksi/{rowIndex}", transaksiHandler.Update)
			r.Delete("/transaksi/{rowIndex}", transaksiHandler.Delete)
		})
	})

	// Health check (public)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		handlers.JSONResponse(w, http.StatusOK, map[string]interface{}{
			"status":    "ok",
			"timestamp": time.Now().Format(time.RFC3339),
			"version":   "1.0.0",
		})
	})

	// 404 handler
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		handlers.ErrorResponse(w, http.StatusNotFound, "Endpoint not found")
	})

	// Print routes info
	fmt.Println("\n📋 Available Endpoints:")
	fmt.Println("=====================")
	fmt.Println("PUBLIC (No Auth Required):")
	fmt.Println("  GET  /health                 - Health check")
	fmt.Println("  POST /api/auth/login         - Login")
	fmt.Println("  GET  /api/laporan/kewajiban  - Laporan kewajiban")
	fmt.Println("  GET  /api/laporan/total      - Laporan total penerimaan")
	fmt.Println("  GET  /api/laporan/gabungan   - Laporan gabungan")
	fmt.Println("  GET  /api/transaksi          - Get all transactions (public)")
	fmt.Println("")
	fmt.Println("PROTECTED (Admin Auth Required):")
	fmt.Println("  GET  /api/auth/me            - Get current user")
	fmt.Println("  GET  /api/penduduk           - Get all penduduk")
	fmt.Println("  GET  /api/penduduk/search?q= - Search penduduk")
	fmt.Println("  POST /api/penduduk           - Create penduduk")
	fmt.Println("  PUT  /api/penduduk/{id}      - Update penduduk")
	fmt.Println("  DELETE /api/penduduk/{id}    - Delete penduduk")
	fmt.Println("  GET  /api/master/opsi-pembayaran - Get payment options")
	fmt.Println("  GET  /api/master/amil        - Get amil list")
	fmt.Println("  POST /api/transaksi          - Create new transaction")
	fmt.Println("  PUT  /api/transaksi/{id}     - Update transaction")
	fmt.Println("  DELETE /api/transaksi/{id}   - Delete transaction")
	fmt.Println("=====================")

	fmt.Printf("\n🚀 Server starting on http://localhost:%s\n", port)
	fmt.Println("Press Ctrl+C to stop")
	log.Fatal(http.ListenAndServe(":"+port, r))
}

// CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// JSON content type middleware for API routes
func jsonContentTypeMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") {
			w.Header().Set("Content-Type", "application/json")
		}
		next.ServeHTTP(w, r)
	})
}

// Serve static files
func serveStatic(path string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check if file exists
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// Return simple HTML if index.html not exists yet
			w.Header().Set("Content-Type", "text/html")
			w.Write([]byte(`<!DOCTYPE html>
<html>
<head>
    <title>Zakat App API</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        .endpoint { margin: 10px 0; padding: 10px; background: #f9f9f9; border-radius: 5px; }
        .public { border-left: 4px solid #28a745; }
        .protected { border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <h1>🕌 Zakat Web App API</h1>
    <p>Backend is running! Frontend is under development.</p>
    <h2>Public Endpoints (No Auth):</h2>
    <div class="endpoint public"><code>GET /health</code> - Health check</div>
    <div class="endpoint public"><code>POST /api/auth/login</code> - Login</div>
    <div class="endpoint public"><code>GET /api/laporan/*</code> - All reports</div>
    <div class="endpoint public"><code>GET /api/transaksi</code> - List transactions</div>
    
    <h2>Protected Endpoints (Admin Only):</h2>
    <div class="endpoint protected"><code>GET /api/auth/me</code> - Current user</div>
    <div class="endpoint protected"><code>GET /api/penduduk</code> - Get all penduduk</div>
    <div class="endpoint protected"><code>GET /api/master/*</code> - Master data</div>
    <div class="endpoint protected"><code>POST /api/transaksi</code> - Create transaction</div>
    <div class="endpoint protected"><code>PUT /api/transaksi/{id}</code> - Update transaction</div>
    <div class="endpoint protected"><code>DELETE /api/transaksi/{id}</code> - Delete transaction</div>
</body>
</html>`))
			return
		}
		http.ServeFile(w, r, path)
	}
}

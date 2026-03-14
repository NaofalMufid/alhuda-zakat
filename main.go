package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"zakat-web-app/internal/handlers"
	"zakat-web-app/internal/sheets"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
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
	if credentialsPath == "" {
		credentialsPath = "credentials/gopal-a5ec7-73c6137bd229.json"
	}
	fmt.Printf("📁 Using credentials: %s\n", credentialsPath)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Check credentials file exists
	if _, err := os.Stat(credentialsPath); os.IsNotExist(err) {
		log.Fatalf("❌ Credentials file not found at: %s", credentialsPath)
	}

	// Initialize Google Sheets client
	fmt.Println("🔄 Connecting to Google Sheets...")
	client, err := sheets.NewClient(credentialsPath, spreadsheetID)
	if err != nil {
		log.Fatalf("❌ Failed to create sheets client: %v", err)
	}
	fmt.Println("✅ Connected to Google Sheets")

	// Ensure transaksi sheet exists
	fmt.Println("🔄 Checking sheets structure...")
	if err := client.EnsureSheetsExist(); err != nil {
		log.Printf("⚠️  Warning: %v", err)
	}

	// Initialize handlers
	pendudukHandler := handlers.NewPendudukHandler(client)
	masterHandler := handlers.NewMasterHandler(client)
	transaksiHandler := handlers.NewTransaksiHandler(client)
	laporanHandler := handlers.NewLaporanHandler(client)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(corsMiddleware)
	r.Use(jsonContentTypeMiddleware)

	// Static files
	r.Get("/", serveStatic("static/index.html"))
	r.Get("/static/*", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/static/")
		http.ServeFile(w, r, "static/"+path)
	})

	// API routes - Grouped by resource
	r.Route("/api", func(r chi.Router) {
		// Master data endpoints (cacheable by frontend)
		r.Mount("/penduduk", pendudukHandler.Routes())
		r.Mount("/master", masterHandler.Routes())

		// Transaction endpoints (no cache)
		r.Mount("/transaksi", transaksiHandler.Routes())

		// Report endpoints
		r.Mount("/laporan", laporanHandler.Routes())
	})

	// Health check
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
	fmt.Println("GET  /health                 - Health check")
	fmt.Println("GET  /api/penduduk           - Get all penduduk")
	fmt.Println("GET  /api/penduduk/search?q= - Search penduduk")
	fmt.Println("GET  /api/master/opsi-pembayaran - Get payment options")
	fmt.Println("GET  /api/master/amil        - Get amil list")
	fmt.Println("GET  /api/transaksi          - Get all transactions")
	fmt.Println("POST /api/transaksi          - Create new transaction")
	fmt.Println("GET  /api/laporan/kewajiban  - Laporan kewajiban")
	fmt.Println("GET  /api/laporan/total      - Laporan total penerimaan")
	fmt.Println("GET  /api/laporan/gabungan   - Laporan gabungan")
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
    </style>
</head>
<body>
    <h1>🕌 Zakat Web App API</h1>
    <p>Backend is running! Frontend is under development.</p>
    <h2>Available Endpoints:</h2>
    <div class="endpoint"><code>GET /health</code> - Health check</div>
    <div class="endpoint"><code>GET /api/penduduk</code> - Get all penduduk</div>
    <div class="endpoint"><code>GET /api/penduduk/search?q=keyword</code> - Search penduduk</div>
    <div class="endpoint"><code>GET /api/master/opsi-pembayaran</code> - Get payment options</div>
    <div class="endpoint"><code>GET /api/master/amil</code> - Get amil list</div>
    <div class="endpoint"><code>GET /api/transaksi</code> - Get all transactions</div>
    <div class="endpoint"><code>POST /api/transaksi</code> - Create transaction</div>
    <div class="endpoint"><code>GET /api/laporan/kewajiban</code> - Laporan kewajiban</div>
    <div class="endpoint"><code>GET /api/laporan/total</code> - Laporan total</div>
    <div class="endpoint"><code>GET /api/laporan/gabungan</code> - Laporan gabungan</div>
</body>
</html>`))
			return
		}
		http.ServeFile(w, r, path)
	}
}

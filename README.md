# 🕌 Zakat Web App

Aplikasi web untuk pencatatan dan pelaporan Zakat Fitrah dan Zakat Mal dengan menggunakan Google Sheets sebagai database.

![Go Version](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat&logo=go)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## ✨ Fitur

- 🔐 **Autentikasi** - Sistem login dengan JWT untuk admin
- 👥 **Data Penduduk** - CRUD data kepala keluarga dengan statistik per RT
- 📝 **Pencatatan Zakat** - Input Zakat Fitrah (beras/uang) dan Zakat Mal
- 📊 **Laporan** - Laporan kewajiban, total penerimaan, dan gabungan
- 🔒 **Akses Terkontrol** - Public dapat melihat laporan, admin dapat mengelola data
- 📱 **Responsive** - Tampilan mobile-friendly dengan Bootstrap 5

## 🏗️ Arsitektur

```
[Frontend (HTML/CSS/JS)] ←→ [Backend API (Go/Chi)] ←→ [Google Sheets]
```

## 🚀 Quick Start

### Prerequisites

- Go 1.25+ installed
- Google Service Account (untuk akses Google Sheets API)

### 1. Clone & Install

```bash
git clone <repository-url>
cd zakat-web-app
go mod download
```

### 2. Konfigurasi

Buat file `.env` di root project:

```bash
# Google Sheets
SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_CREDENTIALS_PATH=credentials/service-account.json

# Server
PORT=8080

# Security (generate strong secret)
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Setup Google Sheets

1. Buat spreadsheet baru di Google Drive
2. Share spreadsheet ke email service account Anda
3. Buat sheet dengan nama:
   - `data_penduduk` - Data penduduk
   - `opsi_pembayaran` - Opsi pembayaran zakat
   - `amil` - Daftar amil
   - Sheet `transaksi` dan `users` akan dibuat otomatis

### 4. Setup Admin User

1. Jalankan server:
```bash
go run .
```

2. Generate password hash:
```bash
go run tools/hash_password.go
```

3. Tambahkan admin di sheet `users`:

| username | password_hash | nama_lengkap | aktif |
|----------|---------------|--------------|-------|
| admin | $2a$10$... | Administrator | TRUE |

### 5. Run

```bash
# Development
go run .

# Production
go build -o bin/server .
./bin/server
```

Server akan berjalan di `http://localhost:8080`

## 📖 Penggunaan

### Akses Public (Tanpa Login)
- Melihat laporan zakat
- Melihat daftar transaksi (read-only)

### Akses Admin (Perlu Login)
- Input zakat fitrah & mal
- Edit/hapus transaksi
- CRUD data penduduk
- Kelola data master

### Halaman Utama

| Halaman | Deskripsi | Akses |
|---------|-----------|-------|
| Laporan | Dashboard statistik zakat | Public |
| Zakat Fitrah | Input zakat fitrah | Admin |
| Zakat Mal | Input zakat mal | Admin |
| Data Penduduk | CRUD data KK | Admin |

## 🔌 API Endpoints

### Public
```
GET  /health                 - Health check
POST /api/auth/login         - Login
GET  /api/laporan/*          - Laporan (kewajiban, total, gabungan)
GET  /api/transaksi          - List transaksi
```

### Protected (Admin)
```
GET    /api/auth/me         - Info user login
GET    /api/penduduk        - List penduduk
POST   /api/penduduk        - Tambah penduduk
PUT    /api/penduduk/{id}   - Update penduduk
DELETE /api/penduduk/{id}   - Hapus penduduk
POST   /api/transaksi       - Tambah transaksi
PUT    /api/transaksi/{id}  - Update transaksi
DELETE /api/transaksi/{id}  - Hapus transaksi
```

## 🗂️ Struktur Project

```
.
├── main.go                    # Entry point
├── internal/
│   ├── handlers/             # HTTP handlers
│   ├── models/               # Data models
│   ├── sheets/               # Google Sheets client
│   ├── auth/                 # JWT & password utils
│   └── middleware/           # Auth middleware
├── static/                   # Frontend assets
│   ├── index.html
│   └── js/                   # JavaScript modules
├── tools/                    # Utilities
│   └── hash_password.go     # Password hash generator
├── credentials/              # Google credentials (gitignored)
└── bin/                      # Build output
```

## 🔒 Keamanan

- Password di-hash dengan **bcrypt**
- Autentikasi menggunakan **JWT** dengan expiry 24 jam
- Role-based access: Public vs Admin
- Token disimpan di localStorage browser

## 🛠️ Tech Stack

**Backend:**
- Go 1.25+
- Chi Router (HTTP)
- Google Sheets API
- JWT Authentication
- bcrypt Password Hashing

**Frontend:**
- HTML5 + Bootstrap 5
- Vanilla JavaScript
- Bootstrap Icons

**Database:**
- Google Sheets

## 📝 Format Sheet

### data_penduduk
| No | Nama KK | Jumlah Jiwa | Alamat/RT | Golongan |
|----|---------|-------------|-----------|----------|

### transaksi
| Tanggal | Nama KK | Jiwa | Jenis | Kategori | Beras | Uang | ... |
|---------|---------|------|-------|----------|-------|------|-----|

## 🤝 Contributing

1. Fork repository
2. Buat branch feature (`git checkout -b feature/amazing`)
3. Commit perubahan (`git commit -m 'Add amazing'`)
4. Push ke branch (`git push origin feature/amazing`)
5. Buat Pull Request

## 📄 License

[MIT](LICENSE) © 2024

---

**Catatan:** Pastikan file `credentials/service-account.json` dan `.env` tidak di-commit ke git (sudah ada di `.gitignore`).

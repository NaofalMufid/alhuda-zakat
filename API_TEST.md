# 🧪 API Testing Guide - Zakat Web App

## Base URL
```
http://localhost:8080
```

## Endpoints

### 1. Health Check
```http
GET /health
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-13T10:57:05+07:00",
  "version": "1.0.0"
}
```

---

### 2. Get All Penduduk
```http
GET /api/penduduk
```
**Response:**
```json
[
  {
    "nama_kk": "Ahmad Sudirman",
    "jumlah_jiwa": 4,
    "rt": "01",
    "golongan": "G"
  }
]
```

---

### 3. Search Penduduk
```http
GET /api/penduduk/search?q=ahmad
```
**Response:** Same as above (filtered)

---

### 4. Get Opsi Pembayaran
```http
GET /api/master/opsi-pembayaran
```
**Response:**
```json
[
  {
    "kategori": "beras",
    "nilai": 2.5,
    "satuan": "kg"
  },
  {
    "kategori": "uang 1",
    "nilai": 35000,
    "satuan": "rupiah"
  }
]
```

---

### 5. Get Amil
```http
GET /api/master/amil
```
**Response:**
```json
[
  {
    "nama": "Ust. Abdullah",
    "tugas": "Penerima Zakat"
  }
]
```

---

### 6. Get All Transaksi
```http
GET /api/transaksi
```
**Response:**
```json
[
  {
    "row_index": 2,
    "tanggal": "2026-03-13T00:00:00Z",
    "nama_kk": "Ahmad Sudirman",
    "jumlah_jiwa": 4,
    "jenis_zakat": "fitrah",
    "kategori": "uang 1",
    "jumlah_beras_kg": 0,
    "jumlah_uang": 140000,
    "kelebihan_dikembalikan": 0,
    "kelebihan_amal": 10000,
    "amil_penerima": "Ust. Abdullah"
  }
]
```
**Note:** `row_index` digunakan untuk mengidentifikasi baris di Google Sheets (dimulai dari 2, karena baris 1 adalah header).

---

### 7. Create Transaksi (Zakat Fitrah)
```http
POST /api/transaksi
Content-Type: application/json

{
  "nama_kk": "Ahmad Sudirman",
  "jumlah_jiwa": 4,
  "jenis_zakat": "fitrah",
  "kategori": "uang 1",
  "jumlah_beras_kg": 0,
  "jumlah_uang": 140000,
  "kelebihan_dikembalikan": 0,
  "kelebihan_amal": 10000,
  "amil_penerima": "Ust. Abdullah"
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Transaksi berhasil disimpan"
}
```

---

### 8. Create Transaksi (Zakat Mal)
```http
POST /api/transaksi
Content-Type: application/json

{
  "nama_kk": "Budi Santoso",
  "jumlah_jiwa": 1,
  "jenis_zakat": "mal",
  "kategori": "emas",
  "jumlah_beras_kg": 0,
  "jumlah_uang": 2500000,
  "kelebihan_dikembalikan": 0,
  "kelebihan_amal": 0,
  "amil_penerima": "Ust. Abdullah"
}
```

---

### 9. Update Transaksi
```http
PUT /api/transaksi/{rowIndex}
Content-Type: application/json

{
  "nama_kk": "Ahmad Sudirman",
  "jumlah_jiwa": 5,
  "jenis_zakat": "fitrah",
  "kategori": "uang 1",
  "jumlah_beras_kg": 0,
  "jumlah_uang": 175000,
  "kelebihan_dikembalikan": 0,
  "kelebihan_amal": 0,
  "amil_penerima": "Ust. Abdullah"
}
```
**Response:**
```json
{
  "status": "success",
  "message": "Transaksi berhasil diperbarui"
}
```
**Note:** `rowIndex` adalah nomor baris di Google Sheets (sama dengan `row_index` dari Get All Transaksi).

---

### 10. Delete Transaksi
```http
DELETE /api/transaksi/{rowIndex}
```
**Response:**
```json
{
  "status": "success",
  "message": "Transaksi berhasil dihapus"
}
```
**Note:** `rowIndex` adalah nomor baris di Google Sheets.

---

### 12. Laporan Kewajiban
```http
GET /api/laporan/kewajiban
```
**Response:**
```json
{
  "total_beras_kg": 25,
  "detail_beras": {
    "beras": 25
  },
  "total_uang": 2800000,
  "detail_uang": {
    "uang 1": 1400000,
    "uang 2": 1400000
  },
  "total_jiwa": 80,
  "jumlah_kk": 20
}
```

---

### 13. Laporan Total
```http
GET /api/laporan/total
```
**Response:**
```json
{
  "total_beras_kg": 25,
  "total_uang": 3200000,
  "total_kelebihan_uang": 100000,
  "total_amal": 50000,
  "jumlah_transaksi": 25
}
```

---

### 14. Laporan Gabungan
```http
GET /api/laporan/gabungan
```
**Response:**
```json
{
  "total_beras_kg": 25,
  "total_uang": 3200000,
  "total_amal": 50000,
  "jumlah_kk_muzaki": 20,
  "total_jiwa": 80,
  "jumlah_transaksi": 25
}
```

---

## Cara Menjalankan Server

```bash
# Build
go build -o zakat-app .

# Run
./zakat-app

# Server akan berjalan di http://localhost:8080
```

## Import ke Postman

1. Buka Postman
2. Klik Import → Paste Raw Text
3. Copy salah satu request di atas
4. Atau buat Collection baru dengan base URL: `http://localhost:8080`

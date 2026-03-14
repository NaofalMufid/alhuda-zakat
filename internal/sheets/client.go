package sheets

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"zakat-web-app/internal/models"

	"google.golang.org/api/option"
	"google.golang.org/api/sheets/v4"
)

// Client wraps Google Sheets API client
type Client struct {
	srv           *sheets.Service
	spreadsheetID string
}

// NewClient creates a new Google Sheets client
func NewClient(credentialsPath, spreadsheetID string) (*Client, error) {
	ctx := context.Background()

	srv, err := sheets.NewService(ctx, option.WithCredentialsFile(credentialsPath))
	if err != nil {
		return nil, fmt.Errorf("unable to create sheets service: %v", err)
	}

	return &Client{
		srv:           srv,
		spreadsheetID: spreadsheetID,
	}, nil
}

// GetPenduduk retrieves all data from "data_penduduk" sheet
// Structure: no | nama_kk | jumlah_jiwa | alamat | kategori
func (c *Client) GetPenduduk() ([]models.Penduduk, error) {
	rangeName := "data_penduduk!A2:E"
	resp, err := c.srv.Spreadsheets.Values.Get(c.spreadsheetID, rangeName).Do()
	if err != nil {
		return nil, fmt.Errorf("unable to retrieve penduduk data: %v", err)
	}

	var penduduk []models.Penduduk
	for _, row := range resp.Values {
		if len(row) < 3 {
			continue
		}

		p := models.Penduduk{
			NamaKK: getString(row, 1),  // Kolom B
		}

		// Parse jumlah_jiwa (Kolom C)
		if jiwa, err := strconv.Atoi(getString(row, 2)); err == nil {
			p.JumlahJiwa = jiwa
		}

		// Alamat (Kolom D)
		p.RT = getString(row, 3)

		// Kategori/Golongan (Kolom E)
		p.Golongan = getString(row, 4)

		// Skip empty rows
		if p.NamaKK == "" {
			continue
		}

		penduduk = append(penduduk, p)
	}

	return penduduk, nil
}

// SearchPenduduk searches penduduk by nama_kk (case insensitive)
func (c *Client) SearchPenduduk(query string) ([]models.Penduduk, error) {
	penduduk, err := c.GetPenduduk()
	if err != nil {
		return nil, err
	}

	if query == "" {
		return penduduk, nil
	}

	query = strings.ToLower(query)
	var results []models.Penduduk
	for _, p := range penduduk {
		if strings.Contains(strings.ToLower(p.NamaKK), query) {
			results = append(results, p)
		}
	}

	return results, nil
}

// GetOpsiPembayaran retrieves all data from "opsi_pembayaran" sheet
// Structure: opsi_pembayaran | nilai | satuan
func (c *Client) GetOpsiPembayaran() ([]models.OpsiPembayaran, error) {
	rangeName := "opsi_pembayaran!A2:C"
	resp, err := c.srv.Spreadsheets.Values.Get(c.spreadsheetID, rangeName).Do()
	if err != nil {
		return nil, fmt.Errorf("unable to retrieve opsi_pembayaran data: %v", err)
	}

	var opsi []models.OpsiPembayaran
	for _, row := range resp.Values {
		if len(row) < 2 {
			continue
		}

		o := models.OpsiPembayaran{
			Kategori: getString(row, 0), // Kolom A
			Satuan:   getString(row, 2), // Kolom C
		}

		// Parse nilai (Kolom B) - handle format like "2,5", "Rp50.000", "45000"
		nilaiStr := getString(row, 1)
		o.Nilai = parseCurrency(nilaiStr)

		// Skip empty rows
		if o.Kategori == "" {
			continue
		}

		opsi = append(opsi, o)
	}

	return opsi, nil
}

// GetAmil retrieves all data from "amil" sheet
// Structure: no | nama | tugas
func (c *Client) GetAmil() ([]models.Amil, error) {
	rangeName := "amil!A2:C"
	resp, err := c.srv.Spreadsheets.Values.Get(c.spreadsheetID, rangeName).Do()
	if err != nil {
		return nil, fmt.Errorf("unable to retrieve amil data: %v", err)
	}

	var amil []models.Amil
	for _, row := range resp.Values {
		if len(row) < 2 {
			continue
		}

		a := models.Amil{
			Nama:  getString(row, 1), // Kolom B
			Tugas: getString(row, 2), // Kolom C
		}

		// Skip empty rows
		if a.Nama == "" {
			continue
		}

		amil = append(amil, a)
	}

	return amil, nil
}

// GetTransaksi retrieves all data from "transaksi" sheet
// Structure: tanggal | nama_kk | jumlah_jiwa | jenis_zakat | kategori | jumlah_beras_kg | jumlah_beras_aktual | jumlah_uang | kelebihan_dikembalikan | kelebihan_amal | amil_penerima
func (c *Client) GetTransaksi() ([]models.Transaksi, error) {
	rangeName := "transaksi!A2:K"
	resp, err := c.srv.Spreadsheets.Values.Get(c.spreadsheetID, rangeName).Do()
	if err != nil {
		return nil, fmt.Errorf("unable to retrieve transaksi data: %v", err)
	}

	var transaksi []models.Transaksi
	// Row index dimulai dari 2 (baris 1 adalah header)
	for i, row := range resp.Values {
		if len(row) < 4 {
			continue
		}

		t := models.Transaksi{
			RowIndex:     i + 2, // +2 karena data mulai dari baris 2
			NamaKK:       getString(row, 1),
			JenisZakat:   getString(row, 3),
			Kategori:     getString(row, 4),
			AmilPenerima: getString(row, 10),
		}

		// Parse tanggal
		if dateStr := getString(row, 0); dateStr != "" {
			t.Tanggal = parseDate(dateStr)
		}

		// Parse jumlah_jiwa
		if jiwa, err := strconv.Atoi(getString(row, 2)); err == nil {
			t.JumlahJiwa = jiwa
		}

		// Parse jumlah_beras_kg (kewajiban)
		t.JumlahBerasKg = parseNumber(getString(row, 5))

		// Parse jumlah_beras_aktual (yang benar-benar diberikan)
		t.JumlahBerasAktual = parseNumber(getString(row, 6))

		// Parse jumlah_uang
		t.JumlahUang = parseCurrency(getString(row, 7))

		// Parse kelebihan_dikembalikan
		t.KelebihanDikembalikan = parseCurrency(getString(row, 8))

		// Parse kelebihan_amal
		t.KelebihanAmal = parseCurrency(getString(row, 9))

		transaksi = append(transaksi, t)
	}

	return transaksi, nil
}

// AddTransaksi adds a new transaction to "transaksi" sheet
func (c *Client) AddTransaksi(input models.TransaksiInput) error {
	rangeName := "transaksi!A:K"

	// Jika jumlah_beras_aktual 0, gunakan jumlah_beras_kg sebagai default
	jumlahBerasAktual := input.JumlahBerasAktual
	if jumlahBerasAktual == 0 && input.JumlahBerasKg > 0 {
		jumlahBerasAktual = input.JumlahBerasKg
	}

	row := []interface{}{
		time.Now().Format("2006-01-02"),
		input.NamaKK,
		input.JumlahJiwa,
		input.JenisZakat,
		input.Kategori,
		input.JumlahBerasKg, // Kewajiban perhitungan
		jumlahBerasAktual,   // Beras yang benar-benar diberikan
		input.JumlahUang,
		input.KelebihanDikembalikan,
		input.KelebihanAmal,
		input.AmilPenerima,
	}

	valueRange := &sheets.ValueRange{
		Values: [][]interface{}{row},
	}

	_, err := c.srv.Spreadsheets.Values.Append(
		c.spreadsheetID,
		rangeName,
		valueRange,
	).ValueInputOption("USER_ENTERED").Do()

	if err != nil {
		return fmt.Errorf("unable to append transaksi: %v", err)
	}

	return nil
}

// UpdateTransaksi updates an existing transaction in "transaksi" sheet
func (c *Client) UpdateTransaksi(rowIndex int, input models.TransaksiInput) error {
	// Row index sudah dalam format 1-based (baris 1 = header, baris 2 = data pertama)
	rangeName := fmt.Sprintf("transaksi!A%d:K%d", rowIndex, rowIndex)

	// Jika jumlah_beras_aktual 0, gunakan jumlah_beras_kg sebagai default
	jumlahBerasAktual := input.JumlahBerasAktual
	if jumlahBerasAktual == 0 && input.JumlahBerasKg > 0 {
		jumlahBerasAktual = input.JumlahBerasKg
	}

	row := []interface{}{
		time.Now().Format("2006-01-02"),
		input.NamaKK,
		input.JumlahJiwa,
		input.JenisZakat,
		input.Kategori,
		input.JumlahBerasKg, // Kewajiban perhitungan
		jumlahBerasAktual,   // Beras yang benar-benar diberikan
		input.JumlahUang,
		input.KelebihanDikembalikan,
		input.KelebihanAmal,
		input.AmilPenerima,
	}

	valueRange := &sheets.ValueRange{
		Values: [][]interface{}{row},
	}

	_, err := c.srv.Spreadsheets.Values.Update(
		c.spreadsheetID,
		rangeName,
		valueRange,
	).ValueInputOption("USER_ENTERED").Do()

	if err != nil {
		return fmt.Errorf("unable to update transaksi: %v", err)
	}

	return nil
}

// DeleteTransaksi deletes a transaction from "transaksi" sheet by clearing the row
func (c *Client) DeleteTransaksi(rowIndex int) error {
	// Row index sudah dalam format 1-based
	rangeName := fmt.Sprintf("transaksi!A%d:K%d", rowIndex, rowIndex)

	// Clear values
	clearRequest := &sheets.ClearValuesRequest{}
	_, err := c.srv.Spreadsheets.Values.Clear(c.spreadsheetID, rangeName, clearRequest).Do()
	if err != nil {
		return fmt.Errorf("unable to clear transaksi row: %v", err)
	}

	return nil
}

// Helper function to safely get string from interface{}
func getString(row []interface{}, index int) string {
	if index < len(row) {
		if val, ok := row[index].(string); ok {
			return strings.TrimSpace(val)
		}
		return fmt.Sprintf("%v", row[index])
	}
	return ""
}

// parseCurrency parses currency strings like "Rp50.000", "50.000", "50,000", "50,000.00"
func parseCurrency(s string) float64 {
	if s == "" {
		return 0
	}

	// Remove currency symbols and non-numeric chars except comma/dot
	re := regexp.MustCompile(`[^0-9,\.]`)
	s = re.ReplaceAllString(s, "")

	// Handle different formats
	// "50.000" -> 50000 (Indonesian format)
	// "50,000" -> 50000 (US format without decimal)
	// "50.000,00" -> 50000 (European format)
	// "50,000.00" -> 50000 (US format)

	// Count occurrences
	commaCount := strings.Count(s, ",")
	dotCount := strings.Count(s, ".")

	if commaCount == 1 && dotCount == 0 {
		// Could be "50,000" (US) or "2,5" (decimal)
		parts := strings.Split(s, ",")
		if len(parts[1]) == 1 || len(parts[1]) == 2 {
			// Decimal: "2,5" -> 2.5
			s = strings.Replace(s, ",", ".", 1)
		} else {
			// Thousand separator: "50,000" -> 50000
			s = strings.Replace(s, ",", "", -1)
		}
	} else if dotCount == 1 && commaCount == 0 {
		// Could be "50.000" (Indonesian) or "2.5" (decimal)
		parts := strings.Split(s, ".")
		if len(parts[1]) == 1 || len(parts[1]) == 2 {
			// Decimal: "2.5" -> 2.5
			// Keep as is
		} else {
			// Thousand separator: "50.000" -> 50000
			s = strings.Replace(s, ".", "", -1)
		}
	} else if commaCount >= 1 && dotCount == 1 {
		// "50,000.00" or "50.000,00" - determine which is decimal
		lastDot := strings.LastIndex(s, ".")
		lastComma := strings.LastIndex(s, ",")

		if lastDot > lastComma {
			// "50,000.00" - dot is decimal
			s = strings.Replace(s, ",", "", -1)
		} else {
			// "50.000,00" - comma is decimal
			s = strings.Replace(s, ".", "", -1)
			s = strings.Replace(s, ",", ".", 1)
		}
	} else {
		// Multiple separators, remove all
		s = strings.Replace(s, ".", "", -1)
		s = strings.Replace(s, ",", "", -1)
	}

	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return val
}

// parseNumber parses numbers with comma as decimal separator
func parseNumber(s string) float64 {
	if s == "" {
		return 0
	}
	// Replace comma with dot for parsing
	s = strings.Replace(s, ",", ".", -1)
	val, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return 0
	}
	return val
}

// parseDate tries to parse various date formats
func parseDate(s string) time.Time {
	formats := []string{
		"2006-01-02",
		"02/01/2006",
		"01/02/2006",
		"2/1/2006",
		"2006-01-02 15:04:05",
		"02/01/2006 15:04:05",
	}

	for _, layout := range formats {
		if date, err := time.Parse(layout, s); err == nil {
			return date
		}
	}

	return time.Time{}
}

// EnsureSheetsExist checks if required sheets exist, creates them if not
func (c *Client) EnsureSheetsExist() error {
	// Get spreadsheet info
	spreadsheet, err := c.srv.Spreadsheets.Get(c.spreadsheetID).Do()
	if err != nil {
		return fmt.Errorf("unable to get spreadsheet: %v", err)
	}

	// Check existing sheets
	sheetNames := make(map[string]bool)
	for _, sheet := range spreadsheet.Sheets {
		sheetNames[sheet.Properties.Title] = true
	}

	// Create "transaksi" sheet if not exists
	if !sheetNames["transaksi"] {
		req := &sheets.BatchUpdateSpreadsheetRequest{
			Requests: []*sheets.Request{
				{
					AddSheet: &sheets.AddSheetRequest{
						Properties: &sheets.SheetProperties{
							Title: "transaksi",
						},
					},
				},
			},
		}

		_, err := c.srv.Spreadsheets.BatchUpdate(c.spreadsheetID, req).Do()
		if err != nil {
			return fmt.Errorf("unable to create transaksi sheet: %v", err)
		}

		// Add headers
		headers := [][]interface{}{{
			"tanggal", "nama_kk", "jumlah_jiwa", "jenis_zakat", "kategori",
			"jumlah_beras_kg", "jumlah_beras_aktual", "jumlah_uang", "kelebihan_dikembalikan",
			"kelebihan_amal", "amil_penerima",
		}}
		valueRange := &sheets.ValueRange{
			Values: headers,
		}
		_, err = c.srv.Spreadsheets.Values.Update(
			c.spreadsheetID,
			"transaksi!A1:K1",
			valueRange,
		).ValueInputOption("USER_ENTERED").Do()
		if err != nil {
			return fmt.Errorf("unable to add headers: %v", err)
		}

		fmt.Println("Created 'transaksi' sheet with headers")
	}

	return nil
}

// LoadEnv loads environment variables from .env file
func LoadEnv() {
	// Try to load .env file if exists
	if _, err := os.Stat(".env"); err == nil {
		content, err := os.ReadFile(".env")
		if err == nil {
			lines := strings.Split(string(content), "\n")
			for _, line := range lines {
				line = strings.TrimSpace(line)
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					key := strings.TrimSpace(parts[0])
					value := strings.TrimSpace(parts[1])
					os.Setenv(key, value)
				}
			}
		}
	}
}

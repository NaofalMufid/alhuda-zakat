/**
 * Kartu Module - Cetak Kartu Pengambilan Zakat
 * Layout PDF dibangun di Frontend menggunakan HTML/CSS + html2pdf.js
 */

// State untuk data kartu
let kartuData = [];

/**
 * Load data penduduk untuk kartu (kategori != G)
 */
async function loadKartuData() {
    showLoading(true);
    
    try {
        const data = await API.get('/api/kartu/penduduk');
        kartuData = data;
        renderKartuPreview();
        updateKartuInfo();
        showToast('Data berhasil dimuat', 'success');
    } catch (error) {
        console.error('Error loading kartu data:', error);
        showToast('Terjadi kesalahan saat memuat data: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Render preview table
 */
function renderKartuPreview() {
    const tbody = document.getElementById('tableKartuPreview');
    
    if (kartuData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    Tidak ada data penduduk dengan kategori M atau F
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    kartuData.forEach((p, index) => {
        const kategoriBadge = getGolonganBadge(p.golongan);
        html += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${escapeHtml(p.nama_kk)}</td>
                <td class="text-center">${p.jumlah_jiwa}</td>
                <td>${kategoriBadge}</td>
                <td>${escapeHtml(p.rt || '-')}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * Update info total kartu dan halaman
 */
function updateKartuInfo() {
    const totalCount = kartuData.length;
    const totalPages = Math.ceil(totalCount / 8);
    
    document.getElementById('kartuTotalCount').textContent = totalCount;
    document.getElementById('kartuTotalPages').textContent = totalPages;
}

/**
 * Generate HTML untuk kartu
 */
function generateKartuHTML(penduduk, tempatTanggal) {
    let html = '<div class="kartu-all">';
    
    penduduk.forEach(p => {
        html += `
            <div class="kartu-item">
                <div class="kartu-header">
                    <div>Kartu Pengambilan</div>
                    <div>Zakat Fitrah</div>
                </div>
                <div class="kartu-body">
                    <div class="kartu-row">
                        <div class="kartu-label">Nama KK</div>
                        <div class="kartu-separator">:</div>
                        <div class="kartu-value">${escapeHtml(p.nama_kk)}</div>
                    </div>
                    <div class="kartu-row">
                        <div class="kartu-label">Jumlah Jiwa</div>
                        <div class="kartu-separator">:</div>
                        <div class="kartu-value">${p.jumlah_jiwa}</div>
                    </div>
                    <div class="kartu-row">
                        <div class="kartu-label">Waktu & Tempat</div>
                        <div class="kartu-separator">:</div>
                        <div class="kartu-value small">${escapeHtml(tempatTanggal)}</div>
                    </div>
                    <div class="kartu-row">
                        <div class="kartu-label">Nb</div>
                        <div class="kartu-separator">:</div>
                        <div class="kartu-notes">
                            <div>- Kartu wajib dibawa saat pengambilan</div>
                            <div>- Amal idul fitri bisa sekalian</div>
                            <div>dibawa pada saat pengembalian</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Generate PDF kartu menggunakan html2pdf.js
 */
async function generateKartuPDF() {
    if (kartuData.length === 0) {
        showToast('Tidak ada data untuk dicetak. Klik Refresh Data terlebih dahulu.', 'warning');
        return;
    }
    
    let tempatTanggal = document.getElementById('kartuTempatTanggal').value.trim();
    
    // Default value if empty
    if (!tempatTanggal) {
        const today = new Date();
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        tempatTanggal = today.toLocaleDateString('id-ID', options) + ' / Mushola Al-Huda';
    }
    
    showLoading(true);
    
    try {
        // Render kartu HTML ke container tersembunyi
        const container = document.getElementById('kartuPreviewContainer');
        container.innerHTML = generateKartuHTML(kartuData, tempatTanggal);
        container.classList.remove('d-none');
        
        // Konfigurasi html2pdf
        const opt = {
            margin: [10, 10, 10, 10], // top, right, bottom, left in mm
            filename: `kartu-pengambilan-zakat-${new Date().toISOString().slice(0,10)}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                logging: false
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            }
        };
        
        // Generate PDF
        await html2pdf().set(opt).from(container).save();
        
        // Sembunyikan container lagi
        container.classList.add('d-none');
        
        showToast('PDF berhasil di-generate dan diunduh', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showToast('Terjadi kesalahan saat generate PDF: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Get golongan badge HTML
 */
function getGolonganBadge(golongan) {
    const upper = (golongan || '').toUpperCase();
    let badgeClass = '';
    let label = '';
    
    switch (upper) {
        case 'G':
            badgeClass = 'badge-golongan G';
            label = 'G (Ghani)';
            break;
        case 'M':
            badgeClass = 'badge-golongan M';
            label = 'M (Miskin)';
            break;
        case 'F':
            badgeClass = 'badge-golongan F';
            label = 'F (Fakir)';
            break;
        default:
            badgeClass = 'badge bg-secondary';
            label = golongan || '-';
    }
    
    return `<span class="${badgeClass}">${label}</span>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initialize kartu page when shown
 */
function initKartuPage() {
    // Set default tempat tanggal
    const today = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const defaultTempatTanggal = today.toLocaleDateString('id-ID', options) + ' / Mushola Al-Huda';
    
    const input = document.getElementById('kartuTempatTanggal');
    if (input && !input.value) {
        input.value = defaultTempatTanggal;
    }
    
    // Load data if empty
    if (kartuData.length === 0) {
        loadKartuData();
    }
}

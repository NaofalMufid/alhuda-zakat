/**
 * Utility functions
 */

function formatRupiah(amount) {
    if (amount === 0 || amount === null || amount === undefined) return 'Rp 0';
    return 'Rp ' + amount.toLocaleString('id-ID');
}

function formatRupiahShort(amount) {
    if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'jt';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(0) + 'rb';
    }
    return amount.toString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('d-none', !show);
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toastId = 'toast-' + Date.now();
    
    const bgClass = {
        success: 'bg-success',
        error: 'bg-danger',
        warning: 'bg-warning text-dark',
        info: 'bg-info text-dark'
    }[type] || 'bg-info';
    
    const icon = {
        success: 'check-circle-fill',
        error: 'exclamation-circle-fill',
        warning: 'exclamation-triangle-fill',
        info: 'info-circle-fill'
    }[type] || 'info-circle-fill';
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center ${bgClass} text-white border-0`;
    toast.id = toastId;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="bi bi-${icon} me-2"></i>${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                    data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    container.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

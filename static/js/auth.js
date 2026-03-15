/**
 * Authentication Module
 * Handle login, logout, token management, and UI visibility
 */

const Auth = {
    TOKEN_KEY: 'zakat_token',
    USER_KEY: 'zakat_user',

    /**
     * Initialize auth state and UI
     */
    init() {
        this.updateUI();
        this.checkProtectedAccess();
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!this.getToken();
    },

    /**
     * Get stored token
     */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    /**
     * Get stored user info
     */
    getUser() {
        const user = localStorage.getItem(this.USER_KEY);
        return user ? JSON.parse(user) : null;
    },

    /**
     * Store auth data
     */
    setAuth(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.updateUI();
        this.checkProtectedAccess();
    },

    /**
     * Clear auth data (logout)
     */
    clearAuth() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.updateUI();
        this.checkProtectedAccess();
    },

    /**
     * Login with credentials
     */
    async login(username, password) {
        try {
            const response = await API.post('/api/auth/login', { username, password });
            this.setAuth(response.token, {
                username: response.username,
                nama_lengkap: response.nama_lengkap
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    /**
     * Logout
     */
    logout() {
        this.clearAuth();
        showToast('success', 'Berhasil logout');
        // Redirect ke laporan jika sedang di halaman protected
        if (this.isProtectedPage()) {
            showPage('laporan');
        }
    },

    /**
     * Check if current page requires authentication
     */
    isProtectedPage() {
        const currentPage = document.querySelector('#mainNav .nav-link.active');
        if (!currentPage) return false;
        
        const text = currentPage.textContent.toLowerCase();
        return text.includes('zakat fitrah') || text.includes('zakat mal');
    },

    /**
     * Get auth header for API requests
     */
    getAuthHeader() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    /**
     * Update UI based on auth state
     */
    updateUI() {
        const isLoggedIn = this.isLoggedIn();
        const user = this.getUser();

        // Update login button
        const loginBtn = document.getElementById('loginBtn');
        const userDropdown = document.getElementById('userDropdown');

        if (loginBtn) {
            loginBtn.classList.toggle('d-none', isLoggedIn);
        }
        if (userDropdown) {
            userDropdown.classList.toggle('d-none', !isLoggedIn);
            const userNameEl = document.getElementById('userName');
            const userNameDropdownEl = document.getElementById('userNameDropdown');
            if (user) {
                if (userNameEl) userNameEl.textContent = user.nama_lengkap || user.username;
                if (userNameDropdownEl) userNameDropdownEl.textContent = user.nama_lengkap || user.username;
            }
        }

        // Show/hide protected elements (menu, buttons, etc)
        document.querySelectorAll('.auth-required').forEach(el => {
            el.classList.toggle('d-none', !isLoggedIn);
        });
        
        // Refresh navigation active state after auth change
        const currentPage = window.location.hash.replace('#', '') || 'laporan';
        if (typeof updateActiveNav === 'function') {
            updateActiveNav(currentPage);
        }

        // Show/hide public-only elements (untuk elemen yang hanya muncul saat belum login)
        document.querySelectorAll('.public-only').forEach(el => {
            el.classList.toggle('d-none', isLoggedIn);
        });

        // Enable/disable form inputs
        document.querySelectorAll('.form-protected input, .form-protected select, .form-protected button, .form-protected textarea').forEach(el => {
            el.disabled = !isLoggedIn;
        });

        // Show auth overlay on forms if not logged in
        document.querySelectorAll('.form-protected').forEach(el => {
            let overlay = el.querySelector('.auth-overlay');
            if (!isLoggedIn) {
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'auth-overlay';
                    overlay.innerHTML = `
                        <div class="auth-overlay-content">
                            <i class="bi bi-lock-fill"></i>
                            <p>Silakan login untuk mengakses fitur ini</p>
                            <button class="btn btn-primary btn-sm" onclick="showLoginModal()">
                                <i class="bi bi-box-arrow-in-right me-1"></i>Login
                            </button>
                        </div>
                    `;
                    el.style.position = 'relative';
                    el.appendChild(overlay);
                }
                overlay.style.display = 'flex';
            } else if (overlay) {
                overlay.style.display = 'none';
            }
        });
    },

    /**
     * Check and handle protected access
     */
    checkProtectedAccess() {
        // Jika sedang di halaman protected tapi belum login, redirect ke laporan
        if (this.isProtectedPage() && !this.isLoggedIn()) {
            showPage('laporan');
            showToast('info', 'Silakan login untuk mengakses halaman tersebut');
        }
    }
};

/**
 * Show login modal
 */
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

/**
 * Hide login modal
 */
function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('btnLogin');

    if (!username || !password) {
        errorEl.textContent = 'Username dan password wajib diisi';
        errorEl.classList.remove('d-none');
        return;
    }

    // Show loading state
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Loading...';
    errorEl.classList.add('d-none');

    const result = await Auth.login(username, password);

    // Reset button
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Login';

    if (result.success) {
        hideLoginModal();
        document.getElementById('loginForm').reset();
        showToast('success', 'Login berhasil! Selamat datang.');
        
        // Refresh data if needed
        if (typeof loadMasterData === 'function') {
            loadMasterData();
        }
    } else {
        errorEl.textContent = result.error || 'Login gagal. Periksa username dan password.';
        errorEl.classList.remove('d-none');
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    Auth.logout();
}

// Initialize auth on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});

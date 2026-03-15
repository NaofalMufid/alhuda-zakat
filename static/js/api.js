/**
 * API Client
 */

const API = {
    /**
     * Get auth headers if user is logged in
     */
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add auth header if available
        if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
            const authHeader = Auth.getAuthHeader();
            Object.assign(headers, authHeader);
        }
        
        return headers;
    },

    async get(endpoint) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            headers: this.getHeaders()
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    },
    
    async post(endpoint, data) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return response.json();
    },
    
    async put(endpoint, data) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return response.json();
    },
    
    async delete(endpoint) {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return response.json();
    }
};

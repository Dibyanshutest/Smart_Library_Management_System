/**
 * Smart Library — API Client
 * Centralized fetch wrapper for all API calls.
 */

const API_BASE = '/api';

const getToken = () => localStorage.getItem('sl_token');
const setToken = (token) => localStorage.setItem('sl_token', token);
const removeToken = () => localStorage.removeItem('sl_token');

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('sl_user'));
  } catch {
    return null;
  }
};

const setUser = (user) => localStorage.setItem('sl_user', JSON.stringify(user));
const removeUser = () => localStorage.removeItem('sl_user');

/**
 * Make an API request.
 * @param {string} endpoint - API path (e.g., '/auth/login')
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} Response data
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = getToken();

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  };

  // Don't set Content-Type for FormData
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
        removeUser();
        if (!window.location.pathname.includes('login')) {
          window.location.href = '/login.html';
        }
      }
      throw { status: response.status, message: data.message || 'Request failed', data };
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    throw { status: 0, message: 'Network error. Please check your connection.' };
  }
}

// Convenience methods
const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),

  // Auth helpers
  getToken,
  setToken,
  removeToken,
  getUser,
  setUser,
  removeUser,

  isLoggedIn: () => !!getToken(),

  logout: () => {
    removeToken();
    removeUser();
    window.location.href = '/login.html';
  }
};

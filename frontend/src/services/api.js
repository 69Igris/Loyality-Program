// Centralized API client for the Ledger frontend.
// Reads VITE_API_URL in production; falls back to localhost:5000 in dev.

const envApiUrl = import.meta.env.VITE_API_URL;
const defaultApiUrl = import.meta.env.DEV ? 'http://localhost:5000' : '';
const API_URL = (envApiUrl || defaultApiUrl).replace(/\/+$/, '');

export const TOKEN_STORAGE_KEY = 'ledger.auth.token';

if (import.meta.env.PROD && !envApiUrl) {
  console.warn('[api] Missing VITE_API_URL in production build. Falling back to same-origin /api path.');
}

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* private browsing / blocked storage — ignore */
  }
}

function buildHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const endpoint = API_URL ? `${API_URL}${path}` : path;
  let response;
  try {
    response = await fetch(endpoint, {
      method,
      headers: buildHeaders(headers),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    console.error('[api] Network error:', networkError);
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 204) return null;

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.message)) || `Request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.fields = payload?.fields;
    throw error;
  }

  return payload;
}

// --- Auth ---
export const auth = {
  signup: ({ email, password, name }) =>
    request('/api/auth/signup', { method: 'POST', body: { email, password, name } }),
  login: ({ email, password }) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/api/auth/me'),
};

// --- Cards (require auth) ---
export const cards = {
  list: () => request('/api/cards'),
  create: (body) => request('/api/cards', { method: 'POST', body }),
  update: (id, body) => request(`/api/cards/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/api/cards/${id}`, { method: 'DELETE' }),
};

// --- Loyalty programs (require auth) ---
export const loyalty = {
  list: () => request('/api/loyalty'),
  create: (body) => request('/api/loyalty', { method: 'POST', body }),
  update: (id, body) => request(`/api/loyalty/${id}`, { method: 'PATCH', body }),
  remove: (id) => request(`/api/loyalty/${id}`, { method: 'DELETE' }),
};

// --- Trip history (require auth) ---
export const trips = {
  list: ({ limit, cursor } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    return request(`/api/trips${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/api/trips/${id}`),
  remove: (id) => request(`/api/trips/${id}`, { method: 'DELETE' }),
};

// --- Optimizer ---
// `userData` is optional — if omitted and the user is logged in, the backend
// hydrates from their saved profile.
export async function optimizeTrip({ userData, trip }) {
  const body = { trip };
  if (userData) body.userData = userData;
  return request('/api/optimize', { method: 'POST', body });
}

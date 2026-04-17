const envApiUrl = import.meta.env.VITE_API_URL;
const defaultApiUrl = import.meta.env.DEV ? 'http://localhost:5000' : '';
const API_URL = (envApiUrl || defaultApiUrl).replace(/\/+$/, '');

if (import.meta.env.PROD && !envApiUrl) {
  console.warn('[api] Missing VITE_API_URL in production build. Falling back to same-origin /api path.');
}

export async function optimizeTrip({ userData, trip }) {
  try {
    const endpoint = API_URL ? `${API_URL}/api/optimize` : '/api/optimize';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userData, trip }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      throw new Error(errorPayload.error || 'Failed to fetch travel strategy from the server.');
    }

    return await response.json();
  } catch (error) {
    console.error('API error:', error);
    throw error;
  }
}

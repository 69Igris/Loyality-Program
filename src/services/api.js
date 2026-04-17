export async function optimizeTrip({ userData, trip }) {
  try {
    const response = await fetch('http://localhost:5001/api/optimize', {
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

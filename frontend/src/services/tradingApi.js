import { auth } from '../firebase/config';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/\/$/, '');

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body.detail === 'string'
      ? body.detail
      : 'No fue posible completar el análisis.';
    throw new Error(detail);
  }
  return body;
}

export async function analyzeTrade(payload) {
  const token = auth.currentUser
    ? await auth.currentUser.getIdToken()
    : null;
  const response = await fetch(`${API_URL}/api/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function getBotHealth() {
  const response = await fetch(`${API_URL}/health`);
  return parseResponse(response);
}

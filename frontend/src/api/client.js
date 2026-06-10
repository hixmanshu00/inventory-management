// Single API client. Base URL comes from an env var so the same build can point
// at local/staging/prod backends without code changes.
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

// Thrown for any non-2xx response. Carries the backend's structured error body so
// callers/components can show the real message (409 conflict, 400, etc.) instead
// of a generic failure.
export class ApiError extends Error {
  constructor(status, body) {
    super(body?.detail || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.code;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network/CORS failure: no HTTP status at all.
    throw new ApiError(0, { detail: 'Could not reach the server. Is the API running?' });
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }
  return payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

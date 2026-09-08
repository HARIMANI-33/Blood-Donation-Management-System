/**
 * Normalizes API base URL:
 * - Trims whitespace and trailing slashes.
 * - Ensures the `/api` route prefix is present if omitted.
 */
const normalizeApiUrl = (url: string): string => {
  let trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed.endsWith('/api')) {
    trimmed += '/api';
  }
  return trimmed;
};

const DEFAULT_PROD_API_URL = 'https://blood-donation-management-system-fzrt.onrender.com/api';
const DEFAULT_DEV_API_URL = 'http://localhost:5000/api';

// Priority:
// 1. Explicit VITE_API_URL environment variable (from .env, .env.production, or Vercel Environment Variables)
// 2. If running in production mode (import.meta.env.PROD), use the live Render backend URL
// 3. Otherwise in development mode, use localhost:5000/api
const RAW_API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL);

const API_URL = normalizeApiUrl(RAW_API_URL);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
}

/**
 * Thin fetch wrapper that talks to the backend API, attaches the
 * bearer token when present, and normalizes error handling.
 */
export const apiRequest = async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (netErr: unknown) {
    const errorDetail = netErr instanceof Error ? netErr.message : 'Network error';
    throw new ApiError(
      `Cannot connect to backend server at ${API_URL}: ${errorDetail}. Please check if the backend is running and CORS is allowed.`,
      0
    );
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // No JSON body (e.g. network error) - fall through with data = null
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return data as T;
};

/**
 * API Client - Centralized HTTP client for all backend API calls.
 * Handles JWT token storage, auto-refresh, and consistent error handling.
 * Tokens are stored in memory only (sessionStorage for page refreshes).
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let accessToken: string | null = null;
let refreshToken: string | null = null;

// Initialize from sessionStorage (survives page refresh, not cross-tab)
function initTokens(): void {
  try {
    accessToken = sessionStorage.getItem('coltion_access_token');
    refreshToken = sessionStorage.getItem('coltion_refresh_token');
  } catch {
    accessToken = null;
    refreshToken = null;
  }
}
initTokens();

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  try {
    sessionStorage.setItem('coltion_access_token', access);
    sessionStorage.setItem('coltion_refresh_token', refresh);
  } catch { /* storage full or unavailable */ }
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  try {
    sessionStorage.removeItem('coltion_access_token');
    sessionStorage.removeItem('coltion_refresh_token');
  } catch { /* silent */ }
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken || refreshToken);
    return true;
  } catch {
    return false;
  }
}

interface ApiOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  // Try refreshing token on 401
  if (res.status === 401 && !skipAuth && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...fetchOptions,
        headers,
      });
    }
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}

// Convenience methods
export const apiService = {
  get: <T = any>(path: string) => api<T>(path),
  post: <T = any>(path: string, body?: any) => api<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(path: string, body?: any) => api<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = any>(path: string) => api<T>(path, { method: 'DELETE' }),
};
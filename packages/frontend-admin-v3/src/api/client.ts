import { clearTokens, getToken, setToken } from '@/lib/auth';
import { loginPath } from '@/lib/auth-paths';

const BASE = '/api/v1';
let refreshPromise: Promise<boolean> | null = null;

/** Ошибка API с опциональным доменным `code` из тела ответа. */
export class AdminApiError extends Error {
  readonly code?: string;
  readonly statusCode: number;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = 'AdminApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === loginPath()) return;
  window.location.assign(loginPath());
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { accessToken: string };
      setToken(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  try {
    return await refreshPromise;
  } catch {
    return false;
  }
}

/** Восстановление access token по HttpOnly refresh-cookie (для RequireAuth). */
export async function tryRefreshSession(): Promise<boolean> {
  return refreshAccessToken();
}

/**
 * Запросы без Bearer (логин, сброс пароля и т.п.).
 * Refresh-cookie с того же origin обрабатывается браузером.
 */
export async function publicApi<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({ message: res.statusText }))) as { message?: string };
    const message: string = err.message || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const isFormData =
    typeof FormData !== 'undefined' && options.body != null && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const request = () =>
    fetch(`${BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });

  let res = await request();

  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${getToken()}`;
      res = await request();
    } else {
      clearTokens();
      redirectToLogin();
      throw new AdminApiError('Session expired', 401);
    }
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({ message: res.statusText }))) as {
      message?: string;
      error?: string;
      code?: string;
    };
    const message: string = err.message || err.error || `HTTP ${res.status}`;
    throw new AdminApiError(message, res.status, err.code);
  }

  return res.json() as Promise<T>;
}

/** Выход: инвалидирует refresh на сервере и очищает access в localStorage. */
export async function logoutAndRedirect(): Promise<void> {
  const token = getToken();
  try {
    if (token) {
      await fetch(`${BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });
    }
  } catch {
    // ignore network errors on logout
  }
  clearTokens();
  redirectToLogin();
}

export const adminApi = {
  get: <T = unknown>(path: string) => api<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = unknown>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => api<T>(path, { method: 'DELETE' }),
};

/** Загрузка изображения в хранилище админки (multipart). Возвращает публичные URL. */
export async function uploadAdminImage(file: File): Promise<{ url: string; thumbUrl: string }> {
  const fd = new FormData();
  fd.append('file', file);
  return api<{ url: string; thumbUrl: string }>('/admin/upload/image', { method: 'POST', body: fd });
}
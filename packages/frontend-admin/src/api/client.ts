import { clearTokens, getToken, setToken } from '../lib/auth';

const BASE = '/api/v1';
let refreshPromise: Promise<boolean> | null = null;
const inflightGetRequests = new Map<string, Promise<any>>();

function buildGetKey(path: string, headers: Record<string, string>): string {
  const auth = headers['Authorization'] ?? '';
  return `GET:${path}:${auth}`;
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      // Refresh token отправляется автоматически через HttpOnly cookie
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Важно: для отправки cookies
        body: JSON.stringify({}),
      });

      if (!res.ok) return false;

      const data = await res.json();
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

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const method = (options.method ?? 'GET').toUpperCase();
  const request = () =>
    fetch(`${BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include', // Для HttpOnly cookies
    });

  const executeWithRefresh = async () => {
    let res = await request();

    // Auto-refresh on 401
    if (res.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${getToken()}`;
        res = await request();
      } else {
        clearTokens();
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      let message: string = err.message || `HTTP ${res.status}`;
      // Локализация типичных сообщений валидации
      if (typeof message === 'string' && message.includes('property shortDescription should not exist')) {
        message = 'Поле shortDescription не поддерживается этим запросом. Уберите его из данных.';
      }
      throw new Error(message);
    }

    return res.json() as Promise<T>;
  };

  if (method === 'GET') {
    const key = buildGetKey(path, headers);
    const inflight = inflightGetRequests.get(key) as Promise<T> | undefined;
    if (inflight) {
      return inflight;
    }

    const promise = executeWithRefresh().finally(() => {
      inflightGetRequests.delete(key);
    });
    inflightGetRequests.set(key, promise);
    return promise;
  }

  let res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Для HttpOnly cookies
  });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getToken()}`;
      res = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      });
    } else {
      clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    let message: string = err.message || `HTTP ${res.status}`;
    // Локализация типичных сообщений валидации
    if (typeof message === 'string' && message.includes('property shortDescription should not exist')) {
      message = 'Поле shortDescription не поддерживается этим запросом. Уберите его из данных.';
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export const adminApi = {
  get: <T = any>(path: string) => api<T>(path),
  post: <T = any>(path: string, body?: any) =>
    api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T = any>(path: string, body?: any) =>
    api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: any) =>
    api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string, body?: unknown) =>
    api<T>(
      path,
      body !== undefined ? { method: 'DELETE', body: JSON.stringify(body) } : { method: 'DELETE' },
    ),
};

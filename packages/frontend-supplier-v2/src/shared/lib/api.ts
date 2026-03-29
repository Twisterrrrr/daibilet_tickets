const API_BASE = '/api/v1';

function getToken(): string | null {
  return localStorage.getItem('supplier_token');
}

export function setToken(token: string) {
  localStorage.setItem('supplier_token', token);
}

export function clearToken() {
  localStorage.removeItem('supplier_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function readJsonBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined as T;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error('Некорректный ответ сервера');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshRes = await fetch(`${API_BASE}/supplier/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshRes.ok) {
      const data = await readJsonBody<{ accessToken?: string }>(refreshRes);
      if (!data?.accessToken) {
        clearToken();
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      setToken(data.accessToken);
      headers.Authorization = `Bearer ${data.accessToken}`;
      const retry = await fetch(`${API_BASE}${path}`, { ...options, headers });
      if (!retry.ok) throw new Error(`HTTP ${retry.status}`);
      return readJsonBody<T>(retry);
    }
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text();
    const trimmed = text.trim();
    let message = `HTTP ${res.status}`;
    if (trimmed) {
      try {
        const parsed = JSON.parse(trimmed) as { message?: string };
        if (parsed?.message) message = String(parsed.message);
      } catch {
        /* оставляем message по статусу */
      }
    }
    throw new Error(message);
  }

  return readJsonBody<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

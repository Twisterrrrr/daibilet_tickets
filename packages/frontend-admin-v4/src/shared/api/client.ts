import { clearAuthTokens, getAccessToken, setAccessToken } from '@/shared/auth/tokens';

export type ApiErrorShape = {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
  requestId?: string | null;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;
  readonly requestId?: string | null;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiError';
    this.status = shape.status;
    this.code = shape.code;
    this.details = shape.details;
    this.requestId = shape.requestId ?? null;
  }
}

const BASE = '/api/v1';
let refreshPromise: Promise<string | null> | null = null;

async function parseError(res: Response): Promise<ApiError> {
  const status = res.status;
  const requestId =
    res.headers.get('x-request-id') ??
    res.headers.get('x-correlation-id') ??
    res.headers.get('x-amzn-trace-id') ??
    null;
  const body = (await res.json().catch(() => null)) as any;
  const message: string =
    body?.message || body?.error || body?.details?.message || res.statusText || `HTTP ${status}`;
  const code: string | undefined = body?.code || body?.errorCode;
  return new ApiError({ message, status, code, details: body ?? undefined, requestId });
}

function networkError(err: unknown): ApiError {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : 'Network error';
  return new ApiError({ status: 0, code: 'NETWORK_ERROR', message });
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    }).catch(() => null);

    if (!res || !res.ok) return null;
    const data = (await res.json().catch(() => null)) as { accessToken?: string } | null;
    const token = data?.accessToken?.trim() || null;
    if (token) setAccessToken(token);
    return token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function publicApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  }).catch((e) => {
    throw networkError(e);
  });

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const doFetch = () =>
    fetch(`${BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    }).catch((e) => {
      throw networkError(e);
    });

  let res = await doFetch();

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      headers.Authorization = `Bearer ${refreshed}`;
      res = await doFetch();
    } else {
      clearAuthTokens();
      throw new ApiError({ status: 401, message: 'Session expired', code: 'SESSION_EXPIRED' });
    }
  }

  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}


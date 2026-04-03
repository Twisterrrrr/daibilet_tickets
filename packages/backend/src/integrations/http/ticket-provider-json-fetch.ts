import { TicketProviderHttpError } from '../errors/provider-integration.errors';

export interface TicketProviderJsonFetchParams {
  /** Полный URL запроса (уже с base + path). */
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  /** Таймаут; по умолчанию 30s */
  timeoutMs?: number;
  /** Для сообщений об ошибках (без секретов). */
  providerLabel: string;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/**
 * Один общий путь для REST ticket providers (Radario, Qtickets, …).
 * Не логирует тело запроса/заголовки с токенами.
 */
export async function ticketProviderJsonFetch<T = unknown>(params: TicketProviderJsonFetchParams): Promise<T> {
  const { url, method = 'GET', headers = {}, body, timeoutMs = 30_000, providerLabel } = params;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...headers,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    if (!res.ok) {
      throw new TicketProviderHttpError(
        providerLabel,
        res.status,
        truncate(text.replace(/\s+/g, ' '), 500),
      );
    }
    if (!text || text.trim() === '') {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new TicketProviderHttpError(providerLabel, res.status, 'Response is not valid JSON');
    }
  } catch (e) {
    if (e instanceof TicketProviderHttpError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new TicketProviderHttpError(providerLabel, 0, msg);
  } finally {
    clearTimeout(t);
  }
}

/** Склеить baseUrl и path без двойных слэшей. */
export function joinTicketProviderUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

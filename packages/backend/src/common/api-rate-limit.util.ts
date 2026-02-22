/**
 * C3 — Rate limiting внешних API (TC/TEP).
 *
 * - concurrency limit (p-limit)
 * - retry с exponential backoff на 429/5xx
 * - метрики (retries, duration)
 */

import pLimit from 'p-limit';

const DEFAULT_CONCURRENCY = 2;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;

function parseEnvInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw == null || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Concurrency limiter для TC/TEP API. */
export function createApiLimiter(envKey = 'TC_TEP_CONCURRENCY'): ReturnType<typeof pLimit> {
  const concurrency = parseEnvInt(envKey, DEFAULT_CONCURRENCY);
  return pLimit(Math.max(1, concurrency));
}

export interface WithRetryOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  /** Проверка, нужно ли ретраить (429, 5xx). */
  shouldRetry?: (status?: number, err?: Error) => boolean;
  onRetry?: (attempt: number, status?: number, delayMs: number) => void;
}

/** Выполняет fn с retry при 429/5xx. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: WithRetryOptions,
): Promise<{ data: T; retries: number }> {
  const maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialBackoffMs = opts?.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS;

  const shouldRetry =
    opts?.shouldRetry ??
    ((status?: number) => {
      if (status === 429) return true;
      if (status != null && status >= 500) return true;
      return false;
    });

  let lastError: Error | undefined;
  let lastStatus: number | undefined;
  let retries = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await fn();
      return { data, retries };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      lastStatus = extractStatus(err);

      if (attempt === maxRetries) break;
      if (!shouldRetry(lastStatus, lastError)) throw lastError;

      const delayMs = initialBackoffMs * Math.pow(2, attempt);
      opts?.onRetry?.(attempt + 1, lastStatus, delayMs);
      await sleep(delayMs);
      retries++;
    }
  }

  throw lastError;
}

function extractStatus(err: unknown): number | undefined {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/(?:returned|failed)\s+(\d{3})/i) ?? msg.match(/\b(\d{3})\b/);
  return m ? parseInt(m[1], 10) : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Общий limiter для TC/TEP HTTP. */
const tcTepLimiter = createApiLimiter('TC_TEP_CONCURRENCY');

/** Выполнить под concurrency limit. */
export function runWithLimit<T>(fn: () => Promise<T>): Promise<T> {
  return tcTepLimiter(fn);
}

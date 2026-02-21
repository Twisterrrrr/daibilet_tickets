/**
 * Утилиты для HTTP timeout и AbortController.
 * C2 — Production Hardening: timeout из env, комбинирование сигналов для job abort.
 */

/**
 * Объединяет несколько AbortSignal: при отмене любого — отменяется результирующий.
 */
export function combineAbortSignals(...signals: (AbortSignal | undefined | null)[]): AbortSignal {
  const valid = signals.filter((s): s is AbortSignal => s != null);
  if (valid.length === 0) return new AbortController().signal;
  if (valid.length === 1) return valid[0];

  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  for (const s of valid) {
    if (s.aborted) {
      ctrl.abort();
      return ctrl.signal;
    }
    s.addEventListener('abort', abort, { once: true });
  }
  return ctrl.signal;
}

/**
 * Возвращает timeout из env или fallback.
 * TC_HTTP_TIMEOUT_MS, TEP_HTTP_TIMEOUT_MS (секунды или миллисекунды по имени).
 */
export function getHttpTimeoutMs(envKey: string, fallbackMs: number): number {
  const raw = process.env[envKey];
  if (raw == null || raw === '') return fallbackMs;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallbackMs;
  // Если значение < 1000, считаем секундами
  return n < 1000 ? n * 1000 : n;
}

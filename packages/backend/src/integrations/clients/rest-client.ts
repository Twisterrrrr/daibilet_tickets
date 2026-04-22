/**
 * Общий слой HTTP JSON для REST ticket providers.
 * Сейчас — заготовка; live-вызовы остаются в существующих сервисах (tc-api и т.д.).
 */
export interface RestClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

/** Factory для будущего единого HTTP-клиента (axios/fetch). */
export function createRestClientContext(opts: RestClientOptions): RestClientOptions {
  return { ...opts };
}

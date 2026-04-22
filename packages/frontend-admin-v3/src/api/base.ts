/**
 * Базовый префикс API. В dev Vite проксирует `/api` → backend (см. vite.config.ts).
 * В проде можно задать полный URL: `VITE_API_BASE_URL=https://api.example.com/api/v1`
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (typeof raw === 'string' && raw.trim()) {
    return raw.replace(/\/+$/, '');
  }
  return '/api/v1';
}

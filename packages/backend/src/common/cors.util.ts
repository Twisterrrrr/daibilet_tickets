/**
 * CORS origins — парсинг env и дефолты по окружению.
 * B2 — Production Hardening Plan.
 */

const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
];

/**
 * Парсит comma-separated origins, убирает пробелы и пустые.
 */
export function parseCorsOrigins(value: string | undefined): string[] {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Возвращает массив origins для enableCors.
 * - CORS_ORIGINS или CORS_ORIGIN заданы → парсим
 * - dev: дефолт localhost (3000, 3001, 5173)
 * - prod: только из env (daibilet.ru и т.п.)
 */
export function getCorsOrigins(): string[] {
  const env = process.env.CORS_ORIGINS ?? process.env.CORS_ORIGIN;
  const parsed = parseCorsOrigins(env);

  if (parsed.length > 0) return parsed;

  if (process.env.NODE_ENV === 'production') {
    const appUrl = process.env.APP_URL?.trim();
    return appUrl ? [appUrl] : [];
  }

  return DEV_ORIGINS;
}

/** Базовый префикс SPA Admin V4 (должен совпадать с router basename). */
export const ADMIN_V4_BASE = '/admin-v4';

export function loginPath(): string {
  return `${ADMIN_V4_BASE}/login`;
}


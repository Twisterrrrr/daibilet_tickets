/** Базовый префикс SPA Admin V3 (совпадает с Route path в App.tsx). */
export const ADMIN_V3_BASE = '/admin-v3';

export function loginPath(): string {
  return `${ADMIN_V3_BASE}/login`;
}

export function forgotPasswordPath(): string {
  return `${ADMIN_V3_BASE}/forgot-password`;
}

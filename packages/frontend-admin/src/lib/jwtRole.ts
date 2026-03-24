import { getToken } from './auth';

export type AdminJwtRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

function decodeJwtPayload(accessToken: string): Record<string, unknown> | null {
  const parts = accessToken.split('.');
  if (parts.length < 2) return null;
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
  try {
    return JSON.parse(atob(b64 + pad)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Роль из access JWT (без верификации подписи; только для UI-gating, см. backend guards). */
export function getAdminRoleFromToken(): AdminJwtRole | null {
  const t = getToken();
  if (!t) return null;
  const payload = decodeJwtPayload(t);
  const r = payload?.role;
  if (r === 'ADMIN' || r === 'EDITOR' || r === 'VIEWER') return r;
  return null;
}

/** Пути навигации, которые для VIEWER дают 403 или не предназначены для read-only (см. Security-Test-Matrix). */
export const ADMIN_VIEWER_NAV_DENYLIST = new Set([
  '/support',
  '/finance-documents',
  '/seo-audit',
  '/payouts',
  '/audit',
  '/source-categories',
]);

export function adminNavItemAllowedForRole(path: string, role: AdminJwtRole | null): boolean {
  if (role !== 'VIEWER') return true;
  for (const blocked of ADMIN_VIEWER_NAV_DENYLIST) {
    if (path === blocked || path.startsWith(`${blocked}/`)) return false;
  }
  return true;
}

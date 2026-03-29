export type SupplierJwtRole = 'OWNER' | 'MANAGER' | 'CONTENT' | 'ACCOUNTANT';

function getSupplierToken(): string | null {
  return localStorage.getItem('supplier_token');
}

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

export function getSupplierRoleFromToken(): SupplierJwtRole | null {
  const t = getSupplierToken();
  if (!t) return null;
  const payload = decodeJwtPayload(t);
  const r = payload?.role;
  if (r === 'OWNER' || r === 'MANAGER' || r === 'CONTENT' || r === 'ACCOUNTANT') return r;
  return null;
}

export function supplierNavPathAllowedForRole(path: string, role: SupplierJwtRole | null): boolean {
  if (!role || role === 'OWNER') return true;

  const deny = new Set<string>();
  if (role === 'MANAGER') {
    deny.add('/team');
    deny.add('/requisites');
  }
  if (role === 'CONTENT') {
    deny.add('/team');
    deny.add('/requisites');
    deny.add('/balance');
    deny.add('/finance-documents');
    deny.add('/integrations');
  }
  if (role === 'ACCOUNTANT') {
    deny.add('/events');
    deny.add('/availability');
    deny.add('/orders');
    deny.add('/reviews');
    deny.add('/notifications');
    deny.add('/team');
    deny.add('/requisites');
    deny.add('/settings');
    deny.add('/integrations');
  }

  for (const p of deny) {
    if (path === p || path.startsWith(`${p}/`)) return false;
  }
  return true;
}

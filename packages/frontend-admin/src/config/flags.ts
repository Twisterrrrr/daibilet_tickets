function envBool(name: string, defaultValue: boolean): boolean {
  const v = (import.meta as any).env?.[name];
  if (v === undefined) return defaultValue;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1';
}

export const flags = {
  legacyAdminEnabled: envBool('VITE_LEGACY_ADMIN_ENABLED', true),
  showCatalog: envBool('VITE_LEGACY_SHOW_CATALOG', true),
  showContent: envBool('VITE_LEGACY_SHOW_CONTENT', true),
  showEvents: envBool('VITE_LEGACY_SHOW_EVENTS', true),
  showOrders: envBool('VITE_LEGACY_SHOW_ORDERS', true),
  showOps: envBool('VITE_LEGACY_SHOW_OPS', true),
};


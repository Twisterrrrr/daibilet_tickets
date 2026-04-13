export type FeatureFlag =
  | 'SALES'
  | 'FINANCE'
  | 'REPORTS'
  | 'USERS'
  | 'MODERATION'
  | 'INTERNAL_EVENTS'
  | 'WHITE_LABEL'
  | 'SUPPORT_ADVANCED';

function envBool(name: string, defaultValue: boolean): boolean {
  const v = (import.meta as any).env?.[name];
  if (v === undefined) return defaultValue;
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1';
}

export const features: Record<FeatureFlag, boolean> = {
  SALES: envBool('VITE_ADMIN_V3_FEATURE_SALES', false),
  FINANCE: envBool('VITE_ADMIN_V3_FEATURE_FINANCE', false),
  REPORTS: envBool('VITE_ADMIN_V3_FEATURE_REPORTS', false),
  USERS: envBool('VITE_ADMIN_V3_FEATURE_USERS', false),
  MODERATION: envBool('VITE_ADMIN_V3_FEATURE_MODERATION', false),
  INTERNAL_EVENTS: envBool('VITE_ADMIN_V3_FEATURE_INTERNAL_EVENTS', false),
  WHITE_LABEL: envBool('VITE_ADMIN_V3_FEATURE_WHITE_LABEL', false),
  SUPPORT_ADVANCED: envBool('VITE_ADMIN_V3_FEATURE_SUPPORT_ADVANCED', false),
};

export function isFeatureEnabled(feature: FeatureFlag | null | undefined): boolean {
  if (!feature) return true;
  return Boolean(features[feature]);
}


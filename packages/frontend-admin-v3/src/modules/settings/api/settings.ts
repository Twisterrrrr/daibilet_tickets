import { adminApi } from '@/api/client';

export type SyncStatus = {
  lastSyncAt: string | null;
  events: { total: number; active: number };
  sessions: { total: number; active: number };
  ops: {
    lastFullSyncAt: string | null;
    lastIncrSyncAt: string | null;
    lastRetagAt: string | null;
    lastPopulateAt: string | null;
    lastCacheFlush: string | null;
    lastError: string | null;
  } | null;
};

export async function fetchAdminSyncStatus() {
  return adminApi.get<SyncStatus>('/admin/settings/sync-status');
}

export type OpsPostResult = { message?: string };

export async function postAdminSettingsOp(path: string, query?: Record<string, string>) {
  const q = query
    ? `?${new URLSearchParams(query).toString()}`
    : '';
  return adminApi.post<OpsPostResult>(`${path}${q}`);
}

export type PricingConfig = {
  id: string;
  serviceFeePercent: number;
  peakMarkupPercent: number;
  lastMinutePercent: number;
  tcCommissionPercent: number;
  peakRanges: unknown[];
};

export async function fetchAdminPricing() {
  return adminApi.get<PricingConfig>('/admin/settings/pricing');
}

export async function patchAdminPricing(data: Omit<PricingConfig, 'id'>) {
  return adminApi.patch<PricingConfig>('/admin/settings/pricing', data);
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminUsersListResponse = { items: AdminUserRow[] };

export async function fetchAdminUsers() {
  return adminApi.get<AdminUsersListResponse>('/admin/users');
}

export async function patchAdminUser(
  id: string,
  patch: { role?: AdminUserRow['role']; isActive?: boolean },
) {
  return adminApi.patch<AdminUserRow>(`/admin/users/${encodeURIComponent(id)}`, patch);
}

export type AuthMeResponse = { role?: string };

export async function fetchAuthMe() {
  return adminApi.get<AuthMeResponse>('/auth/me');
}

export type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
};

export type FeatureFlagsListResponse = { items: FeatureFlagRow[] };

export async function fetchAdminFeatureFlags() {
  return adminApi.get<FeatureFlagsListResponse>('/admin/feature-flags');
}

export async function patchAdminFeatureFlag(key: string, data: { enabled: boolean; description?: string }) {
  return adminApi.patch<FeatureFlagRow>(`/admin/feature-flags/${encodeURIComponent(key)}`, data);
}

export type SeoSettingsValue = {
  siteName?: string;
  defaultTitleSuffix?: string;
  defaultOgImageUrl?: string;
  twitterSite?: string;
  indexableDefault?: boolean;
};

export type SystemSettingsValue = {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  showAdminDebugBanner?: boolean;
};

export type AppSettingsResponse<T> = {
  key: string;
  value: T;
  updatedAt: string | null;
};

export async function fetchAdminSeoSettings() {
  return adminApi.get<AppSettingsResponse<SeoSettingsValue>>('/admin/settings/app/seo');
}

export async function patchAdminSeoSettings(value: SeoSettingsValue) {
  return adminApi.patch<AppSettingsResponse<SeoSettingsValue>>('/admin/settings/app/seo', { value });
}

export async function fetchAdminSystemSettings() {
  return adminApi.get<AppSettingsResponse<SystemSettingsValue>>('/admin/settings/app/system');
}

export async function patchAdminSystemSettings(value: SystemSettingsValue) {
  return adminApi.patch<AppSettingsResponse<SystemSettingsValue>>('/admin/settings/app/system', { value });
}


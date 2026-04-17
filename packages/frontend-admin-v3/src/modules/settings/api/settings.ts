import { adminApi } from '@/api/client';

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


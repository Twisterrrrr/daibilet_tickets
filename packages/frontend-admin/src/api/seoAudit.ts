import { adminApi } from './client';

export interface SeoIssueDto {
  code: string;
  severity: 'ERROR' | 'WARN' | 'INFO';
  message: string;
  field?: string;
  hint?: string;
  docsUrl?: string;
}

export interface SeoAuditEventRowDto {
  id: string;
  title: string;
  slug: string;
  cityName: string;
  source: string;
  isActive: boolean;
  updatedAt: string;
  priceFrom: number | null;
  imageUrl: string | null;
  rating: number | null;
  sessionsFutureCount: number;
  canonicalGroup?: {
    groupingKey: string | null;
    canonicalEventId: string | null;
    isCanonical: boolean;
  };
  issues: SeoIssueDto[];
  issueCounts: { ERROR: number; WARN: number; INFO: number; total: number };
}

export interface SeoAuditSummaryDto {
  totalEvents: number;
  eventsWithIssues: number;
  issuesTotal: number;
  issuesBySeverity: { ERROR: number; WARN: number; INFO: number };
}

export interface SeoAuditEventsResponse {
  items: SeoAuditEventRowDto[];
  total: number;
  page: number;
  pages: number;
  summary: SeoAuditSummaryDto;
}

export interface SeoAuditEventsParams {
  search?: string;
  cityId?: string;
  source?: string;
  isActive?: 'true' | 'false';
  hasFutureSessions?: 'true' | 'false';
  onlyIssues?: 'true' | 'false';
  page?: string;
  limit?: string;
}

export function getSeoAuditEvents(params: SeoAuditEventsParams = {}): Promise<SeoAuditEventsResponse> {
  const sp = new URLSearchParams();
  if (params.search) sp.set('search', params.search);
  if (params.cityId) sp.set('cityId', params.cityId);
  if (params.source?.trim()) sp.set('source', params.source);
  if (params.isActive) sp.set('isActive', params.isActive);
  if (params.hasFutureSessions) sp.set('hasFutureSessions', params.hasFutureSessions);
  if (params.onlyIssues !== undefined) sp.set('onlyIssues', params.onlyIssues);
  if (params.page) sp.set('page', params.page);
  if (params.limit) sp.set('limit', params.limit);

  const qs = sp.toString();
  return adminApi.get<SeoAuditEventsResponse>(`/admin/seo-audit/events${qs ? `?${qs}` : ''}`);
}

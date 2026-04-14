/**
 * SEO Audit types — on-the-fly (v1), prepare for persistence (v1.1).
 */

export const SEO_ISSUE_SEVERITY = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
} as const;

export type SeoIssueSeverity = (typeof SEO_ISSUE_SEVERITY)[keyof typeof SEO_ISSUE_SEVERITY];

export const SEO_ISSUE_CODES = {
  // Indexability / Page viability
  NO_FUTURE_SESSIONS_ACTIVE: 'NO_FUTURE_SESSIONS_ACTIVE',
  EVENT_UPDATED_TOO_OLD: 'EVENT_UPDATED_TOO_OLD',
  EVENT_NO_RATING: 'EVENT_NO_RATING',

  // Meta completeness / CTR
  META_TITLE_MISSING: 'META_TITLE_MISSING',
  META_DESC_MISSING: 'META_DESC_MISSING',
  META_TITLE_TOO_LONG: 'META_TITLE_TOO_LONG',
  META_TITLE_TOO_SHORT: 'META_TITLE_TOO_SHORT',
  META_DESC_TOO_LONG: 'META_DESC_TOO_LONG',
  META_DESC_TOO_SHORT: 'META_DESC_TOO_SHORT',
  TITLE_TOO_LONG: 'TITLE_TOO_LONG',
  TITLE_TOO_SHORT: 'TITLE_TOO_SHORT',
  DESC_MISSING: 'DESC_MISSING',
  DESC_TOO_SHORT: 'DESC_TOO_SHORT',

  // Slug / URL quality
  SLUG_MISSING: 'SLUG_MISSING',
  SLUG_INVALID: 'SLUG_INVALID',
  SLUG_TOO_LONG: 'SLUG_TOO_LONG',
  SLUG_DUPLICATE: 'SLUG_DUPLICATE',

  // Media quality
  IMAGE_MISSING: 'IMAGE_MISSING',
  IMAGE_NOT_HTTPS: 'IMAGE_NOT_HTTPS',
  IMAGE_SUSPECT_LOW_QUALITY: 'IMAGE_SUSPECT_LOW_QUALITY',

  // Structured data
  PRICE_MISSING: 'PRICE_MISSING',
  DURATION_MISSING: 'DURATION_MISSING',
  AGE_MISSING: 'AGE_MISSING',
  LOCATION_MISSING: 'LOCATION_MISSING',

  // Grouping / canonical
  GROUP_NOT_CANONICAL: 'GROUP_NOT_CANONICAL',
  GROUP_HAS_N_ITEMS: 'GROUP_HAS_N_ITEMS',
} as const;

export type SeoIssueCode = (typeof SEO_ISSUE_CODES)[keyof typeof SEO_ISSUE_CODES];

export interface SeoIssueDto {
  code: SeoIssueCode | string;
  severity: SeoIssueSeverity;
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
  updatedAt: Date;
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

export interface SeoAuditEventsResponseDto {
  items: SeoAuditEventRowDto[];
  total: number;
  page: number;
  pages: number;
  summary: SeoAuditSummaryDto;
}

// ─── Cities / Venues audit (Gate 3) ─────────────────────────────────────────

export interface SeoAuditCityRowDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: Date;
  issues: SeoIssueDto[];
  issueCounts: { ERROR: number; WARN: number; INFO: number; total: number };
}

export interface SeoAuditVenueRowDto {
  id: string;
  slug: string;
  title: string;
  cityName: string;
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: Date;
  issues: SeoIssueDto[];
  issueCounts: { ERROR: number; WARN: number; INFO: number; total: number };
}

export interface SeoAuditEntitySummaryDto {
  total: number;
  withIssues: number;
  issuesTotal: number;
  issuesBySeverity: { ERROR: number; WARN: number; INFO: number };
}

export interface SeoAuditCitiesResponseDto {
  items: SeoAuditCityRowDto[];
  total: number;
  page: number;
  pages: number;
  summary: SeoAuditEntitySummaryDto;
}

export interface SeoAuditVenuesResponseDto {
  items: SeoAuditVenueRowDto[];
  total: number;
  page: number;
  pages: number;
  summary: SeoAuditEntitySummaryDto;
}

// ─── Unified (soft) read-model ───────────────────────────────────────────────

export type UnifiedSeoEntityType = 'EVENT' | 'VENUE' | 'CITY';

export type UnifiedSeoSeverity = 'ERROR' | 'WARN' | 'INFO';

export interface UnifiedSeoIssueListItemDto {
  entityType: UnifiedSeoEntityType;
  entityId: string;
  entityTitle: string;
  entitySlug?: string | null;
  cityName?: string | null;

  issueCode: string;
  severity: UnifiedSeoSeverity;
  message: string;

  updatedAt?: Date | null;
  targetUrl?: string | null;
}

export interface UnifiedSeoAuditSummaryDto {
  totals: { issues: number; errors: number; warnings: number; info: number };
  byEntityType: Array<{ entityType: UnifiedSeoEntityType; total: number; errors: number; warnings: number; info: number }>;
  byIssueCode: Array<{ issueCode: string; total: number }>;
}

export interface UnifiedSeoAuditIssuesResponseDto {
  items: UnifiedSeoIssueListItemDto[];
  total: number;
  page: number;
  pages: number;
}

export interface UnifiedSeoAuditEntityIssuesResponseDto {
  entityType: UnifiedSeoEntityType;
  entityId: string;
  issues: UnifiedSeoIssueListItemDto[];
}

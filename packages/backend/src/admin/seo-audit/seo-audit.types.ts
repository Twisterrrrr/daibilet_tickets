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

/**
 * Minimal SEO audit rules for content entities (ARTICLE / LANDING / COLLECTION).
 * Goals: cheap, deterministic, explainable.
 */

import type { UnifiedSeoSeverity } from './seo-audit.types';

export type ContentSeoIssue = { code: string; severity: UnifiedSeoSeverity; message: string };

const hasText = (s: string | null | undefined): boolean => Boolean(s && s.trim().length > 0);

export function runArticleRules(input: {
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  metaTitle: string | null;
  metaDescription: string | null;
}): ContentSeoIssue[] {
  const issues: ContentSeoIssue[] = [];
  const metaTitleOk = hasText(input.metaTitle);
  const metaDescOk = hasText(input.metaDescription);

  if (!metaTitleOk) issues.push({ code: 'META_TITLE_MISSING', severity: 'WARN', message: 'Meta title не задан' });
  if (!metaDescOk) issues.push({ code: 'META_DESC_MISSING', severity: 'WARN', message: 'Meta description не задана' });

  if (input.status === 'PUBLISHED' && (!metaTitleOk || !metaDescOk)) {
    issues.push({ code: 'PUBLISHED_WITHOUT_SEO', severity: 'ERROR', message: 'Статья опубликована без заполненных SEO полей' });
  }

  return issues;
}

export function runLandingRules(input: {
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  metaTitle: string | null;
  metaDescription: string | null;
  filterTagId: string | null;
}): ContentSeoIssue[] {
  const issues: ContentSeoIssue[] = [];
  const metaTitleOk = hasText(input.metaTitle);
  const metaDescOk = hasText(input.metaDescription);

  if (!metaTitleOk) issues.push({ code: 'META_TITLE_MISSING', severity: 'WARN', message: 'Meta title не задан' });
  if (!metaDescOk) issues.push({ code: 'META_DESC_MISSING', severity: 'WARN', message: 'Meta description не задана' });

  if (!input.filterTagId) {
    issues.push({ code: 'FILTER_TAG_MISSING', severity: 'WARN', message: 'Не задан основной filter tag (filterTagId)' });
  }

  if (input.status === 'ACTIVE' && (!metaTitleOk || !metaDescOk)) {
    issues.push({ code: 'PUBLISHED_WITHOUT_SEO', severity: 'ERROR', message: 'Лендинг опубликован без заполненных SEO полей' });
  }

  return issues;
}

export function runCollectionRules(input: {
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  tagFiltersCount: number;
  legacyFilterTagsCount: number;
}): ContentSeoIssue[] {
  const issues: ContentSeoIssue[] = [];
  const metaTitleOk = hasText(input.metaTitle);
  const metaDescOk = hasText(input.metaDescription);

  if (!metaTitleOk) issues.push({ code: 'META_TITLE_MISSING', severity: 'WARN', message: 'Meta title не задан' });
  if (!metaDescOk) issues.push({ code: 'META_DESC_MISSING', severity: 'WARN', message: 'Meta description не задана' });

  const hasAnyTagFilters = input.tagFiltersCount > 0 || input.legacyFilterTagsCount > 0;
  if (!hasAnyTagFilters) {
    issues.push({ code: 'TAG_FILTERS_MISSING', severity: 'WARN', message: 'Не настроены tag filters (tagFilters/filterTags пусты)' });
  }

  if (String(input.status).toUpperCase() === 'ACTIVE' && (!metaTitleOk || !metaDescOk)) {
    issues.push({ code: 'PUBLISHED_WITHOUT_SEO', severity: 'ERROR', message: 'Подборка опубликована без заполненных SEO полей' });
  }

  return issues;
}


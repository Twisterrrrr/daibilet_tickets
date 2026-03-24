/**
 * SEO audit rules для City и Venue (Gate 3).
 */

import type { SeoIssueDto } from './seo-audit.types';

const DESC_MIN = 100;
const META_TITLE_MIN = 20;
const META_TITLE_MAX = 60;
const META_DESC_MIN = 50;
const META_DESC_MAX = 160;

export function runCityRules(e: {
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}): SeoIssueDto[] {
  const issues: SeoIssueDto[] = [];
  const desc = e.description?.trim() || null;
  const metaTitle = e.metaTitle?.trim() || null;
  const metaDesc = e.metaDescription?.trim() || null;

  if (!desc || desc.length < DESC_MIN) {
    issues.push({
      code: 'DESC_MISSING_OR_SHORT',
      severity: 'ERROR',
      message: `Описание города отсутствует или слишком короткое (мин. ${DESC_MIN} символов)`,
      field: 'description',
    });
  }
  if (!metaTitle) {
    issues.push({
      code: 'META_TITLE_MISSING',
      severity: 'WARN',
      message: 'Meta title не задан',
      field: 'metaTitle',
    });
  } else if (metaTitle.length < META_TITLE_MIN) {
    issues.push({
      code: 'META_TITLE_TOO_SHORT',
      severity: 'WARN',
      message: `Meta title слишком короткий (мин. ${META_TITLE_MIN})`,
      field: 'metaTitle',
    });
  } else if (metaTitle.length > META_TITLE_MAX) {
    issues.push({
      code: 'META_TITLE_TOO_LONG',
      severity: 'INFO',
      message: `Meta title слишком длинный (рекоменд. до ${META_TITLE_MAX})`,
      field: 'metaTitle',
    });
  }
  if (!metaDesc) {
    issues.push({
      code: 'META_DESC_MISSING',
      severity: 'WARN',
      message: 'Meta description не задана',
      field: 'metaDescription',
    });
  } else if (metaDesc.length < META_DESC_MIN) {
    issues.push({
      code: 'META_DESC_TOO_SHORT',
      severity: 'WARN',
      message: `Meta description слишком короткая (мин. ${META_DESC_MIN})`,
      field: 'metaDescription',
    });
  } else if (metaDesc.length > META_DESC_MAX) {
    issues.push({
      code: 'META_DESC_TOO_LONG',
      severity: 'INFO',
      message: `Meta description слишком длинная (рекоменд. до ${META_DESC_MAX})`,
      field: 'metaDescription',
    });
  }
  return issues;
}

export function runVenueRules(e: {
  description: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
}): SeoIssueDto[] {
  const issues: SeoIssueDto[] = [];
  const desc = e.description?.trim() || null;
  const metaTitle = e.metaTitle?.trim() || null;
  const metaDesc = e.metaDescription?.trim() || null;

  if (!desc || desc.length < DESC_MIN) {
    issues.push({
      code: 'DESC_MISSING_OR_SHORT',
      severity: 'ERROR',
      message: `Описание площадки отсутствует или слишком короткое (мин. ${DESC_MIN} символов)`,
      field: 'description',
    });
  }
  if (!metaTitle) {
    issues.push({
      code: 'META_TITLE_MISSING',
      severity: 'WARN',
      message: 'Meta title не задан',
      field: 'metaTitle',
    });
  } else if (metaTitle.length < META_TITLE_MIN) {
    issues.push({
      code: 'META_TITLE_TOO_SHORT',
      severity: 'WARN',
      message: `Meta title слишком короткий (мин. ${META_TITLE_MIN})`,
      field: 'metaTitle',
    });
  } else if (metaTitle.length > META_TITLE_MAX) {
    issues.push({
      code: 'META_TITLE_TOO_LONG',
      severity: 'INFO',
      message: `Meta title слишком длинный (рекоменд. до ${META_TITLE_MAX})`,
      field: 'metaTitle',
    });
  }
  if (!metaDesc) {
    issues.push({
      code: 'META_DESC_MISSING',
      severity: 'WARN',
      message: 'Meta description не задана',
      field: 'metaDescription',
    });
  } else if (metaDesc.length < META_DESC_MIN) {
    issues.push({
      code: 'META_DESC_TOO_SHORT',
      severity: 'WARN',
      message: `Meta description слишком короткая (мин. ${META_DESC_MIN})`,
      field: 'metaDescription',
    });
  } else if (metaDesc.length > META_DESC_MAX) {
    issues.push({
      code: 'META_DESC_TOO_LONG',
      severity: 'INFO',
      message: `Meta description слишком длинная (рекоменд. до ${META_DESC_MAX})`,
      field: 'metaDescription',
    });
  }
  return issues;
}

function countIssues(issues: SeoIssueDto[]): {
  ERROR: number;
  WARN: number;
  INFO: number;
  total: number;
} {
  let ERROR = 0,
    WARN = 0,
    INFO = 0;
  for (const i of issues) {
    if (i.severity === 'ERROR') ERROR++;
    else if (i.severity === 'WARN') WARN++;
    else INFO++;
  }
  return { ERROR, WARN, INFO, total: issues.length };
}

export { countIssues as countEntityIssues };

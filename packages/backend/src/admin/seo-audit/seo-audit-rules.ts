/**
 * SEO Audit rules — pure functions over event + context.
 * Each rule returns 0..N issues.
 */

import {
  SeoIssueCode,
  SeoIssueDto,
  SeoIssueSeverity,
  SEO_ISSUE_SEVERITY,
} from './seo-audit.types';

/** Input for rule evaluation. */
export interface SeoAuditEventInput {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  imageUrl: string | null;
  priceFrom: number | null;
  rating: number | null;
  durationMinutes: number | null;
  minAge: number | null;
  groupingKey: string | null;
  canonicalOfId: string | null;
  cityId: string | null;
  cityName: string | null;
  source: string;
  isActive: boolean;
  updatedAt: Date;
}

export interface SeoAuditContext {
  sessionsFutureCount: number;
  dupSlugCount: number;
  canonicalEventId: string | null;
  groupingCount: number;
}

const META_TITLE_MAX = 70;
const META_TITLE_MIN = 25;
const META_DESC_MAX = 160;
const META_DESC_MIN = 90;
const TITLE_MAX = 70;
const TITLE_MIN = 12;
const DESC_MIN = 120;
const SLUG_MAX = 80;
const UPDATED_DAYS_OLD = 180;

function mk(
  code: SeoIssueCode | string,
  severity: SeoIssueSeverity,
  message: string,
  opts?: { field?: string; hint?: string; docsUrl?: string },
): SeoIssueDto {
  return { code, severity, message, ...opts };
}

/** A) Indexability / Page viability */
export function ruleIndexability(
  e: SeoAuditEventInput,
  ctx: SeoAuditContext,
): SeoIssueDto[] {
  const issues: SeoIssueDto[] = [];

  if (e.isActive && ctx.sessionsFutureCount === 0) {
    issues.push(
      mk(
        'NO_FUTURE_SESSIONS_ACTIVE',
        SEO_ISSUE_SEVERITY.ERROR,
        'Нет будущих активных сеансов — страница не продаёт и будет плохо ранжироваться.',
        { hint: 'Добавьте сеансы или отключите событие.' },
      ),
    );
  }

  if (e.isActive) {
    const daysSince = (Date.now() - e.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > UPDATED_DAYS_OLD) {
      issues.push(
        mk(
          'EVENT_UPDATED_TOO_OLD',
          SEO_ISSUE_SEVERITY.WARN,
          `Событие не обновлялось ${Math.floor(daysSince)} дней.`,
          { hint: 'Обновите контент для лучшего ранжирования.' },
        ),
      );
    }
  }

  if ((e.rating == null || e.rating === 0) && e.isActive) {
    issues.push(
      mk(
        'EVENT_NO_RATING',
        SEO_ISSUE_SEVERITY.INFO,
        'Нет рейтинга — отзывы помогают конверсии.',
        { hint: 'Добавьте отзывы или внешний рейтинг.' },
      ),
    );
  }

  return issues;
}

/** B) Meta completeness / CTR — fallback to title/description if no meta fields */
export function ruleMetaCompleteness(e: SeoAuditEventInput): SeoIssueDto[] {
  const issues: SeoIssueDto[] = [];
  const metaTitle = e.metaTitle?.trim() || null;
  const metaDesc = e.metaDescription?.trim() || null;

  if (metaTitle != null || metaDesc != null) {
    if (!metaTitle || metaTitle.length === 0) {
      issues.push(
        mk(
          'META_TITLE_MISSING',
          SEO_ISSUE_SEVERITY.ERROR,
          'Meta Title отсутствует.',
          { field: 'metaTitle', hint: 'Заполните meta title для поисковиков (25–70 символов).' },
        ),
      );
    } else {
      if (metaTitle.length > META_TITLE_MAX) {
        issues.push(
          mk(
            'META_TITLE_TOO_LONG',
            SEO_ISSUE_SEVERITY.WARN,
            `Meta Title слишком длинный (${metaTitle.length} > ${META_TITLE_MAX}).`,
            { field: 'metaTitle', hint: 'Сократите до 70 символов.' },
          ),
        );
      }
      if (metaTitle.length < META_TITLE_MIN) {
        issues.push(
          mk(
            'META_TITLE_TOO_SHORT',
            SEO_ISSUE_SEVERITY.WARN,
            `Meta Title слишком короткий (${metaTitle.length} < ${META_TITLE_MIN}).`,
            { field: 'metaTitle', hint: 'Расширьте до 25–70 символов.' },
          ),
        );
      }
    }

    if (!metaDesc || metaDesc.length === 0) {
      issues.push(
        mk(
          'META_DESC_MISSING',
          SEO_ISSUE_SEVERITY.ERROR,
          'Meta Description отсутствует.',
          { field: 'metaDescription', hint: 'Заполните meta description (90–160 символов).' },
        ),
      );
    } else {
      if (metaDesc.length > META_DESC_MAX) {
        issues.push(
          mk(
            'META_DESC_TOO_LONG',
            SEO_ISSUE_SEVERITY.WARN,
            `Meta Description слишком длинная (${metaDesc.length} > ${META_DESC_MAX}).`,
            { field: 'metaDescription', hint: 'Сократите до 160 символов.' },
          ),
        );
      }
      if (metaDesc.length < META_DESC_MIN) {
        issues.push(
          mk(
            'META_DESC_TOO_SHORT',
            SEO_ISSUE_SEVERITY.WARN,
            `Meta Description слишком короткая (${metaDesc.length} < ${META_DESC_MIN}).`,
            { field: 'metaDescription', hint: 'Расширьте до 90–160 символов.' },
          ),
        );
      }
    }
  } else {
    const title = e.title?.trim() || '';
    const desc = e.description?.trim() || e.shortDescription?.trim() || '';

    if (title.length > TITLE_MAX) {
      issues.push(
        mk(
          'TITLE_TOO_LONG',
          SEO_ISSUE_SEVERITY.WARN,
          `Заголовок слишком длинный (${title.length} > ${TITLE_MAX}).`,
          { field: 'title', hint: 'Сократите или добавьте meta title.' },
        ),
      );
    }
    if (title.length > 0 && title.length < TITLE_MIN) {
      issues.push(
        mk(
          'TITLE_TOO_SHORT',
          SEO_ISSUE_SEVERITY.WARN,
          `Заголовок слишком короткий (${title.length} < ${TITLE_MIN}).`,
          { field: 'title', hint: 'Расширьте до 12+ символов.' },
        ),
      );
    }
    if (desc.length === 0) {
      issues.push(
        mk(
          'DESC_MISSING',
          SEO_ISSUE_SEVERITY.WARN,
          'Описание отсутствует.',
          { field: 'description', hint: 'Добавьте описание для SEO.' },
        ),
      );
    } else if (desc.length < DESC_MIN) {
      issues.push(
        mk(
          'DESC_TOO_SHORT',
          SEO_ISSUE_SEVERITY.WARN,
          `Описание слишком короткое (${desc.length} < ${DESC_MIN}).`,
          { field: 'description', hint: 'Расширьте до 120+ символов.' },
        ),
      );
    }
  }

  return issues;
}

/** C) Slug / URL quality */
export function ruleSlug(e: SeoAuditEventInput, ctx: SeoAuditContext): SeoIssueDto[] {
  const issues: SeoIssueDto[] = [];

  if (!e.slug || e.slug.trim().length === 0) {
    issues.push(
      mk('SLUG_MISSING', SEO_ISSUE_SEVERITY.ERROR, 'Slug отсутствует.', {
        field: 'slug',
        hint: 'Заполните slug (латиница, дефисы).',
      }),
    );
  } else {
    if (/[\sA-Z]/.test(e.slug)) {
      issues.push(
        mk(
          'SLUG_INVALID',
          SEO_ISSUE_SEVERITY.ERROR,
          'Slug содержит пробелы или заглавные буквы.',
          { field: 'slug', hint: 'Используйте только строчные латинские буквы и дефисы.' },
        ),
      );
    }
    if (e.slug.length > SLUG_MAX) {
      issues.push(
        mk(
          'SLUG_TOO_LONG',
          SEO_ISSUE_SEVERITY.WARN,
          `Slug слишком длинный (${e.slug.length} > ${SLUG_MAX}).`,
          { field: 'slug', hint: 'Сократите до 80 символов.' },
        ),
      );
    }
    if (ctx.dupSlugCount > 1) {
      issues.push(
        mk(
          'SLUG_DUPLICATE',
          SEO_ISSUE_SEVERITY.WARN,
          'Slug дублируется у нескольких событий.',
          { field: 'slug', hint: 'Уникализируйте slug.' },
        ),
      );
    }
  }

  return issues;
}

/** D) Media quality */
export function ruleMedia(e: SeoAuditEventInput): SeoIssueDto[] {
  const issues: SeoIssueDto[] = [];
  const img = e.imageUrl?.trim() || null;

  if (!img) {
    issues.push(
      mk(
        'IMAGE_MISSING',
        SEO_ISSUE_SEVERITY.ERROR,
        'Главное изображение отсутствует.',
        { field: 'imageUrl', hint: 'Загрузите обложку события.' },
      ),
    );
  } else {
    if (img.startsWith('http://')) {
      issues.push(
        mk(
          'IMAGE_NOT_HTTPS',
          SEO_ISSUE_SEVERITY.WARN,
          'Изображение загружается по HTTP.',
          { field: 'imageUrl', hint: 'Используйте HTTPS.' },
        ),
      );
    }
    const lower = img.toLowerCase();
    if (lower.includes('thumb') || lower.includes('small')) {
      issues.push(
        mk(
          'IMAGE_SUSPECT_LOW_QUALITY',
          SEO_ISSUE_SEVERITY.INFO,
          'Возможно, используется миниатюра вместо полноразмерного изображения.',
          { field: 'imageUrl', hint: 'Проверьте качество обложки.' },
        ),
      );
    }
  }

  return issues;
}

/** E) Structured data readiness */
export function ruleStructuredData(e: SeoAuditEventInput): SeoIssueDto[] {
  const issues: SeoIssueDto[] = [];

  if (e.isActive && (e.priceFrom == null || e.priceFrom === 0)) {
    issues.push(
      mk(
        'PRICE_MISSING',
        SEO_ISSUE_SEVERITY.ERROR,
        'Цена отсутствует у активного события.',
        { field: 'priceFrom', hint: 'Укажите цену от (в копейках).' },
      ),
    );
  }

  if (e.durationMinutes == null || e.durationMinutes === 0) {
    issues.push(
      mk(
        'DURATION_MISSING',
        SEO_ISSUE_SEVERITY.INFO,
        'Длительность не указана.',
        { field: 'durationMinutes', hint: 'Укажите длительность в минутах.' },
      ),
    );
  }

  if (e.minAge == null) {
    issues.push(
      mk(
        'AGE_MISSING',
        SEO_ISSUE_SEVERITY.INFO,
        'Возрастные ограничения не указаны.',
        { field: 'minAge', hint: 'Укажите мин. возраст (0 если нет ограничений).' },
      ),
    );
  }

  if (!e.cityId || !e.cityName) {
    issues.push(
      mk(
        'LOCATION_MISSING',
        SEO_ISSUE_SEVERITY.WARN,
        'Город не указан.',
        { field: 'cityId', hint: 'Привяжите событие к городу.' },
      ),
    );
  }

  return issues;
}

/** F) Grouping / canonical duplicates */
export function ruleGrouping(
  e: SeoAuditEventInput,
  ctx: SeoAuditContext,
): SeoIssueDto[] {
  const issues: SeoIssueDto[] = [];

  if (e.groupingKey) {
    if (ctx.canonicalEventId && ctx.canonicalEventId !== e.id) {
      issues.push(
        mk(
          'GROUP_NOT_CANONICAL',
          SEO_ISSUE_SEVERITY.WARN,
          'Событие не является каноническим в группе.',
          { hint: 'Главная страница — событие с минимальным createdAt в группе.' },
        ),
      );
    }
    if (ctx.groupingCount > 1) {
      issues.push(
        mk(
          'GROUP_HAS_N_ITEMS',
          SEO_ISSUE_SEVERITY.INFO,
          `В группе ${ctx.groupingCount} событий.`,
          { hint: 'Проверьте, что каноническая страница настроена.' },
        ),
      );
    }
  }

  return issues;
}

/** Run all rules and merge results. */
export function runAllRules(
  e: SeoAuditEventInput,
  ctx: SeoAuditContext,
): SeoIssueDto[] {
  return [
    ...ruleIndexability(e, ctx),
    ...ruleMetaCompleteness(e),
    ...ruleSlug(e, ctx),
    ...ruleMedia(e),
    ...ruleStructuredData(e),
    ...ruleGrouping(e, ctx),
  ];
}

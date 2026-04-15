import type { Prisma } from '@/prisma-client';

/** Готовность города к SEO-хабу и публичной странице (эвристика, без изменения Prisma). */
export type CityAdminReadinessStatus = 'READY' | 'NEEDS_WORK' | 'BLOCKED';

export type CityAdminReadinessDto = {
  status: CityAdminReadinessStatus;
  /** 0..100 */
  score: number;
  blockers: string[];
  warnings: string[];
  /** До 3 коротких подсказок для строки списка */
  keySignals: string[];
};

export type CityAdminReadinessInput = {
  isActive: boolean;
  name: string;
  slug: string;
  description: string | null | undefined;
  heroImage: string | null | undefined;
  metaTitle: string | null | undefined;
  metaDescription: string | null | undefined;
  eventsCount: number;
  activeEventsCount: number;
  futureEventsCount: number;
  venuesCount: number;
  activeVenuesCount: number;
  landingPagesCount: number;
  activeLandingsCount: number;
  comboPagesCount: number;
  collectionsCount: number;
  hasRegionLink: boolean;
};

const trim = (s: string | null | undefined): string | null => {
  if (s === null || s === undefined) return null;
  const x = s.trim();
  return x.length > 0 ? x : null;
};

/**
 * SQL/Prisma-аппроксимация «READY» для фильтра списка (согласована с {@link computeCityAdminReadiness}).
 */
export function cityReadyWhereApprox(): Prisma.CityWhereInput {
  return {
    AND: [
      { description: { not: null } },
      { NOT: { description: '' } },
      { metaTitle: { not: null } },
      { NOT: { metaTitle: '' } },
      { metaDescription: { not: null } },
      { NOT: { metaDescription: '' } },
      { heroImage: { not: null } },
      { NOT: { heroImage: '' } },
      {
        OR: [
          { events: { some: { isDeleted: false, isActive: true } } },
          {
            venues: {
              some: { isDeleted: false, isActive: true, lifecycleStatus: 'ACTIVE' },
            },
          },
          {
            landingPages: {
              some: { isDeleted: false, isActive: true, status: 'ACTIVE' },
            },
          },
        ],
      },
    ],
  };
}

export function cityReadinessListWhere(status: CityAdminReadinessStatus): Prisma.CityWhereInput {
  if (status === 'BLOCKED') {
    return { isActive: false };
  }
  const ready = cityReadyWhereApprox();
  if (status === 'READY') {
    return { isActive: true, ...ready };
  }
  // NEEDS_WORK: активен, но не попадает в аппроксимацию READY
  return {
    isActive: true,
    NOT: ready,
  };
}

export function computeCityAdminReadiness(input: CityAdminReadinessInput): CityAdminReadinessDto {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const keySignals: string[] = [];

  if (!input.isActive) {
    blockers.push('Город скрыт (неактивен)');
    return {
      status: 'BLOCKED',
      score: 0,
      blockers,
      warnings,
      keySignals: ['Неактивен'],
    };
  }

  let score = 100;

  const nameOk = Boolean(trim(input.name));
  const slugOk = Boolean(trim(input.slug));
  if (!nameOk) {
    blockers.push('Нет названия');
    score -= 40;
    keySignals.push('Нет названия');
  }
  if (!slugOk) {
    blockers.push('Нет slug');
    score -= 40;
    keySignals.push('Нет slug');
  }

  if (blockers.length) {
    return {
      status: 'BLOCKED',
      score: Math.max(0, score),
      blockers,
      warnings,
      keySignals: keySignals.slice(0, 3),
    };
  }

  const descOk = Boolean(trim(input.description));
  if (!descOk) {
    warnings.push('Нет описания / SEO-текста');
    score -= 15;
    if (keySignals.length < 3) keySignals.push('Нет описания');
  }

  const mt = trim(input.metaTitle);
  const md = trim(input.metaDescription);
  const seoOk = Boolean(mt && md);
  if (!seoOk) {
    warnings.push('Нет meta title / description');
    score -= 15;
    if (keySignals.length < 3) keySignals.push('Нет SEO meta');
  }

  const coverOk = Boolean(trim(input.heroImage));
  if (!coverOk) {
    warnings.push('Нет обложки (hero)');
    score -= 10;
    if (keySignals.length < 3) keySignals.push('Нет обложки');
  }

  if (!input.hasRegionLink) {
    warnings.push('Нет привязки к региону');
    score -= 5;
  }

  const catalogSignal =
    input.eventsCount > 0 ||
    input.venuesCount > 0 ||
    input.landingPagesCount > 0 ||
    input.collectionsCount > 0;
  if (!catalogSignal) {
    warnings.push('Пустой каталог: нет событий, площадок, лендингов и подборок');
    score -= 20;
    if (keySignals.length < 3) keySignals.push('Нет связей с каталогом');
  } else {
    if (input.activeEventsCount === 0 && input.futureEventsCount === 0 && input.eventsCount > 0) {
      warnings.push('Нет активных / будущих событий по данным каталога');
      score -= 5;
    }
    if (input.activeVenuesCount === 0 && input.venuesCount > 0) {
      warnings.push('Нет активных площадок (по жизненному циклу)');
      score -= 5;
    }
    if (input.activeLandingsCount === 0 && input.landingPagesCount > 0) {
      warnings.push('Нет опубликованных (ACTIVE) лендингов');
      score -= 5;
    }
  }

  const status: CityAdminReadinessStatus =
    score >= 78 && warnings.length === 0 ? 'READY' : 'NEEDS_WORK';

  return {
    status,
    score: Math.max(0, Math.min(100, score)),
    blockers,
    warnings,
    keySignals: keySignals.slice(0, 3),
  };
}

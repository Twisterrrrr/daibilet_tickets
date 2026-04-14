import { VenueLifecycleStatus } from '@/prisma-client';

import { PrismaService } from '../prisma/prisma.service';

/** Агрегат готовности площадки для админ list/detail (без изменения Prisma). */
export type VenueAdminReadinessStatus = 'READY' | 'NEEDS_WORK' | 'NEEDS_REVIEW' | 'BLOCKED';

export type VenueAdminReadinessDto = {
  status: VenueAdminReadinessStatus;
  /** 0..100, эвристика для UI */
  score: number;
  blockers: string[];
  warnings: string[];
  moderationSignals: string[];
  /** До 3 коротких подсказок для строки списка */
  keySignals: string[];
};

export type VenueAdminReadinessInput = {
  lifecycleStatus: VenueLifecycleStatus;
  needsReview: boolean;
  confidenceScore: number | null;
  mergeTargetId: string | null;
  title: string;
  /** Уже разрешённый адрес для отображения (address → raw → normalized) */
  displayAddress: string | null;
  imageUrl: string | null;
  shortDescription: string | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  isVenuePageWhitelisted: boolean;
  /** Учитывается в предупреждении про SEO whitelist при опубликованной площадке */
  isPublished: boolean;
};

const trim = (s: string | null | undefined): string | null => {
  if (s === null || s === undefined) return null;
  const x = s.trim();
  return x.length > 0 ? x : null;
};

/** Для списка: канонический адрес → сырой → нормализованный */
export function venueDisplayAddress(v: {
  address: string | null;
  rawAddress: string | null;
  normalizedAddress: string | null;
}): string | null {
  return trim(v.address) ?? trim(v.rawAddress) ?? trim(v.normalizedAddress);
}

const CONFIDENCE_LOW = 0.45;

/**
 * Вычисляет готовность площадки к работе в каталоге и публичной SEO-странице (эвристика).
 * Не дублирует полный publish-gate по подкатегориям — для этого есть validateVenueForPublish.
 */
export function computeVenueAdminReadiness(input: VenueAdminReadinessInput): VenueAdminReadinessDto {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const moderationSignals: string[] = [];
  const keySignals: string[] = [];

  const { lifecycleStatus } = input;
  if (lifecycleStatus === 'MERGED' || lifecycleStatus === 'REJECTED') {
    blockers.push(
      lifecycleStatus === 'MERGED'
        ? 'Площадка объединена с другой записью'
        : 'Площадка отклонена',
    );
    return {
      status: 'BLOCKED',
      score: 0,
      blockers,
      warnings,
      moderationSignals,
      keySignals: [blockers[0]!],
    };
  }

  let score = 100;

  const titleOk = Boolean(trim(input.title));
  if (!titleOk) {
    blockers.push('Нет названия');
    score -= 25;
    keySignals.push('Нет названия');
  }

  const addrOk = Boolean(trim(input.displayAddress));
  if (!addrOk) {
    blockers.push('Нет адреса / локации');
    score -= 20;
    keySignals.push('Нет адреса');
  }

  const coordsOk = input.lat != null && input.lng != null;
  if (!coordsOk && addrOk) {
    warnings.push('Нет координат на карте');
    score -= 5;
  }

  const hasCover = Boolean(trim(input.imageUrl));
  if (!hasCover) {
    warnings.push('Нет обложки');
    score -= 10;
    if (keySignals.length < 3) keySignals.push('Нет обложки');
  }

  const descOk =
    Boolean(trim(input.shortDescription)) || Boolean(trim(input.description));
  if (!descOk) {
    warnings.push('Нет описания');
    score -= 10;
    if (keySignals.length < 3) keySignals.push('Нет описания');
  }

  if (input.needsReview) {
    moderationSignals.push('Требуется ручная проверка');
    score -= 15;
    if (keySignals.length < 3) keySignals.push('Требуется проверка');
  }

  if (input.mergeTargetId) {
    moderationSignals.push('Указана цель объединения (подозрение на дубль)');
    score -= 10;
    if (keySignals.length < 3) keySignals.push('Есть merge target');
  }

  if (input.confidenceScore != null && input.confidenceScore < CONFIDENCE_LOW) {
    moderationSignals.push('Низкая уверенность импорта');
    score -= 10;
    if (keySignals.length < 3) keySignals.push('Низкая уверенность');
  }

  if (lifecycleStatus === 'ACTIVE' && input.isPublished && !input.isVenuePageWhitelisted) {
    warnings.push('Страница площадки не в whitelist SEO');
    score -= 5;
    if (keySignals.length < 3) keySignals.push('SEO whitelist выкл.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status: VenueAdminReadinessStatus;
  if (input.needsReview) {
    status = 'NEEDS_REVIEW';
  } else if (blockers.length > 0 || score < 50) {
    status = 'NEEDS_WORK';
  } else if (warnings.length > 0 || moderationSignals.length > 0 || score < 80) {
    status = 'NEEDS_WORK';
  } else {
    status = 'READY';
  }

  if (input.needsReview && status === 'NEEDS_WORK' && blockers.length === 0) {
    status = 'NEEDS_REVIEW';
  }

  return {
    status,
    score,
    blockers,
    warnings,
    moderationSignals,
    keySignals: keySignals.slice(0, 3),
  };
}

/** Счётчики событий по площадкам для одной страницы списка (без N+1 по строкам). */
export async function loadVenueListEventStats(
  prisma: PrismaService,
  venueIds: string[],
): Promise<{
  activeEventsByVenue: Map<string, number>;
  futureEventsByVenue: Map<string, number>;
}> {
  const activeEventsByVenue = new Map<string, number>();
  const futureEventsByVenue = new Map<string, number>();
  if (venueIds.length === 0) {
    return { activeEventsByVenue, futureEventsByVenue };
  }

  const activeRows = await prisma.event.groupBy({
    by: ['venueId'],
    where: {
      venueId: { in: venueIds },
      isDeleted: false,
      isActive: true,
    },
    _count: { _all: true },
  });
  for (const row of activeRows) {
    if (row.venueId) activeEventsByVenue.set(row.venueId, row._count._all);
  }

  const evList = await prisma.event.findMany({
    where: {
      venueId: { in: venueIds },
      isDeleted: false,
      isActive: true,
    },
    select: { id: true, venueId: true },
  });
  const eventIds = evList.map((e) => e.id);
  const eventToVenue = new Map(evList.map((e) => [e.id, e.venueId!]));
  if (eventIds.length === 0) {
    return { activeEventsByVenue, futureEventsByVenue };
  }

  const now = new Date();
  const futureGrouped = await prisma.eventSession.groupBy({
    by: ['eventId'],
    where: {
      eventId: { in: eventIds },
      isActive: true,
      canceledAt: null,
      startsAt: { gt: now },
    },
    _count: { _all: true },
  });
  const futureEventIds = new Set(futureGrouped.map((g) => g.eventId));
  for (const eid of futureEventIds) {
    const vid = eventToVenue.get(eid);
    if (!vid) continue;
    futureEventsByVenue.set(vid, (futureEventsByVenue.get(vid) ?? 0) + 1);
  }

  return { activeEventsByVenue, futureEventsByVenue };
}

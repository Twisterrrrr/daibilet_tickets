import { Injectable } from '@nestjs/common';
import type { Event } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { computeEffectiveTrustScore } from '../supplier/supplier-trust.service';

export interface HealthIssue {
  code: string;
  message: string;
  field?: string;
  eventId?: string;
  /** Ссылка «Исправить» в ЛК поставщика */
  actionUrl?: string;
}

export interface EventHealth {
  eventId: string;
  title: string;
  score: number;
  issues: HealthIssue[];
}

export interface ListingHealthResult {
  score: number;
  issues: HealthIssue[];
  recommendations: string[];
  byEvent: EventHealth[];
}

@Injectable()
export class ListingHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async computeForOperator(operatorId: string): Promise<ListingHealthResult> {
    const operatorTrust = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: {
        trustScore: true,
        supplierTrustOverride: { select: { scoreDelta: true, expiresAt: true } },
      },
    });
    const effectiveTrustScore = computeEffectiveTrustScore(
      operatorTrust?.trustScore ?? 0,
      operatorTrust?.supplierTrustOverride ?? null,
    );

    const events = await this.prisma.event.findMany({
      where: {
        operatorId,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        galleryUrls: true,
        priceFrom: true,
        dateMode: true,
        venueId: true,
        moderationStatus: true,
        offers: {
          select: {
            id: true,
            priceFrom: true,
          },
        },
        sessions: {
          select: {
            id: true,
            startsAt: true,
            canceledAt: true,
            capacityTotal: true,
            isActive: true,
          },
        },
        venue: {
          select: {
            id: true,
            address: true,
          },
        },
        subcategoryLinks: { select: { subcategoryId: true } },
        subcategories: true,
      },
    });

    if (!events.length) {
      const scoreOnlyTrust = Math.min(100, Math.max(0, Math.round(100 * 0.8 + effectiveTrustScore * 0.2)));
      return { score: scoreOnlyTrust, issues: [], recommendations: [], byEvent: [] };
    }

    const byEvent: EventHealth[] = [];
    let totalScore = 0;
    let rejectedCount = 0;

    for (const ev of events) {
      if (ev.moderationStatus === 'REJECTED') {
        rejectedCount += 1;
      }
      const health = this.computeEventHealth(
        ev as Event & {
          offers: { id: string; priceFrom: number | null }[];
          sessions: { id: string; startsAt: Date; canceledAt: Date | null; capacityTotal: number | null; isActive: boolean }[];
          venue?: { id: string; address: string | null } | null;
          subcategoryLinks?: { subcategoryId: string }[];
          subcategories?: unknown[];
        },
      );
      byEvent.push(health);
      totalScore += health.score;
    }

    const avgScore = totalScore / events.length;

    const issues: HealthIssue[] = [];
    for (const h of byEvent) {
      for (const issue of h.issues) {
        if (issues.length >= 50) break;
        issues.push(issue);
      }
      if (issues.length >= 50) break;
    }

    const recommendations: string[] = [];
    if (issues.some((i) => i.code === 'NO_PHOTO')) {
      recommendations.push('Добавьте фото к событиям без главного изображения.');
    }
    if (issues.some((i) => i.code === 'WEAK_DESC')) {
      recommendations.push('Увеличьте длину описания до 200+ символов там, где оно слишком короткое.');
    }
    if (issues.some((i) => i.code === 'NO_SESSIONS')) {
      recommendations.push('Добавьте расписание (сеансы) для событий без будущих дат.');
    }
    if (issues.some((i) => i.code === 'NO_PRICE')) {
      recommendations.push('Укажите цену для событий без установленной цены.');
    }
    if (issues.some((i) => i.code === 'VENUE_GAPS')) {
      recommendations.push('Заполните адрес площадки для событий с привязанным venue.');
    }
    if (issues.some((i) => i.code === 'SUBCATEGORY_LEGACY_ONLY')) {
      recommendations.push('Перенесите подкатегории из legacy-поля в справочник Subcategory.');
    }

    const rejectedRatio = rejectedCount / events.length;
    let adjustedScore = avgScore;
    if (rejectedRatio > 0.1) {
      adjustedScore = Math.max(0, adjustedScore - 10);
      recommendations.push('Уменьшите долю отклонённых событий — улучшите качество новых листингов перед отправкой на модерацию.');
    }

    // Смешение качества листинга с эффективным trust (учёт админ-override).
    const blended = Math.round(adjustedScore * 0.8 + effectiveTrustScore * 0.2);

    return {
      score: Math.min(100, Math.max(0, blended)),
      issues,
      recommendations,
      byEvent,
    };
  }

  computeEventHealth(
    event: Event & {
      offers: { id: string; priceFrom: number | null }[];
      sessions: { id: string; startsAt: Date; canceledAt: Date | null; capacityTotal: number | null; isActive: boolean }[];
      venue?: { id: string; address: string | null } | null;
      subcategoryLinks?: { subcategoryId: string }[];
      subcategories?: unknown[];
    },
  ): EventHealth {
    const now = new Date();
    const issues: HealthIssue[] = [];
    let penalty = 0;

    if (!event.imageUrl && (!event.galleryUrls || event.galleryUrls.length === 0)) {
      issues.push({
        code: 'NO_PHOTO',
        message: 'Нет главного фото события',
        field: 'imageUrl',
        eventId: event.id,
        actionUrl: `/events/${event.id}/edit#photos`,
      });
      penalty += 15;
    }

    const descLength = event.description ? event.description.trim().length : 0;
    if (descLength > 0 && descLength < 200) {
      issues.push({
        code: 'WEAK_DESC',
        message: 'Описание короче 200 символов',
        field: 'description',
        eventId: event.id,
        actionUrl: `/events/${event.id}/edit#description`,
      });
      penalty += 10;
    }

    if (event.dateMode === 'SCHEDULED') {
      const hasFutureSession = event.sessions.some(
        (s) => s.canceledAt === null && s.startsAt > now,
      );
      if (!hasFutureSession) {
        issues.push({
          code: 'NO_SESSIONS',
          message: 'Нет будущих активных сеансов',
          field: 'sessions',
          eventId: event.id,
          actionUrl: `/availability?eventId=${event.id}`,
        });
        penalty += 20;
      }
    }

    const hasPrice =
      (typeof event.priceFrom === 'number' && event.priceFrom > 0) ||
      event.offers.some((o) => typeof o.priceFrom === 'number' && o.priceFrom > 0);
    if (!hasPrice) {
      issues.push({
        code: 'NO_PRICE',
        message: 'Не указана цена события',
        field: 'priceFrom',
        eventId: event.id,
        actionUrl: `/events/${event.id}/edit#prices`,
      });
      penalty += 15;
    }

    if (event.venueId && (!event.venue || !event.venue.address)) {
      issues.push({
        code: 'VENUE_GAPS',
        message: 'У площадки не заполнен адрес',
        field: 'venue.address',
        eventId: event.id,
        actionUrl: `/events/${event.id}/edit#venue`,
      });
      penalty += 5;
    }

    const linkCount = event.subcategoryLinks?.length ?? 0;
    const legacyCount = Array.isArray(event.subcategories) ? event.subcategories.length : 0;
    if (legacyCount > 0 && linkCount === 0) {
      issues.push({
        code: 'SUBCATEGORY_LEGACY_ONLY',
        message: 'Подкатегории заданы только в legacy-поле — привяжите записи из справочника',
        field: 'subcategories',
        eventId: event.id,
        actionUrl: `/events/${event.id}/edit#classification`,
      });
      penalty += 5;
    }

    const rawScore = 100 - penalty;
    const score = Math.max(0, Math.min(100, rawScore));

    return {
      eventId: event.id,
      title: event.title,
      score,
      issues,
    };
  }
}


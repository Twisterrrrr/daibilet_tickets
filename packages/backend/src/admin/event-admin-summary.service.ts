import { Injectable, NotFoundException } from '@nestjs/common';
import { EventSource } from '@/prisma-client';

import { EventQualityIssue, EventQualityService } from '../catalog/event-quality.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  EventAdminCommercialDto,
  EventAdminIntegrationDto,
  EventAdminOperationsCapacityDto,
  EventAdminOperationsDto,
  EventAdminPromotionDto,
  EventAdminReadinessChecklistDto,
  EventAdminReadinessDto,
  EventAdminReadinessIssueDto,
  EventAdminSummaryDto,
} from './dto/admin-event-summary.dto';
import { mapManualBoostToTier } from './event-admin-summary.util';

function mapIssueSeverity(code: string): 'warning' | 'error' {
  if (code === 'EVENT_NOT_FOUND') return 'error';
  if (code === 'HAS_INACTIVE_SUBCATEGORY') return 'warning';
  if (code === 'MISSING_SECONDARY_SUBCATEGORY') return 'warning';
  return 'error';
}

@Injectable()
export class EventAdminSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventQuality: EventQualityService,
  ) {}

  async getSummary(eventId: string): Promise<EventAdminSummaryDto> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        source: true,
        lastSyncAt: true,
        groupingKey: true,
        subcategories: true,
        minAge: true,
        audience: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Событие не найдено');
    }

    const override = await this.prisma.eventOverride.findUnique({
      where: { eventId },
      select: { minAge: true, audience: true, manualBoost: true },
    });
    const subcategoryLinksCount = await this.prisma.eventSubcategoryLink.count({ where: { eventId } });

    const quality = await this.eventQuality.validateForPublish(eventId);

    const checklist = this.buildChecklist(quality.issues, {
      minAge: event.minAge,
      audience: event.audience,
      override: override ? { minAge: override.minAge, audience: override.audience } : null,
    });
    const classificationSource =
      subcategoryLinksCount > 0
        ? 'LINKS'
        : Array.isArray(event.subcategories) && event.subcategories.length > 0
          ? 'LEGACY_ENUM'
          : 'NONE';
    const classificationNeedsReview = quality.issues.some((i) =>
      ['MISSING_PRIMARY_SUBCATEGORY', 'TOO_MANY_SUBCATEGORIES', 'HAS_INACTIVE_SUBCATEGORY'].includes(i.code),
    );

    const readiness = this.buildReadiness(quality.issues, checklist, quality.isReady, {
      classificationSource,
      classificationNeedsReview,
    });

    const manualBoost = override?.manualBoost ?? 0;
    const tier = mapManualBoostToTier(manualBoost);
    const promotion: EventAdminPromotionDto = {
      tier,
      manualBoost,
      helpText:
        manualBoost > 0
          ? 'Ручной boost влияет на порядок в каталоге; в блоке «Популярные» действует лимит числа boosted-слотов в топе.'
          : 'Без ручного boost порядок задаётся рейтингом и правилами каталога.',
    };

    const operations = await this.buildOperations(eventId);
    const commercial = await this.buildCommercial(eventId);
    const integration = this.buildIntegration(event);

    return {
      id: event.id,
      readiness,
      promotion,
      operations,
      commercial,
      integration,
    };
  }

  private buildChecklist(
    issues: EventQualityIssue[],
    event: {
      minAge: number;
      audience: string;
      override: { minAge: number | null; audience: string | null } | null;
    },
  ): EventAdminReadinessChecklistDto {
    const byCode = new Set(issues.map((i) => i.code));

    const base: EventAdminReadinessChecklistDto = {
      hasImage: !byCode.has('MISSING_IMAGE'),
      hasDescription: !byCode.has('MISSING_DESCRIPTION'),
      hasFutureSlots: !byCode.has('NO_FUTURE_SESSIONS') && !byCode.has('END_DATE_PASSED'),
      hasPrice: !byCode.has('MISSING_ACTIVE_OFFER') && !byCode.has('NO_VALID_PRICE'),
      hasVenue: !byCode.has('MISSING_LOCATION'),
      hasCategory: !byCode.has('MISSING_CATEGORY'),
      hasAge: !byCode.has('MIN_AGE_REQUIRED_FOR_KIDS') && this.computeHasAge(event),
    };

    return base;
  }

  /** Возраст «задан осмысленно»: override.minAge или minAge > 0 на событии */
  private computeHasAge(event: {
    minAge: number;
    override: { minAge: number | null } | null;
  }): boolean {
    if (event.override?.minAge != null) return true;
    return event.minAge > 0;
  }

  private buildReadiness(
    issues: EventQualityIssue[],
    checklist: EventAdminReadinessChecklistDto,
    isReady: boolean,
    meta: { classificationSource: 'LINKS' | 'LEGACY_ENUM' | 'NONE'; classificationNeedsReview: boolean },
  ): EventAdminReadinessDto {
    const mappedIssues: EventAdminReadinessIssueDto[] = issues
      .filter((i) => i.code !== 'EVENT_NOT_FOUND')
      .map((i) => ({
        code: i.code,
        message: i.message,
        severity: mapIssueSeverity(i.code),
      }));

    const allChecklistOk = Object.values(checklist).every(Boolean);

    let status: 'READY' | 'NEEDS_WORK' | 'BLOCKED';
    if (!isReady || issues.some((i) => i.code === 'EVENT_NOT_FOUND')) {
      status = 'BLOCKED';
    } else if (!allChecklistOk) {
      status = 'NEEDS_WORK';
    } else {
      status = 'READY';
    }

    const total = Object.keys(checklist).length || 1;
    const ok = Object.values(checklist).filter(Boolean).length;
    const score = Math.max(0, Math.min(100, Math.round((ok / total) * 100)));

    return {
      status,
      score,
      classificationSource: meta.classificationSource,
      classificationNeedsReview: meta.classificationNeedsReview,
      checklist,
      issues: mappedIssues,
    };
  }

  private async buildOperations(eventId: string): Promise<EventAdminOperationsDto> {
    const now = new Date();
    const futureSessions = await this.prisma.eventSession.findMany({
      where: {
        eventId,
        isActive: true,
        canceledAt: null,
        startsAt: { gt: now },
      },
      select: { id: true, startsAt: true, capacityTotal: true },
      orderBy: { startsAt: 'asc' },
    });

    const nextSessionAt = futureSessions[0]?.startsAt.toISOString() ?? null;
    const futureSessionsCount = futureSessions.length;

    let total = 0;
    let sold = 0;
    if (futureSessions.length > 0) {
      const sessionIds = futureSessions.map((s) => s.id);
      for (const s of futureSessions) {
        const cap = s.capacityTotal ?? 0;
        total += cap;
      }

      const soldRows = await this.prisma.packageItem.groupBy({
        by: ['sessionId'],
        where: {
          sessionId: { in: sessionIds },
          status: { in: ['BOOKED', 'CONFIRMED'] },
        },
        _sum: { adultTickets: true, childTickets: true },
      });
      const soldBySession: Record<string, number> = {};
      for (const row of soldRows) {
        soldBySession[row.sessionId] =
          (row._sum.adultTickets ?? 0) + (row._sum.childTickets ?? 0);
      }
      for (const sid of sessionIds) {
        sold += soldBySession[sid] ?? 0;
      }
    }

    const capacity: EventAdminOperationsCapacityDto = {
      total,
      sold,
      available: Math.max(0, total - sold),
    };

    return {
      nextSessionAt,
      futureSessionsCount,
      capacity,
    };
  }

  private async buildCommercial(eventId: string): Promise<EventAdminCommercialDto> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last30dOrders = await this.prisma.orderRequest.count({
      where: {
        eventId,
        createdAt: { gte: since },
      },
    });

    const dto: EventAdminCommercialDto = {
      last30dOrders,
      conversionRate: null,
      refundsRate: null,
      dataQuality: 'PARTIAL',
      note:
        'Конверсия view→order и доля возвратов требуют отдельной витрины событий/сессий; сейчас — число заявок OrderRequest за 30 дней.',
    };
    return dto;
  }

  private buildIntegration(event: {
    source: EventSource;
    lastSyncAt: Date | null;
    groupingKey: string | null;
  }): EventAdminIntegrationDto {
    const lastSyncAt = event.lastSyncAt?.toISOString() ?? null;

    let syncStatus: 'OK' | 'WARNING' | 'ERROR' = 'OK';
    if (event.source === EventSource.MANUAL) {
      syncStatus = 'OK';
    } else if (!event.lastSyncAt) {
      syncStatus = 'WARNING';
    } else {
      const ageMs = Date.now() - event.lastSyncAt.getTime();
      const day = 24 * 60 * 60 * 1000;
      if (ageMs > 7 * day) syncStatus = 'ERROR';
      else if (ageMs > 1 * day) syncStatus = 'WARNING';
    }

    return {
      source: event.source,
      lastSyncAt,
      syncStatus,
      hasDuplicates: Boolean(event.groupingKey?.trim()),
    };
  }
}

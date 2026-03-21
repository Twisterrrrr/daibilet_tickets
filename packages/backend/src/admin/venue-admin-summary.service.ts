import { Injectable, NotFoundException } from '@nestjs/common';

import { EventAdminSummaryService } from './event-admin-summary.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  VenueAdminContentDto,
  VenueAdminStorefrontDto,
  VenueAdminSummaryDto,
  VenueRelatedEventDto,
} from './dto/admin-venue-summary.dto';

const READINESS_LIMIT = 20;

@Injectable()
export class VenueAdminSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventAdminSummary: EventAdminSummaryService,
  ) {}

  async getSummary(venueId: string): Promise<VenueAdminSummaryDto> {
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        isDeleted: true,
        isFeatured: true,
        venueTemplateData: true,
      },
    });

    if (!venue) {
      throw new NotFoundException('Площадка не найдена');
    }

    if (venue.isDeleted) {
      throw new NotFoundException('Площадка не найдена');
    }

    const relatedEventsRaw = await this.prisma.event.findMany({
        where: {
          venueId,
          isDeleted: false,
          isActive: true,
        },
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          rating: true,
          reviewCount: true,
          override: {
            select: {
              qualityStatus: true,
              isHidden: true,
              suppressLowQuality: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

    const activeEventsCount = relatedEventsRaw.length;
    const eventIds = relatedEventsRaw.map((e) => e.id);

    let eventsWithFutureSlotsCount = 0;
    if (eventIds.length > 0) {
      const now = new Date();
      const futureSlotsByEvent = await this.prisma.eventSession.groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: eventIds },
          isActive: true,
          canceledAt: null,
          startsAt: { gt: now },
        },
        _count: { id: true },
      });
      eventsWithFutureSlotsCount = futureSlotsByEvent.length;
    }

    const ratingsWithValue = relatedEventsRaw
      .map((e) => Number(e.rating ?? 0))
      .filter((r) => r > 0);
    const avgEventRating =
      ratingsWithValue.length > 0
        ? ratingsWithValue.reduce((a, b) => a + b, 0) / ratingsWithValue.length
        : null;

    let readyRatio: number | null = null;
    let readyDataQuality: 'FULL' | 'PARTIAL' | 'FROM_OVERRIDE_ONLY' =
      'FROM_OVERRIDE_ONLY';
    const truncated = relatedEventsRaw.length > READINESS_LIMIT;

    const toFetch = relatedEventsRaw.slice(0, READINESS_LIMIT);
    const readinessMap = new Map<string, 'READY' | 'NEEDS_WORK' | 'BLOCKED' | 'UNKNOWN'>();
    if (toFetch.length > 0) {
      const summaries = await Promise.all(
        toFetch.map((e) =>
          this.eventAdminSummary.getSummary(e.id).catch(() => null),
        ),
      );
      for (let i = 0; i < toFetch.length; i++) {
        const s = summaries[i];
        const ev = toFetch[i]!;
        readinessMap.set(
          ev.id,
          s ? (s.readiness.status as 'READY' | 'NEEDS_WORK' | 'BLOCKED') : 'UNKNOWN',
        );
      }
      const readyCount = summaries.filter(
        (s) => s?.readiness?.status === 'READY',
      ).length;
      readyRatio = summaries.length > 0 ? readyCount / summaries.length : null;
      readyDataQuality =
        relatedEventsRaw.length <= READINESS_LIMIT ? 'FULL' : 'PARTIAL';
    } else {
      readyDataQuality = 'FROM_OVERRIDE_ONLY';
    }

    const storefront: VenueAdminStorefrontDto = {
      activeEventsCount,
      eventsWithFutureSlotsCount,
      avgEventRating,
      readyRatio,
      readyDataQuality,
      isFeatured: venue.isFeatured ?? false,
    };

    const hasVenueTemplateData =
      venue.venueTemplateData != null &&
      typeof venue.venueTemplateData === 'object' &&
      Object.keys(venue.venueTemplateData as object).length > 0;
    const content: VenueAdminContentDto = {
      hasVenueTemplateData,
    };

    const VIS_ORDER: Record<string, number> = { HIDDEN: 0, SUPPRESSED: 1, VISIBLE: 2 };
    const READY_ORDER: Record<string, number> = { BLOCKED: 0, NEEDS_WORK: 1, UNKNOWN: 2, READY: 3 };

    const relatedEvents: VenueRelatedEventDto[] = relatedEventsRaw
      .map((ev) => {
        const status =
          readinessMap.get(ev.id) ??
          (ev.override?.qualityStatus === 'READY'
            ? 'READY'
            : ev.override?.qualityStatus === 'BLOCKED'
              ? 'BLOCKED'
              : 'UNKNOWN');
        let storefrontVisibility: 'VISIBLE' | 'HIDDEN' | 'SUPPRESSED' = 'VISIBLE';
        if (ev.override?.isHidden === true) {
          storefrontVisibility = 'HIDDEN';
        } else if (ev.override?.suppressLowQuality === true) {
          storefrontVisibility = 'SUPPRESSED';
        }

        return {
          id: ev.id,
          slug: ev.slug,
          title: ev.title,
          category: ev.category,
          readinessStatus: status,
          storefrontVisibility,
          rating: ev.rating ? Number(ev.rating) : null,
          reviewCount: ev.reviewCount ?? 0,
          adminUrlPath: `/events/${ev.id}`,
          publicUrlPath: `/events/${ev.slug}`,
        };
      })
      .sort((a, b) => {
        const v = (VIS_ORDER[a.storefrontVisibility] ?? 2) - (VIS_ORDER[b.storefrontVisibility] ?? 2);
        if (v !== 0) return v;
        const r = (READY_ORDER[a.readinessStatus] ?? 3) - (READY_ORDER[b.readinessStatus] ?? 3);
        if (r !== 0) return r;
        return a.title.localeCompare(b.title, 'ru');
      });

    const result: VenueAdminSummaryDto = {
      id: venue.id,
      storefront,
      content,
      relatedEvents,
    };
    if (truncated) {
      result.truncated = true;
    }

    return result;
  }
}

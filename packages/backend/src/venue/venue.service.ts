import { Injectable, NotFoundException } from '@nestjs/common';
import { DateMode, Prisma, VenueType } from '@prisma/client';
import type { VenueProgramItemDto, VenueProgramResponse, VenuePublicTemplate, VenueTemplateData } from '@daibilet/shared';
import { parseVenueTemplateData } from '@daibilet/shared';

import { PrismaService } from '../prisma/prisma.service';
import { resolveVenueSubcategoryPresentation } from '../subcategories/subcategory-public.mapper';
import {
  buildSortMeta,
  buildVenueProgramEventWhere,
  classifyProgramState,
  compareCurrent,
  comparePast,
  compareUpcoming,
  computeWindowOpenDate,
} from './venue-program.logic';

@Injectable()
export class VenueService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: список venues с фильтрами */
  async getVenues(params: {
    city?: string;
    venueType?: string;
    featured?: boolean;
    sort?: string;
    page?: number;
    limit?: number;
  }) {
    const { city, venueType, featured, sort = 'rating', page = 1, limit = 20 } = params;

    const where: Prisma.VenueWhereInput = {
      isActive: true,
      isDeleted: false,
      ...(city && { city: { slug: city } }),
      ...(venueType && { venueType: venueType as VenueType }),
      ...(featured !== undefined && { isFeatured: featured }),
    };

    const orderBy: Prisma.VenueOrderByWithRelationInput =
      sort === 'price' ? { priceFrom: 'asc' } : sort === 'name' ? { title: 'asc' } : { rating: 'desc' }; // default: rating

    const [items, total] = await Promise.all([
      this.prisma.venue.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          city: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.venue.count({ where }),
    ]);

    return {
      items: items.map((v) => ({
        id: v.id,
        slug: v.slug,
        title: v.title,
        shortTitle: v.shortTitle,
        venueType: v.venueType,
        imageUrl: v.imageUrl,
        city: v.city,
        address: v.address,
        metro: v.metro,
        priceFrom: v.priceFrom,
        rating: Number(v.rating),
        reviewCount: v.reviewCount,
        isFeatured: v.isFeatured,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Public: детальная страница venue */
  async getVenueBySlug(slug: string) {
    const venue = await this.prisma.venue.findFirst({
      where: { slug, isActive: true, isDeleted: false },
      include: {
        city: { select: { name: true, slug: true } },
        operator: { select: { id: true, name: true, slug: true, logo: true } },
        offers: {
          where: { status: 'ACTIVE' },
          orderBy: { priority: 'desc' },
          select: {
            id: true,
            source: true,
            purchaseType: true,
            deeplink: true,
            priceFrom: true,
            badge: true,
            availabilityMode: true,
            widgetProvider: true,
            widgetPayload: true,
            externalEventId: true,
          },
        },
        events: {
          where: { isActive: true, moderationStatus: 'APPROVED' },
          orderBy: [{ isPermanent: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            slug: true,
            title: true,
            imageUrl: true,
            category: true,
            priceFrom: true,
            rating: true,
            reviewCount: true,
            dateMode: true,
            isPermanent: true,
            endDate: true,
            shortDescription: true,
            durationMinutes: true,
          },
        },
        subcategoryLinks: {
          select: {
            subcategory: { select: { code: true, nameRu: true, layer: true } },
          },
        },
      },
    });

    if (!venue) throw new NotFoundException('Venue not found');

    return this.buildVenuePublicDto(venue, true);
  }

  /** Публичная программа площадки: выставки (EXHIBITION) с классификацией по времени. */
  async getVenueProgramBySlug(slug: string): Promise<VenueProgramResponse> {
    const venue = await this.prisma.venue.findFirst({
      where: { slug, isActive: true, isDeleted: false },
      select: { id: true },
    });
    if (!venue) throw new NotFoundException('Venue not found');

    const where = buildVenueProgramEventWhere(venue.id);
    const events = await this.prisma.event.findMany({
      where,
      take: 200,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        imageUrl: true,
        priceFrom: true,
        dateMode: true,
        isPermanent: true,
        endDate: true,
        createdAt: true,
        override: {
          select: {
            title: true,
            imageUrl: true,
            isFeaturedInVenue: true,
            venueProgramSortOrder: true,
            manualBoost: true,
          },
        },
      },
    });

    const eventIds = events.map((e) => e.id);
    const aggMap = new Map<string, { min_start: Date; max_end: Date }>();
    if (eventIds.length > 0) {
      const rows = await this.prisma.$queryRaw<Array<{ eventId: string; min_start: Date; max_end: Date }>>(
        Prisma.sql`
        SELECT "eventId",
          MIN("startsAt") AS min_start,
          MAX(COALESCE("endsAt", "startsAt")) AS max_end
        FROM event_sessions
        WHERE "isActive" = true AND "canceledAt" IS NULL
          AND "eventId" IN (${Prisma.join(eventIds)})
        GROUP BY "eventId"
      `,
      );
      for (const r of rows) {
        aggMap.set(r.eventId, { min_start: r.min_start, max_end: r.max_end });
      }
    }

    const now = new Date();
    type Row = { dto: VenueProgramItemDto; meta: ReturnType<typeof buildSortMeta> };
    const current: Row[] = [];
    const upcoming: Row[] = [];
    const past: Row[] = [];

    for (const e of events) {
      const ov = e.override;
      const title = (ov?.title?.trim() ? ov.title : e.title) ?? e.title;
      const imageUrl = ov?.imageUrl?.trim() ? ov.imageUrl : e.imageUrl;

      let startsAtMin: Date;
      let endsAtMax: Date;

      if (e.dateMode === DateMode.SCHEDULED) {
        const agg = aggMap.get(e.id);
        if (!agg) continue;
        startsAtMin = agg.min_start;
        endsAtMax = agg.max_end;
      } else {
        const agg = aggMap.get(e.id);
        const sessionStarts = agg ? [agg.min_start] : [];
        const w = computeWindowOpenDate(
          { createdAt: e.createdAt, endDate: e.endDate, isPermanent: e.isPermanent },
          sessionStarts,
        );
        startsAtMin = w.startsAtMin;
        endsAtMax = w.endsAtMax;
      }

      const programState = classifyProgramState(now, startsAtMin, endsAtMax);
      const dto: VenueProgramItemDto = {
        id: e.id,
        slug: e.slug,
        title,
        imageUrl: imageUrl ?? null,
        shortDescription: e.shortDescription ?? null,
        priceFrom: e.priceFrom ?? null,
        dateMode: e.dateMode,
        isPermanent: e.isPermanent,
        startsAt: startsAtMin.toISOString(),
        endsAt: endsAtMax.toISOString(),
        programState,
      };

      const meta = buildSortMeta({
        startsAtMin,
        endsAtMax,
        override: ov
          ? {
              isFeaturedInVenue: ov.isFeaturedInVenue,
              venueProgramSortOrder: ov.venueProgramSortOrder,
              manualBoost: ov.manualBoost,
            }
          : null,
      });

      const row: Row = { dto, meta };
      if (programState === 'CURRENT') current.push(row);
      else if (programState === 'UPCOMING') upcoming.push(row);
      else past.push(row);
    }

    current.sort((a, b) => compareCurrent(a.meta, b.meta));
    upcoming.sort((a, b) => compareUpcoming(a.meta, b.meta));
    past.sort((a, b) => comparePast(a.meta, b.meta));

    const featuredId =
      current.find((r) => {
        const ev = events.find((x) => x.id === r.dto.id);
        return ev?.override?.isFeaturedInVenue === true;
      })?.dto.id ??
      current[0]?.dto.id ??
      null;

    return {
      current: current.map((r) => r.dto),
      upcoming: upcoming.map((r) => r.dto),
      past: past.map((r) => r.dto),
      totalCurrent: current.length,
      totalUpcoming: upcoming.length,
      totalPast: past.length,
      featuredId,
    };
  }

  /** Preview: детальная страница venue по ID, допускает неактивные (isActive=false) сущности. */
  async getVenueByIdForPreview(id: string) {
    const venue = await this.prisma.venue.findFirst({
      where: { id, isDeleted: false },
      include: {
        city: { select: { name: true, slug: true } },
        operator: { select: { id: true, name: true, slug: true, logo: true } },
        offers: {
          where: { status: 'ACTIVE' },
          orderBy: { priority: 'desc' },
          select: {
            id: true,
            source: true,
            purchaseType: true,
            deeplink: true,
            priceFrom: true,
            badge: true,
            availabilityMode: true,
            widgetProvider: true,
            widgetPayload: true,
            externalEventId: true,
          },
        },
        events: {
          where: { isActive: true, moderationStatus: 'APPROVED' },
          orderBy: [{ isPermanent: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            slug: true,
            title: true,
            imageUrl: true,
            category: true,
            priceFrom: true,
            rating: true,
            reviewCount: true,
            dateMode: true,
            isPermanent: true,
            endDate: true,
            shortDescription: true,
            durationMinutes: true,
          },
        },
        subcategoryLinks: {
          select: {
            subcategory: { select: { code: true, nameRu: true, layer: true } },
          },
        },
      },
    });

    if (!venue) throw new NotFoundException('Venue not found');

    return this.buildVenuePublicDto(venue, false);
  }

  private async buildVenuePublicDto(
    venue: {
      id: string;
      cityId: string | null;
      slug: string;
      title: string;
      shortTitle: string | null;
      venueType: VenueType;
      description: string | null;
      shortDescription: string | null;
      imageUrl: string | null;
      galleryUrls: string[] | null;
      address: string | null;
      lat: number | null;
      lng: number | null;
      metro: string | null;
      district: string | null;
      phone: string | null;
      email: string | null;
      website: string | null;
      openingHours: Prisma.JsonValue | null;
      priceFrom: number | null;
      rating: Prisma.Decimal;
      reviewCount: number;
      recommendPercent?: number | null;
      externalRating: Prisma.Decimal | null;
      externalSource: string | null;
      highlights: Prisma.JsonValue | null;
      faq: Prisma.JsonValue | null;
      features: Prisma.JsonValue | null;
      venueTemplateData: Prisma.JsonValue | null;
      isFeatured: boolean;
      metaTitle: string | null;
      metaDescription: string | null;
      city: { name: string; slug: string } | null;
      operator: { id: string; name: string; slug: string; logo: string | null } | null;
      offers: {
        id: string;
        source: string;
        purchaseType: string;
        deeplink: string | null;
        priceFrom: number | null;
        badge: string | null;
        availabilityMode: string | null;
        widgetProvider: string | null;
        widgetPayload: Prisma.JsonValue | null;
        externalEventId: string | null;
      }[];
      events: {
        id: string;
        slug: string;
        title: string;
        imageUrl: string | null;
        category: string;
        priceFrom: number | null;
        rating: Prisma.Decimal | null;
        reviewCount: number;
        dateMode: string;
        isPermanent: boolean;
        endDate: Date | null;
        shortDescription: string | null;
        durationMinutes: number | null;
      }[];
      subcategoryLinks?: {
        subcategory: { code: string; nameRu: string; layer: string };
      }[];
    },
    _requireActive: boolean,
  ) {
    const events = venue.events;
    const subPres = resolveVenueSubcategoryPresentation(
      venue.subcategoryLinks as Parameters<typeof resolveVenueSubcategoryPresentation>[0],
    );
    // Загрузим последние отзывы: прямые venue-отзывы + по привязанным events
    const eventIds = events.map((e) => e.id);
    const reviewWhere = {
      status: 'APPROVED' as const,
      OR: [...(eventIds.length > 0 ? [{ eventId: { in: eventIds } }] : []), { venueId: venue.id }],
    };

    let reviews: { id: string; authorName: string; rating: unknown; text: string | null; createdAt: Date }[] = [];
    let recommendPercent = 0;

    // eslint-disable-next-line no-constant-condition -- always load reviews for venue stats
    if (eventIds.length > 0 || true) {
      reviews = await this.prisma.review.findMany({
        where: reviewWhere,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          authorName: true,
          rating: true,
          text: true,
          createdAt: true,
        },
      });
      // % рекомендаций (rating >= 4)
      const totalApproved = await this.prisma.review.count({ where: reviewWhere });
      if (totalApproved > 0) {
        const positiveCount = await this.prisma.review.count({
          where: { ...reviewWhere, rating: { gte: 4 } },
        });
        recommendPercent = Math.round((positiveCount / totalApproved) * 100);
      }
    }

    return {
      id: venue.id,
      cityId: venue.cityId,
      slug: venue.slug,
      primarySubcategory: subPres.primarySubcategory,
      secondarySubcategories: subPres.secondarySubcategories,
      title: venue.title,
      shortTitle: venue.shortTitle,
      venueType: venue.venueType,
      description: venue.description,
      shortDescription: venue.shortDescription,
      imageUrl: venue.imageUrl,
      galleryUrls: venue.galleryUrls,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      metro: venue.metro,
      district: venue.district,
      phone: venue.phone,
      email: venue.email,
      website: venue.website,
      openingHours: venue.openingHours,
      priceFrom: venue.priceFrom,
      rating: Number(venue.rating),
      reviewCount: venue.reviewCount,
      recommendPercent,
      externalRating: venue.externalRating ? Number(venue.externalRating) : null,
      externalSource: venue.externalSource,
      highlights: (venue.highlights as string[] | null) ?? null,
      faq: (venue.faq as Array<{ q: string; a: string }> | null) ?? null,
      features: (venue.features as string[] | null) ?? null,
      isFeatured: venue.isFeatured,
      metaTitle: venue.metaTitle,
      metaDescription: venue.metaDescription,
      template: this.buildVenuePublicTemplate({
        venueType: venue.venueType,
        venueTemplateData: venue.venueTemplateData,
        legacyDescription: venue.description,
        legacyShortDescription: venue.shortDescription,
        legacyGalleryUrls: venue.galleryUrls,
        legacyOpeningHours: venue.openingHours,
        legacyFaq: (venue.faq as Array<{ q: string; a: string }> | null) ?? null,
        legacyHighlights: (venue.highlights as string[] | null) ?? null,
      }),
      city: venue.city,
      operator: venue.operator,
      offers: venue.offers,
      exhibitions: venue.events,
      reviews,
    };
  }

  private buildVenuePublicTemplate(input: {
    venueType: VenueType;
    venueTemplateData: Prisma.JsonValue | null;
    legacyDescription: string | null;
    legacyShortDescription: string | null;
    legacyGalleryUrls: string[] | null;
    legacyOpeningHours: Prisma.JsonValue | null;
    legacyFaq: Array<{ q: string; a: string }> | null;
    legacyHighlights: string[] | null;
  }): VenuePublicTemplate | null {
    const parsed = parseVenueTemplateData(input.venueTemplateData) as VenueTemplateData | null;
    const raw = this.asRecord(input.venueTemplateData);
    const supportedTemplateType = this.isTemplateAwareVenueType(input.venueType);

    if (!parsed && !supportedTemplateType) return null;

    const introLead = this.pickFirstNonEmptyString(
      this.readString(raw, 'lead'),
      this.readString(raw, 'introLead'),
      input.legacyShortDescription,
    );
    const introLongDescription = this.pickFirstNonEmptyString(
      this.readString(raw, 'longDescription'),
      this.readString(raw, 'introDescription'),
      input.legacyDescription,
    );
    const introTitle = this.pickFirstNonEmptyString(this.readString(raw, 'introTitle'));

    const galleryImages = this.pickFirstNonEmptyStringArray(
      this.readStringArray(raw, 'gallery'),
      this.readStringArray(raw, 'galleryUrls'),
      input.legacyGalleryUrls ?? null,
    );
    const visitHours = (this.pickFirstNonEmptyRecord(
      this.readHoursRecord(raw, 'visitHours'),
      this.readHoursRecord(raw, 'openingHours'),
      (input.legacyOpeningHours as Record<string, string | null> | null) ?? null,
    ) ?? null) as Record<string, string | null> | null;
    const visitingRules = this.pickFirstNonEmptyString(
      this.readString(raw, 'visitingRules'),
      this.readString(raw, 'visitRules'),
    );

    const collectionsItems = this.pickFirstNonEmptyStringArray(parsed?.collections ?? null);
    const currentExhibitions = this.pickFirstNonEmptyString(
      parsed?.currentExhibitions ?? null,
      this.readString(raw, 'currentExhibitionsIntro'),
    );
    const permanentExpositionText = this.pickFirstNonEmptyString(parsed?.permanentExhibitions ?? null);
    const accessibilityNotes = this.pickFirstNonEmptyString(parsed?.accessibilityNotes ?? null);
    const faqItems = this.pickFirstNonEmptyFaqArray(
      this.readFaqArray(raw, 'faq'),
      input.legacyFaq,
    );
    const eventsTitle = this.pickFirstNonEmptyString(this.readString(raw, 'eventsTitle'));
    const eventsIntro = this.pickFirstNonEmptyString(this.readString(raw, 'eventsIntro'));

    const mergedHighlights = this.pickFirstNonEmptyStringArray(
      this.readStringArray(raw, 'highlights'),
      this.readStringArray(raw, 'templateHighlights'),
      input.legacyHighlights ?? null,
    );

    const amenitiesItems = this.pickFirstNonEmptyStringArray(
      this.readStringArray(raw, 'amenitiesList'),
      this.readStringArray(raw, 'amenityList'),
    );
    const amenitiesText = this.pickFirstNonEmptyString(
      this.readString(raw, 'amenities'),
      this.readString(raw, 'amenitiesNote'),
    );

    const sections: VenuePublicTemplate['sections'] = {};
    if (introTitle || introLead || introLongDescription || mergedHighlights) {
      sections.intro = {
        title: introTitle,
        lead: introLead,
        longDescription: introLongDescription,
        ...(mergedHighlights ? { highlights: mergedHighlights } : {}),
      };
    }
    if (galleryImages) sections.gallery = { images: galleryImages };
    if (visitHours || visitingRules) sections.visitInfo = { openingHours: visitHours, visitingRules };
    if (collectionsItems || currentExhibitions) {
      sections.collections = { items: collectionsItems, text: currentExhibitions };
    }
    if (permanentExpositionText) sections.permanentExposition = { text: permanentExpositionText };
    if (parsed?.audioGuide !== undefined || parsed?.interactive !== undefined || accessibilityNotes) {
      sections.accessibility = {
        audioGuide: parsed?.audioGuide ?? null,
        interactive: parsed?.interactive ?? null,
        notes: accessibilityNotes,
      };
    }
    if (faqItems) sections.faq = { items: faqItems };
    if (eventsTitle || eventsIntro) sections.eventsCopy = { title: eventsTitle, intro: eventsIntro };
    if (amenitiesItems || amenitiesText) {
      sections.amenities = {
        ...(amenitiesItems ? { items: amenitiesItems } : {}),
        ...(amenitiesText ? { text: amenitiesText } : {}),
      };
    }

    const hasAnySection = Object.keys(sections).length > 0;
    if (!hasAnySection && !supportedTemplateType) return null;
    return {
      venueType: input.venueType,
      supportedTemplateType,
      sections,
    };
  }

  private isTemplateAwareVenueType(venueType: VenueType): boolean {
    return (
      venueType === 'MUSEUM' ||
      venueType === 'ART_SPACE' ||
      venueType === 'GALLERY' ||
      venueType === 'EXHIBITION_HALL'
    );
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private readString(record: Record<string, unknown> | null, key: string): string | null {
    if (!record) return null;
    const value = record[key];
    return typeof value === 'string' ? value : null;
  }

  private readStringArray(record: Record<string, unknown> | null, key: string): string[] | null {
    if (!record) return null;
    const value = record[key];
    if (!Array.isArray(value)) return null;
    const items = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
    return items.length > 0 ? items : null;
  }

  private readHoursRecord(record: Record<string, unknown> | null, key: string): Record<string, string | null> | null {
    if (!record) return null;
    const value = record[key];
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const entries = Object.entries(value as Record<string, unknown>).map(([day, hours]) => [
      day,
      typeof hours === 'string' ? hours : hours == null ? null : String(hours),
    ]);
    return entries.length > 0 ? Object.fromEntries(entries) : null;
  }

  private readFaqArray(record: Record<string, unknown> | null, key: string): Array<{ q: string; a: string }> | null {
    if (!record) return null;
    const value = record[key];
    if (!Array.isArray(value)) return null;
    const items = value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const q = typeof (item as { q?: unknown }).q === 'string' ? (item as { q: string }).q.trim() : '';
        const a = typeof (item as { a?: unknown }).a === 'string' ? (item as { a: string }).a.trim() : '';
        if (!q || !a) return null;
        return { q, a };
      })
      .filter((item): item is { q: string; a: string } => Boolean(item));
    return items.length > 0 ? items : null;
  }

  private pickFirstNonEmptyString(...values: Array<string | null | undefined>): string | null {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return null;
  }

  private pickFirstNonEmptyStringArray(...values: Array<string[] | null | undefined>): string[] | null {
    for (const value of values) {
      if (Array.isArray(value)) {
        const normalized = value.map((item) => item.trim()).filter(Boolean);
        if (normalized.length > 0) return normalized;
      }
    }
    return null;
  }

  private pickFirstNonEmptyRecord<T extends Record<string, unknown>>(...values: Array<T | null | undefined>): T | null {
    for (const value of values) {
      if (value && Object.keys(value).length > 0) return value;
    }
    return null;
  }

  private pickFirstNonEmptyFaqArray(
    ...values: Array<Array<{ q: string; a: string }> | null | undefined>
  ): Array<{ q: string; a: string }> | null {
    for (const value of values) {
      if (Array.isArray(value) && value.length > 0) return value;
    }
    return null;
  }

  /** Похожие места: приоритет общим подкатегориям (links), затем тот же тип в городе */
  async getRelatedVenues(venueId: string, cityId: string, venueType: string, limit = 6) {
    const self = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: {
        subcategoryLinks: { select: { subcategory: { select: { code: true } } } },
      },
    });
    const codes =
      self?.subcategoryLinks.map((l) => l.subcategory.code).filter((c): c is string => Boolean(c)) ?? [];

    const baseSelect = {
      id: true,
      slug: true,
      title: true,
      shortTitle: true,
      venueType: true,
      imageUrl: true,
      address: true,
      priceFrom: true,
      rating: true,
      reviewCount: true,
      city: { select: { slug: true, name: true } },
    } as const;

    if (codes.length > 0) {
      const byLinks = await this.prisma.venue.findMany({
        where: {
          id: { not: venueId },
          cityId,
          isActive: true,
          isDeleted: false,
          subcategoryLinks: { some: { subcategory: { code: { in: codes } } } },
        },
        orderBy: { rating: 'desc' },
        take: limit,
        select: baseSelect,
      });
      if (byLinks.length >= limit) return byLinks;
      const exclude = new Set(byLinks.map((v) => v.id));
      const fillerIdFilter =
        exclude.size > 0 ? { not: venueId, notIn: [...exclude] as string[] } : { not: venueId };
      const filler = await this.prisma.venue.findMany({
        where: {
          id: fillerIdFilter,
          cityId,
          venueType: venueType as VenueType,
          isActive: true,
          isDeleted: false,
        },
        orderBy: { rating: 'desc' },
        take: limit - byLinks.length,
        select: baseSelect,
      });
      return [...byLinks, ...filler];
    }

    return this.prisma.venue.findMany({
      where: {
        id: { not: venueId },
        cityId,
        venueType: venueType as VenueType,
        isActive: true,
        isDeleted: false,
      },
      orderBy: { rating: 'desc' },
      take: limit,
      select: baseSelect,
    });
  }

  /** Связанные статьи для venue (по городу) */
  async getRelatedArticles(cityId: string, limit = 4) {
    return this.prisma.article.findMany({
      where: {
        isPublished: true,
        isDeleted: false,
        cityId,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
      },
    });
  }

  /** Пересчёт рейтинга venue (аналогично Event) */
  async recalculateRating(venueId: string): Promise<void> {
    // Собираем рейтинги привязанных events
    const events = await this.prisma.event.findMany({
      where: { venueId, isActive: true },
      select: { rating: true, reviewCount: true },
    });

    if (events.length === 0) return;

    let totalRating = 0;
    let totalReviews = 0;
    for (const e of events) {
      const r = Number(e.rating);
      if (r > 0) {
        totalRating += r * e.reviewCount;
        totalReviews += e.reviewCount;
      }
    }

    const avgRating = totalReviews > 0 ? totalRating / totalReviews : 0;

    await this.prisma.venue.update({
      where: { id: venueId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: totalReviews,
      },
    });
  }
}

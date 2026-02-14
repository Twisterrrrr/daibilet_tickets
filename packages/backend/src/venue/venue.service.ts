import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, VenueType } from '@prisma/client';

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
      sort === 'price' ? { priceFrom: 'asc' } :
      sort === 'name' ? { title: 'asc' } :
      { rating: 'desc' }; // default: rating

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
      },
    });

    if (!venue) throw new NotFoundException('Venue not found');

    // Загрузим последние отзывы: прямые venue-отзывы + по привязанным events
    const eventIds = venue.events.map((e) => e.id);
    const reviewWhere = {
      status: 'APPROVED' as const,
      OR: [
        ...(eventIds.length > 0 ? [{ eventId: { in: eventIds } }] : []),
        { venueId: venue.id },
      ],
    };

    let reviews: any[] = [];
    let recommendPercent = 0;

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
      highlights: venue.highlights,
      faq: venue.faq,
      features: venue.features,
      isFeatured: venue.isFeatured,
      metaTitle: venue.metaTitle,
      metaDescription: venue.metaDescription,
      city: venue.city,
      operator: venue.operator,
      offers: venue.offers,
      exhibitions: venue.events,
      reviews,
    };
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

'use client';

import { type CatalogItem, EventCategory } from '@daibilet/shared';

import { EventCard } from './EventCard';
import { EventCardHorizontal } from './EventCardHorizontal';
import { VenueCard } from './VenueCard';

interface CatalogCardProps {
  item: CatalogItem;
  variant?: 'vertical' | 'horizontal';
}

/** Унифицированная карточка каталога: делегирует в EventCard, EventCardHorizontal или VenueCard */
export function CatalogCard({ item, variant = 'vertical' }: CatalogCardProps) {
  if (item.type === 'venue') {
    return (
      <VenueCard
        slug={item.slug}
        title={item.title}
        venueType={item.venueType}
        imageUrl={item.imageUrl}
        address={item.location?.address}
        metro={item.location?.metro}
        priceFrom={item.priceFrom}
        rating={item.rating}
        reviewCount={item.reviewCount ?? 0}
        city={item.citySlug && item.cityName ? { slug: item.citySlug, name: item.cityName } : undefined}
      />
    );
  }

  const city = item.citySlug && item.cityName ? { slug: item.citySlug, name: item.cityName } : undefined;
  const ev = item as typeof item & {
    priceOriginalKopecks?: number | null;
    groupSize?: string | null;
    sessionTimes?: string[];
    highlights?: string[];
    templateData?: { groupSize?: string };
  };

  if (variant === 'horizontal') {
    const evItem = item as typeof item & { description?: string; shortDescription?: string };
    return (
      <EventCardHorizontal
        slug={item.slug}
        title={item.title}
        category={(item.category ?? EventCategory.EVENT) as EventCategory}
        imageUrl={item.imageUrl}
        priceFrom={item.priceFrom}
        rating={item.rating}
        reviewCount={item.reviewCount ?? 0}
        durationMinutes={item.durationMinutes ?? null}
        city={city}
        totalAvailableTickets={item.totalAvailableTickets ?? undefined}
        departingSoonMinutes={item.departingSoonMinutes ?? undefined}
        nextSessionAt={item.nextSessionAt ?? undefined}
        isOptimalChoice={item.isOptimalChoice}
        dateMode={item.dateMode}
        priceOriginalKopecks={ev.priceOriginalKopecks}
        groupSize={ev.groupSize ?? ev.templateData?.groupSize}
        sessionTimes={ev.sessionTimes ?? []}
        highlights={ev.highlights ?? []}
        description={evItem.description ?? evItem.shortDescription}
      />
    );
  }

  return (
    <EventCard
      slug={item.slug}
      title={item.title}
      category={(item.category ?? EventCategory.EVENT) as EventCategory}
      subcategories={item.subcategories}
      audience={item.audience}
      tagSlugs={item.tagSlugs}
      imageUrl={item.imageUrl}
      priceFrom={item.priceFrom}
      priceOriginalKopecks={ev.priceOriginalKopecks}
      rating={item.rating}
      reviewCount={item.reviewCount ?? 0}
      durationMinutes={item.durationMinutes ?? null}
      city={city}
      address={item.location?.address}
      totalAvailableTickets={item.totalAvailableTickets ?? undefined}
      departingSoonMinutes={item.departingSoonMinutes ?? undefined}
      nextSessionAt={item.nextSessionAt ?? undefined}
      isOptimalChoice={item.isOptimalChoice}
      dateMode={item.dateMode}
      groupSize={ev.groupSize ?? ev.templateData?.groupSize}
      sessionTimes={ev.sessionTimes ?? []}
      highlights={ev.highlights ?? []}
    />
  );
}

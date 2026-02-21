'use client';

import type { CatalogItem } from '@daibilet/shared';
import { EventCard } from './EventCard';
import { VenueCard } from './VenueCard';

interface CatalogCardProps {
  item: CatalogItem;
}

/** Унифицированная карточка каталога: делегирует в EventCard или VenueCard */
export function CatalogCard({ item }: CatalogCardProps) {
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

  return (
    <EventCard
      slug={item.slug}
      title={item.title}
      category={item.category || 'EVENT'}
      subcategories={item.subcategories}
      audience={item.audience}
      tagSlugs={item.tagSlugs}
      imageUrl={item.imageUrl}
      priceFrom={item.priceFrom}
      rating={item.rating}
      reviewCount={item.reviewCount ?? 0}
      durationMinutes={item.durationMinutes ?? null}
      city={item.citySlug && item.cityName ? { slug: item.citySlug, name: item.cityName } : undefined}
      address={item.location?.address}
      totalAvailableTickets={item.totalAvailableTickets}
      departingSoonMinutes={item.departingSoonMinutes}
      nextSessionAt={item.nextSessionAt ?? undefined}
      isOptimalChoice={item.isOptimalChoice}
      dateMode={item.dateMode}
    />
  );
}

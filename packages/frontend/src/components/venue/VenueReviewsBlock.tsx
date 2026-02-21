'use client';

import { ReviewSection } from '@/components/ui/ReviewSection';

export function VenueReviewsBlock({
  venueId,
  venueSlug,
  externalRating,
  externalSource,
}: {
  venueId: string;
  venueSlug: string;
  externalRating?: number | null;
  externalSource?: string | null;
}) {
  return (
    <ReviewSection
      venueId={venueId}
      venueSlug={venueSlug}
      externalRating={externalRating ? Number(externalRating) : undefined}
      externalSource={externalSource ?? undefined}
    />
  );
}

'use client';

/**
 * Блок «Программа площадки» на странице Venue: текущие / скоро / архив выставок.
 * Контракт и лимиты: docs/Venue-Program-UX.md
 */
import type { VenueProgramResponse } from '@daibilet/shared';
import { EventCategory } from '@daibilet/shared';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { catalogEventsHref } from '@/lib/catalog-events-url';
import { buildVenueProgramGroups, type ProgramItem } from '@/lib/venues/buildVenueProgramGroups';
import { VenueExhibitionCard } from './VenueExhibitionCard';
import { VenueFeaturedExhibitionCard } from './VenueFeaturedExhibitionCard';
import { VenuePastExhibitionsAccordion } from './VenuePastExhibitionsAccordion';

const MAX_SECONDARY = 2;
const MAX_UPCOMING_VISIBLE = 3;
const MAX_CURRENT_BEFORE_CTA = 4;
const DEFAULT_PROGRAM_SECTION_TITLE = 'Выставки и проводимые мероприятия';

type Props = {
  program?: VenueProgramResponse | null;
  venueId: string;
  citySlug?: string | null;
  title?: string | null;
  intro?: string | null;
  featured?: ProgramItem | null;
  current?: ProgramItem[];
  upcoming?: ProgramItem[];
};

function buildAllEventsHref(venueId: string, citySlug?: string | null): string {
  return catalogEventsHref({
    city: citySlug || undefined,
    venueId,
    category: EventCategory.MUSEUM,
    subcategory: 'EXHIBITION',
  });
}

export function VenueProgramSection({ program, venueId, citySlug, title, intro, featured, current, upcoming }: Props) {
  const [showAllCurrent, setShowAllCurrent] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const fallbackGroups = useMemo(() => {
    if (!program) return null;
    const flatItems: ProgramItem[] = [...program.current, ...program.upcoming];
    return buildVenueProgramGroups(flatItems);
  }, [program]);

  const currentItems = useMemo(
    () => current ?? fallbackGroups?.current ?? [],
    [current, fallbackGroups],
  );
  const upcomingItems = useMemo(
    () => upcoming ?? fallbackGroups?.upcoming ?? [],
    [upcoming, fallbackGroups],
  );
  const hero = useMemo(
    () => featured ?? fallbackGroups?.featured ?? null,
    [featured, fallbackGroups],
  );
  const past = program?.past ?? [];
  const totalPast = program?.totalPast ?? past.length;
  const totalCurrent = currentItems.length;
  const totalUpcoming = upcomingItems.length;
  const totalActiveFuture = (hero ? 1 : 0) + totalCurrent + totalUpcoming;

  const hasAny = Boolean(hero) || currentItems.length > 0 || upcomingItems.length > 0 || totalPast > 0;
  const hasActiveOrFuture = totalActiveFuture > 0;

  const visibleSecondary = useMemo(() => {
    if (showAllCurrent) return currentItems;
    return currentItems.slice(0, MAX_SECONDARY);
  }, [currentItems, showAllCurrent]);

  const visibleUpcoming = useMemo(() => {
    if (showAllUpcoming) return upcomingItems;
    return upcomingItems.slice(0, MAX_UPCOMING_VISIBLE);
  }, [upcomingItems, showAllUpcoming]);

  const allHref = buildAllEventsHref(venueId, citySlug);
  const sectionTitle = title?.trim() || DEFAULT_PROGRAM_SECTION_TITLE;

  if (!hasAny) return null;

  return (
    <section className="space-y-8" aria-labelledby="venue-program-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="venue-program-heading" className="text-xl font-bold text-gray-900">
          {sectionTitle}
        </h2>
        {totalActiveFuture >= MAX_CURRENT_BEFORE_CTA && (
          <Link href={allHref} className="text-sm font-semibold text-blue-600 hover:underline">
            Смотреть все выставки площадки
          </Link>
        )}
      </div>
      {intro?.trim() && <p className="-mt-4 text-sm text-gray-600">{intro}</p>}

      {!hasActiveOrFuture && totalPast > 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-slate-50/80 px-4 py-6 text-center">
          <p className="text-sm text-gray-600">Сейчас у площадки нет активных выставок.</p>
          <p className="mt-2 text-xs text-gray-500">Откройте список прошедших ниже.</p>
        </div>
      )}

      {hero && (
        <div className="space-y-4">
          <VenueFeaturedExhibitionCard item={hero} />
          {currentItems.length > 0 && (
            <div
              className={
                visibleSecondary.length === 1 && !showAllCurrent
                  ? 'grid grid-cols-1 gap-3 md:max-w-md'
                  : 'grid grid-cols-1 gap-3 sm:grid-cols-2'
              }
            >
              {visibleSecondary.map((item) => (
                <VenueExhibitionCard key={item.id} item={item} />
              ))}
            </div>
          )}
          {currentItems.length > MAX_SECONDARY && !showAllCurrent && (
            <button
              type="button"
              onClick={() => setShowAllCurrent(true)}
              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Показать все текущие
            </button>
          )}
        </div>
      )}

      {upcomingItems.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Скоро откроются</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleUpcoming.map((item) => (
              <VenueExhibitionCard key={item.id} item={item} />
            ))}
          </div>
          {upcomingItems.length > MAX_UPCOMING_VISIBLE && !showAllUpcoming && (
            <button
              type="button"
              onClick={() => setShowAllUpcoming(true)}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Все предстоящие
            </button>
          )}
        </div>
      )}

      {totalPast > 0 && <VenuePastExhibitionsAccordion items={past} totalPast={totalPast} />}
    </section>
  );
}

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { EventListItem, VenueListItem } from '@daibilet/shared';

import type { SubcategoryLandingPublishedPayload } from '@/lib/api.types';
import { ClusterHubLinks } from '@/components/landing/ClusterHubLinks';
import { EventCard } from '@/components/ui/EventCard';
import { VenueCard } from '@/components/ui/VenueCard';

interface Props {
  citySlug: string;
  payload: SubcategoryLandingPublishedPayload;
}

export function SubcategoryLandingView({ citySlug, payload }: Props) {
  const { definition, entityKind, collection, relatedLandings } = payload;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="container-page relative py-10 sm:py-14 lg:py-16">
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-primary-300/70">
            {definition.breadcrumbs.map((b, i) => (
              <span key={`${b.href}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                {i < definition.breadcrumbs.length - 1 ? (
                  <Link href={b.href} className="hover:text-white transition-colors">
                    {b.label}
                  </Link>
                ) : (
                  <span className="text-primary-200">{b.label}</span>
                )}
              </span>
            ))}
          </nav>
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {definition.h1}
          </h1>
          {definition.introText ? (
            <p className="mt-4 max-w-2xl text-base text-primary-200/90 sm:text-lg">{definition.introText}</p>
          ) : null}
          <p className="mt-3 text-sm text-primary-300/70">В подборке: {collection.total}</p>
        </div>
      </section>

      <div className="container-page py-8 sm:py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entityKind === 'VENUE'
            ? (collection.items as VenueListItem[]).map((v) => <VenueCard key={v.id} {...v} />)
            : (collection.items as EventListItem[]).map((e) => (
                <EventCard
                  key={e.id}
                  slug={e.slug}
                  title={e.title}
                  category={e.category}
                  imageUrl={e.imageUrl}
                  priceFrom={e.priceFrom}
                  rating={e.rating}
                  reviewCount={e.reviewCount}
                  durationMinutes={e.durationMinutes}
                  city={e.city}
                  dateMode={e.dateMode}
                />
              ))}
        </div>

        {relatedLandings.length > 0 ? (
          <div className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">Смотрите также</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {relatedLandings.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={r.href}
                    className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-800"
                  >
                    {r.nameRu}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-base font-semibold text-slate-900">Разделы города</h2>
          <ClusterHubLinks citySlug={citySlug} variant="chips" />
        </div>
      </div>
    </>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { MultiEventDetailDto } from '@/lib/api.types';
import { formatPrice } from '@daibilet/shared';

interface MultiEventPageClientProps {
  detail: MultiEventDetailDto;
}

export function MultiEventPageClient({ detail }: MultiEventPageClientProps) {
  const { group, cities } = detail;

  return (
    <div className="container-page py-10">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900">{group.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
          {group.totalEvents > 0 && (
            <span>{group.totalEvents} {group.totalEvents === 1 ? 'событие' : 'событий'}</span>
          )}
          {group.totalCities > 0 && (
            <span>{group.totalCities} {group.totalCities === 1 ? 'город' : 'городов'}</span>
          )}
          {group.minPrice != null && group.minPrice > 0 && (
            <span>от {formatPrice(group.minPrice)}</span>
          )}
        </div>
        {group.coverUrl && (
          <div className="mt-6 relative aspect-video overflow-hidden rounded-xl bg-slate-200">
            <Image
              src={group.coverUrl}
              alt={group.title}
              fill
              className="h-full w-full object-cover"
              sizes="(min-width: 768px) 768px, 100vw"
            />
          </div>
        )}
      </div>

      {cities.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900">Города</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {cities.map((c) => (
              <Link
                key={c.slug}
                href={`/events?city=${c.slug}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <Link href="/events" className="text-primary-600 hover:underline">
          ← Все события
        </Link>
      </div>
    </div>
  );
}

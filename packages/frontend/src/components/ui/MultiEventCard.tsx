'use client';

import Link from 'next/link';
import type { MultiEventListItemDto } from '@/lib/api.types';
import { formatPrice } from '@daibilet/shared';

interface MultiEventCardProps {
  item: MultiEventListItemDto;
  className?: string;
}

export function MultiEventCard({ item, className = '' }: MultiEventCardProps) {
  const citiesLabel =
    item.totalCities > 1
      ? `${item.citiesPreview?.[0]?.name ?? ''} и ещё ${item.totalCities - 1}`
      : item.citiesPreview?.[0]?.name ?? '';

  return (
    <Link
      href={`/events/m/${item.slug}`}
      className={`card group block overflow-hidden transition hover:shadow-lg ${className}`}
    >
      {item.coverUrl ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
          <img
            src={item.coverUrl}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      ) : null}
      <div className="p-3 sm:p-4">
        <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-primary-600">{item.title}</h3>
        {citiesLabel ? <p className="mt-1 text-sm text-slate-500">{citiesLabel}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {item.minPrice != null && item.minPrice > 0 ? (
            <span className="font-medium text-primary-600">от {formatPrice(item.minPrice)}</span>
          ) : null}
          {(item.rating ?? 0) > 0 ? <span className="text-slate-500">★ {item.rating?.toFixed(1)}</span> : null}
          {item.nextDate ? (
            <span className="text-slate-500">
              {new Date(item.nextDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

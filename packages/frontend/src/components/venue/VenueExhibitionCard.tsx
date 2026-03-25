import { formatPrice } from '@daibilet/shared';
import type { VenueProgramItemDto } from '@daibilet/shared';
import Image from 'next/image';
import Link from 'next/link';

import { formatExhibitionPeriod, programBadgeLabel } from './venueProgramUtils';

type Props = {
  item: VenueProgramItemDto;
  variant?: 'compact' | 'horizontal';
};

export function VenueExhibitionCard({ item, variant = 'compact' }: Props) {
  const badge = programBadgeLabel(item.programState);
  const period = formatExhibitionPeriod(item);
  const priceLine =
    item.priceFrom != null && item.priceFrom > 0 ? `от ${formatPrice(item.priceFrom)}` : null;

  if (variant === 'horizontal') {
    return (
      <Link
        href={`/events/${item.slug}`}
        className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-md"
      >
        <div className="relative h-24 w-28 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="112px" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">Нет фото</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {badge}
          </span>
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-900">{item.title}</h3>
          <p className="mt-0.5 text-xs text-gray-500">{period}</p>
          {priceLine && <p className="mt-1 text-xs font-medium text-gray-800">{priceLine}</p>}
          <span className="mt-2 inline-block text-xs font-semibold text-blue-600">Подробнее →</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/events/${item.slug}`}
      className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative h-32 w-full bg-slate-100">
        {item.imageUrl ? (
          <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 280px" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">Нет фото</div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-gray-800 shadow-sm">
          {badge}
        </span>
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{item.title}</h3>
        <p className="mt-1 text-xs text-gray-500">{period}</p>
        {priceLine && <p className="mt-1 text-xs font-medium text-gray-800">{priceLine}</p>}
        <span className="mt-2 inline-block text-xs font-semibold text-blue-600">Подробнее</span>
      </div>
    </Link>
  );
}

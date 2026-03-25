import { formatPrice } from '@daibilet/shared';
import type { VenueProgramItemDto } from '@daibilet/shared';
import Image from 'next/image';
import Link from 'next/link';

import { formatExhibitionPeriod, programBadgeLabel } from './venueProgramUtils';

type Props = {
  item: VenueProgramItemDto;
};

export function VenueFeaturedExhibitionCard({ item }: Props) {
  const period = formatExhibitionPeriod(item);
  const priceLine =
    item.priceFrom != null && item.priceFrom > 0 ? `от ${formatPrice(item.priceFrom)}` : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="relative aspect-[21/9] min-h-[200px] w-full bg-slate-900 md:aspect-[2.4/1]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 1024px) 100vw, 896px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-500">Нет обложки</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-emerald-500/95 px-3 py-1 text-xs font-bold text-white shadow">
          {programBadgeLabel(item.programState)}
        </span>
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
          <h3 className="text-xl font-extrabold text-white drop-shadow md:text-2xl">{item.title}</h3>
          <p className="mt-1 text-sm text-white/90">{period}</p>
        </div>
      </div>
      <div className="space-y-3 p-4 md:flex md:items-end md:justify-between md:gap-6 md:p-6">
        {item.shortDescription && (
          <p className="text-sm leading-relaxed text-gray-600 line-clamp-3 md:line-clamp-4">{item.shortDescription}</p>
        )}
        <div className="flex flex-shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {priceLine && <p className="text-lg font-bold text-gray-900">{priceLine}</p>}
          <Link
            href={`/events/${item.slug}`}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-blue-500"
          >
            {item.programState === 'CURRENT' ? 'Купить билет' : 'Подробнее'}
          </Link>
        </div>
      </div>
    </article>
  );
}

import Link from 'next/link';
import { Clock, MapPin, Star, Ticket } from 'lucide-react';
import { formatPrice, CATEGORY_LABELS, type EventCategory } from '@daibilet/shared';

interface EventCardProps {
  slug: string;
  title: string;
  category: EventCategory;
  imageUrl: string | null;
  priceFrom: number | null;
  rating: number;
  reviewCount: number;
  durationMinutes: number | null;
  city?: { slug: string; name: string };
  address?: string | null;
  compact?: boolean;
}

export function EventCard({
  slug,
  title,
  category,
  imageUrl,
  priceFrom,
  rating,
  reviewCount,
  durationMinutes,
  city,
  address,
  compact = false,
}: EventCardProps) {
  const categoryLabel = CATEGORY_LABELS[category] || 'Событие';

  return (
    <Link
      href={`/events/${slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className={`relative overflow-hidden bg-slate-100 ${compact ? 'h-28 sm:h-36' : 'h-36 sm:h-48'}`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-50">
            <span className="text-3xl sm:text-4xl">
              {category === 'EXCURSION' ? '🚶' : category === 'MUSEUM' ? '🏛️' : '🎭'}
            </span>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Category badge */}
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs">
          {categoryLabel}
        </span>

        {/* Price badge on image (desktop only) */}
        {priceFrom !== null && priceFrom > 0 && (
          <span className="absolute bottom-2 right-2 hidden rounded-lg bg-white/95 px-2 py-0.5 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-sm sm:bottom-3 sm:right-3 sm:block sm:px-2.5 sm:py-1 sm:text-sm">
            от {formatPrice(priceFrom)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 text-xs font-semibold text-slate-900 transition-colors group-hover:text-primary-600 sm:text-sm">
          {title}
        </h3>

        {/* Meta */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500 sm:mt-2 sm:gap-x-3 sm:text-xs">
          {Number(rating) > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400 sm:h-3.5 sm:w-3.5" />
              <span className="font-medium text-slate-700">{Number(rating).toFixed(1)}</span>
              {reviewCount > 0 && <span className="hidden sm:inline">({reviewCount})</span>}
            </span>
          )}
          {durationMinutes && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {durationMinutes >= 60
                ? `${Math.floor(durationMinutes / 60)} ч${durationMinutes % 60 > 0 ? ` ${durationMinutes % 60} мин` : ''}`
                : `${durationMinutes} мин`}
            </span>
          )}
        </div>

        {/* Location */}
        {(city || address) && (
          <p className="mt-1 flex items-start gap-0.5 text-[10px] text-slate-400 line-clamp-1 sm:mt-1.5 sm:gap-1 sm:text-xs">
            <MapPin className="mt-0.5 h-2.5 w-2.5 flex-shrink-0 sm:h-3 sm:w-3" />
            {city ? city.name : ''}{city && address ? ', ' : ''}{address || ''}
          </p>
        )}

        {/* Footer: price (always visible on mobile since badge is hidden) */}
        <div className="mt-auto flex items-center justify-between pt-2 sm:pt-3">
          {priceFrom !== null && priceFrom > 0 ? (
            <p className="text-xs sm:text-sm">
              <span className="text-slate-400">от </span>
              <span className="font-bold text-slate-900">{formatPrice(priceFrom)}</span>
            </p>
          ) : (
            <p className="text-[10px] text-slate-400 sm:text-xs">Цена уточняется</p>
          )}

          <span className="hidden items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 sm:flex sm:px-2.5 sm:py-1 sm:text-xs">
            <Ticket className="h-3 w-3" />
            Подробнее
          </span>
        </div>
      </div>
    </Link>
  );
}

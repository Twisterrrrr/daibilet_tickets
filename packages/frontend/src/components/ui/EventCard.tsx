import Link from 'next/link';
import { Clock, MapPin, Star, Ticket, Flame, Award } from 'lucide-react';
import { formatPrice, CATEGORY_LABELS, SUBCATEGORY_LABELS, SYSTEM_TAG_BADGES, type EventCategory, type EventSubcategory } from '@daibilet/shared';

interface EventCardProps {
  slug: string;
  title: string;
  category: EventCategory;
  subcategories?: EventSubcategory[];
  audience?: string;
  tagSlugs?: string[];
  imageUrl: string | null;
  priceFrom: number | null;
  rating: number;
  reviewCount: number;
  durationMinutes: number | null;
  city?: { slug: string; name: string };
  address?: string | null;
  compact?: boolean;
  /** Сумма свободных мест по ближайшим сеансам */
  totalAvailableTickets?: number;
  /** Минут до ближайшего сеанса (1–120) — показываем бейдж «Начнётся скоро» */
  departingSoonMinutes?: number;
  /** Дата ближайшего сеанса (ISO) */
  nextSessionAt?: string;
  /** Лучшее событие по scoring-алгоритму */
  isOptimalChoice?: boolean;
}

/** Порог: при скольких оставшихся местах показывать "Осталось N мест" */
const LOW_TICKETS_THRESHOLD = 20;

/** Максимум тег-бейджей на карточке (чтобы не перегружать) */
const MAX_TAG_BADGES = 2;

/** Форматировать ближайший сеанс: "Сегодня, 18:00" / "Завтра, 12:30" / "15 фев, 10:00" */
function formatNextSession(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.floor((sessionDay.getTime() - today.getTime()) / 86400000);

  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  if (diff === 0) return `Сегодня, ${time}`;
  if (diff === 1) return `Завтра, ${time}`;

  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return `${date}, ${time}`;
}

export function EventCard({
  slug,
  title,
  category,
  subcategories = [],
  audience,
  tagSlugs = [],
  imageUrl,
  priceFrom,
  rating,
  reviewCount,
  durationMinutes,
  city,
  address,
  compact = false,
  totalAvailableTickets,
  departingSoonMinutes,
  nextSessionAt,
  isOptimalChoice,
}: EventCardProps) {
  // Показываем первый подтип если есть, иначе категорию
  const primarySub = subcategories?.[0];
  const categoryLabel = (primarySub && SUBCATEGORY_LABELS[primarySub])
    ? SUBCATEGORY_LABELS[primarySub]
    : CATEGORY_LABELS[category] || 'Событие';
  const showLowTickets =
    totalAvailableTickets !== undefined &&
    totalAvailableTickets > 0 &&
    totalAvailableTickets <= LOW_TICKETS_THRESHOLD;

  // Системные тег-бейджи (показываем не больше MAX_TAG_BADGES)
  const visibleTagBadges = SYSTEM_TAG_BADGES
    .filter((badge) => tagSlugs.includes(badge.slug))
    .slice(0, MAX_TAG_BADGES);

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

        {/* Top-left badges */}
        <div className="absolute left-2 top-2 flex flex-col gap-1 sm:left-3 sm:top-3">
          {/* Optimal choice badge */}
          {isOptimalChoice && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-semibold text-amber-950 shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
              <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Лучший выбор
            </span>
          )}

          {/* Category / subcategory badges */}
          {subcategories && subcategories.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {subcategories.map((sub) => (
                <span key={sub} className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
                  {SUBCATEGORY_LABELS[sub] || sub}
                </span>
              ))}
            </div>
          ) : (
            <span className="rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-slate-700 shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
              {categoryLabel}
            </span>
          )}

          {/* Audience badge */}
          {audience && audience !== 'ALL' && (
            <span className="rounded-full bg-pink-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
              {audience === 'KIDS' ? '👶 Детям' : '👨‍👩‍👧 Семейный'}
            </span>
          )}
        </div>

        {/* Top-right: system tag badges */}
        {visibleTagBadges.length > 0 && (
          <div className="absolute right-2 top-2 flex flex-col gap-1 sm:right-3 sm:top-3">
            {visibleTagBadges.map((badge) => (
              <span
                key={badge.slug}
                className={`rounded-full ${badge.color} px-2 py-0.5 text-[10px] font-semibold ${badge.textColor} shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs`}
              >
                {badge.emoji} {badge.label}
              </span>
            ))}
          </div>
        )}

        {/* Bottom-left: departing soon (priority) or low tickets badge */}
        {departingSoonMinutes ? (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm animate-pulse sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Через {departingSoonMinutes} мин
          </span>
        ) : showLowTickets ? (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs">
            <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {totalAvailableTickets} мест
          </span>
        ) : null}

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
          {/* Рейтинг — всегда видим */}
          <span className="flex items-center gap-0.5">
            <Star className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${Number(rating) > 0 ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
            {Number(rating) > 0 ? (
              <>
                <span className="font-medium text-slate-700">{Number(rating).toFixed(1)}</span>
                {reviewCount > 0 && <span className="hidden text-slate-400 sm:inline">({reviewCount})</span>}
              </>
            ) : (
              <span className="font-medium text-slate-400">Новое</span>
            )}
          </span>
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

        {/* Next session */}
        {nextSessionAt && (
          <p className="mt-1 text-[10px] font-medium text-primary-600 sm:text-xs">
            {formatNextSession(nextSessionAt)}
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

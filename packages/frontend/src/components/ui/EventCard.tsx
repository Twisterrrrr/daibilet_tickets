'use client';

import {
  formatPrice,
  type EventAudience,
  type EventCategory,
  type EventSubcategory,
} from '@daibilet/shared';
import { Award, Clock, Flame, MapPin, Star, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FavoriteButton } from './FavoriteButton';

export type EventCardVM = {
  id?: string;
  slug: string;
  title: string;
  category?: EventCategory | string | null;
  subcategories?: EventSubcategory[];
  audience?: EventAudience | null;
  tagSlugs?: string[];
  imageUrl?: string | null;
  priceFrom?: number | null;
  rating?: number | null;
  reviewCount?: number;
  durationMinutes?: number | null;
  city?: { slug: string; name: string } | null;
  address?: string | null;
  totalAvailableTickets?: number;
  departingSoonMinutes?: number | null;
  nextSessionAt?: string | null;
  isOptimalChoice?: boolean;
  dateMode?: string | null;
  groupSize?: string | null;
  sessionTimes?: string[];
  highlights?: string[];
};

type EventCardProps = EventCardVM & {
  /** Старая цена в копейках — для бейджа скидки и зачёркнутой цены */
  priceOriginalKopecks?: number | null;
  compact?: boolean;
  /** Переопределение ссылки по клику (для мульти-событий) */
  hrefOverride?: string;
  /** Переопределение отображаемого города/списка городов */
  cityLabelOverride?: string;
};

/** Порог: при скольких оставшихся местах показывать "Осталось N мест" */
const LOW_TICKETS_THRESHOLD = 20;

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
  subcategories: _subcategories = [],
  audience: _audience,
  tagSlugs: _tagSlugs = [],
  imageUrl,
  priceFrom,
  rating,
  reviewCount,
  durationMinutes,
  city,
  address: _address,
  compact = false,
  totalAvailableTickets,
  departingSoonMinutes,
  nextSessionAt,
  isOptimalChoice,
  dateMode,
  priceOriginalKopecks,
  groupSize,
  sessionTimes = [],
  highlights = [],
  hrefOverride,
  cityLabelOverride,
}: EventCardProps) {
  const router = useRouter();
  const safeReviewCount = reviewCount ?? 0;
  const showLowTickets =
    totalAvailableTickets !== undefined && totalAvailableTickets > 0 && totalAvailableTickets <= LOW_TICKETS_THRESHOLD;
  const showPopular = safeReviewCount >= 100;
  const hasDiscount =
    priceOriginalKopecks != null &&
    priceOriginalKopecks > 0 &&
    priceFrom != null &&
    priceFrom > 0 &&
    priceOriginalKopecks > priceFrom;
  const discountPercent =
    hasDiscount && priceOriginalKopecks
      ? Math.round(((priceOriginalKopecks - priceFrom) / priceOriginalKopecks) * 100)
      : 0;

  const displayHighlights = highlights.slice(0, 3);
  const displaySlots = sessionTimes.slice(0, 5);
  const isToday = (() => {
    if (!nextSessionAt) return false;
    const d = new Date(nextSessionAt);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
    );
  })();

  const handleSlotClick = (e: React.MouseEvent, time: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/events/${slug}?openBuy=1&sessionTime=${encodeURIComponent(time)}`);
  };

  return (
    <Link
      href={hrefOverride ?? `/events/${slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className={`relative overflow-hidden bg-slate-100 ${compact ? 'h-28 sm:h-36' : 'h-36 sm:h-48'}`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
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

        {/* Top-left badges — Рекомендуем, Популярно, Скидка N%, N мест */}
        <div className="absolute left-2 top-2 flex flex-col gap-1 sm:left-3 sm:top-3">
          {isOptimalChoice && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-semibold text-amber-950 shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
              <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Рекомендуем
            </span>
          )}
          {showPopular && (
            <span className="rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:text-xs">
              Популярно
            </span>
          )}
          {hasDiscount && discountPercent > 0 && (
            <span className="rounded-full bg-orange-500/95 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:text-xs">
              Скидка {discountPercent}%
            </span>
          )}
          {showLowTickets && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-xs">
              <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {totalAvailableTickets} мест
            </span>
          )}
        </div>

        {/* Top-right: избранное — строго круг (overflow-hidden обрезает до круга) */}
        <div className="absolute right-2 top-2 size-8 shrink-0 overflow-hidden rounded-full sm:right-3 sm:top-3 sm:size-9">
          <FavoriteButton slug={slug} size="sm" className="h-full w-full" />
        </div>

        {/* Bottom-right фото: цена — синий pill */}
        {priceFrom != null && priceFrom > 0 && (
          <div className="absolute bottom-2 right-2 flex flex-col items-end gap-0.5 sm:bottom-3 sm:right-3">
            {hasDiscount && priceOriginalKopecks && (
              <span className="text-[10px] font-medium text-white/90 line-through drop-shadow-md sm:text-xs">
                {formatPrice(priceOriginalKopecks)}
              </span>
            )}
            <span className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm sm:px-4 sm:py-2 sm:text-sm">
              от {formatPrice(priceFrom)}
            </span>
          </div>
        )}

        {/* Bottom-left: departing soon (priority) or nothing (N мест — сверху) */}
        {dateMode === 'OPEN_DATE' ? (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs">
            Открытая дата
          </span>
        ) : departingSoonMinutes ? (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm animate-pulse sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-xs">
            <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Через {departingSoonMinutes} мин
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-3 sm:p-4">
        {/* Между фото и названием: Рейтинг слева, Город прижат вправо */}
        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 sm:text-xs">
          <span className="flex items-center gap-0.5 shrink-0">
            <Star
              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${Number(rating) > 0 ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`}
            />
            {Number(rating) > 0 ? (
              <>
                <span className="font-medium text-slate-700">{Number(rating).toFixed(1)}</span>
                {safeReviewCount > 0 && <span className="text-slate-400">({safeReviewCount})</span>}
              </>
            ) : (
              <span className="font-medium text-slate-400">Новое</span>
            )}
          </span>
          {(city || cityLabelOverride) && (
            <span className="flex items-center gap-0.5 text-slate-500 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{cityLabelOverride ?? city?.name}</span>
            </span>
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 text-xs font-semibold text-slate-900 transition-colors group-hover:text-primary-600 sm:text-sm">
          {title}
        </h3>

        {/* Длительность, размер группы, ближайшая дата */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 sm:gap-x-3 sm:text-xs">
          {durationMinutes && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {durationMinutes >= 60
                ? `${Math.floor(durationMinutes / 60)} ч${durationMinutes % 60 > 0 ? ` ${durationMinutes % 60} мин` : ''}`
                : `${durationMinutes} мин`}
            </span>
          )}
          {groupSize && <span>{groupSize}</span>}
          {dateMode === 'OPEN_DATE' && <span className="font-medium text-emerald-600">Билет с открытой датой</span>}
          {dateMode !== 'OPEN_DATE' && nextSessionAt && (
            <span className="font-medium text-primary-600">
              {isToday && displaySlots.length > 0 ? 'Сегодня' : formatNextSession(nextSessionAt)}
            </span>
          )}
        </div>

        {/* 3 highlights */}
        {displayHighlights.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[10px] text-slate-600 sm:text-xs">
            {displayHighlights.map((h, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-primary-500">•</span>
                <span className="line-clamp-1">{h}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Слоты времени — под хайлайтами, только если ближайший сеанс сегодня */}
        {isToday && displaySlots.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {displaySlots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={(e) => handleSlotClick(e, time)}
                className="inline-btn box-border inline-flex h-6 min-h-6 shrink-0 items-center justify-center self-start rounded-lg border border-slate-300 bg-white px-2.5 text-[10px] leading-none text-slate-800 transition-colors hover:border-primary-400 hover:bg-primary-50"
              >
                {time}
              </button>
            ))}
          </div>
        )}

        {/* Footer: Подробнее прижат влево (цена на фото) */}
        <div className="mt-auto flex items-center pt-2 sm:pt-3">
          <span className="flex items-center gap-1 text-[10px] font-medium text-primary-600 sm:text-xs">
            <Ticket className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            Подробнее →
          </span>
        </div>
      </div>
    </Link>
  );
}

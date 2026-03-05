'use client';

import { type EventCategory, formatPrice } from '@daibilet/shared';
import { Award, Clock, Flame, MapPin, Star, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { FavoriteButton } from './FavoriteButton';

/** Убрать теги из описания, <br> → пробел */
function stripDescription(html: string | null | undefined): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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

interface EventCardHorizontalProps {
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
  totalAvailableTickets?: number;
  departingSoonMinutes?: number;
  nextSessionAt?: string;
  isOptimalChoice?: boolean;
  dateMode?: string;
  priceOriginalKopecks?: number | null;
  /** Размер группы: "1–8 чел." */
  groupSize?: string | null;
  /** Слоты времени на сегодня: ["12:30", "13:30", ...] */
  sessionTimes?: string[];
  /** 3 highlights */
  highlights?: string[];
  /** Описание для 3 строк под длительностью/датой */
  description?: string | null;
  /** Переопределение ссылки по клику (для мульти-событий) */
  hrefOverride?: string;
  /** Переопределение отображаемого города/списка городов */
  cityLabelOverride?: string;
}

export function EventCardHorizontal({
  slug,
  title,
  category,
  imageUrl,
  priceFrom,
  rating,
  reviewCount,
  durationMinutes,
  city,
  departingSoonMinutes,
  nextSessionAt,
  isOptimalChoice,
  dateMode,
  priceOriginalKopecks,
  groupSize,
  sessionTimes = [],
  highlights = [],
  description,
  totalAvailableTickets,
  hrefOverride,
  cityLabelOverride,
}: EventCardHorizontalProps) {
  const router = useRouter();

  const LOW_TICKETS_THRESHOLD = 20;
  const showLowTickets =
    totalAvailableTickets !== undefined && totalAvailableTickets > 0 && totalAvailableTickets <= LOW_TICKETS_THRESHOLD;

  /** Показывать слоты времени только если ближайший сеанс — сегодня */
  const isToday = (() => {
    if (!nextSessionAt) return false;
    const d = new Date(nextSessionAt);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
    );
  })();
  const showPopular = reviewCount >= 100;
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

  const handleSlotClick = (e: React.MouseEvent, time: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/events/${slug}?openBuy=1&sessionTime=${encodeURIComponent(time)}`);
  };

  return (
    <Link
      href={hrefOverride ?? `/events/${slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/60 hover:-translate-y-0.5 sm:flex-row"
    >
      {/* Image — 16:9 слева */}
      <div className="relative w-full sm:w-80 sm:min-w-[20rem] aspect-video bg-slate-100 shrink-0">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, 20rem"
            className="object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-50">
            <span className="text-4xl">{category === 'EXCURSION' ? '🚶' : category === 'MUSEUM' ? '🏛️' : '🎭'}</span>
          </div>
        )}

        {/* Top-left badges — Рекомендуем, Популярно, Скидка N%, N мест */}
        <div className="absolute left-2 top-2 flex flex-col gap-1 sm:left-3 sm:top-3">
          {isOptimalChoice && (
            <span className="flex items-center gap-1 rounded-full bg-amber-400/95 px-2 py-0.5 text-[10px] font-semibold text-amber-950 shadow-sm backdrop-blur-sm sm:text-xs">
              <Award className="h-3 w-3" />
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
            <span className="flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:text-xs">
              <Flame className="h-3 w-3" />
              {totalAvailableTickets} мест
            </span>
          )}
        </div>

        {/* Top-right: избранное — строго круг */}
        <div className="absolute right-2 top-2 size-8 shrink-0 overflow-hidden rounded-full sm:right-3 sm:top-3 sm:size-9">
          <FavoriteButton slug={slug} size="sm" className="h-full w-full" />
        </div>

        {/* Bottom-left: departing soon / open date */}
        {dateMode === 'OPEN_DATE' ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:text-xs">
            Открытая дата
          </span>
        ) : (
          departingSoonMinutes && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-sm sm:text-xs">
              <Clock className="h-3 w-3" />
              Через {departingSoonMinutes} мин
            </span>
          )
        )}
      </div>

      {/* Content — справа, с увеличенным отступом слева */}
      <div className="ml-2.5 flex flex-1 flex-col justify-between p-3 pl-5 sm:pl-7 sm:pr-4 sm:pt-4 sm:pb-4">
        {/* Первая строка: слева — заголовок, справа — локация */}
        <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 sm:text-xs">
          <h3 className="flex-1 truncate text-base font-semibold text-slate-900 transition-colors group-hover:text-primary-600 sm:text-lg">
            {title}
          </h3>
          {(city || cityLabelOverride) && (
            <span className="flex items-center gap-0.5 text-slate-500 truncate">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{cityLabelOverride ?? city?.name}</span>
            </span>
          )}
        </div>

        {/* Длительность, рейтинг, размер группы, ближайшая дата */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500 sm:text-xs">
          <span className="flex items-center gap-0.5 shrink-0">
            <Star
              className={
                Number(rating) > 0 ? 'h-3 w-3 fill-amber-400 text-amber-400' : 'h-3 w-3 fill-slate-200 text-slate-200'
              }
            />
            {Number(rating) > 0 ? (
              <>
                <span className="font-medium text-slate-700">{Number(rating).toFixed(1)}</span>
                {reviewCount > 0 && <span className="text-slate-400">({reviewCount})</span>}
              </>
            ) : (
              <span className="font-medium text-slate-400">Новое</span>
            )}
          </span>
          {durationMinutes && (
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
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

        {/* 3 строки описания, половина последней — в градиенте */}
        {stripDescription(description) && (
          <div className="relative mt-2 overflow-hidden">
            <p className="line-clamp-3 text-[10px] leading-[1.35] text-slate-600 sm:text-xs sm:leading-[1.4]">
              {stripDescription(description)}
            </p>
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[0.7em] bg-gradient-to-t from-white to-transparent"
              aria-hidden
            />
          </div>
        )}

        {/* Слоты времени — только если ближайший сеанс сегодня */}
        {isToday && displaySlots.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {displaySlots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={(e) => handleSlotClick(e, time)}
                className="inline-btn box-border inline-flex h-[30px] min-h-[30px] shrink-0 items-center justify-center self-start rounded-lg border border-slate-300 bg-white px-3 text-xs leading-none text-slate-800 transition-colors hover:border-primary-400 hover:bg-primary-50"
              >
                {time}
              </button>
            ))}
          </div>
        )}

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

        {/* Footer: Подробнее слева, цена справа внизу карточки */}
        <div className="mt-auto flex items-center justify-between gap-4 pt-3">
          <span className="flex items-center gap-1 text-xs font-medium text-primary-600 sm:text-sm">
            <Ticket className="h-3.5 w-3.5 shrink-0" />
            Подробнее →
          </span>
          {priceFrom !== null && priceFrom > 0 ? (
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              {hasDiscount && priceOriginalKopecks && (
                <span className="text-[11px] text-slate-400 line-through">{formatPrice(priceOriginalKopecks)}</span>
              )}
              <span className="rounded-full bg-primary-600 px-5 py-2 text-base font-bold uppercase tracking-wide text-white shadow-sm sm:px-6 sm:py-2.5 sm:text-lg">
                от {formatPrice(priceFrom)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Цена уточняется</span>
          )}
        </div>
      </div>
    </Link>
  );
}

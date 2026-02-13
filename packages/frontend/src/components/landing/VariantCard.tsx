'use client';

import { useState } from 'react';
import { TcWidgetButton } from '@/components/ui/TcWidget';
import { Clock, MapPin, Star, Users, ChevronDown, ExternalLink, Ship } from 'lucide-react';

interface Variant {
  sessionId: string;
  startsAt: string;
  endsAt?: string;
  availableTickets: number;
  prices: Array<{ type: string; amount?: number; price?: number }>;
  event: {
    id: string;
    title: string;
    slug: string;
    address?: string;
    durationMinutes?: number;
    tcEventId: string;
    source: string;
    rating: number;
    reviewCount: number;
    priceFrom?: number;
  };
}

interface VariantCardProps {
  variant: Variant;
  isBest: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone: 'Europe/Moscow',
  });
}

function formatPrice(kopecks: number): string {
  return Math.round(kopecks / 100).toLocaleString('ru-RU');
}

function getPrice(v: Variant): number {
  const p = v.prices?.[0];
  const sessionPrice = p?.amount || p?.price || 0;
  return sessionPrice > 0 ? sessionPrice : (v.event.priceFrom ?? 0);
}

function formatDuration(minutes: number | undefined): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h}ч ${m}м`;
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

export function VariantCard({ variant: v, isBest }: VariantCardProps) {
  const [expanded, setExpanded] = useState(false);
  const price = getPrice(v);
  const isSoldOut = v.availableTickets <= 0;

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-shadow ${
        isBest
          ? 'border-primary-300 ring-2 ring-primary-100'
          : 'border-slate-200'
      } ${isSoldOut ? 'opacity-60' : ''}`}
    >
      <div className="p-4">
        {/* Оптимальный тег */}
        {isBest && (
          <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[12px] font-bold text-primary-700">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            Оптимальный выбор
          </div>
        )}

        {/* Верхний ряд: время + цена */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-2xl font-black text-slate-900 leading-none">
              {formatTime(v.startsAt)}
            </div>
            <div className="mt-1 text-[13px] text-slate-500">{formatDate(v.startsAt)}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-slate-900 leading-none">
              {price > 0 ? `${formatPrice(price)} ₽` : '—'}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">взрослый</div>
          </div>
        </div>

        {/* Причал + длительность */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
          {v.event.address && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate max-w-[200px]">{v.event.address}</span>
            </span>
          )}
          {v.event.durationMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
              {formatDuration(v.event.durationMinutes)}
            </span>
          )}
        </div>

        {/* Название */}
        <p className="mt-2 text-[13px] font-semibold text-slate-800 line-clamp-2">
          {v.event.title}
        </p>

        {/* Бейджи (pills) */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Number(v.event.rating) > 0 && (
            <Pill className="border-amber-200 bg-amber-50 text-amber-700">
              <Star className="h-3 w-3 fill-amber-400" />
              {Number(v.event.rating).toFixed(1)}
            </Pill>
          )}
          {isSoldOut ? (
            <Pill className="border-red-200 bg-red-50 text-red-600">
              Нет мест
            </Pill>
          ) : v.availableTickets <= 10 ? (
            <Pill className="border-orange-200 bg-orange-50 text-orange-700">
              <Users className="h-3 w-3" />
              Осталось {v.availableTickets}
            </Pill>
          ) : (
            <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">
              <Users className="h-3 w-3" />
              Есть места
            </Pill>
          )}
          <Pill className="border-slate-200 bg-slate-50 text-slate-600">
            {formatDuration(v.event.durationMinutes)}
          </Pill>
        </div>

        {/* Раскрытие */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-primary-600 hover:text-primary-700"
        >
          Подробнее
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {expanded && (
          <div className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2.5 text-[12px] text-slate-500">
            {Number(v.event.rating) > 0 && (
              <p>Рейтинг: {Number(v.event.rating).toFixed(1)} / 5</p>
            )}
            {v.event.reviewCount > 0 && <p>Отзывов: {v.event.reviewCount}</p>}
            <p className="text-slate-400">
              Цена и наличие подтверждаются в билетной системе организатора.
            </p>
          </div>
        )}

        {/* Кнопка покупки */}
        {!isSoldOut && (
          <div className="mt-4">
            {v.event.source === 'TC' ? (
              <TcWidgetButton tcEventId={v.event.tcEventId} />
            ) : (
              <a
                href={`https://teplohod.info/event/${v.event.tcEventId.replace('tep-', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-primary-700 transition-colors"
              >
                Купить билет <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Mobile cards list */
export function VariantCards({
  variants,
  bestDealIdx,
}: {
  variants: Variant[];
  bestDealIdx: number | null;
}) {
  if (variants.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center md:hidden">
        <Ship className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-2 text-base font-semibold text-slate-500">
          Нет доступных рейсов
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Попробуйте другую дату или сбросьте фильтры
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:hidden">
      {variants.map((v, idx) => (
        <VariantCard
          key={v.sessionId}
          variant={v}
          isBest={idx === bestDealIdx}
        />
      ))}
    </div>
  );
}

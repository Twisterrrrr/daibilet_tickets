'use client';

import { useState } from 'react';
import { TcWidgetButton } from '@/components/ui/TcWidget';
import { Clock, MapPin, Star, Users, ChevronDown, ExternalLink } from 'lucide-react';

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
  return p?.amount ?? p?.price ?? v.event.priceFrom ?? 0;
}

function formatDuration(minutes: number | undefined): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

export function VariantCard({ variant: v, isBest }: VariantCardProps) {
  const [expanded, setExpanded] = useState(false);
  const price = getPrice(v);
  const isSoldOut = v.availableTickets <= 0;

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        isBest
          ? 'border-amber-300 ring-2 ring-amber-200/50'
          : 'border-slate-200'
      } ${isSoldOut ? 'opacity-60' : ''}`}
    >
      <div className="p-4">
        {/* Top row: time + price */}
        <div className="flex items-start justify-between">
          <div>
            {isBest && (
              <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                Лучший выбор
              </div>
            )}
            <div className="text-2xl font-bold text-slate-900">
              {formatTime(v.startsAt)}
            </div>
            <div className="text-sm text-slate-500">{formatDate(v.startsAt)}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-900">
              {price > 0 ? `${formatPrice(price)} \u20BD` : '—'}
            </div>
            {v.availableTickets > 0 && v.availableTickets <= 10 && (
              <div className="mt-0.5 flex items-center justify-end gap-1 text-amber-600">
                <Users className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">
                  Осталось {v.availableTickets}
                </span>
              </div>
            )}
            {isSoldOut && (
              <span className="mt-0.5 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Распродано
              </span>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
          {v.event.address && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {v.event.address.slice(0, 35)}
            </span>
          )}
          {v.event.durationMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {formatDuration(v.event.durationMinutes)}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="mt-2 text-sm font-medium text-slate-800 line-clamp-2">
          {v.event.title}
        </p>

        {/* Expandable */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
        >
          Подробнее
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </button>

        {expanded && (
          <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <p>Рейтинг: {Number(v.event.rating).toFixed(1)} / 5</p>
            {v.event.reviewCount > 0 && (
              <p>Отзывов: {v.event.reviewCount}</p>
            )}
          </div>
        )}

        {/* Buy button */}
        {!isSoldOut && (
          <div className="mt-4">
            {v.event.source === 'TC' ? (
              <TcWidgetButton tcEventId={v.event.tcEventId} />
            ) : (
              <a
                href={`https://teplohod.info/event/${v.event.tcEventId.replace('tep-', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white hover:bg-primary-700"
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
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-base text-slate-500">
          Нет доступных рейсов по выбранным фильтрам
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
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

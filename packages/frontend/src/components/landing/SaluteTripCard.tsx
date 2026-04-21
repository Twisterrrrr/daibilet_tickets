'use client';

import type { EventListItem } from '@daibilet/shared';
import {
  ArrowRight,
  Clock,
  Headphones,
  MapPin,
  Mic,
  Music,
  Ship,
  Star,
  Sun,
  Users,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react';
import Link from 'next/link';

import { deriveSaluteServices, type SaluteServices } from '@/lib/salute-service-amenities';

function formatTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone });
}

function formatDate(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone,
  });
}

function formatDuration(min: number | null | undefined): string {
  if (!min || min <= 0) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

function formatPriceKop(kop: number | null | undefined): string {
  if (!kop || kop <= 0) return '—';
  return Math.round(kop / 100).toLocaleString('ru-RU');
}

function shipNameFromTitle(title: string): string | undefined {
  const m = title.match(/«([^»]+)»/);
  return m ? m[1] : undefined;
}

const SERVICE_SLOTS: ReadonlyArray<{
  key: keyof SaluteServices;
  label: string;
  labelOff: string;
  ActiveIcon: typeof Utensils;
  InactiveIcon: typeof Utensils;
}> = [
  {
    key: 'food',
    label: 'Еда и напитки',
    labelOff: 'Без еды и напитков в программе',
    ActiveIcon: Utensils,
    InactiveIcon: UtensilsCrossed,
  },
  {
    key: 'music',
    label: 'Музыка/DJ',
    labelOff: 'Без музыки/DJ в программе',
    ActiveIcon: Music,
    InactiveIcon: Music,
  },
  {
    key: 'guide',
    label: 'Экскурсовод',
    labelOff: 'Без экскурсовода',
    ActiveIcon: Mic,
    InactiveIcon: Mic,
  },
  {
    key: 'audioguide',
    label: 'Аудиогид',
    labelOff: 'Без аудиогида',
    ActiveIcon: Headphones,
    InactiveIcon: Headphones,
  },
  {
    key: 'deck',
    label: 'Открытая палуба',
    labelOff: 'Без открытой палубы в программе',
    ActiveIcon: Sun,
    InactiveIcon: Sun,
  },
];

/** Пять пиктограмм: активная — услуга есть, приглушённая — нет (как в макете Lovable). */
function SaluteServicePictograms({ services }: { services: SaluteServices }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Услуги в программе">
      {SERVICE_SLOTS.map(({ key, label, labelOff, ActiveIcon, InactiveIcon }) => {
        const on = services[key];
        const Icon = on ? ActiveIcon : InactiveIcon;
        return (
          <span
            key={key}
            role="listitem"
            title={on ? label : labelOff}
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-slate-600 transition-colors ${
              on
                ? 'border-primary-200 bg-primary-50 text-primary-700'
                : 'border-slate-200 bg-slate-100 text-slate-400 opacity-90'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          </span>
        );
      })}
    </div>
  );
}

export function SaluteTripCard({
  event: e,
  isBest,
  index,
  timeZone,
  nextSessionAt,
}: {
  event: EventListItem;
  isBest: boolean;
  index: number;
  timeZone: string;
  nextSessionAt: string;
}) {
  const seats = e.totalAvailableTickets ?? 0;
  const soldOut = seats <= 0;
  const urgencyClass =
    seats <= 5 ? 'text-orange-600' : seats <= 15 ? 'text-primary-700' : 'text-emerald-700';
  const services = deriveSaluteServices(e);
  const ship = shipNameFromTitle(e.title);
  const rating = Number(e.rating) || 0;
  const rc = e.reviewCount ?? 0;

  return (
    <div
      className={`rounded-xl border bg-white p-4 transition-all duration-200 hover:shadow-md md:p-5 ${
        isBest ? 'best-deal-ring' : 'border-slate-200'
      } ${soldOut ? 'opacity-70' : ''}`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
    >
      {isBest ? (
        <div className="mb-3">
          <span className="rounded-full bg-primary-600/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-700">
            Оптимальный выбор
          </span>
        </div>
      ) : null}

      <div className="hidden gap-4 md:flex md:items-center">
        <div className="w-28 shrink-0">
          <div className="text-2xl font-bold text-slate-900">{formatTime(nextSessionAt, timeZone)}</div>
          <div className="text-sm text-slate-500">{formatDate(nextSessionAt, timeZone)}</div>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="truncate font-semibold text-slate-900">{e.title}</h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {formatDuration(e.durationMinutes)}
            </span>
            {e.address ? (
              <span className="flex min-w-0 items-center gap-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{e.address}</span>
              </span>
            ) : null}
            {ship ? (
              <span className="flex items-center gap-1">
                <Ship className="h-3.5 w-3.5 shrink-0" />
                {ship}
              </span>
            ) : null}
            {rating > 0 ? (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                {rating.toFixed(1)}
                {rc > 0 ? ` (${rc})` : ''}
              </span>
            ) : null}
          </div>
          <SaluteServicePictograms services={services} />
        </div>

        <div className="flex shrink-0 items-center gap-4 lg:gap-10">
          {!soldOut ? (
            <div className={`flex items-center gap-1 text-xs font-medium ${urgencyClass}`}>
              <Users className="h-3.5 w-3.5" />
              Осталось {seats} мест
            </div>
          ) : (
            <div className="text-xs font-medium text-slate-500">Распродано</div>
          )}
          {soldOut ? (
            <span className="inline-flex cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-400">
              Распродано
            </span>
          ) : (
            <Link
              href={`/events/${e.slug}`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary-700 active:scale-[0.98]"
            >
              {formatPriceKop(e.priceFrom)} ₽ <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <div className="text-xl font-bold text-slate-900">{formatTime(nextSessionAt, timeZone)}</div>
            <div className="text-xs text-slate-500">{formatDate(nextSessionAt, timeZone)}</div>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-tight text-slate-900">{e.title}</h3>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(e.durationMinutes)}
          </span>
          {e.address ? (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="line-clamp-2">{e.address}</span>
            </span>
          ) : null}
          {rating > 0 ? (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-500" />
              {rating.toFixed(1)}
              {rc > 0 ? ` (${rc})` : ''}
            </span>
          ) : null}
        </div>
        <SaluteServicePictograms services={services} />

        <div className="flex items-center justify-between gap-3">
          {!soldOut ? (
            <div className={`flex items-center gap-1 text-xs font-medium ${urgencyClass}`}>
              <Users className="h-3 w-3" />
              Осталось {seats}
            </div>
          ) : (
            <div />
          )}
          {soldOut ? (
            <span className="inline-flex cursor-not-allowed rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
              Распродано
            </span>
          ) : (
            <Link
              href={`/events/${e.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              {formatPriceKop(e.priceFrom)} ₽
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

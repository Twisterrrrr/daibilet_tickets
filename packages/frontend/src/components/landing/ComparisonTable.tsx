'use client';

import { Clock, ExternalLink, Ship, Star, Users } from 'lucide-react';

import { TcWidgetButton } from '@/components/ui/TcWidget';

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

interface ComparisonTableProps {
  variants: Variant[];
  bestDealIdx: number | null;
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
    timeZone: 'Europe/Moscow',
  });
}

function formatPrice(kopecks: number): string {
  return Math.round(kopecks / 100).toLocaleString('ru-RU');
}

function getPrice(v: Variant): number {
  const p = v.prices?.[0];
  // price — цена в копейках; amount — количество мест (teplohod ставит 100)
  const sessionPrice = p?.price ?? p?.amount ?? 0;
  return sessionPrice > 0 ? sessionPrice : (v.event.priceFrom ?? 0);
}

function formatDuration(minutes: number | undefined): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

function shortenAddress(address: string | undefined): string {
  if (!address) return '—';
  return address.replace(/^(причал|наб\.|набережная)\s*/i, '').slice(0, 40);
}

function extractVessel(title: string): string {
  const patterns = [/теплоход[еу]?\s+[«"]?([^»"]+)[»"]?/i, /на\s+[«"]([^»"]+)[»"]/i, /—\s+(.+)$/i];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return m[1].trim().slice(0, 25);
  }
  return title.slice(0, 35);
}

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-tight ${className}`}
    >
      {children}
    </span>
  );
}

export function ComparisonTable({ variants, bestDealIdx }: ComparisonTableProps) {
  if (variants.length === 0) {
    return (
      <div className="hidden rounded-2xl border border-slate-200 bg-white p-12 text-center md:block">
        <Ship className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 text-lg font-semibold text-slate-500">Нет рейсов по выбранным фильтрам</p>
        <p className="mt-1 text-sm text-slate-400">Попробуйте сбросить фильтры или выбрать другую дату</p>
      </div>
    );
  }

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <th className="w-[110px] px-4 py-3">Время</th>
            <th className="px-4 py-3">Причал / оператор</th>
            <th className="px-4 py-3">Опции</th>
            <th className="w-[130px] px-4 py-3 text-right">Цена</th>
            <th className="w-[110px] px-4 py-3 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {variants.map((v, idx) => {
            const price = getPrice(v);
            const isBest = idx === bestDealIdx;
            const isSoldOut = v.availableTickets <= 0;

            return (
              <tr
                key={v.sessionId}
                className={`transition-colors ${
                  isBest ? 'bg-gradient-to-r from-primary-50/60 to-transparent' : 'hover:bg-slate-50/50'
                } ${isSoldOut ? 'opacity-50' : ''}`}
              >
                {/* Время */}
                <td className="px-4 py-3.5">
                  {isBest && (
                    <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary-700">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      Оптимальный
                    </div>
                  )}
                  <div className="text-lg font-black text-slate-900 leading-none">{formatTime(v.startsAt)}</div>
                  <div className="mt-0.5 text-[12px] text-slate-400">
                    {formatDate(v.startsAt)} · {formatDuration(v.event.durationMinutes)}
                  </div>
                </td>

                {/* Причал / оператор */}
                <td className="px-4 py-3.5">
                  <div className="font-bold text-slate-900">{shortenAddress(v.event.address)}</div>
                  <div className="mt-0.5 text-[12px] text-slate-500">{extractVessel(v.event.title)}</div>
                </td>

                {/* Опции (pills) */}
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Pill className="border-slate-200 bg-slate-50 text-slate-600">
                      <Clock className="h-3 w-3" />
                      {formatDuration(v.event.durationMinutes)}
                    </Pill>
                    {Number(v.event.rating) > 0 && (
                      <Pill className="border-amber-200 bg-amber-50 text-amber-700">
                        <Star className="h-3 w-3 fill-amber-400" />
                        {Number(v.event.rating).toFixed(1)}
                      </Pill>
                    )}
                    {isSoldOut ? (
                      <Pill className="border-red-200 bg-red-50 text-red-600">Нет мест</Pill>
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
                  </div>
                </td>

                {/* Цена */}
                <td className="px-4 py-3.5 text-right">
                  <div className="text-base font-black text-slate-900">
                    {price > 0 ? `${formatPrice(price)} ₽` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-400">взрослый</div>
                </td>

                {/* Кнопка */}
                <td className="px-4 py-3.5 text-right">
                  {v.event.source === 'TC' && !isSoldOut ? (
                    <div className="w-[100px] ml-auto">
                      <TcWidgetButton tcEventId={v.event.tcEventId} compact />
                    </div>
                  ) : v.event.source === 'TEPLOHOD' && !isSoldOut ? (
                    <a
                      href={`https://teplohod.info/event/${v.event.tcEventId.replace('tep-', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-colors"
                    >
                      Купить <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

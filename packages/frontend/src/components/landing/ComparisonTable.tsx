'use client';

import { TcWidgetButton } from '@/components/ui/TcWidget';
import { Star, Users, Clock, MapPin, ExternalLink } from 'lucide-react';

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

function shortenAddress(address: string | undefined): string {
  if (!address) return '—';
  return address.replace(/^(причал|наб\.|набережная)\s*/i, '').slice(0, 40);
}

// Извлекаем название судна из заголовка события
function extractVessel(title: string): string {
  const patterns = [
    /теплоход[еу]?\s+[«"]?([^»"]+)[»"]?/i,
    /на\s+[«"]([^»"]+)[»"]/i,
    /—\s+(.+)$/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return m[1].trim().slice(0, 25);
  }
  return title.slice(0, 30);
}

export function ComparisonTable({ variants, bestDealIdx }: ComparisonTableProps) {
  if (variants.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-lg text-slate-500">
          Нет доступных рейсов по выбранным фильтрам
        </p>
      </div>
    );
  }

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Дата / Время</th>
            <th className="px-4 py-3">Причал</th>
            <th className="px-4 py-3">Длительность</th>
            <th className="px-4 py-3">Судно</th>
            <th className="px-4 py-3 text-right">Цена</th>
            <th className="px-4 py-3 text-center">Мест</th>
            <th className="px-4 py-3"></th>
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
                className={`transition-colors hover:bg-slate-50 ${
                  isBest ? 'bg-amber-50/60' : ''
                } ${isSoldOut ? 'opacity-50' : ''}`}
              >
                {/* Дата / Время */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {isBest && (
                      <Star className="h-4 w-4 flex-shrink-0 fill-amber-400 text-amber-400" />
                    )}
                    <div>
                      <div className="font-semibold text-slate-900">
                        {formatTime(v.startsAt)}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatDate(v.startsAt)}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Причал */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-slate-700">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{shortenAddress(v.event.address)}</span>
                  </div>
                </td>

                {/* Длительность */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {formatDuration(v.event.durationMinutes)}
                  </div>
                </td>

                {/* Судно */}
                <td className="max-w-[180px] px-4 py-3">
                  <span className="truncate text-slate-700">
                    {extractVessel(v.event.title)}
                  </span>
                </td>

                {/* Цена */}
                <td className="px-4 py-3 text-right">
                  <span className="text-base font-bold text-slate-900">
                    {price > 0 ? `${formatPrice(price)} \u20BD` : '—'}
                  </span>
                </td>

                {/* Остаток мест */}
                <td className="px-4 py-3 text-center">
                  {isSoldOut ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      Распродано
                    </span>
                  ) : v.availableTickets <= 10 ? (
                    <span className="flex items-center justify-center gap-1 text-amber-600">
                      <Users className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        {v.availableTickets}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Есть
                    </span>
                  )}
                </td>

                {/* Кнопка */}
                <td className="px-4 py-3">
                  {v.event.source === 'TC' && !isSoldOut ? (
                    <div className="w-[120px]">
                      <TcWidgetButton tcEventId={v.event.tcEventId} />
                    </div>
                  ) : v.event.source === 'TEPLOHOD' && !isSoldOut ? (
                    <a
                      href={`https://teplohod.info/event/${v.event.tcEventId.replace('tep-', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                    >
                      Купить <ExternalLink className="h-3.5 w-3.5" />
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

'use client';

import { DEFAULT_CALENDAR_TZ } from '@daibilet/shared';
import { Clock, ExternalLink, Ship, Star, Users } from 'lucide-react';

import { TcWidgetButton } from '@/components/ui/TcWidget';

interface Variant {
  sessionId: string;
  startsAt?: string;
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
    vesselName?: string;
    experienceFormat?: string;
    catering?: {
      enabled: boolean;
      type?: string | null;
      includedInPrice?: boolean | null;
      menuMarkdown?: string | null;
    };
  };
}

interface ComparisonTableProps {
  variants: Variant[];
  bestDealIdx: number | null;
  /** IANA timezone отображения времени/даты рейса */
  ianaTimeZone?: string;
  /** Колонки меню/формата и судно из полей события (гастро-лендинг) */
  showGastroColumns?: boolean;
}

function formatTime(iso: string | undefined, timeZone: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  });
}

function formatDate(iso: string | undefined, timeZone: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    timeZone,
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

function vesselLine(ev: Variant['event']): string {
  const v = ev.vesselName?.trim();
  if (v) return v.slice(0, 40);
  return extractVessel(ev.title);
}

const MENU_KIND_LABELS: Record<string, string> = {
  BREAKFAST: 'Завтрак',
  LUNCH: 'Ланч',
  DINNER: 'Обед',
  BRUNCH: 'Бранч',
  SUPPER: 'Ужин',
  BUFFET: 'Шведский стол',
  SNACKS: 'Закуски',
  TASTING: 'Дегустация',
  BAR: 'Бар / напитки',
  OTHER: 'Другое',
};

const EXPERIENCE_LABELS: Record<string, string> = {
  CLASSIC: 'Классический',
  ROMANTIC: 'Романтический',
  VIP: 'VIP',
  PANORAMIC: 'Панорамный',
};

function formatMenuKindLabel(code: string | undefined): string {
  if (!code) return '—';
  return MENU_KIND_LABELS[code] ?? code;
}

function formatExperienceLabel(code: string | undefined): string {
  if (!code) return '—';
  return EXPERIENCE_LABELS[code] ?? code;
}

function markdownToPlainText(md: string | null | undefined): string {
  if (!md) return '';
  return (
    md
      .replace(/\r\n/g, '\n')
      // links [text](url) -> text
      .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
      // bold/italic markers
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      // list markers
      .replace(/^\s*-\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
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

export function ComparisonTable({
  variants,
  bestDealIdx,
  ianaTimeZone = DEFAULT_CALENDAR_TZ,
  showGastroColumns = false,
}: ComparisonTableProps) {
  if (variants.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center sm:p-12">
        <Ship className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 text-lg font-semibold text-slate-500">Нет рейсов по выбранным фильтрам</p>
        <p className="mt-1 text-sm text-slate-400">Попробуйте сбросить фильтры или выбрать другую дату</p>
      </div>
    );
  }

  const tableBody = variants.map((v, idx) => {
    const price = getPrice(v);
    const isBest = idx === bestDealIdx;
    const isSoldOut = v.availableTickets <= 0;
    const rowKey = v.sessionId ?? `${v.event.id}-${idx}`;

    const cta =
      v.event.source === 'TC' && !isSoldOut ? (
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
      ) : null;

    if (showGastroColumns) {
      return (
        <tr
          key={rowKey}
          className={`transition-colors ${
            isBest ? 'bg-gradient-to-r from-primary-50/60 to-transparent' : 'hover:bg-slate-50/50'
          } ${isSoldOut ? 'opacity-50' : ''}`}
        >
          <td className="px-4 py-3.5">
            {isBest && (
              <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary-700">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                Оптимальный
              </div>
            )}
            <div className="text-lg font-black text-slate-900 leading-none">{formatTime(v.startsAt, ianaTimeZone)}</div>
            <div className="mt-0.5 text-[12px] text-slate-400">
              {formatDate(v.startsAt, ianaTimeZone)} · {formatDuration(v.event.durationMinutes)}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {Number(v.event.rating) > 0 ? (
                <Pill className="border-amber-200 bg-amber-50 text-amber-700">
                  <Star className="h-3 w-3 fill-amber-400" />
                  {Number(v.event.rating).toFixed(1)}
                </Pill>
              ) : null}
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
          <td className="px-4 py-3.5">
            <div className="font-bold text-slate-900">{shortenAddress(v.event.address)}</div>
            <div className="mt-0.5 text-[12px] text-slate-600">{vesselLine(v.event)}</div>
          </td>
          <td className="max-w-[220px] px-4 py-3.5">
            <div className="mb-1">
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {v.event.catering?.enabled
                  ? formatMenuKindLabel(v.event.catering?.type ?? undefined)
                  : '—'}
              </span>
            </div>
            {v.event.catering?.enabled && v.event.catering?.menuMarkdown ? (
              <p className="text-[12px] leading-snug text-slate-600 line-clamp-3">
                {markdownToPlainText(v.event.catering.menuMarkdown)}
              </p>
            ) : (
              <p className="text-[12px] text-slate-400">—</p>
            )}
          </td>
          <td className="px-4 py-3.5 text-[13px] font-medium text-slate-800">
            {formatExperienceLabel(v.event.experienceFormat)}
          </td>
          <td className="px-4 py-3.5 text-right">
            <div className="text-base font-black text-slate-900">
              {price > 0 ? `${formatPrice(price)} ₽` : '—'}
            </div>
            <div className="text-[11px] text-slate-400">взрослый</div>
          </td>
          <td className="px-4 py-3.5 text-right">{cta}</td>
        </tr>
      );
    }

    return (
      <tr
        key={rowKey}
        className={`transition-colors ${
          isBest ? 'bg-gradient-to-r from-primary-50/60 to-transparent' : 'hover:bg-slate-50/50'
        } ${isSoldOut ? 'opacity-50' : ''}`}
      >
        <td className="px-4 py-3.5">
          {isBest && (
            <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary-700">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              Оптимальный
            </div>
          )}
          <div className="text-lg font-black text-slate-900 leading-none">{formatTime(v.startsAt, ianaTimeZone)}</div>
          <div className="mt-0.5 text-[12px] text-slate-400">
            {formatDate(v.startsAt, ianaTimeZone)} · {formatDuration(v.event.durationMinutes)}
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="font-bold text-slate-900">{shortenAddress(v.event.address)}</div>
          <div className="mt-0.5 text-[12px] text-slate-500">{extractVessel(v.event.title)}</div>
        </td>
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
        <td className="px-4 py-3.5 text-right">
          <div className="text-base font-black text-slate-900">
            {price > 0 ? `${formatPrice(price)} ₽` : '—'}
          </div>
          <div className="text-[11px] text-slate-400">взрослый</div>
        </td>
        <td className="px-4 py-3.5 text-right">{cta}</td>
      </tr>
    );
  });

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm [-webkit-overflow-scrolling:touch]">
      <table className={`w-full text-sm ${showGastroColumns ? 'min-w-[920px]' : 'min-w-[680px]'}`}>
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {showGastroColumns ? (
              <>
                <th className="w-[110px] px-4 py-3">Время</th>
                <th className="px-4 py-3">Причал / теплоход</th>
                <th className="px-4 py-3">Меню</th>
                <th className="w-[120px] px-4 py-3">Формат</th>
                <th className="w-[130px] px-4 py-3 text-right">Цена</th>
                <th className="w-[110px] px-4 py-3 text-right"></th>
              </>
            ) : (
              <>
                <th className="w-[110px] px-4 py-3">Время</th>
                <th className="px-4 py-3">Причал / оператор</th>
                <th className="px-4 py-3">Опции</th>
                <th className="w-[130px] px-4 py-3 text-right">Цена</th>
                <th className="w-[110px] px-4 py-3 text-right"></th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{tableBody}</tbody>
      </table>
    </div>
  );
}

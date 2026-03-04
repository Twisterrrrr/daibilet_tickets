'use client';

import { formatPrice } from '@daibilet/shared';
import { CheckCircle, ChevronLeft, ChevronRight, Clock, ExternalLink, Minus, Plus, Ticket, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

// ─── Types ────────────────────────────────────────
interface Offer {
  id: string;
  source: string;
  purchaseType: string;
  deeplink?: string | null;
  priceFrom: number | null;
  badge?: string | null;
  availabilityMode?: string | null;
  widgetProvider?: string | null;
  widgetPayload?: Record<string, unknown>;
  externalEventId?: string | null;
}

interface TicketsBlockProps {
  offers: Offer[];
  isOpenDate?: boolean;
  venueName: string;
  website?: string | null;
}

// ─── Mini Calendar ────────────────────────────────
function MiniCalendar({ selectedDate, onSelect }: { selectedDate: Date | null; onSelect: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthLabel = viewMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7; // Mon = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    return cells;
  }, [viewMonth]);

  const canPrev = viewMonth > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => canPrev && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          disabled={!canPrev}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
          aria-label="Предыдущий месяц"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold capitalize">{monthLabel}</span>
        <button
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Следующий месяц"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
          <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const isPast = day < today;
          const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === today.toDateString();

          return (
            <button
              key={day.toISOString()}
              disabled={isPast}
              onClick={() => onSelect(day)}
              className={`
                relative h-9 rounded-lg text-sm font-medium transition-all
                ${isPast ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}
                ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-blue-300 text-blue-600 font-bold' : ''}
              `}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quantity Picker ──────────────────────────────
function QuantityPicker({ value, onChange, max = 10 }: { value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center
                   hover:bg-gray-50 disabled:opacity-30 transition-colors"
        aria-label="Уменьшить"
      >
        <Minus size={16} />
      </button>
      <span className="text-lg font-bold tabular-nums w-6 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center
                   hover:bg-gray-50 disabled:opacity-30 transition-colors"
        aria-label="Увеличить"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

// ─── Offer Card ───────────────────────────────────
function OfferCard({
  offer,
  index,
  quantity,
  selectedDate,
  isOpenDate,
}: {
  offer: Offer;
  index: number;
  quantity: number;
  selectedDate: Date | null;
  isOpenDate: boolean;
}) {
  const isPrimary = index === 0;
  const isSoldOut = offer.availabilityMode === 'SOLD_OUT';
  const totalPrice = offer.priceFrom ? offer.priceFrom * quantity : null;

  // Determine CTA text
  let ctaText = 'Купить';
  if (isSoldOut) ctaText = 'Распродано';
  else if (offer.purchaseType === 'REQUEST') ctaText = 'Оставить заявку';
  else if (isOpenDate && selectedDate) ctaText = 'Купить билет';
  else if (isOpenDate) ctaText = 'Выбрать дату';

  // Offer description hint
  const descHint =
    offer.badge === 'Быстрее проход' || (offer.badge || '').toLowerCase().includes('очеред')
      ? 'Проход без очереди, электронный билет'
      : offer.badge === 'С аудиогидом'
        ? 'Включён аудиогид на русском языке'
        : 'Электронный билет с открытой датой';

  return (
    <div
      className={`
        rounded-xl border p-4 sm:p-5 transition-all
        ${
          isPrimary
            ? 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-200 shadow-sm'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
    >
      {/* Top row: badges */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {isPrimary && (
          <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold uppercase tracking-wider">
            Рекомендуем
          </span>
        )}
        {offer.badge && (
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              isPrimary ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {offer.badge}
          </span>
        )}
        {isSoldOut && (
          <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-medium">Распродано</span>
        )}
        {(offer.badge || '').toLowerCase().includes('очеред') && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium flex items-center gap-1">
            <Zap size={10} /> Быстрый вход
          </span>
        )}
      </div>

      {/* Title + desc */}
      <h3 className="font-semibold text-gray-900">
        {offer.badge || (offer.source === 'MANUAL' ? 'Входной билет' : 'Билет')}
      </h3>
      <p className="text-sm text-gray-500 mt-0.5">{descHint}</p>

      {/* Price + CTA */}
      <div className="flex items-center justify-between mt-4 gap-3">
        <div>
          {totalPrice ? (
            <>
              <p className="text-xs text-gray-400">
                {quantity > 1 ? `${quantity} × ${formatPrice(offer.priceFrom!)}` : 'от'}
              </p>
              <p className="text-xl font-extrabold text-gray-900">{formatPrice(totalPrice)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Цена по запросу</p>
          )}
        </div>

        {isSoldOut ? (
          <button
            disabled
            className="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-500 font-bold text-sm cursor-not-allowed"
          >
            Распродано
          </button>
        ) : offer.purchaseType === 'REDIRECT' && offer.deeplink ? (
          <a
            href={offer.deeplink}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap
              ${
                isPrimary
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }
            `}
          >
            {ctaText}
            <ExternalLink size={14} />
          </a>
        ) : (
          <button
            className={`
              px-5 py-2.5 rounded-xl font-bold text-sm transition-colors whitespace-nowrap
              ${
                isPrimary
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }
            `}
          >
            {ctaText}
          </button>
        )}
      </div>

      {/* Trust signals */}
      {isPrimary && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-blue-200/60 text-xs text-blue-700">
          <span className="flex items-center gap-1">
            <CheckCircle size={12} /> Электронный билет
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> Мгновенное получение
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────
export function TicketsBlock({ offers, isOpenDate = false, venueName: _venueName, website }: TicketsBlockProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [quantity, setQuantity] = useState(1);

  if (!offers || offers.length === 0) {
    return (
      <section id="tickets">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Ticket size={20} className="text-blue-600" />
          Билеты
        </h2>
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-gray-500">Билеты скоро появятся</p>
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 text-sm text-blue-600 hover:underline"
            >
              Купить на официальном сайте
            </a>
          )}
        </div>
      </section>
    );
  }

  return (
    <section id="tickets">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Ticket size={20} className="text-blue-600" />
        Билеты
      </h2>

      {/* OPEN_DATE: calendar + quantity row */}
      {isOpenDate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />
          <div className="flex flex-col justify-center gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Количество билетов</p>
              <QuantityPicker value={quantity} onChange={setQuantity} />
            </div>
            {selectedDate && (
              <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">
                    {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })}
                  </span>
                  {' · '}
                  {quantity} {quantity === 1 ? 'билет' : quantity < 5 ? 'билета' : 'билетов'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Non-OPEN_DATE: just quantity */}
      {!isOpenDate && offers.length > 0 && (
        <div className="flex items-center gap-3 mb-5 p-3 bg-gray-50 rounded-xl">
          <p className="text-sm text-gray-600">Количество:</p>
          <QuantityPicker value={quantity} onChange={setQuantity} />
        </div>
      )}

      {/* Offer cards */}
      <div className="space-y-3">
        {offers.map((offer, i) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            index={i}
            quantity={quantity}
            selectedDate={selectedDate}
            isOpenDate={isOpenDate}
          />
        ))}
      </div>

      {/* Trust footer */}
      <p className="mt-3 text-xs text-gray-400 text-center">
        Безопасная покупка · Электронный билет на email · Можно оформить возврат
      </p>
    </section>
  );
}

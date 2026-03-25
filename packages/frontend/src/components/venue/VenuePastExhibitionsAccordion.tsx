'use client';

import type { VenueProgramItemDto } from '@daibilet/shared';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { VenueExhibitionCard } from './VenueExhibitionCard';

const PAGE = 8;

type Props = {
  items: VenueProgramItemDto[];
  totalPast: number;
};

export function VenuePastExhibitionsAccordion({ items, totalPast }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  if (items.length === 0) return null;

  const slice = items.slice(0, visible);

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-900"
        aria-expanded={open}
      >
        <span>Прошедшие выставки {totalPast > 0 ? `(${totalPast})` : ''}</span>
        <ChevronDown size={18} className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-200 px-4 pb-4 pt-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {slice.map((item) => (
              <VenueExhibitionCard key={item.id} item={item} variant="horizontal" />
            ))}
          </div>
          {items.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE)}
              className="mt-3 w-full rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Показать ещё
            </button>
          )}
        </div>
      )}
    </div>
  );
}

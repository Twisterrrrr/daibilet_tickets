'use client';

import { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Hash } from 'lucide-react';
import { CityCard } from '@/components/ui/CityCard';

type CityCardVM = {
  id: string;
  slug: string;
  name: string;
  heroImage: string | null;
  eventCount: number;
  venueCount: number;
  description?: string | null;
  region?: { slug: string; name: string; eventCount: number } | null;
};

interface CitiesListClientProps {
  cities: CityCardVM[];
}

type SortMode = 'events' | 'asc' | 'desc';

export function CitiesListClient({ cities }: CitiesListClientProps) {
  const [sortMode, setSortMode] = useState<SortMode>('events');

  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => {
      if (sortMode === 'events') {
        return b.eventCount - a.eventCount; // больше событий — выше
      }
      const cmp = a.name.localeCompare(b.name, 'ru');
      return sortMode === 'asc' ? cmp : -cmp;
    });
  }, [cities, sortMode]);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Города</h1>
          <p className="mt-2 text-lg text-slate-500">Выберите город — найдём лучшие экскурсии, музеи и мероприятия</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-sm text-slate-500">Сортировка:</span>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setSortMode('events')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              sortMode === 'events' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
            title="По количеству событий"
          >
            <Hash className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">По событиям</span>
          </button>
          <button
            type="button"
            onClick={() => setSortMode('asc')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              sortMode === 'asc' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
            title="По алфавиту А–Я"
          >
            <ArrowDownAZ className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">А–Я</span>
          </button>
          <button
            type="button"
            onClick={() => setSortMode('desc')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              sortMode === 'desc' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
            title="По алфавиту Я–А"
          >
            <ArrowUpAZ className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Я–А</span>
          </button>
        </div>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sortedCities.map((vm) => (
          <CityCard
            key={vm.id}
            slug={vm.slug}
            name={vm.name}
            heroImage={vm.heroImage}
            eventCount={vm.eventCount}
            venueCount={vm.venueCount}
            description={vm.description}
            region={vm.region ?? undefined}
            large
          />
        ))}
      </div>
    </div>
  );
}

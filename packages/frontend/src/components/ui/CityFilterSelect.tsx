'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

interface City {
  slug: string;
  name: string;
  _count?: { events?: number };
}

interface CityFilterSelectProps {
  cities: City[];
  currentCitySlug?: string;
  variant?: 'hero' | 'default';
  showReset?: boolean;
}

export function CityFilterSelect({
  cities,
  currentCitySlug,
  variant = 'default',
  showReset = true,
}: CityFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentCity = cities.find((c) => c.slug === currentCitySlug);
  const label = currentCity?.name ?? 'Все города';

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [search, cities]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isHero = variant === 'hero';
  const triggerClass = isHero
    ? `rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm transition-all ${
        !currentCitySlug
          ? 'border-white/40 bg-white/20 text-white'
          : 'border-white/20 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
      }`
    : `rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        !currentCitySlug
          ? 'bg-primary-600 text-white'
          : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-300 hover:text-primary-700'
      }`;

  return (
    <div ref={containerRef} className="relative inline-flex flex-wrap items-center gap-2">
      {showReset && currentCitySlug && (
        <Link
          href="/"
          scroll={false}
          className={
            isHero
              ? 'inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 backdrop-blur-sm hover:bg-white/20'
              : 'inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800'
          }
        >
          <X className="h-3.5 w-3.5" />
          Сбросить
        </Link>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className={`inline-flex items-center gap-1.5 ${triggerClass}`}
        >
          {label}
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 top-full z-[100] mt-1 min-w-[220px] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
            <div className="border-b border-slate-200 p-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск города..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              <Link
                href="/"
                scroll={false}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium transition-colors ${
                  !currentCitySlug ? 'bg-primary-50 text-primary-700' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                Все города
              </Link>
              {filteredCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/?city=${city.slug}`}
                  scroll={false}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2.5 text-sm transition-colors ${
                    currentCitySlug === city.slug
                      ? 'bg-primary-50 font-medium text-primary-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="block truncate">{city.name}</span>
                  {city._count?.events ? (
                    <span className="mt-0.5 block text-xs text-slate-400">{city._count.events} событий</span>
                  ) : null}
                </Link>
              ))}
              {filteredCities.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-slate-500">Ничего не найдено</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

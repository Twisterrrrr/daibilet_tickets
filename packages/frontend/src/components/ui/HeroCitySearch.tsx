'use client';

import { MapPin, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

interface City {
  slug: string;
  name: string;
  _count?: { events?: number };
}

interface HeroCitySearchProps {
  cities: City[];
  initialCitySlug?: string;
}

const TOP_COUNT = 5;

export function HeroCitySearch({ cities, initialCitySlug }: HeroCitySearchProps) {
  const router = useRouter();
  const initialName = cities.find((c) => c.slug === initialCitySlug)?.name ?? '';
  const [query, setQuery] = useState(initialName);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (initialCitySlug) {
      const city = cities.find((c) => c.slug === initialCitySlug);
      setQuery(city?.name ?? '');
    } else {
      setQuery('');
    }
  }, [initialCitySlug, cities]);
  const containerRef = useRef<HTMLDivElement>(null);

  const topByEvents = useMemo(
    () => [...cities].sort((a, b) => (b._count?.events ?? 0) - (a._count?.events ?? 0)).slice(0, TOP_COUNT),
    [cities],
  );

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topByEvents;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [query, cities, topByEvents]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    const q = query.trim().toLowerCase();
    const exact = cities.find((c) => c.slug === query || c.name.toLowerCase() === q);
    const city = exact ?? (filteredCities.length === 1 ? filteredCities[0] : null);
    if (city) {
      router.push(`/?city=${city.slug}`, { scroll: false });
    } else {
      router.push('/events');
    }
  };

  const handleCitySelect = (slug: string) => {
    const city = cities.find((c) => c.slug === slug);
    if (city) {
      setQuery(city.name);
    }
    setIsOpen(false);
    router.push(`/?city=${slug}`, { scroll: false });
  };

  const showDropdown = isOpen && filteredCities.length > 0;

  return (
    <div ref={containerRef} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 shadow-lg sm:rounded-l-xl sm:rounded-r-none">
          <MapPin className="h-5 w-5 flex-shrink-0 text-primary-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Выберите город или введите название"
            className="min-w-0 flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 outline-none"
          />
        </div>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-64 overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
            {filteredCities.map((city) => (
              <button
                key={city.slug}
                type="button"
                onClick={() => handleCitySelect(city.slug)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-primary-50"
              >
                <span className="font-medium text-slate-700">{city.name}</span>
                {city._count?.events ? (
                  <span className="text-xs text-slate-400">{city._count.events} событий</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-[0.98] sm:rounded-l-none sm:rounded-r-xl"
      >
        <Search className="h-5 w-5" />
        <span>Найти</span>
      </button>
    </div>
  );
}

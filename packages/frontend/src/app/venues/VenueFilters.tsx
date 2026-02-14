'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { VENUE_TYPE_LABELS, type VenueType } from '@daibilet/shared';

interface VenueFiltersProps {
  cities: Array<{ slug: string; name: string }>;
  currentCity: string;
  currentType: string;
  currentSort: string;
}

const SORT_OPTIONS = [
  { value: 'rating', label: 'По рейтингу' },
  { value: 'price', label: 'По цене' },
  { value: 'name', label: 'По названию' },
];

export function VenueFilters({
  cities,
  currentCity,
  currentType,
  currentSort,
}: VenueFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page'); // Reset page on filter change
    router.push(`/venues?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* City filter */}
      <select
        value={currentCity}
        onChange={(e) => updateFilter('city', e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Все города</option>
        {cities.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Type filter */}
      <select
        value={currentType}
        onChange={(e) => updateFilter('venueType', e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">Все типы</option>
        {Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={currentSort}
        onChange={(e) => updateFilter('sort', e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

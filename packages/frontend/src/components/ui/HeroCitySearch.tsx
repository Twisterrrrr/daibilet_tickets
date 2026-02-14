'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ChevronDown } from 'lucide-react';

interface City {
  slug: string;
  name: string;
  _count?: { events?: number };
}

interface HeroCitySearchProps {
  cities: City[];
}

export function HeroCitySearch({ cities }: HeroCitySearchProps) {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    if (selectedCity) {
      router.push(`/cities/${selectedCity}`);
    } else {
      router.push('/events');
    }
  };

  const handleCitySelect = (slug: string) => {
    setSelectedCity(slug);
    setIsOpen(false);
  };

  const selectedCityName = cities.find((c) => c.slug === selectedCity)?.name || '';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      {/* City selector */}
      <div className="relative flex-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-left shadow-lg transition-shadow hover:shadow-xl sm:rounded-l-xl sm:rounded-r-none"
        >
          <MapPin className="h-5 w-5 flex-shrink-0 text-primary-500" />
          <span className={selectedCityName ? 'text-slate-900 font-medium' : 'text-slate-400'}>
            {selectedCityName || 'Выберите город'}
          </span>
          <ChevronDown className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-64 overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-slate-200">
            {cities.map((city) => (
              <button
                key={city.slug}
                onClick={() => handleCitySelect(city.slug)}
                className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-primary-50 ${
                  selectedCity === city.slug ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
                }`}
              >
                <span className="font-medium">{city.name}</span>
                {city._count?.events ? (
                  <span className="text-xs text-slate-400">{city._count.events} событий</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search button */}
      <button
        onClick={handleSubmit}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl active:scale-[0.98] sm:rounded-l-none sm:rounded-r-xl"
      >
        <Search className="h-5 w-5" />
        <span>Найти</span>
      </button>
    </div>
  );
}

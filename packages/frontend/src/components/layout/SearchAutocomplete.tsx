'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, X, MapPin, Ticket, Loader2, ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@daibilet/shared';

interface SearchResult {
  events: any[];
  cities: any[];
}

export function SearchAutocomplete() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.search(q);
      setResults(res);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const openSearch = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const navigate = (path: string) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    router.push(path);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.length >= 2) {
      navigate(`/events?q=${encodeURIComponent(query)}`);
    }
  };

  const hasResults = results && (results.events.length > 0 || results.cities.length > 0);
  const noResults = results && results.events.length === 0 && results.cities.length === 0 && query.length >= 2;

  return (
    <div ref={containerRef} className="relative">
      {/* Search trigger button */}
      {!open && (
        <button
          onClick={openSearch}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="Поиск"
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:inline">Поиск</span>
        </button>
      )}

      {/* Expanded search */}
      {open && (
        <>
          {/* Mobile: full-screen overlay */}
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />

          <div className="fixed inset-x-0 top-0 z-50 bg-white p-3 shadow-xl md:absolute md:inset-auto md:right-0 md:top-auto md:mt-1 md:w-[440px] md:rounded-xl md:border md:border-slate-200 md:p-0 md:shadow-2xl">
            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 md:px-4 md:pt-3 md:pb-2">
              <Search className="h-5 w-5 flex-shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Город, событие, музей..."
                className="flex-1 bg-transparent text-base text-slate-900 placeholder-slate-400 outline-none md:text-sm"
                autoComplete="off"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              <button
                type="button"
                onClick={() => { setOpen(false); setQuery(''); setResults(null); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </form>

            {/* Results */}
            {(hasResults || noResults) && (
              <div className="max-h-[70vh] overflow-y-auto border-t border-slate-100 md:max-h-96">
                {/* Cities */}
                {results!.cities.length > 0 && (
                  <div className="px-3 py-2 md:px-4">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Города</p>
                    {results!.cities.slice(0, 4).map((city: any) => (
                      <button
                        key={city.slug}
                        onClick={() => navigate(`/cities/${city.slug}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
                      >
                        <MapPin className="h-4 w-4 flex-shrink-0 text-primary-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{city.name}</p>
                          {city._count?.events > 0 && (
                            <p className="text-xs text-slate-400">{city._count.events} событий</p>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Events */}
                {results!.events.length > 0 && (
                  <div className="px-3 py-2 md:px-4">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">События</p>
                    {results!.events.slice(0, 6).map((event: any) => (
                      <button
                        key={event.id || event.slug}
                        onClick={() => navigate(`/events/${event.slug}`)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"
                      >
                        {event.imageUrl ? (
                          <img
                            src={event.imageUrl}
                            alt=""
                            className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 flex-shrink-0">
                            <Ticket className="h-4 w-4 text-primary-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{event.title}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            {event.city?.name && <span>{event.city.name}</span>}
                            {event.priceFrom > 0 && (
                              <span className="font-medium text-slate-600">от {formatPrice(event.priceFrom)}</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                      </button>
                    ))}
                  </div>
                )}

                {/* View all */}
                {query.length >= 2 && (results!.events.length > 0 || results!.cities.length > 0) && (
                  <div className="border-t border-slate-100 px-3 py-2.5 md:px-4">
                    <button
                      onClick={() => navigate(`/events?q=${encodeURIComponent(query)}`)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
                    >
                      Все результаты по «{query}»
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* No results */}
                {noResults && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-slate-500">Ничего не найдено по «{query}»</p>
                    <p className="mt-1 text-xs text-slate-400">Попробуйте другой запрос</p>
                  </div>
                )}
              </div>
            )}

            {/* Quick links when empty */}
            {query.length < 2 && !results && (
              <div className="border-t border-slate-100 px-3 py-3 md:px-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Популярное</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Развод мостов', 'Эрмитаж', 'Москва-река', 'Казанский Кремль', 'Петергоф'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setQuery(tag)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

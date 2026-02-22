'use client';

import { ChevronDown, Compass, Heart, HelpCircle, MapPin, Menu, Search, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { useFavorites } from '@/hooks/useFavorites';
import { useUserAuthOptional } from '@/hooks/useUserAuth';
import { api } from '@/lib/api';

import { SearchAutocomplete } from './SearchAutocomplete';

const navigation = [
  { name: 'Экскурсии', href: '/events?category=EXCURSION' },
  { name: 'Музеи и Арт', href: '/events?category=MUSEUM' },
  { name: 'Мероприятия', href: '/events?category=EVENT' },
  { name: 'Подборки', href: '/podborki' },
  { name: 'Города', href: '/cities' },
  { name: 'Блог', href: '/blog' },
];

interface HeaderCity {
  slug: string;
  name: string;
}

function HeaderCitySelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cities, setCities] = useState<HeaderCity[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.getCities();
        if (!cancelled) {
          setCities(
            (data || []).map((c: any) => ({
              slug: c.slug,
              name: c.name,
            })),
          );
        }
      } catch {
        if (!cancelled) setCities([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [search, cities]);

  const currentCitySlug = searchParams.get('city');
  const currentCity = cities.find((c) => c.slug === currentCitySlug);
  const label = currentCity?.name || 'Все города';

  const handleSelect = (slug?: string) => {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set('city', slug);
    } else {
      params.delete('city');
    }
    const query = params.toString();
    const path = typeof window !== 'undefined' && window.location.pathname === '/' ? '/' : '/events';
    router.push(`${path}${query ? `?${query}` : ''}`);
  };

  if (cities.length === 0) {
    return null;
  }

  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
      >
        <MapPin className="h-4 w-4 text-primary-500" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
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
            {filteredCities.map((city) => (
              <button
                key={city.slug}
                type="button"
                onClick={() => handleSelect(city.slug)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                <span className="truncate">{city.name}</span>
              </button>
            ))}
            {filteredCities.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-slate-500">Ничего не найдено</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const auth = useUserAuthOptional();
  const { slugs, mounted } = useFavorites();
  const favoritesCount = mounted ? slugs.length : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav className="container-page flex h-16 items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Compass className="h-7 w-7 text-primary-600" />
          <span className="text-xl font-bold text-slate-900">
            Дай<span className="text-primary-600">билет</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right side: city selector (desktop) + search + help + mobile menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Suspense fallback={null}>
            <HeaderCitySelect />
          </Suspense>
          <SearchAutocomplete />
          <Link
            href="/favorites"
            className="relative flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-rose-500 sm:inline-flex"
            title="Избранное"
          >
            <Heart className="h-5 w-5" />
            {favoritesCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {favoritesCount > 99 ? '99+' : favoritesCount}
              </span>
            )}
          </Link>
          <Link
            href="/help"
            className="hidden items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:inline-flex"
            title="Помощь"
          >
            <HelpCircle className="h-5 w-5" />
          </Link>
          {auth?.isLoggedIn ? (
            <span className="hidden text-sm text-slate-600 sm:inline">{auth.user?.name}</span>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 sm:inline-flex"
            >
              Войти
            </Link>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="container-page space-y-1 py-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/favorites"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <Heart className="h-5 w-5" />
              Избранное {favoritesCount > 0 && `(${favoritesCount})`}
            </Link>
            <Link
              href="/help"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <HelpCircle className="h-5 w-5" />
              Помощь
            </Link>
            {auth?.isLoggedIn ? (
              <span className="block px-3 py-2.5 text-sm text-slate-500">{auth.user?.name}</span>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-medium text-primary-600 hover:bg-primary-50"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

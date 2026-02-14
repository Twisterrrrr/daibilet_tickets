'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, Compass, HelpCircle } from 'lucide-react';
import { SearchAutocomplete } from './SearchAutocomplete';
import { CartIcon } from '@/components/ui/CartDrawer';

const navigation = [
  { name: 'Экскурсии', href: '/events?category=EXCURSION' },
  { name: 'Музеи и Арт', href: '/venues' },
  { name: 'Мероприятия', href: '/events?category=EVENT' },
  { name: 'Подборки', href: '/podborki' },
  { name: 'Города', href: '/cities' },
  { name: 'Блог', href: '/blog' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

        {/* Right side: search + cart + mobile menu */}
        <div className="flex items-center gap-1 sm:gap-2">
          <SearchAutocomplete />
          <CartIcon />

          <Link
            href="/help"
            className="hidden items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:inline-flex"
            title="Помощь"
          >
            <HelpCircle className="h-5 w-5" />
          </Link>

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
              href="/help"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <HelpCircle className="h-5 w-5" />
              Помощь
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

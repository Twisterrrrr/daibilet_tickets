'use client';

import {
  Heart,
  LayoutDashboard,
  Loader2,
  LogIn,
  MessageCircle,
  Ticket,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useUserAuth } from '@/hooks/useUserAuth';

const nav = [
  { href: '/account', label: 'Обзор', icon: LayoutDashboard },
  { href: '/account/purchases', label: 'Мои покупки', icon: Ticket },
  { href: '/account/reviews', label: 'Мои отзывы', icon: MessageCircle },
  { href: '/account/favorites', label: 'Избранное', icon: Heart },
  { href: '/account/profile', label: 'Профиль', icon: User },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, token } = useUserAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn || !token) {
      const returnUrl = encodeURIComponent(pathname || '/account/purchases');
      router.replace(`/login?returnUrl=${returnUrl}`);
    }
  }, [isLoading, isLoggedIn, token, pathname, router]);

  if (isLoading) {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20">
        <p className="text-slate-600">Требуется вход в аккаунт</p>
        <Link
          href={`/login?returnUrl=${encodeURIComponent(pathname || '/account/purchases')}`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          <LogIn className="h-4 w-4" />
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row">
        <aside className="w-full flex-shrink-0 md:w-52">
          <nav className="sticky top-24 space-y-0.5 rounded-xl border border-slate-200 bg-white p-2">
            {nav.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/account' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

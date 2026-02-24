import type { CityListItem } from '@daibilet/shared';
import { Compass } from 'lucide-react';
import Link from 'next/link';

import { api } from '@/lib/api';

interface FooterCity {
  slug: string;
  name: string;
  total: number;
}

interface FooterLink {
  name: string;
  href: string;
}

type FooterSection = 'Каталог' | 'Города' | 'Компания';

const staticFooterLinks = {
  Каталог: [
    { name: 'Экскурсии', href: '/events?category=EXCURSION' },
    { name: 'Музеи', href: '/events?category=MUSEUM' },
    { name: 'Мероприятия', href: '/events?category=EVENT' },
  ],
  Компания: [
    { name: 'О сервисе', href: '/about' },
    { name: 'Правовая информация', href: '/legal' },
    { name: 'Стать партнёром', href: '/partner' },
    { name: 'Подарочный сертификат', href: '/gift-certificate' },
    { name: 'Блог', href: '/blog' },
    { name: 'Помощь', href: '/help' },
    { name: 'Контакты', href: '/contacts' },
  ],
};

export async function Footer() {
  // Топ-города по количеству событий и мест (по городам, которые реально отображаются)
  let cities: FooterCity[] = [];
  try {
    const all: CityListItem[] = await api.getTopCities();
    cities = (all || [])
      .map((c) => {
        const events = c._count?.events ?? 0;
        const museumCount = c.museumCount ?? c._count?.venues ?? 0;
        const total = events + museumCount;
        return {
          slug: c.slug,
          name: c.name,
          total,
        };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  } catch {
    // Fallback — без блока городов
    cities = [];
  }

  const footerLinks = {
    ...staticFooterLinks,
    ...(cities.length > 0 && {
      Города: cities.map((c) => ({
        name: c.name,
        href: `/cities/${c.slug}`,
      })),
    }),
  };

  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-page py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <Compass className="h-6 w-6 text-primary-600" />
              <span className="text-lg font-bold text-slate-900">
                Дай<span className="text-primary-600">билет</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              Билеты на экскурсии, музеи и мероприятия по городам России.
              <br />
              Покупайте онлайн, посещайте лучшее!
            </p>
            <div className="mt-4 space-y-1.5 text-base font-medium leading-none text-slate-800">
              <a href="tel:+78001234567" className="block transition-colors hover:text-primary-600">
                8 800 123-45-67
              </a>
              <a href="mailto:info@daibilet.ru" className="block transition-colors hover:text-primary-600">
                info@daibilet.ru
              </a>
            </div>
          </div>

          {/* Links (каталог, города, компания). Порядок: Каталог → Города → Компания */}
          {(['Каталог', 'Города', 'Компания'] as FooterSection[]).map((section) => {
            const links = footerLinks[section] as FooterLink[] | undefined;
            if (!links || links.length === 0) return null;
            return (
              <div key={section}>
                <h3 className="text-sm font-semibold text-slate-900">{section}</h3>
                <ul className="mt-3 space-y-2">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-500 transition-colors hover:text-primary-600"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-slate-200 pt-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-slate-900">
                &copy; {new Date().getFullYear()} Дайбилет
              </p>
              <p className="mt-1 text-sm text-slate-400">ИП Бутин В.А. · ИНН 781125361276</p>
            </div>
            <div className="flex flex-col gap-2 text-right sm:ml-auto">
              <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 sm:gap-x-6">
                <Link href="/privacy#user-agreement" className="text-sm text-slate-400 hover:text-slate-600">
                  Пользовательское соглашение
                </Link>
                <Link href="/privacy#privacy-policy" className="text-sm text-slate-400 hover:text-slate-600">
                  Политика конфиденциальности
                </Link>
                <Link href="/offer" className="text-sm text-slate-400 hover:text-slate-600">
                  Договор-оферта (для партнёров)
                </Link>
              </div>
              <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 sm:gap-x-6">
                <Link href="/legal#refunds" className="text-sm text-slate-400 hover:text-slate-600">
                  Правила возврата
                </Link>
                <Link href="/legal#rightsholders" className="text-sm text-slate-400 hover:text-slate-600">
                  Правообладателям
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

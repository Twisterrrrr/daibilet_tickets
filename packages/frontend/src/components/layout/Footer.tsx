import { Compass } from 'lucide-react';
import Link from 'next/link';

import { api } from '@/lib/api';

const staticFooterLinks = {
  Каталог: [
    { name: 'Экскурсии', href: '/events?category=EXCURSION' },
    { name: 'Музеи', href: '/events?category=MUSEUM' },
    { name: 'Мероприятия', href: '/events?category=EVENT' },
  ],
  Компания: [
    { name: 'О сервисе', href: '/about' },
    { name: 'Подарочный сертификат', href: '/gift-certificate' },
    { name: 'Блог', href: '/blog' },
    { name: 'Помощь', href: '/help' },
    { name: 'Контакты', href: '/contacts' },
  ],
};

export async function Footer() {
  // Топ-города по количеству событий и мест (по городам, которые реально отображаются)
  let cities: any[] = [];
  try {
    const all = await api.getTopCities();
    cities = (all || [])
      .map((c: any) => {
        const events = c._count?.events ?? 0;
        const museumCount = (c.museumCount as number | undefined) ?? c._count?.venues ?? 0;
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
            <p className="mt-3 text-sm text-slate-500">Билеты на экскурсии, музеи и мероприятия по городам России.</p>
          </div>

          {/* Links (каталог, города, компания). Порядок: Каталог → Города → Компания */}
          {(['Каталог', 'Города', 'Компания'] as const).map((section) => {
            const links = (footerLinks as any)[section];
            if (!links || links.length === 0) return null;
            return (
              <div key={section}>
                <h3 className="text-sm font-semibold text-slate-900">{section}</h3>
                <ul className="mt-3 space-y-2">
                  {links.map((link: any) => (
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
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-sm text-slate-400">&copy; {new Date().getFullYear()} Дайбилет. ИП Бутин В.А.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-slate-400 hover:text-slate-600">
              Конфиденциальность
            </Link>
            <Link href="/terms" className="text-sm text-slate-400 hover:text-slate-600">
              Оферта
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

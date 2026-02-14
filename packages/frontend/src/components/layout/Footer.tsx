import Link from 'next/link';
import { Compass } from 'lucide-react';

const footerLinks = {
  'Каталог': [
    { name: 'Экскурсии', href: '/events?category=EXCURSION' },
    { name: 'Музеи', href: '/events?category=MUSEUM' },
    { name: 'Мероприятия', href: '/events?category=EVENT' },
  ],
  'Города': [
    { name: 'Санкт-Петербург', href: '/cities/saint-petersburg' },
    { name: 'Москва', href: '/cities/moscow' },
    { name: 'Казань', href: '/cities/kazan' },
    { name: 'Калининград', href: '/cities/kaliningrad' },
    { name: 'Нижний Новгород', href: '/cities/nizhny-novgorod' },
    { name: 'Владимир', href: '/cities/vladimir' },
    { name: 'Ярославль', href: '/cities/yaroslavl' },
  ],
  'Компания': [
    { name: 'О сервисе', href: '/about' },
    { name: 'Блог', href: '/blog' },
    { name: 'Помощь', href: '/help' },
    { name: 'Контакты', href: '/contacts' },
  ],
};

export function Footer() {
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
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
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
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} Дайбилет. ИП Бутин В.А.
          </p>
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

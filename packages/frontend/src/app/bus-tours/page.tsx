import type { Metadata } from 'next';
import Link from 'next/link';

import { api } from '@/lib/api';
import { catalogEventsHref } from '@/lib/catalog-events-url';

import {
  BUS_TOUR_HUB_RELATED,
  busTourCanonicalHref,
  isBusToursHubLanding,
} from './bus-tours-routing';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Обзорные автобусные экскурсии по России — расписание и цены 2026 | Дайбилет',
  description:
    'Обзорные и тематические автобусные экскурсии по городам России: канонические страницы /cities/…/avtobusnye-ekskursii с расписанием и ценами.',
  alternates: { canonical: '/bus-tours' },
};

type LandingRow = {
  slug: string;
  title: string;
  subtitle?: string | null;
  city?: { slug: string; name: string } | null;
};

export default async function BusToursHubPage() {
  const landings = (await api.getLandings().catch(() => [])) as LandingRow[];

  const hubCards = landings
    .filter((l) => isBusToursHubLanding(l))
    .map((l) => {
      const citySlug = l.city?.slug;
      if (!citySlug) return null;
      return {
        key: `${citySlug}-${l.slug}`,
        citySlug,
        cityName: l.city?.name ?? citySlug,
        href: busTourCanonicalHref(citySlug),
        hint:
          typeof l.subtitle === 'string' && l.subtitle.trim() ? l.subtitle : 'Открыть подборку →',
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => a.cityName.localeCompare(b.cityName, 'ru'));

  return (
    <div className="container-page py-8 sm:py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
          Автобусные экскурсии и обзорные туры
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Ниже — города, где в каталоге есть <strong className="font-semibold text-slate-800">активная</strong> подборка
          автобусных и обзорных экскурсий (данные из API лендингов). Карточки ведут на{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">/cities/…/avtobusnye-ekskursii</code>.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Короткий путь <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/bus-tours/город</code> — редирект на тот
          же канон. Пока мало событий с городским тегом кластера, лендинг не активируется и город не попадает в этот список.
        </p>
        <p className="mt-4">
          <Link
            href={catalogEventsHref({ category: 'EXCURSION', subcategory: 'BUS' })}
            className="inline-flex text-sm font-semibold text-primary-700 hover:text-primary-900 hover:underline"
          >
            Все автобусные экскурсии в общем каталоге /events →
          </Link>
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-slate-900">Города с открытой подборкой</h2>
        {hubCards.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">
            Пока нет городов с активным лендингом в этом кластере — загляните позже или откройте каталог событий по городу.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-600">Выберите город.</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {hubCards.map((c) => (
                <div
                  key={c.key}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300"
                >
                  <Link href={c.href} className="block p-4 hover:bg-slate-50">
                    <div className="text-base font-bold text-slate-900">{c.cityName}</div>
                    <div className="mt-1 text-sm text-slate-500">{c.hint}</div>
                    <div className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                      Алиас: /bus-tours/{c.citySlug}
                    </div>
                  </Link>
                  <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5">
                    <Link
                      href={catalogEventsHref({
                        city: c.citySlug,
                        category: 'EXCURSION',
                        subcategory: 'BUS',
                      })}
                      className="text-xs font-semibold text-primary-700 hover:text-primary-900 hover:underline"
                    >
                      Этот город в каталоге /events →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 sm:p-7">
        <h2 className="text-lg font-bold text-slate-900">Смежные направления</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {BUS_TOUR_HUB_RELATED.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/40"
              >
                <span className="font-semibold text-slate-900">{item.title}</span>
                <span className="mt-1 block text-sm text-slate-600">{item.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

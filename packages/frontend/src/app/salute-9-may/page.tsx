import type { Metadata } from 'next';
import Link from 'next/link';

import { api } from '@/lib/api';

import { SALUTE_TAG, saluteContentForCity } from './salute-content';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Салют 9 мая 2026 — по городам России | Дайбилет',
  description: 'Выберите город и сравните варианты: теплоходы, рестораны, крыши и обзорные точки.',
  alternates: { canonical: '/salute-9-may' },
};

export default async function Salute9MayRootPage() {
  const content = saluteContentForCity();
  const landings = await api.getLandings().catch(() => []);
  const saluteLandings = landings.filter((l) => l.slug === 'salute-9-may');
  const saluteHub = saluteLandings
    .map((l) => {
      const c = l.city as { slug?: string; name?: string } | undefined;
      if (!c?.slug || !c.name) return null;
      return { id: l.id, citySlug: c.slug, cityName: c.name, title: typeof l.title === 'string' ? l.title : '' };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
  const featured = await api.getCities(true).catch(() => []);
  const cities =
    featured.length > 0 ? featured : await api.getCities().catch(() => []);

  return (
    <div className="container-page py-8 sm:py-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
          Салют 9 мая 2026 в России
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Выберите город, чтобы увидеть варианты с билетами и комфортные точки просмотра. Фильтр каталога: тег{' '}
          <span className="font-semibold">{SALUTE_TAG}</span>.
        </p>
        {content.introText ? <p className="mt-4 text-sm text-slate-700 leading-relaxed">{content.introText}</p> : null}
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">Города</h2>
        <p className="mt-1 text-sm text-slate-500">
          Канонические страницы ведут на лендинги в каталоге:{' '}
          <span className="font-mono text-xs">/cities/…/salute-9-may</span> (редактируются в админке).
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {saluteHub.length > 0
            ? saluteHub.map((row) => (
                <Link
                  key={row.id}
                  href={`/cities/${row.citySlug}/salute-9-may`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <div className="text-base font-bold text-slate-900">{row.cityName}</div>
                  <div className="mt-1 text-sm text-slate-500">{row.title || 'Открыть'}</div>
                </Link>
              ))
            : cities.map((c) => (
                <Link
                  key={c.id}
                  href={`/cities/${c.slug}/salute-9-may`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <div className="text-base font-bold text-slate-900">{c.name}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {c._count?.events ? `${c._count.events} событий в каталоге` : 'Открыть'}
                  </div>
                </Link>
              ))}
        </div>
      </section>
    </div>
  );
}


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
  const cities = await api.getCities(true).catch(() => api.getCities().catch(() => []));

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
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cities.map((c) => (
            <Link
              key={c.id}
              href={`/salute-9-may/${c.slug}`}
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


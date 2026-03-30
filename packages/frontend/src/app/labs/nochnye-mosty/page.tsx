import { ArrowDown, Star } from 'lucide-react';
import type { Metadata } from 'next';

import { LandingClient } from '@/app/cities/[slug]/[landingSlug]/LandingClient';
import { toLandingVM } from '@/app/cities/_landingVm';
import { api } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Ночные прогулки на развод мостов в Санкт-Петербурге сегодня — расписание и билеты (лаборатория)',
  description:
    'Экспериментальная версия лендинга ночных прогулок на развод мостов в Санкт-Петербурге: новый список рейсов, фильтры-чипы и карточки с оптимальным выбором.',
};

export default async function NochnyeMostyLabPage() {
  const citySlug = 'saint-petersburg';
  const landingSlug = 'nochnye-mosty';

  const data = await api.getLandingBySlug(landingSlug);
  const { vm } = toLandingVM(data);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="container-page mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Лаборатория UX — ночные мосты
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
              Ночные прогулки на развод мостов в Санкт-Петербурге сегодня — расписание и билеты
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Экспериментальная версия списка рейсов: один ближайший слот на рейс, фильтры-чипы по дате, времени и
              причалам, сортировка и выделение оптимального выбора.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-slate-100">
            <div className="flex items-center gap-2 font-semibold">
              <Star className="h-4 w-4 text-amber-400" />
              Только для сравнения
            </div>
            <p className="mt-1 text-xs text-slate-300">
              Это экспериментальный список рейсов. Базовый лендинг по-прежнему доступен по адресу
              {' '}
              <a href={`/cities/${citySlug}/${landingSlug}`} className="underline decoration-dotted underline-offset-4">
                /cities/{citySlug}/{landingSlug}
              </a>
              .
            </p>
          </div>
        </div>
      </header>

      <main className="container-page mx-auto px-4 pb-16 pt-6">
        <section id="variants" className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/40 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white sm:text-xl">Все ночные рейсы</h2>
              <p className="mt-1 text-xs text-slate-300 sm:text-sm">
                Один ближайший слот на каждый рейс. Фильтры по дате, времени и причалам + выделение оптимального выбора.
              </p>
            </div>
            <a
              href="#variants-list"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-primary-700 shadow-md hover:bg-primary-50 transition-colors sm:text-sm"
            >
              Перейти к списку рейсов
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          <div id="variants-list">
            <LandingClient
              citySlug={citySlug}
              variants={vm.variants}
              filters={vm.filters}
              templateType={vm.templateType}
              timeSlotMode="night"
            />
          </div>
        </section>
      </main>
    </div>
  );
}


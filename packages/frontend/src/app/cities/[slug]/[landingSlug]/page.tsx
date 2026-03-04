import { ArrowDown, ChevronRight, Shield, Star, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  HowToChoose,
  InfoBlocks,
  LegalDisclaimer,
  RelatedLinks,
  ReviewsSection,
  StatsBadge,
} from '@/components/landing/ContentSections';
import { FaqSection } from '@/components/landing/FaqSection';
import { api } from '@/lib/api';
import { getLandingCitySlug, toLandingVM } from '../../_landingVm';

import { LandingClient } from './LandingClient';

// ISR: обновлять каждые 6 часов (21600 секунд)
export const revalidate = 21600;

/** Предварительная генерация страниц для всех активных лендингов */
export async function generateStaticParams() {
  try {
    const landings = await api.getLandings();
    return landings
      .map((lp) => {
        const citySlug = getLandingCitySlug(lp);
        return citySlug ? { slug: citySlug, landingSlug: lp.slug } : null;
      })
      .filter((p): p is { slug: string; landingSlug: string } => p != null);
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string; landingSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { landingSlug } = await params;
  try {
    const data = await api.getLandingBySlug(landingSlug);
    const l = data.landing;
    const title = typeof l.metaTitle === 'string' ? l.metaTitle : l.title;
    const description =
      (typeof l.metaDescription === 'string' ? l.metaDescription : null) ||
      (typeof l.subtitle === 'string' ? l.subtitle : null) ||
      undefined;
    return { title, description };
  } catch {
    return { title: 'Страница не найдена' };
  }
}

function pluralReis(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} рейсов`;
  if (mod10 === 1) return `${n} рейс`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} рейса`;
  return `${n} рейсов`;
}

export default async function LandingPage({ params }: Props) {
  const { slug: citySlug, landingSlug } = await params;

  let data;
  try {
    data = await api.getLandingBySlug(landingSlug);
  } catch {
    notFound();
  }

  const { vm, total } = toLandingVM(data);
  const { city, ...landing } = vm;

  if (!city || city.slug !== citySlug) {
    notFound();
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="container-page relative py-12 sm:py-16 lg:py-20">
          {/* Breadcrumbs */}
          <nav className="mb-5 flex items-center gap-1.5 text-sm text-primary-300/70">
            <Link href="/" className="hover:text-white transition-colors">
              Главная
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/cities/${citySlug}`} className="hover:text-white transition-colors">
              {city.name}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-primary-200">{landing.title.split('—')[0].trim()}</span>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: title + subtitle */}
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {landing.title}
              </h1>

              {landing.subtitle && <p className="mt-3 text-base text-primary-200/90 sm:text-lg">{landing.subtitle}</p>}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#variants"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-primary-700 shadow-lg hover:bg-primary-50 transition-colors"
                >
                  Смотреть рейсы
                  <ArrowDown className="h-4 w-4" />
                </a>
                <a
                  href="#how-to-choose"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/30 bg-white/5 backdrop-blur-sm px-6 py-3 text-base font-medium text-white hover:bg-white/10 transition-colors"
                >
                  Как выбрать маршрут
                </a>
              </div>
            </div>

            {/* Right: trust block */}
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4 sm:p-5 lg:min-w-[300px]">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Shield className="h-4 w-4 text-emerald-400" />
                Проверенные организаторы
              </div>
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-primary-100">
                    {total > 0 ? `${pluralReis(total)} доступно` : 'Рейсы появятся ближе к сезону'}
                  </span>
                </div>
                {(vm.stats?.totalSold ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span className="text-sm text-primary-100">
                      Более {Number(vm.stats?.totalSold ?? 0).toLocaleString('ru-RU')} проданных билетов
                    </span>
                  </div>
                )}
                {(vm.stats?.avgRating ?? 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-emerald-300">
                      {vm.stats?.avgRating} / 5 — средняя оценка
                    </span>
                  </div>
                )}
              </div>
              <p className="mt-3 text-[11px] text-primary-300/60 leading-relaxed">
                Покупка — через билетную систему организатора. Мы помогаем сравнить предложения.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="container-page py-6 sm:py-10">
        {/* Filters + Table/Cards */}
        <div id="variants">
          <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">Расписание рейсов</h2>
          <LandingClient variants={vm.variants} filters={vm.filters} />
        </div>

        {/* Stats Badge */}
        {vm.stats && (
          <div className="mt-10">
            <StatsBadge stats={vm.stats} />
          </div>
        )}

        {/* How to Choose */}
        <HowToChoose items={vm.howToChoose} />

        {/* Info Blocks (bridge schedule etc.) */}
        <InfoBlocks items={vm.blocks} />

        {/* FAQ */}
        <FaqSection items={vm.faq} />

        {/* Reviews */}
        <ReviewsSection items={vm.reviews} />

        {/* Related Links */}
        <RelatedLinks items={vm.relatedLinks} />

        {/* Legal */}
        <LegalDisclaimer text={vm.legalText ?? undefined} />
      </div>
    </>
  );
}

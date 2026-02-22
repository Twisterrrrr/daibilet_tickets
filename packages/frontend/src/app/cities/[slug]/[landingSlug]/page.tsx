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

import { LandingClient, type Filters, type Variant } from './LandingClient';

// ISR: обновлять каждые 6 часов (21600 секунд)
export const revalidate = 21600;

/** Предварительная генерация страниц для всех активных лендингов */
export async function generateStaticParams() {
  try {
    const landings = await api.getLandings();
    return landings
      .filter((lp) => lp.city)
      .map((lp) => ({ slug: lp.city!.slug, landingSlug: lp.slug }));
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
    const landing = data.landing;
    if (!landing) return { title: 'Страница не найдена' };
    return {
      title: landing.metaTitle || landing.title,
      description: (landing.metaDescription || landing.subtitle) ?? undefined,
    };
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

  let data: Awaited<ReturnType<typeof api.getLandingBySlug>>;
  try {
    data = await api.getLandingBySlug(landingSlug);
  } catch {
    notFound();
  }

  if (!data.landing?.city || data.landing.city.slug !== citySlug) {
    notFound();
  }

  const { landing, variants, filters, total } = data;

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
              {landing.city.name}
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
                    {(total ?? 0) > 0 ? `${pluralReis(total ?? 0)} доступно` : 'Рейсы появятся ближе к сезону'}
                  </span>
                </div>
                {landing.stats?.totalSold && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-400 flex-shrink-0" />
                    <span className="text-sm text-primary-100">
                      Более {Number(landing.stats.totalSold).toLocaleString('ru-RU')} проданных билетов
                    </span>
                  </div>
                )}
                {landing.stats?.avgRating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-emerald-300">
                      {landing.stats.avgRating} / 5 — средняя оценка
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
          <LandingClient variants={(variants ?? []) as unknown as Variant[]} filters={(filters ?? {}) as unknown as Filters} />
        </div>

        {/* Stats Badge */}
        {landing.stats && (
          <div className="mt-10">
            <StatsBadge
              stats={{
                soldTickets: (landing.stats as { soldTickets?: number; totalSold?: number }).soldTickets
                  ?? (landing.stats as { totalSold?: number }).totalSold ?? 0,
                avgRating: landing.stats.avgRating ?? 0,
              }}
            />
          </div>
        )}

        {/* How to Choose */}
        <HowToChoose items={(landing.howToChoose ?? []) as Parameters<typeof HowToChoose>[0]['items']} />

        {/* Info Blocks (bridge schedule etc.) */}
        <InfoBlocks items={(landing.infoBlocks ?? []) as Parameters<typeof InfoBlocks>[0]['items']} />

        {/* FAQ */}
        <FaqSection items={(landing.faq ?? []) as Parameters<typeof FaqSection>[0]['items']} />

        {/* Reviews */}
        <ReviewsSection items={(landing.reviews ?? []) as Parameters<typeof ReviewsSection>[0]['items']} />

        {/* Related Links */}
        <RelatedLinks items={(landing.relatedLinks ?? []) as Parameters<typeof RelatedLinks>[0]['items']} />

        {/* Legal */}
        <LegalDisclaimer text={landing.legalText ?? undefined} />
      </div>
    </>
  );
}

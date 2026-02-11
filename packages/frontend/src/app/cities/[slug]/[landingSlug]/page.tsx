import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { LandingClient } from './LandingClient';
import {
  HowToChoose,
  InfoBlocks,
  ReviewsSection,
  StatsBadge,
  RelatedLinks,
  LegalDisclaimer,
} from '@/components/landing/ContentSections';
import { FaqSection } from '@/components/landing/FaqSection';

// ISR: обновлять каждые 6 часов (21600 секунд)
export const revalidate = 21600;

/** Предварительная генерация страниц для всех активных лендингов */
export async function generateStaticParams() {
  try {
    const landings = await api.getLandings();
    return landings.map((lp: any) => ({
      slug: lp.city.slug,
      landingSlug: lp.slug,
    }));
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
    return {
      title: data.landing.metaTitle || data.landing.title,
      description: data.landing.metaDescription || data.landing.subtitle,
    };
  } catch {
    return { title: 'Страница не найдена' };
  }
}

export default async function LandingPage({ params }: Props) {
  const { slug: citySlug, landingSlug } = await params;

  let data: any;
  try {
    data = await api.getLandingBySlug(landingSlug);
  } catch {
    notFound();
  }

  // Проверяем что лендинг принадлежит правильному городу
  if (data.landing.city.slug !== citySlug) {
    notFound();
  }

  const { landing, variants, filters, total } = data;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="container-page relative py-16 sm:py-20">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-1.5 text-sm text-primary-300/70">
            <Link href="/" className="hover:text-white">
              Главная
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/cities/${citySlug}`}
              className="hover:text-white"
            >
              {landing.city.name}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-primary-200">{landing.title.split('—')[0].trim()}</span>
          </nav>

          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {landing.title}
          </h1>

          {landing.subtitle && (
            <p className="mt-4 max-w-2xl text-lg text-primary-200/90">
              {landing.subtitle}
            </p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#variants"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-primary-700 shadow-lg hover:bg-primary-50"
            >
              Смотреть рейсы
              <ArrowDown className="h-4 w-4" />
            </a>
            <a
              href="#how-to-choose"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-6 py-3 text-base font-medium text-white hover:bg-white/10"
            >
              Как выбрать маршрут
            </a>
          </div>

          {/* Краткая статистика */}
          <div className="mt-6 text-sm text-primary-300/80">
            {total > 0
              ? `${total} ${total === 1 ? 'рейс' : total < 5 ? 'рейса' : 'рейсов'} доступно`
              : 'Рейсы появятся ближе к сезону'}
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="container-page py-8 sm:py-12">
        {/* Filters + Table/Cards (client component) */}
        <div id="variants">
          <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">
            Рейсы сегодня
          </h2>
          <LandingClient
            variants={variants}
            filters={filters}
          />
        </div>

        {/* Stats Badge */}
        {landing.stats && <div className="mt-10"><StatsBadge stats={landing.stats} /></div>}

        {/* How to Choose */}
        <HowToChoose items={landing.howToChoose} />

        {/* Info Blocks (bridge schedule etc.) */}
        <InfoBlocks items={landing.infoBlocks} />

        {/* FAQ */}
        <FaqSection items={landing.faq} />

        {/* Reviews */}
        <ReviewsSection items={landing.reviews} />

        {/* Related Links */}
        <RelatedLinks items={landing.relatedLinks} />

        {/* Legal */}
        <LegalDisclaimer text={landing.legalText} />
      </div>
    </>
  );
}

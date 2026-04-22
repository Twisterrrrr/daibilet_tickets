import type { Metadata } from 'next';
import Link from 'next/link';

import { ChevronRight, MapPin, Shield } from 'lucide-react';

import { HowToChoose, ReviewsSection } from '@/components/landing/ContentSections';
import { FaqSection } from '@/components/landing/FaqSection';
import { LandingCompositionRenderer } from '@/components/landing/LandingCompositionRenderer';
import { SaluteMultilandingHero } from '@/components/landing/SaluteMultilandingHero';
import { api } from '@/lib/api';
import type { CatalogHubLandingResponse } from '@/lib/api.types';

import { saluteContentForCity } from './salute-content';

export const revalidate = 21600;

async function loadHubSalute(): Promise<CatalogHubLandingResponse | null> {
  try {
    return await api.getCatalogHubLandingBySlug('salute-9-may');
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const hub = await loadHubSalute();
  if (hub?.landing) {
    const L = hub.landing;
    const title =
      (typeof L.seoTitle === 'string' && L.seoTitle.trim()) ||
      (typeof L.metaTitle === 'string' && L.metaTitle.trim()) ||
      (typeof L.heroTitle === 'string' && L.heroTitle.trim()) ||
      undefined;
    const description =
      (typeof L.seoDescription === 'string' && L.seoDescription.trim()) ||
      (typeof L.metaDescription === 'string' && L.metaDescription.trim()) ||
      undefined;
    if (title || description) {
      return {
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        alternates: { canonical: '/salute-9-may' },
      };
    }
  }
  const content = saluteContentForCity();
  return {
    title: content.seoTitle ?? 'Салют 9 мая 2026 — по городам России | Дайбилет',
    description:
      content.seoDescription ??
      'Выберите город и сравните варианты: теплоходы, рестораны, крыши и обзорные точки.',
    alternates: { canonical: '/salute-9-may' },
  };
}

/** Корень `/salute-9-may` — MULTI_CITY hub из `/catalog/landings/hub/salute-9-may` при наличии; иначе fallback на список городов. */
export default async function Salute9MayRootPage() {
  const content = saluteContentForCity();
  const hub = await loadHubSalute();

  let cityCards: Array<{ key: string; href: string; name: string; line: string }>;

  if (hub && hub.variants.length > 0) {
    cityCards = hub.variants.map((v) => ({
      key: v.id,
      href: v.canonicalPath,
      name: v.city.name,
      line: (typeof v.title === 'string' && v.title.trim()) || 'Салют 9 мая — расписание и билеты',
    }));
  } else {
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

    cityCards =
      saluteHub.length > 0
        ? saluteHub.map((row) => ({
            key: row.id,
            href: `/cities/${row.citySlug}/salute-9-may`,
            name: row.cityName,
            line: row.title.trim() || 'Салют 9 мая — расписание и билеты',
          }))
        : cities.map((c) => ({
            key: c.id,
            href: `/cities/${c.slug}/salute-9-may`,
            name: c.name,
            line: c._count?.events
              ? `${c._count.events} событий в каталоге`
              : 'Открыть подборку по городу',
          }));
  }

  const heroTitle =
    (hub?.landing &&
      (hub.landing.heroTitle?.trim() || hub.landing.seoH1?.trim() || hub.landing.title?.trim())) ||
    content.heroTitle ||
    'Салют 9 мая в России';

  const heroSubtitle =
    hub?.landing?.heroSubtitle?.trim() ||
    hub?.landing?.subtitle?.trim() ||
    content.heroSubtitle ||
    null;

  const cityCount = cityCards.length;
  const showComposition = Boolean(hub?.blocks && hub.blocks.length > 0);

  return (
    <div className="min-h-screen bg-slate-50/80">
      <SaluteMultilandingHero heroTitle={heroTitle} subtitle={heroSubtitle} cityCount={cityCount} />

      <div className="container-page py-10 sm:py-12">
        {showComposition ? (
          <section className="mb-12">
            <LandingCompositionRenderer blocks={hub!.blocks} />
          </section>
        ) : null}

        {!showComposition && content.introText ? (
          <section className="mx-auto max-w-3xl text-center">
            <p className="text-lg leading-relaxed text-slate-600 md:text-xl">{content.introText}</p>
          </section>
        ) : null}

        <section id="cities" className="mt-12 scroll-mt-24">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Города</h2>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Перейдите в город — там расписание, фильтры и карточки предложений.
              {hub ? ' Состав страницы задаётся в админке (мультилендинг + дочерние города).' : null}
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cityCards.map((card) => (
              <Link
                key={card.key}
                href={card.href}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-primary-200 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-600/10 transition-colors group-hover:bg-primary-100">
                  <MapPin className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="text-lg font-bold text-slate-900">{card.name}</div>
                  <p className="mt-1 text-sm leading-snug text-slate-600">{card.line}</p>
                </div>
                <ChevronRight
                  className="mt-1 h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-primary-600"
                  aria-hidden
                />
              </Link>
            ))}
          </div>

          {cityCards.length === 0 ? (
            <p className="mx-auto mt-6 max-w-lg text-center text-sm text-slate-500">
              Список городов временно недоступен. Попробуйте обновить страницу позже.
            </p>
          ) : null}
        </section>
      </div>

      <div className="border-t border-slate-200 bg-white">
        <div className="container-page py-12 sm:py-16">
          {content.howToChoose?.length ? (
            <HowToChoose
              items={content.howToChoose}
              layout="steps"
              title="Как выбрать предложение на салют"
              subtitle="4 простых шага к комфортному просмотру"
            />
          ) : null}

          {content.faq?.length ? (
            <div className="mt-4">
              <FaqSection items={content.faq} />
            </div>
          ) : null}

          {content.reviews?.length ? (
            <ReviewsSection
              items={content.reviews}
              title="Отзывы"
              subtitle="Что пишут гости о форматах с салютом"
            />
          ) : null}

          <div className="mx-auto mt-12 max-w-2xl border-t border-slate-100 pt-8 text-center">
            <div className="flex items-start justify-center gap-2 text-sm text-slate-600">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <span>
                Покупка оформляется через билетную систему организатора. Мы помогаем сравнить предложения по городам.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

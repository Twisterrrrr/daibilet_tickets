import { ArrowDown, ChevronRight, Shield, Star, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { matchesBusToursCanonicalLanding } from '@/app/bus-tours/bus-tours-routing';
import {
  getRiverCruiseCanonicalTarget,
  matchesRiverCruiseCanonicalLanding,
} from '@/app/river-cruises/river-cruises-routing';

import {
  HowToChoose,
  InfoBlocks,
  LegalDisclaimer,
  RelatedLinks,
  ReviewsSection,
  StatsBadge,
} from '@/components/landing/ContentSections';
import { FaqSection } from '@/components/landing/FaqSection';
import { ClusterHubLinks } from '@/components/landing/ClusterHubLinks';
import { SaluteLandingHero } from '@/components/landing/SaluteLandingHero';
import { SaluteLandingPage } from '@/components/landing/SaluteLandingPage';
import { SubcategoryLandingView } from '@/components/landing/SubcategoryLandingView';
import { LandingCompositionRenderer } from '@/components/landing/LandingCompositionRenderer';
import { api } from '@/lib/api';
import { compositionProvidesRenderableFaq } from '@/lib/landing-composition-faq';
import { catalogParamsFromLandingContext } from '@/lib/catalog-events-url';
import {
  buildSaluteFilterOptionsFromEvents,
  catalogLandingToSaluteContent,
  saluteHeroAvgRating,
  sanitizeSaluteHeroTitle,
  variantsToSaluteEventListItems,
} from '@/lib/salute-landing-mapper';
import type { LandingVariant } from '../../_landingVm';
import {
  getLandingCitySlug,
  landingTimeSlotMode,
  rawCatalogVariantsHaveGastroFacets,
  shouldShowGastroComparisonColumns,
  toLandingVM,
} from '../../_landingVm';

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
  const { slug, landingSlug } = await params;
  try {
    const data = await api.getCatalogLandingByCityAndSlug(slug, landingSlug);
    const l = data.landing;
    let title: string =
      typeof l.metaTitle === 'string' && l.metaTitle.trim()
        ? l.metaTitle
        : typeof l.title === 'string'
          ? l.title
          : '';
    if (landingSlug === 'salute-9-may' && title) {
      title = sanitizeSaluteHeroTitle(title);
    }
    const description =
      (typeof l.metaDescription === 'string' ? l.metaDescription : null) ||
      (typeof l.subtitle === 'string' ? l.subtitle : null) ||
      undefined;
    return { title, description };
  } catch {
    if (
      matchesRiverCruiseCanonicalLanding(slug, landingSlug) ||
      matchesBusToursCanonicalLanding(slug, landingSlug)
    ) {
      redirect(`/cities/${slug}`);
    }
    try {
      const route = await api.getSubcategoryLandingRoute(slug, landingSlug);
      if (route.kind === 'TOPIC_HUB') redirect(route.redirectPath);
    } catch {
      /* ignore */
    }
    try {
      const sub = await api.getSubcategoryLandingPublished(slug, landingSlug);
      return {
        title: sub.definition.title,
        description: sub.definition.description,
        alternates: { canonical: sub.definition.canonicalPath },
      };
    } catch {
      return { title: 'Страница не найдена' };
    }
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

const PUBLIC_SITE_BASE =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://daibilet.ru';

function landingSurfaceVariant(landing: Record<string, unknown>): string | null {
  const v = landing['surfaceVariant'];
  return typeof v === 'string' ? v : null;
}

function landingVariantPriceKopecks(v: LandingVariant): number {
  const p = v.prices?.[0];
  const sessionPrice = p?.price ?? p?.amount ?? 0;
  return sessionPrice > 0 ? sessionPrice : (v.event.priceFrom ?? 0);
}

function verticalBreadcrumbFromLanding(
  citySlug: string,
  seasonalPayload: unknown,
  surfaceVariant: string | null | undefined,
): { label: string; href: string } | null {
  if (seasonalPayload && typeof seasonalPayload === 'object') {
    const raw = seasonalPayload as { verticalBreadcrumb?: { label?: string; href?: string } };
    const vb = raw.verticalBreadcrumb;
    if (vb && typeof vb.label === 'string' && typeof vb.href === 'string') {
      return { label: vb.label, href: vb.href };
    }
  }
  if (surfaceVariant === 'GASTRO_TABLE' || surfaceVariant === 'DINNER_CRUISE') {
    const rc = getRiverCruiseCanonicalTarget(citySlug);
    if (rc) return { label: 'Речные прогулки', href: rc.canonicalPath };
  }
  return null;
}

function markdownToPlainText(md: string | null | undefined): string {
  if (!md) return '';
  return (
    md
      .replace(/\r\n/g, '\n')
      .replace(/\[(.+?)\]\((.+?)\)/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^\s*-\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function LandingFoodEventsJsonLd({
  cityName,
  variants,
}: {
  cityName: string;
  variants: LandingVariant[];
}) {
  const graph = variants
    .filter(
      (v) =>
        Boolean(v.startsAt) &&
        Boolean(v.event.catering?.enabled) &&
        Boolean(v.event.catering?.menuMarkdown || v.event.catering?.type),
    )
    .slice(0, 24)
    .map((v) => {
      const priceRub = landingVariantPriceKopecks(v) / 100;
      const path = `/events/${v.event.slug}`;
      return {
        '@type': 'FoodEvent',
        name: v.event.title,
        description: markdownToPlainText(v.event.catering?.menuMarkdown) || v.event.title,
        startDate: v.startsAt,
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: cityName,
          address: v.event.address || cityName,
        },
        offers: {
          '@type': 'Offer',
          price: priceRub > 0 ? priceRub : undefined,
          priceCurrency: 'RUB',
          availability:
            v.availableTickets > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
          url: `${PUBLIC_SITE_BASE.replace(/\/$/, '')}${path}`,
        },
      };
    });

  if (graph.length === 0) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}

type CatalogLandingHeroStats = {
  totalSold?: number;
  soldTickets?: number;
  avgRating?: number;
} | null;

function CatalogLandingHero({
  citySlug,
  cityName,
  heroTitle,
  subtitle,
  total,
  stats,
  verticalBreadcrumb,
}: {
  citySlug: string;
  cityName: string;
  heroTitle: string;
  subtitle?: string | null;
  total: number;
  stats?: CatalogLandingHeroStats;
  /** Опциональная ссылка на вертикаль (напр. речные прогулки) между «Главная» и городом */
  verticalBreadcrumb?: { label: string; href: string } | null;
}) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      <div className="container-page relative py-12 sm:py-16 lg:py-20">
        <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-primary-300/70">
          <Link href="/" className="hover:text-white transition-colors">
            Главная
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          {verticalBreadcrumb ? (
            <>
              <Link href={verticalBreadcrumb.href} className="hover:text-white transition-colors">
                {verticalBreadcrumb.label}
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          ) : null}
          <Link href={`/cities/${citySlug}`} className="hover:text-white transition-colors">
            {cityName}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-primary-200">{heroTitle.split('—')[0].trim()}</span>
        </nav>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">{heroTitle}</h1>

            {subtitle ? (
              <p className="mt-3 text-base text-primary-200/90 sm:text-lg">{subtitle}</p>
            ) : null}

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
              {(stats?.totalSold ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span className="text-sm text-primary-100">
                    Более {Number(stats?.totalSold ?? 0).toLocaleString('ru-RU')} проданных билетов
                  </span>
                </div>
              )}
              {(stats?.avgRating ?? 0) > 0 && (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-emerald-300">
                    {stats?.avgRating} / 5 — средняя оценка
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
  );
}

export default async function LandingPage({ params }: Props) {
  const { slug: citySlug, landingSlug } = await params;

  let data;
  try {
    data = await api.getCatalogLandingByCityAndSlug(citySlug, landingSlug);
  } catch {
    if (
      matchesRiverCruiseCanonicalLanding(citySlug, landingSlug) ||
      matchesBusToursCanonicalLanding(citySlug, landingSlug)
    ) {
      redirect(`/cities/${citySlug}`);
    }
    try {
      const route = await api.getSubcategoryLandingRoute(citySlug, landingSlug);
      if (route.kind === 'TOPIC_HUB') redirect(route.redirectPath);
    } catch {
      /* ignore */
    }
    try {
      const subPayload = await api.getSubcategoryLandingPublished(citySlug, landingSlug);
      return <SubcategoryLandingView citySlug={citySlug} payload={subPayload} />;
    } catch {
      notFound();
    }
  }

  const { vm, total } = toLandingVM(data);
  const compositionBlocks = data.blocks ?? [];
  /** Один источник FAQ: при непустом блоке FAQ в композиции не дублируем legacy `landing.faq`. */
  const legacyFaqItems = compositionProvidesRenderableFaq(compositionBlocks) ? [] : vm.faq;
  const catalogEventsBaseParams = catalogParamsFromLandingContext(
    typeof data.landing.filterTag === 'string' ? data.landing.filterTag : undefined,
    data.landing.additionalFilters,
  );
  const { city, ...landing } = vm;

  if (!city || city.slug !== citySlug) {
    notFound();
  }

  const hasGastroFacetsRaw = rawCatalogVariantsHaveGastroFacets(data.variants);
  const surfaceVariant = landingSurfaceVariant(data.landing as Record<string, unknown>);
  const verticalCrumb = verticalBreadcrumbFromLanding(citySlug, data.landing.seasonalPayload, surfaceVariant);
  const showGastroColumns = shouldShowGastroComparisonColumns(vm.templateType, surfaceVariant, vm.variants);

  const heroTitle =
    landingSlug === 'salute-9-may' ? sanitizeSaluteHeroTitle(landing.title) : landing.title;

  if (landingSlug === 'salute-9-may') {
    const content = catalogLandingToSaluteContent(data.landing, citySlug);
    const events = variantsToSaluteEventListItems(vm.variants, city);
    const filterOptions = buildSaluteFilterOptionsFromEvents(events, citySlug);
    const lc = data.landing.city as { id?: string; slug?: string; name?: string } | undefined;
    return (
      <>
        <SaluteLandingHero
          heroTitle={heroTitle}
          subtitle={landing.subtitle}
          cityName={city.name}
          tripCount={events.length}
          totalSold={vm.stats?.totalSold ?? null}
          avgRating={saluteHeroAvgRating(events, vm.stats?.avgRating ?? null)}
        />
        <div className="container-page py-8 sm:py-10">
          <SaluteLandingPage
            city={{ id: typeof lc?.id === 'string' ? lc.id : '', slug: city.slug, name: city.name }}
            content={content}
            events={events}
            filterOptions={filterOptions}
            catalogEventsBaseParams={catalogEventsBaseParams}
          />
          <div className="mt-10 border-t border-slate-200 pt-6">
            <h2 className="text-base font-semibold text-slate-900">Смотрите также</h2>
            <ClusterHubLinks citySlug={citySlug} variant="chips" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showGastroColumns ? (
        <LandingFoodEventsJsonLd cityName={city.name} variants={vm.variants} />
      ) : null}
      <CatalogLandingHero
        citySlug={citySlug}
        cityName={city.name}
        heroTitle={heroTitle}
        subtitle={landing.subtitle}
        total={total}
        stats={vm.stats}
        verticalBreadcrumb={verticalCrumb}
      />

      {compositionBlocks.length > 0 ? (
        <section className="border-b border-slate-200 bg-white">
          <div className="container-page py-8 sm:py-10">
            <LandingCompositionRenderer blocks={compositionBlocks} />
          </div>
        </section>
      ) : null}

      {/* Main content */}
      <div className="container-page py-6 sm:py-10">
        {/* Filters + Table/Cards */}
        <div id="variants">
          <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">Расписание рейсов</h2>
          <LandingClient
            citySlug={citySlug}
            variants={vm.variants}
            filters={vm.filters}
            templateType={vm.templateType}
            timeSlotMode={landingTimeSlotMode(landingSlug, {
              surfaceVariant,
              hasGastroFacets: hasGastroFacetsRaw,
            })}
            catalogEventsBaseParams={catalogEventsBaseParams}
            showGastroColumns={showGastroColumns}
          />
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

        {/* FAQ: legacy JSON; при непустом FAQ в композиции выше — `legacyFaqItems` пустой */}
        <FaqSection items={legacyFaqItems} />

        {/* Reviews */}
        <ReviewsSection items={vm.reviews} />

        {/* Related Links */}
        <RelatedLinks items={vm.relatedLinks} />

        {/* Legal */}
        <LegalDisclaimer text={vm.legalText ?? undefined} />

        {/* Cluster hubs (соседние подборки) */}
        <div className="mt-10 border-t border-slate-200 pt-6">
          <h2 className="text-base font-semibold text-slate-900">Смотрите также</h2>
          <ClusterHubLinks citySlug={citySlug} variant="chips" />
        </div>
      </div>
    </>
  );
}

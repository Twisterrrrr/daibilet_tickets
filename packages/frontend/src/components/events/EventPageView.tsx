'use client';

import { CATEGORY_LABELS, formatPrice, getScarcityState, SUBCATEGORY_LABELS, type EventOffer, type EventSubcategory } from '@daibilet/shared';
import type { EventDetailFrontend } from '@/lib/api.types';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, ChevronDown, ChevronRight, Clock, MapPin, Shield, Users, X, Ticket } from 'lucide-react';
import { useState } from 'react';

import { AddToCartButton } from '@/components/ui/AddToCartButton';
import { EventCard, type EventCardVM } from '@/components/ui/EventCard';
import { RequestOfferForm } from '@/components/ui/RequestOfferForm';
import { RatingBadge, ReviewSection } from '@/components/ui/ReviewSection';
import { TcSessionSlot } from '@/components/ui/TcWidget';
import { shortenAddressToStreet } from '@/lib/address';
import { isPastOpenDateExhibition } from '@/lib/event-ended';

type EventDetail = EventDetailFrontend;
type EventOfferLite = EventOffer | null;

export type EventPageViewProps = {
  event: EventDetail;
  mode?: 'public' | 'preview';
};

export function EventPageView({ event }: EventPageViewProps) {
  const exhibitionEnded = isPastOpenDateExhibition(event);
  const tags = (event.tags ?? []).map((t) => t.tag).filter(Boolean);
  const venueName = getVenueName(event.tcData);

  const primaryOffer: EventOfferLite =
    event.primaryOffer || ((event.offers ?? [])[0] ?? null);
  const buyUrl = primaryOffer?.externalEventId
    ? getTcBuyUrl(String(primaryOffer.metaEventId || primaryOffer.externalEventId || ''))
    : event.tcEventId
      ? getTcBuyUrl(event.tcMetaEventId || event.tcEventId)
      : null;
  const hasActiveSessions = event.sessions?.some((s) => s.isActive && s.availableTickets > 0) ?? false;

  const categoryLabel = CATEGORY_LABELS[event.category as keyof typeof CATEGORY_LABELS] || 'Событие';
  const subcategoryLabels: string[] = (event.subcategories || [])
    .map((s: string) => SUBCATEGORY_LABELS[s as EventSubcategory])
    .filter(Boolean);

  const nextSession = event.sessions?.find((s) => {
    const d = new Date(s.startsAt);
    return d > new Date() && s.isActive;
  });

  const nextSessionWithTickets = event.sessions?.find((s) => {
    const d = new Date(s.startsAt);
    return d > new Date() && s.isActive && (s.availableTickets ?? 0) > 0;
  });

  const urgencyText =
    nextSessionWithTickets && (nextSessionWithTickets.availableTickets ?? 0) > 0
      ? ((): string | null => {
          const left = nextSessionWithTickets.availableTickets ?? 0;
          if (left <= 10) return `Осталось ${left} мест на ближайший рейс`;
          if (left <= 30) return `Осталось ${left} мест на ближайший рейс`;
          return null;
        })()
      : null;

  const [activeGalleryImage, setActiveGalleryImage] = useState<string | null>(null);

  return (
    <>
      {/* JSON-LD: Event schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Event',
            name: event.title,
            description: event.shortDescription || stripHtml(event.description || '').slice(0, 300),
            image: event.imageUrl || undefined,
            startDate: nextSession?.startsAt || undefined,
            ...(event.durationMinutes && {
              duration: `PT${event.durationMinutes}M`,
            }),
            location: {
              '@type': 'Place',
              name: venueName || event.city?.name || 'Россия',
              address: event.address || event.city?.name || '',
            },
            organizer: {
              '@type': 'Organization',
              name: 'Дайбилет',
              url: 'https://daibilet.ru',
            },
            ...(event.endDate && { endDate: new Date(event.endDate).toISOString() }),
            offers:
              !exhibitionEnded && event.priceFrom
                ? {
                    '@type': 'Offer',
                    price: (event.priceFrom / 100).toFixed(0),
                    priceCurrency: 'RUB',
                    availability: hasActiveSessions ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
                    url: `https://daibilet.ru/events/${event.slug}`,
                  }
                : undefined,
            performer: {
              '@type': 'Organization',
              name: venueName || 'Организатор',
            },
            ...(Number(event.rating) > 0 && (event.reviewCount ?? 0) >= 10
              ? {
                  aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: Number(event.rating).toFixed(1),
                    reviewCount: event.reviewCount,
                    bestRating: 5,
                    worstRating: 1,
                  },
                }
              : {}),
          }),
        }}
      />

      {/* JSON-LD: BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Каталог',
                item: 'https://daibilet.ru/events',
              },
              ...(event.city
                ? [
                    {
                      '@type': 'ListItem',
                      position: 2,
                      name: event.city.name,
                      item: `https://daibilet.ru/cities/${event.city.slug}`,
                    },
                  ]
                : []),
              {
                '@type': 'ListItem',
                position: event.city ? 3 : 2,
                name: event.title,
              },
            ],
          }),
        }}
      />

      {/* Hero Section */}
      <div className="relative">
        {/* Hero image */}
        <div className="min-h-[calc(100vh-6rem)] overflow-hidden bg-slate-900 sm:min-h-0 sm:h-80 lg:h-[420px]">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-80 sm:object-top"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900">
              <span className="text-8xl opacity-30">
                {event.category === 'EXCURSION' ? '🚶' : event.category === 'MUSEUM' ? '🏛️' : '🎭'}
              </span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
        </div>

        {/* Content over hero */}
        <div className="container-page absolute inset-x-0 bottom-0 pb-6 sm:pb-8">
          {/* Breadcrumbs */}
          <nav className="mb-3 flex items-center gap-1.5 text-sm text-white/70">
            <Link href="/events" className="hover:text-white transition">
              Каталог
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            {event.city && (
              <>
                <Link href={`/cities/${event.city.slug}`} className="hover:text-white transition">
                  {event.city.name}
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
            <span className="text-white/90">{categoryLabel}</span>
          </nav>

          <div className="flex items-end justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {categoryLabel}
                </span>
                {subcategoryLabels.map((label: string) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm"
                  >
                    {label}
                  </span>
                ))}
                {exhibitionEnded && (
                  <span className="inline-flex items-center rounded-full bg-white/25 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    Период проведения завершён
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl lg:text-4xl leading-tight">
                {event.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/80">
                {/* Рейтинг: всегда показываем displayRating, бэкенд сам решает псевдорейтинг/реальный */}
                {Number(event.rating) > 0 && (
                  <a
                    href="#reviews"
                    className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-white transition hover:bg-white/25"
                  >
                    <RatingBadge rating={Number(event.rating)} reviewCount={event.reviewCount} variant="light" />
                  </a>
                )}
                {event.durationMinutes && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {formatDuration(event.durationMinutes)}
                  </span>
                )}
                {event.minAge >= 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {event.minAge || event.minAge === 0 ? `${event.minAge}+` : null}
                  </span>
                )}
                {nextSession && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Ближайший: {formatSessionDate(nextSession.startsAt).date}
                  </span>
                )}
              </div>

              {(event.priceFrom ?? 0) > 0 && (
                <div className="mt-4 sm:hidden">
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('buy-card');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-base font-semibold text-white shadow-md shadow-amber-700/30 transition hover:bg-amber-600 active:bg-amber-700"
                  >
                    Купить билет — от {formatPrice(event.priceFrom ?? 0)}
                  </button>
                  {urgencyText && (
                    <p className="mt-2 text-center text-xs font-medium text-amber-100">
                      {urgencyText}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Hero CTA с ценой (desktop/tablet): визуальный price-badge */}
            {(event.priceFrom ?? 0) > 0 && (
              <div className="hidden items-center justify-center rounded-xl bg-amber-500 px-6 py-2.5 text-base font-semibold text-white shadow-md shadow-amber-700/30 sm:flex">
                Купить билет — от {formatPrice(event.priceFrom ?? 0)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container-page py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {event.description && (
              <div>
                <h2 className="text-lg font-bold text-slate-900">О событии</h2>
                <div
                  className="mt-3 text-sm leading-relaxed text-slate-600 prose prose-sm max-w-none prose-p:my-2 prose-br:block"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
                />
              </div>
            )}

            {/* Quick info — mobile: строки, desktop: карточки */}
            {/* Mobile rows */}
            <div className="space-y-2 sm:hidden">
              {event.address && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <MapPin className="h-4 w-4 text-primary-500" />
                  <div>
                    <span className="text-xs text-slate-500">Адрес</span>
                    <p className="text-sm font-medium text-slate-900">
                      {shortenAddressToStreet(event.address)}
                    </p>
                  </div>
                </div>
              )}
              {event.durationMinutes && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Clock className="h-4 w-4 text-primary-500" />
                  <div>
                    <span className="text-xs text-slate-500">Длительность</span>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDuration(event.durationMinutes)}
                    </p>
                  </div>
                </div>
              )}
              {event.minAge >= 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Users className="h-4 w-4 text-primary-500" />
                  <div>
                    <span className="text-xs text-slate-500">Возраст</span>
                    <p className="text-sm font-medium text-slate-900">
                      {event.minAge || event.minAge === 0 ? `${event.minAge}+` : 'Для всех'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop cards */}
            <div className="hidden gap-3 sm:grid sm:grid-cols-4">
              {event.address && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <MapPin className="h-5 w-5 text-primary-500" />
                  <p className="mt-1.5 text-xs text-slate-500">Адрес</p>
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">
                    {shortenAddressToStreet(event.address)}
                  </p>
                </div>
              )}
              {event.durationMinutes && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <Clock className="h-5 w-5 text-primary-500" />
                  <p className="mt-1.5 text-xs text-slate-500">Длительность</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDuration(event.durationMinutes)}
                  </p>
                </div>
              )}
              {event.minAge >= 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <Users className="h-5 w-5 text-primary-500" />
                  <p className="mt-1.5 text-xs text-slate-500">Возраст</p>
                  <p className="text-sm font-medium text-slate-900">
                    {event.minAge || event.minAge === 0 ? `${event.minAge}+` : 'Для всех'}
                  </p>
                </div>
              )}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tags/${tag.slug}`}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Mobile buy card — над правилами / контентными блоками */}
            {(exhibitionEnded ||
              primaryOffer ||
              event.tcEventId ||
              event.offers?.some((o) => o.status === 'ACTIVE')) && (
              <div className="mt-6 lg:hidden" id="buy-card">
                <BuyCard
                  event={event}
                  buyUrl={buyUrl}
                  hasActiveSessions={hasActiveSessions}
                  categoryLabel={categoryLabel}
                  venueName={venueName}
                  primaryOffer={primaryOffer}
                />
              </div>
            )}

            {/* Контентные блоки события по contentTemplateData (PageTemplateSpecs) */}
            <EventContentBlocks
              contentTemplateData={(event as unknown as { contentTemplateData?: Record<string, unknown> | null })
                .contentTemplateData}
              refundPolicyResolved={(event as unknown as { refundPolicyResolved?: string | null }).refundPolicyResolved}
            />

            {/* legacy templateData: program, cast, hall (из EventOverride) */}
            {event.templateData && <TemplateDataBlocks templateData={event.templateData} />}

            {/* Галерея события */}
            {Array.isArray(event.galleryUrls) && event.galleryUrls.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">Фотогалерея</h2>
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                  {event.galleryUrls.map((url, index) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      onClick={() => setActiveGalleryImage(url)}
                      className="h-44 w-64 flex-shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    >
                      <Image
                        src={url}
                        alt={`${event.title} — фото ${index + 1}`}
                        width={256}
                        height={176}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Отзывы */}
            <ReviewSection
              eventId={event.id}
              eventSlug={event.slug}
              reviewCapability={event.reviewCapability}
              externalRating={event.externalRating ? Number(event.externalRating) : undefined}
              externalSource={event.externalSource || undefined}
            />
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-20" id="buy-card">
              {(exhibitionEnded ||
                primaryOffer ||
                event.tcEventId ||
                event.offers?.some((o) => o.status === 'ACTIVE')) && (
                <BuyCard
                  event={event}
                  buyUrl={buyUrl}
                  hasActiveSessions={hasActiveSessions}
                  categoryLabel={categoryLabel}
                  venueName={venueName}
                  primaryOffer={primaryOffer}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related events */}
      {event.relatedEvents && event.relatedEvents.length > 0 && (
        <section className="border-t border-slate-100 bg-slate-50 py-12">
          <div className="container-page">
            <h2 className="text-xl font-bold text-slate-900">Похожие события в {event.city?.name}</h2>
            <div className="mt-6 grid gap-4 grid-cols-1 min-[361px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {event.relatedEvents.map((related) => (
                <EventCard key={related.id ?? related.slug} {...(related as EventCardVM)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Лайтбокс для фотогалереи */}
      {activeGalleryImage && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setActiveGalleryImage(null)}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-4xl px-4">
            <button
              type="button"
              onClick={() => setActiveGalleryImage(null)}
              className="absolute right-6 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative mt-8 h-[60vh] w-full overflow-hidden rounded-2xl bg-black/80">
              <Image
                src={activeGalleryImage}
                alt={event.title}
                fill
                className="h-full w-full object-contain"
                sizes="(min-width: 1024px) 960px, 100vw"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
  }
  return `${min} мин`;
}

function formatSessionDate(dateStr: string): { date: string; time: string; weekday: string } {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
    time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    weekday: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
  };
}

function getTcBuyUrl(tcEventId: string): string {
  return `https://ticketscloud.com/v1/services/widget?event=${tcEventId}`;
}

function splitTariffLabel(raw: string): { name: string; description: string | null } {
  const text = raw.trim();
  if (!text) return { name: 'Стандарт', description: null };
  const idx = text.indexOf(',');
  if (idx === -1) {
    return { name: text, description: null };
  }
  const name = text.slice(0, idx).trim();
  const rest = text.slice(idx + 1).trim();
  return { name: name || text, description: rest || null };
}

type ImportedPrice = { type?: string; price?: number; name?: string };

function buildImportedTariffGroups(prices: ImportedPrice[]): { key: string; name: string; description: string | null; minPrice: number; maxPrice: number }[] {
  const groups = new Map<
    string,
    { name: string; descriptions: (string | null)[]; prices: number[] }
  >();

  for (const p of prices) {
    const price = p.price ?? 0;
    if (price <= 0) continue;

    const baseLabel =
      (typeof p.name === 'string' && p.name.trim()) ||
      (typeof p.type === 'string' && p.type.trim()) ||
      'Стандарт';

    const { name, description } = splitTariffLabel(baseLabel);
    const key = name.toLowerCase();

    if (!groups.has(key)) {
      groups.set(key, { name, descriptions: [], prices: [] });
    }
    const g = groups.get(key)!;
    g.prices.push(price);
    if (description) g.descriptions.push(description);
  }

  const result: { key: string; name: string; description: string | null; minPrice: number; maxPrice: number }[] = [];

  for (const [key, g] of groups.entries()) {
    if (g.prices.length === 0) continue;
    const minPrice = Math.min(...g.prices);
    const maxPrice = Math.max(...g.prices);
    const uniqueDescriptions = Array.from(new Set(g.descriptions.filter((d): d is string => !!d)));
    result.push({
      key,
      name: g.name,
      description: uniqueDescriptions.length === 1 ? uniqueDescriptions[0] : null,
      minPrice,
      maxPrice,
    });
  }

  return result;
}

function EventContentBlocks({
  contentTemplateData,
  refundPolicyResolved,
}: {
  contentTemplateData?: Record<string, unknown> | null;
  refundPolicyResolved?: string | null;
}) {
  if (!contentTemplateData && !refundPolicyResolved) return null;

  const routeDescription =
    typeof contentTemplateData?.routeDescription === 'string' ? contentTemplateData.routeDescription : null;
  const program =
    typeof contentTemplateData?.program === 'string' ? contentTemplateData.program : null;
  const menu =
    typeof contentTemplateData?.menu === 'string' ? contentTemplateData.menu : null;
  const bookingRules =
    typeof contentTemplateData?.bookingRules === 'string' ? contentTemplateData.bookingRules : null;
  const visitRules =
    typeof contentTemplateData?.visitRules === 'string' ? contentTemplateData.visitRules : null;
  const advantages =
    Array.isArray(contentTemplateData?.advantages) && contentTemplateData.advantages.length > 0
      ? (contentTemplateData.advantages as string[])
      : null;
  const visitorTips =
    typeof contentTemplateData?.visitorTips === 'string' ? contentTemplateData.visitorTips : null;
  const extraFaq =
    Array.isArray(contentTemplateData?.extraFaq) && contentTemplateData.extraFaq.length > 0
      ? (contentTemplateData.extraFaq as { q?: unknown; a?: unknown }[])
      : null;

  const rawRouteMap = contentTemplateData?.routeMap as
    | {
        lat?: unknown;
        lng?: unknown;
        zoom?: unknown;
        points?: unknown;
      }
    | undefined;

  let routeMap: {
    lat: number;
    lng: number;
    zoom?: number;
    points?: { lat: number; lng: number; label?: string }[];
  } | null = null;

  if (rawRouteMap && typeof rawRouteMap.lat === 'number' && typeof rawRouteMap.lng === 'number') {
    const zoom = typeof rawRouteMap.zoom === 'number' ? rawRouteMap.zoom : undefined;
    let points: { lat: number; lng: number; label?: string }[] | undefined;
    if (Array.isArray(rawRouteMap.points)) {
      const parsed = rawRouteMap.points
        .map((p) => {
          if (!p || typeof p !== 'object') return null;
          const obj = p as { lat?: unknown; lng?: unknown; label?: unknown };
          if (typeof obj.lat !== 'number' || typeof obj.lng !== 'number') return null;
          return {
            lat: obj.lat,
            lng: obj.lng,
            label: typeof obj.label === 'string' ? obj.label : undefined,
          };
        })
        .filter((x) => x !== null);
      // Здесь мы гарантированно отфильтровали null, поэтому приводим тип массива.
      points = parsed as { lat: number; lng: number; label?: string }[];
    }
    routeMap = { lat: rawRouteMap.lat, lng: rawRouteMap.lng, zoom, points };
  }

  const hasAnyContent =
    advantages ||
    program ||
    routeDescription ||
    routeMap ||
    menu ||
    visitRules ||
    visitorTips ||
    extraFaq ||
    bookingRules ||
    visitRules ||
    (refundPolicyResolved && refundPolicyResolved.trim().length > 0);

  if (!hasAnyContent) return null;

  const routeMapEmbedUrl =
    routeMap &&
    // Центрируем карту и добавляем маркер в точке начала маршрута
    `https://yandex.ru/map-widget/v1/?ll=${routeMap.lng.toFixed(6)}%2C${routeMap.lat.toFixed(
      6,
    )}&z=${routeMap.zoom ?? 15}&pt=${routeMap.lng.toFixed(6)},${routeMap.lat.toFixed(6)},pm2rdm`;

  return (
    <div className="space-y-6">
      {advantages && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Особенности</h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-600">
            {advantages.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {program && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Программа</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{program}</p>
        </section>
      )}

      {(routeDescription || routeMap) && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Маршрут</h2>
          {routeDescription && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{routeDescription}</p>
          )}
          {routeMapEmbedUrl && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <iframe
                src={routeMapEmbedUrl}
                title="Карта маршрута"
                loading="lazy"
                className="h-64 w-full border-0"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          )}
          {routeMap?.points && routeMap.points.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
              {routeMap.points.map((p, idx) => (
                <li key={`${p.lat}-${p.lng}-${idx}`}>
                  <span className="font-medium text-slate-800">
                    Точка {idx + 1}
                    {p.label ? ` — ${p.label}` : ''}
                  </span>
                  <span className="ml-1 text-slate-500">
                    ({p.lat.toFixed(5)}, {p.lng.toFixed(5)})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {menu && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Меню</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{menu}</p>
        </section>
      )}

      {visitRules && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Транспорт</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{visitRules}</p>
        </section>
      )}

      {visitorTips && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Памятка гостя</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{visitorTips}</p>
        </section>
      )}

      {extraFaq && extraFaq.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Частые вопросы</h2>
          <div className="mt-3 space-y-2">
            {extraFaq.map((item, index) => {
              const question = typeof item.q === 'string' ? item.q : null;
              const answer = typeof item.a === 'string' ? item.a : null;
              if (!question || !answer) return null;
              return (
                <details
                  key={`${question}-${index}`}
                  className="group rounded-lg border border-slate-200 bg-white px-4 py-3"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-900">
                    <span>{question}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{answer}</p>
                </details>
              );
            })}
          </div>
        </section>
      )}

      {(bookingRules || visitRules || (refundPolicyResolved && refundPolicyResolved.trim().length > 0)) && (
        <section>
          <h2 className="text-lg font-bold text-slate-900">Правила обмена и возврата</h2>
          {refundPolicyResolved && refundPolicyResolved.trim().length > 0 ? (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {refundPolicyResolved}
            </p>
          ) : (
            <>
              {bookingRules && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{bookingRules}</p>
              )}
              {visitRules && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{visitRules}</p>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function TemplateDataBlocks({ templateData }: { templateData: Record<string, unknown> }) {
  const program = templateData.program;
  const cast = templateData.cast;
  const hall = templateData.hall;
  const route = templateData.route;
  const menu = templateData.menu;
  const shipName = templateData.shipName;
  const rules = templateData.rules;
  const advantages = templateData.advantages;
  const bookingRules = templateData.bookingRules;

  const programItems = Array.isArray(program) ? program : typeof program === 'string' ? [program] : [];
  const castItems = Array.isArray(cast) ? cast : [];
  const hallStr = typeof hall === 'string' ? hall : null;
  const routeStr = typeof route === 'string' ? route : null;
  const menuStr = typeof menu === 'string' ? menu : null;
  const shipStr = typeof shipName === 'string' ? shipName : null;
  const rulesStr = typeof rules === 'string' ? rules : null;
  const advantagesStr = typeof advantages === 'string' ? advantages : null;
  const bookingRulesStr = typeof bookingRules === 'string' ? bookingRules : null;

  const hasAny =
    programItems.length > 0 ||
    castItems.length > 0 ||
    hallStr ||
    routeStr ||
    menuStr ||
    shipStr ||
    rulesStr ||
    advantagesStr ||
    bookingRulesStr;
  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      {programItems.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Программа</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-slate-600">
            {programItems.map((item, i) => (
              <li key={i}>
                {typeof item === 'string'
                  ? item
                  : ((item as { name?: string; text?: string })?.name ??
                    (item as { text?: string })?.text ??
                    String(item))}
              </li>
            ))}
          </ul>
        </div>
      )}
      {castItems.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Состав</h2>
          <ul className="mt-3 space-y-1.5 text-slate-600">
            {castItems.map((item, i) => {
              const c =
                typeof item === 'object' && item && 'name' in item ? (item as { name?: string; role?: string }) : null;
              const label = c ? (c.role ? `${c.name ?? ''} — ${c.role}` : (c.name ?? '')) : String(item);
              return <li key={i}>{label}</li>;
            })}
          </ul>
        </div>
      )}
      {hallStr && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Зал / площадка</h2>
          <p className="mt-2 text-slate-600">{hallStr}</p>
        </div>
      )}
      {routeStr && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Маршрут</h2>
          <p className="mt-2 whitespace-pre-line text-slate-600">{routeStr}</p>
        </div>
      )}
      {(shipStr || menuStr) && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Теплоход и меню</h2>
          {shipStr && (
            <p className="mt-2 text-slate-600">
              <span className="font-medium">Теплоход:</span> {shipStr}
            </p>
          )}
          {menuStr && (
            <p className="mt-2 whitespace-pre-line text-slate-600">
              <span className="font-medium">Меню:</span>
              <br />
              {menuStr}
            </p>
          )}
        </div>
      )}
      {rulesStr && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Правила</h2>
          <p className="mt-2 whitespace-pre-line text-slate-600">{rulesStr}</p>
        </div>
      )}
      {advantagesStr && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Прогулка вам понравится</h2>
          <p className="mt-2 whitespace-pre-line text-slate-600">{advantagesStr}</p>
        </div>
      )}
      {bookingRulesStr && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Правила бронирования</h2>
          <p className="mt-2 whitespace-pre-line text-slate-600">{bookingRulesStr}</p>
        </div>
      )}
    </div>
  );
}

function getVenueName(tcData: unknown): string | null {
  if (!tcData || typeof tcData !== 'object') return null;
  const v = (tcData as Record<string, unknown>).venue;
  if (!v) return null;
  if (typeof v === 'string') {
    const match = v.match(/name=([^;]+)/);
    return match ? match[1].trim() : null;
  }
  if (typeof v === 'object' && v !== null && 'name' in v) {
    return String((v as { name?: unknown }).name ?? '') || null;
  }
  return null;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

function OfferBadge({ badge }: { badge?: string | null }) {
  if (!badge) return null;
  const BADGE_CONFIG: Record<string, { label: string; className: string }> = {
    optimal: { label: 'Оптимальный', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    cheapest: { label: 'Лучшая цена', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    fastest: { label: 'Быстрее всего', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    hit: { label: 'Хит продаж', className: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-300' },
  };
  const cfg = BADGE_CONFIG[badge] || { label: badge, className: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function BuyCard({
  event,
  buyUrl: _buyUrl,
  hasActiveSessions: _hasActiveSessions,
  categoryLabel: _categoryLabel,
  venueName: _venueName,
  primaryOffer,
}: {
  event: EventDetail;
  buyUrl: string | null;
  hasActiveSessions: boolean;
  categoryLabel: string;
  venueName: string | null;
  primaryOffer?: EventOfferLite;
}) {
  const [preselectedSessionId, setPreselectedSessionId] = useState<string | null>(null);

  if (isPastOpenDateExhibition(event)) {
    const endLabel =
      event.endDate != null && event.endDate !== ''
        ? new Date(event.endDate).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : null;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Билеты не продаются</h2>
        <p className="mt-2 text-sm text-slate-600">
          {endLabel ? `Период проведения завершён (${endLabel}).` : 'Период проведения этого мероприятия завершён.'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Страница доступна по ссылке для справки; в каталоге такие события не показываются.
        </p>
        <Link
          href="/events"
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-medium text-primary-800 transition hover:bg-primary-100"
        >
          Смотреть актуальные события
        </Link>
      </div>
    );
  }

  const purchaseType = primaryOffer?.purchaseType || (event.source === 'TEPLOHOD' ? 'REDIRECT' : 'WIDGET');
  const isWidget = purchaseType === 'WIDGET';
  const isRequest = purchaseType === 'REQUEST';
  /** MANUAL — наши события, слоты показываем статично (без виджета TC). */
  const isManualEvent = event.source === 'MANUAL';

  const widgetProvider = primaryOffer?.widgetProvider || primaryOffer?.source || event.source;
  const isTepWidget = widgetProvider === 'TEPLOHOD' || event.source === 'TEPLOHOD';
  const offerDeeplink = primaryOffer?.deeplink;
  const offerSource = primaryOffer?.source || event.source;
  const offerBadge = primaryOffer?.badge;

  const allOffers = (event.offers ?? []).filter((o) => o.status === 'ACTIVE');

  const allPrices = new Set<number>();
  for (const o of allOffers) {
    if (o.priceFrom && o.priceFrom >= 10000) allPrices.add(o.priceFrom);
  }
  for (const s of event.sessions || []) {
    const prices = (s.prices || []) as { price?: number }[];
    for (const p of prices) {
      if (p.price && p.price >= 10000) allPrices.add(p.price);
    }
  }
  const showFromPrefix = allPrices.size > 1;

  const handleSelectSession = (sessionId: string | null) => {
    setPreselectedSessionId(sessionId);
  };

  const firstSessionPrices =
    event.sessions?.length ? ((event.sessions[0].prices as { type?: string; price?: number; name?: string }[] | null) ?? []) : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
      {(event.priceFrom ?? 0) > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {showFromPrefix ? `от ${formatPrice(event.priceFrom ?? 0)}` : formatPrice(event.priceFrom ?? 0)}
            </span>
            <span className="text-sm text-slate-400">/ чел.</span>
          </div>
          {offerBadge && (
            <div className="flex-shrink-0">
              <OfferBadge badge={offerBadge} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-lg font-semibold text-slate-600">Цена уточняется</p>
      )}

      {allOffers.length > 1 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Варианты покупки</h3>
          {allOffers.map((offer) => (
            <div
              key={offer.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition ${
                (offer as EventOffer & { isPrimary?: boolean }).isPrimary
                  ? 'border-primary-300 bg-primary-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {offer.priceFrom ? formatPrice(offer.priceFrom) : 'Уточняется'}
                  </span>
                  <OfferBadge badge={offer.badge} />
                </div>
                <span className="text-xs text-slate-500">
                  {offer.source === 'TC'
                    ? 'TicketsCloud'
                    : offer.source === 'TEPLOHOD'
                      ? 'Теплоход'
                      : (offer as EventOffer & { operator?: { name?: string } }).operator?.name ?? 'Дайбилет'}
                </span>
              </div>
              {offer.purchaseType === 'REQUEST' ? (
                <a
                  href="#request-form"
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600"
                >
                  Заявка
                </a>
              ) : (
                <AddToCartButton
                  eventId={event.id}
                  offerId={offer.id}
                  eventTitle={event.title}
                  eventSlug={event.slug}
                  imageUrl={event.imageUrl ?? undefined}
                  priceFrom={offer.priceFrom ?? event.priceFrom ?? 0}
                  purchaseType={offer.purchaseType ?? 'WIDGET'}
                  source={offer.source ?? 'INTERNAL'}
                  deeplink={offer.deeplink ?? undefined}
                  badge={offer.badge ?? undefined}
                  className="rounded-lg px-3 py-1.5 text-xs"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {isManualEvent && firstSessionPrices.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Ticket className="h-3.5 w-3.5" />
            Категории и цены
          </h3>
          <ul className="mt-2 space-y-2">
            {firstSessionPrices.map((p, idx) => {
              const label =
                p.type === 'adult'
                  ? 'Взрослый билет'
                  : p.type === 'child'
                    ? 'Детский билет'
                    : p.type === 'concession'
                      ? 'Льготный билет'
                      : p.type ?? 'Стандарт';
              const desc =
                p.type === 'adult'
                  ? 'без льгот'
                  : p.type === 'child'
                    ? 'от 3 до 14 включительно'
                    : p.type === 'concession'
                      ? 'школьники от 15 лет, студенты, пенсионеры и пр. льготные категории'
                      : (p as { description?: string }).description ?? null;
              return (
                <li key={`${p.type ?? 'price'}-${idx}`} className="flex flex-col gap-0.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-700">{label}</span>
                    <span className="font-medium text-slate-900">{formatPrice(p.price ?? 0)}</span>
                  </div>
                  {desc && <p className="text-xs text-slate-500">{desc}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Импортируемые события (TC/TEPLOHOD): показываем категории и цены из первого сеанса, если они есть */}
      {!isManualEvent && firstSessionPrices.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Ticket className="h-3.5 w-3.5" />
            Категории и цены
          </h3>
          <ul className="mt-2 space-y-2">
            {buildImportedTariffGroups(firstSessionPrices).map((g) => (
              <li key={g.key} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-700">{g.name}</span>
                  <span className="font-medium text-slate-900">
                    {g.minPrice === g.maxPrice
                      ? formatPrice(g.minPrice)
                      : `${formatPrice(g.minPrice).replace(/\s*₽/g, '')} – ${formatPrice(g.maxPrice)}`}
                  </span>
                </div>
                {g.description && <p className="text-xs text-slate-500">{g.description}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ближайшие сеансы перед основной кнопкой */}
      {event.sessions && event.sessions.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            Ближайшие сеансы
          </h3>
          {isWidget && !isTepWidget && !isManualEvent && (
            <p className="mt-1 text-[11px] text-slate-400">Нажмите на сеанс для покупки</p>
          )}
          {isManualEvent && (
            <p className="mt-1 text-[11px] text-slate-400">Нажмите на сеанс — откроется выбор билетов</p>
          )}
          <div className="mt-2.5 space-y-1.5">
            {event.sessions
              .filter((s) => s.isActive)
              .slice(0, 5)
              .map((session) =>
                isWidget && !isTepWidget && !isManualEvent ? (
                  <TcSessionSlot key={session.id} session={session} />
                ) : isManualEvent ? (
                  (session.availableTickets ?? 0) > 0 ? (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className="w-full rounded-lg border border-slate-200 bg-white text-left transition hover:border-primary-200 hover:bg-primary-50/50 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    >
                      <StaticSessionRow session={session} />
                    </button>
                  ) : (
                    <StaticSessionRow key={session.id} session={session} />
                  )
                ) : (
                  <StaticSessionRow key={session.id} session={session} />
                ),
              )}
          </div>
        </div>
      )}

      {/* Основная кнопка покупки — canonical путь через /checkout (фиксирует CheckoutSession в БД) */}
      {isRequest ? (
        primaryOffer ? <RequestOfferForm eventId={event.id} offerId={primaryOffer.id} /> : null
      ) : primaryOffer ? (
        <div className="mt-5">
          <AddToCartButton
            eventId={event.id}
            offerId={primaryOffer.id}
            sessionId={preselectedSessionId ?? undefined}
            eventTitle={event.title}
            eventSlug={event.slug}
            imageUrl={event.imageUrl ?? undefined}
            priceFrom={primaryOffer.priceFrom ?? event.priceFrom ?? 0}
            purchaseType={purchaseType ?? primaryOffer.purchaseType ?? 'WIDGET'}
            source={offerSource ?? primaryOffer.source ?? 'INTERNAL'}
            deeplink={offerDeeplink ?? primaryOffer.deeplink ?? undefined}
            badge={offerBadge ?? primaryOffer.badge ?? undefined}
            className="rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700"
          />
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Покупка проходит через оформление заказа на сайте — так заказ гарантированно фиксируется и появляется в ЛК/админке.
          </div>
        </div>
      ) : (
        <button
          disabled
          className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-6 py-3.5 text-base font-medium text-slate-400"
        >
          Билеты недоступны
        </button>
      )}

      {/* Доп. CTA больше не нужен: основной checkout-CTA выше. */}

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <Shield className="h-4 w-4 text-emerald-500" />
        <span className="text-xs text-slate-500">
          {isRequest
            ? 'Заявка будет подтверждена оператором'
            : `Безопасная оплата через ${
                offerSource === 'TEPLOHOD'
                  ? 'teplohod.info'
                  : offerSource === 'TC'
                    ? 'Ticketscloud'
                    : 'Дайбилет'
              }`}
        </span>
      </div>
    </div>
  );
}

function StaticSessionRow({ session }: { session: EventDetail['sessions'][number] }) {
  const fmt = formatSessionDate(session.startsAt);
  const scarcity = getScarcityState(session.availableTickets);
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-700">
          {fmt.weekday}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{fmt.date}</p>
          <p className="text-xs text-slate-500">{fmt.time}</p>
        </div>
      </div>
      {scarcity.label ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            scarcity.level === 'SOLD_OUT'
              ? 'bg-red-50 text-red-600'
              : scarcity.level === 'LAST'
                ? 'bg-amber-50 text-amber-700'
                : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          {scarcity.label}
        </span>
      ) : session.availableTickets > 0 ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
          {session.availableTickets} мест
        </span>
      ) : null}
    </div>
  );
}


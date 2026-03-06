import { CATEGORY_LABELS, formatPrice, SUBCATEGORY_LABELS, type EventOffer, type EventSubcategory } from '@daibilet/shared';
import type { EventDetailFrontend } from '@/lib/api.types';
import Image from 'next/image';
import Link from 'next/link';
import { Building2, Calendar, ChevronRight, Clock, MapPin, Shield, Users } from 'lucide-react';

import { AddToCartButton } from '@/components/ui/AddToCartButton';
import { BuyButton } from '@/components/ui/BuyModal';
import { EventCard } from '@/components/ui/EventCard';
import { RequestOfferForm } from '@/components/ui/RequestOfferForm';
import { RatingBadge, ReviewSection } from '@/components/ui/ReviewSection';
import { TcSessionSlot, TcWidgetButton } from '@/components/ui/TcWidget';
import { TepWidgetEmbed } from '@/components/ui/TepWidget';
import { shortenAddressToStreet } from '@/lib/address';

type EventDetail = EventDetailFrontend;
type EventOfferLite = EventOffer | null;

export type EventPageViewProps = {
  event: EventDetail;
  mode?: 'public' | 'preview';
};

export function EventPageView({ event }: EventPageViewProps) {
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
            offers: event.priceFrom
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
            ...(Number(event.rating) > 0 && event.reviewCount > 0
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
        <div className="h-72 overflow-hidden bg-slate-900 sm:h-80 lg:h-[420px]">
          {event.imageUrl ? (
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-80"
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
              </div>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl lg:text-4xl leading-tight">
                {event.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/80">
                {/* Рейтинг */}
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
                {event.minAge > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {event.minAge}+
                  </span>
                )}
                {nextSession && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Ближайший: {formatSessionDate(nextSession.startsAt).date}
                  </span>
                )}
              </div>
            </div>

            {/* Price badge on hero (desktop) */}
            {(event.priceFrom ?? 0) > 0 && (
              <div className="hidden rounded-xl bg-white/15 px-5 py-3 text-right backdrop-blur-sm sm:block">
                <p className="text-xs text-white/70">от</p>
                <p className="text-2xl font-bold text-white">{formatPrice(event.priceFrom ?? 0)}</p>
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
            {/* Quick info cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {event.address && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <MapPin className="h-5 w-5 text-primary-500" />
                  <p className="mt-1.5 text-xs text-slate-500">Адрес</p>
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">
                    {shortenAddressToStreet(event.address)}
                  </p>
                </div>
              )}
              {event.venue ? (
                <Link
                  href={`/venues/${event.venue.slug}`}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-primary-300 transition-colors"
                >
                  <Building2 className="h-5 w-5 text-primary-500" />
                  <p className="mt-1.5 text-xs text-slate-500">Место</p>
                  <p className="text-sm font-medium text-primary-600 hover:underline line-clamp-2">
                    {event.venue.shortTitle ?? event.venue.title ?? event.venue.name}
                  </p>
                </Link>
              ) : venueName ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <Building2 className="h-5 w-5 text-primary-500" />
                  <p className="mt-1.5 text-xs text-slate-500">Площадка</p>
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">{venueName}</p>
                </div>
              ) : null}
              {event.durationMinutes && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <Clock className="h-5 w-5 text-primary-500" />
                  <p className="mt-1.5 text-xs text-slate-500">Длительность</p>
                  <p className="text-sm font-medium text-slate-900">{formatDuration(event.durationMinutes)}</p>
                </div>
              )}
              {event.minAge > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <Users className="h-5 w-5 text-primary-500" />
                  <p className="mt-1.5 text-xs text-slate-500">Возраст</p>
                  <p className="text-sm font-medium text-slate-900">от {event.minAge} лет</p>
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

            {/* Description */}
            {event.description && (
              <div>
                <h2 className="text-lg font-bold text-slate-900">О событии</h2>
                <div
                  className="mt-3 text-slate-600 leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-br:block"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
                />
              </div>
            )}

            {/* templateData: program, cast, hall (из EventOverride) */}
            {event.templateData && <TemplateDataBlocks templateData={event.templateData} />}

            {/* Отзывы */}
            <ReviewSection
              eventId={event.id}
              eventSlug={event.slug}
              externalRating={event.externalRating ? Number(event.externalRating) : undefined}
              externalSource={event.externalSource || undefined}
            />

            {/* Mobile buy button */}
            {(primaryOffer || event.tcEventId || event.offers?.some((o) => o.status === 'ACTIVE')) && (
              <div className="lg:hidden">
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
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-20">
              <BuyCard
                event={event}
                buyUrl={buyUrl}
                hasActiveSessions={hasActiveSessions}
                categoryLabel={categoryLabel}
                venueName={venueName}
                primaryOffer={primaryOffer}
              />
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
                <EventCard
                  key={related.id}
                  slug={related.slug}
                  title={related.title}
                  category={related.category}
                  imageUrl={related.imageUrl}
                  priceFrom={related.priceFrom}
                  rating={related.rating}
                  reviewCount={related.reviewCount}
                  durationMinutes={related.durationMinutes}
                  address={related.address}
                />
              ))}
            </div>
          </div>
        </section>
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
  };
  const cfg = BADGE_CONFIG[badge] || { label: badge, className: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function BuyCard({
  event,
  buyUrl: _buyUrl,
  hasActiveSessions: _hasActiveSessions,
  categoryLabel: _categoryLabel,
  venueName,
  primaryOffer,
}: {
  event: EventDetail;
  buyUrl: string | null;
  hasActiveSessions: boolean;
  categoryLabel: string;
  venueName: string | null;
  primaryOffer?: EventOfferLite;
}) {
  const purchaseType = primaryOffer?.purchaseType || (event.source === 'TEPLOHOD' ? 'REDIRECT' : 'WIDGET');
  const isWidget = purchaseType === 'WIDGET';
  const isRequest = purchaseType === 'REQUEST';

  const widgetProvider = primaryOffer?.widgetProvider || primaryOffer?.source || event.source;
  const isTepWidget = widgetProvider === 'TEPLOHOD' || event.source === 'TEPLOHOD';
  const widgetPayload: Record<string, unknown> = (primaryOffer?.widgetPayload as Record<string, unknown>) ?? {};
  const offerEventId =
    (typeof widgetPayload.externalEventId === 'string' ? widgetPayload.externalEventId : null) ||
    primaryOffer?.externalEventId ||
    event.tcEventId;
  const offerMetaId =
    (typeof widgetPayload.metaEventId === 'string' ? widgetPayload.metaEventId : null) ||
    primaryOffer?.metaEventId ||
    event.tcMetaEventId;
  const offerDeeplink = primaryOffer?.deeplink;
  const offerSource = primaryOffer?.source || event.source;

  const tepWidgetId = (typeof widgetPayload.tepWidgetId === 'string' ? widgetPayload.tepWidgetId : null) ?? null;
  const tepEventId =
    (typeof widgetPayload.tepEventId === 'string' ? widgetPayload.tepEventId : null) ??
    primaryOffer?.externalEventId?.match?.(/^tep-(\d+)$/)?.[1] ??
    (typeof event.tcData === 'object' && event.tcData != null && 'id' in event.tcData
      ? String((event.tcData as { id?: unknown }).id ?? '')
      : null);
  const offerBadge = primaryOffer?.badge;

  const allOffers = (event.offers ?? []).filter((o) => o.status === 'ACTIVE');

  const allPrices = new Set<number>();
  for (const o of allOffers) {
    if (o.priceFrom && o.priceFrom > 0) allPrices.add(o.priceFrom);
  }
  for (const s of event.sessions || []) {
    const prices = (s.prices || []) as { price?: number }[];
    for (const p of prices) {
      if (p.price && p.price > 0) allPrices.add(p.price);
    }
  }
  const showFromPrefix = allPrices.size > 1;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
      {(event.priceFrom ?? 0) > 0 ? (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">
            {showFromPrefix ? `от ${formatPrice(event.priceFrom ?? 0)}` : formatPrice(event.priceFrom ?? 0)}
          </span>
          <span className="text-sm text-slate-400">/ чел.</span>
        </div>
      ) : (
        <p className="text-lg font-semibold text-slate-600">Цена уточняется</p>
      )}

      {offerBadge && (
        <div className="mt-2">
          <OfferBadge badge={offerBadge} />
        </div>
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
              {offer.source === 'TEPLOHOD' && offer.deeplink ? (
                <a
                  href={offer.deeplink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-600"
                >
                  Купить
                </a>
              ) : offer.purchaseType === 'WIDGET' && offer.externalEventId ? (
                <TcWidgetButton tcEventId={offer.externalEventId} tcMetaEventId={offer.metaEventId} compact>
                  Купить
                </TcWidgetButton>
              ) : offer.purchaseType === 'REDIRECT' && offer.deeplink ? (
                <a
                  href={offer.deeplink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-primary-700"
                >
                  Купить
                </a>
              ) : offer.purchaseType === 'REQUEST' ? (
                <a
                  href="#request-form"
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-600"
                >
                  Заявка
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {event.sessions && event.sessions.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            Ближайшие сеансы
          </h3>
          {isWidget && !isTepWidget && (
            <p className="mt-1 text-[11px] text-slate-400">Нажмите на сеанс для покупки</p>
          )}
          <div className="mt-2.5 space-y-1.5">
            {event.sessions
              .filter((s) => s.isActive)
              .slice(0, 5)
              .map((session) =>
                isWidget && !isTepWidget ? (
                  <TcSessionSlot key={session.id} session={session} />
                ) : (
                  <StaticSessionRow key={session.id} session={session} />
                ),
              )}
          </div>
        </div>
      )}

      {isRequest ? (
        primaryOffer ? <RequestOfferForm eventId={event.id} offerId={primaryOffer.id} /> : null
      ) : isTepWidget && (tepWidgetId || tepEventId || primaryOffer?.externalEventId) ? (
        <TepWidgetEmbed
          tepWidgetId={tepWidgetId}
          tepEventId={tepEventId}
          externalEventId={primaryOffer?.externalEventId}
        />
      ) : offerEventId ? (
        <div className="mt-5">
          {isWidget ? (
            <TcWidgetButton tcEventId={offerEventId} tcMetaEventId={offerMetaId}>
              Купить билет
            </TcWidgetButton>
          ) : purchaseType === 'REDIRECT' && offerDeeplink ? (
            <a
              href={offerDeeplink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700"
            >
              Купить на {offerSource === 'TEPLOHOD' ? 'teplohod.info' : 'сайте оператора'}
            </a>
          ) : (
            <BuyButton
              eventTitle={event.title}
              eventImage={event.imageUrl}
              tcEventId={offerEventId}
              source={offerSource === 'TEPLOHOD' ? 'TEPLOHOD' : 'TC'}
              sessions={(event.sessions || []).map((s) => ({
                ...s,
                prices: (s.prices || []).map((p: { type?: string; price?: number }) => ({
                  name: p.type ?? 'Стандарт',
                  price: p.price ?? 0,
                  setId: s.id,
                  amount: 1,
                  amountVacant: s.availableTickets ?? 0,
                })),
              }))}
              address={event.address ?? undefined}
              venueName={venueName ?? undefined}
              priceFrom={event.priceFrom ?? 0}
            />
          )}
        </div>
      ) : primaryOffer?.deeplink && purchaseType === 'REDIRECT' ? (
        <div className="mt-5">
          <a
            href={primaryOffer.deeplink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-base font-medium text-white transition hover:bg-primary-700"
          >
            Купить на сайте оператора
          </a>
        </div>
      ) : (
        <button
          disabled
          className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-6 py-3.5 text-base font-medium text-slate-400"
        >
          Билеты недоступны
        </button>
      )}

      {primaryOffer &&
        purchaseType !== 'WIDGET' &&
        !isRequest &&
        offerSource !== 'TC' &&
        offerSource !== 'TEPLOHOD' && (
          <div className="mt-3">
            <AddToCartButton
              eventId={event.id}
              offerId={primaryOffer.id}
              eventTitle={event.title}
              eventSlug={event.slug}
              imageUrl={event.imageUrl ?? undefined}
              priceFrom={primaryOffer.priceFrom ?? event.priceFrom ?? 0}
              purchaseType={purchaseType ?? 'WIDGET'}
              source={offerSource ?? 'TC'}
              deeplink={typeof offerDeeplink === 'string' ? offerDeeplink : undefined}
              badge={typeof offerBadge === 'string' ? offerBadge : undefined}
            />
          </div>
        )}

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <Shield className="h-4 w-4 text-emerald-500" />
        <span className="text-xs text-slate-500">
          {isRequest
            ? 'Заявка будет подтверждена оператором'
            : `Безопасная оплата через ${offerSource === 'TEPLOHOD' ? 'teplohod.info' : 'Дайбилет'}`}
        </span>
      </div>
    </div>
  );
}

function StaticSessionRow({ session }: { session: EventDetail['sessions'][number] }) {
  const fmt = formatSessionDate(session.startsAt);
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
      {session.availableTickets > 0 ? (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
          {session.availableTickets} мест
        </span>
      ) : (
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">Распродано</span>
      )}
    </div>
  );
}


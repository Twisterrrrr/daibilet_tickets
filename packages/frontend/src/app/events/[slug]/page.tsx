import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import {
  Clock,
  MapPin,
  Users,
  Calendar,
  Building2,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import { EventCard } from '@/components/ui/EventCard';
import { BuyButton } from '@/components/ui/BuyModal';
import { TcWidgetButton, TcSessionSlot } from '@/components/ui/TcWidget';
import { TepWidgetEmbed } from '@/components/ui/TepWidget';
import { ReviewSection, RatingBadge } from '@/components/ui/ReviewSection';
import { AddToCartButton } from '@/components/ui/AddToCartButton';
import { formatPrice, CATEGORY_LABELS, SUBCATEGORY_LABELS, type EventSubcategory } from '@daibilet/shared';

// ISR: обновлять каждый час
export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    // Берём первые 200 самых популярных событий для статической генерации
    const res = await api.getEvents({ sort: 'popular', limit: 200 });
    return res.items.map((e: any) => ({ slug: e.slug }));
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const event = await api.getEventBySlug(slug);
    return {
      title: `${event.title} — купить билет | Дайбилет`,
      description: event.shortDescription || stripHtml(event.description || '').slice(0, 160),
    };
  } catch {
    return { title: 'Событие не найдено' };
  }
}

/** Убрать HTML-теги для meta description */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Форматирование длительности */
function formatDuration(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
  }
  return `${min} мин`;
}

/** Форматирование даты сеанса */
function formatSessionDate(dateStr: string): { date: string; time: string; weekday: string } {
  const d = new Date(dateStr);
  return {
    date: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
    time: d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
    weekday: d.toLocaleDateString('ru-RU', { weekday: 'short' }),
  };
}

/** Получить ссылку на покупку билета в TC */
function getTcBuyUrl(tcEventId: string): string {
  return `https://ticketscloud.com/v1/services/widget?event=${tcEventId}`;
}

/** Блоки program, cast, hall, route, menu, shipName, rules, advantages, bookingRules из templateData */
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
    programItems.length > 0 || castItems.length > 0 || hallStr || routeStr || menuStr || shipStr ||
    rulesStr || advantagesStr || bookingRulesStr;
  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      {programItems.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Программа</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-slate-600">
            {programItems.map((item, i) => (
              <li key={i}>{typeof item === 'string' ? item : (item as { name?: string; text?: string })?.name ?? (item as { text?: string })?.text ?? String(item)}</li>
            ))}
          </ul>
        </div>
      )}
      {castItems.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-900">Состав</h2>
          <ul className="mt-3 space-y-1.5 text-slate-600">
            {castItems.map((item, i) => {
              const c = typeof item === 'object' && item && 'name' in item
                ? (item as { name?: string; role?: string })
                : null;
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
          {shipStr && <p className="mt-2 text-slate-600"><span className="font-medium">Теплоход:</span> {shipStr}</p>}
          {menuStr && <p className="mt-2 whitespace-pre-line text-slate-600"><span className="font-medium">Меню:</span><br />{menuStr}</p>}
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

/** Извлечь название площадки из tcData */
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

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  let event: any = null;
  try {
    event = await api.getEventBySlug(slug);
  } catch (e) {
    // Если slug — это venue (музей/площадка), перенаправляем
    try {
      await api.getVenueBySlug(slug);
      redirect(`/venues/${slug}`);
    } catch {
      // И event, и venue не найдены — показываем 404
    }
    return (
      <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20">
        <span className="text-6xl">🔍</span>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Событие не найдено</h1>
        <p className="mt-2 text-slate-500">Возможно, оно было снято с продажи</p>
        <Link href="/events" className="btn-primary mt-6 inline-flex">
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  const tags = event.tags?.map((t: any) => t.tag).filter(Boolean) || [];
  const venueName = getVenueName(event.tcData);

  // Offer-based: primaryOffer из API или fallback на event.source/tcEventId
  const primaryOffer = event.primaryOffer || (event.offers && event.offers.length > 0 ? event.offers[0] : null);
  const buyUrl = primaryOffer?.externalEventId
    ? getTcBuyUrl(primaryOffer.metaEventId || primaryOffer.externalEventId)
    : event.tcEventId
      ? getTcBuyUrl(event.tcMetaEventId || event.tcEventId)
      : null;
  const hasActiveSessions =
    event.sessions?.some((s: any) => s.isActive && s.availableTickets > 0) ?? false;
  const categoryLabel =
    CATEGORY_LABELS[event.category as keyof typeof CATEGORY_LABELS] || 'Событие';
  const subcategoryLabels: string[] = (event.subcategories || [])
    .map((s: string) => SUBCATEGORY_LABELS[s as EventSubcategory])
    .filter(Boolean);

  // Ближайший сеанс
  const nextSession = event.sessions?.find((s: any) => {
    const d = new Date(s.startsAt);
    return d > new Date() && s.isActive;
  });

  return (
    <>
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
            <Link href="/events" className="hover:text-white transition">Каталог</Link>
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
                  <span key={label} className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
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
                  <a href="#reviews" className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-white transition hover:bg-white/25">
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
            {event.priceFrom > 0 && (
              <div className="hidden rounded-xl bg-white/15 px-5 py-3 text-right backdrop-blur-sm sm:block">
                <p className="text-xs text-white/70">от</p>
                <p className="text-2xl font-bold text-white">{formatPrice(event.priceFrom)}</p>
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
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">{event.address}</p>
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
                    {event.venue.shortTitle || event.venue.title}
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
                {tags.map((tag: any) => (
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
            {event.templateData && (
              <TemplateDataBlocks templateData={event.templateData} />
            )}

            {/* Отзывы */}
            <ReviewSection
              eventId={event.id}
              eventSlug={event.slug}
              externalRating={event.externalRating ? Number(event.externalRating) : undefined}
              externalSource={event.externalSource || undefined}
            />

            {/* Mobile buy button */}
            {(primaryOffer || event.tcEventId || event.offers?.some((o: any) => o.status === 'ACTIVE')) && (
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
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {event.relatedEvents.map((related: any) => (
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
                  availability: hasActiveSessions
                    ? 'https://schema.org/InStock'
                    : 'https://schema.org/SoldOut',
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
                ? [{
                    '@type': 'ListItem',
                    position: 2,
                    name: event.city.name,
                    item: `https://daibilet.ru/cities/${event.city.slug}`,
                  }]
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
    </>
  );
}

// ========================
// Компоненты
// ========================

/** Бейдж оффера */
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

/** Карточка покупки (sidebar + mobile) — offer-based */
function BuyCard({
  event,
  buyUrl,
  hasActiveSessions,
  categoryLabel,
  venueName,
  primaryOffer,
}: {
  event: any;
  buyUrl: string | null;
  hasActiveSessions: boolean;
  categoryLabel: string;
  venueName: string | null;
  primaryOffer?: any;
}) {
  // Определяем тип покупки из primaryOffer или fallback на source
  const purchaseType = primaryOffer?.purchaseType
    || (event.source === 'TEPLOHOD' ? 'REDIRECT' : 'WIDGET');
  const isWidget = purchaseType === 'WIDGET';
  const isRequest = purchaseType === 'REQUEST';

  // WIDGET contract: рендерим виджет по widgetProvider, не угадываем
  const widgetProvider = primaryOffer?.widgetProvider || primaryOffer?.source || event.source;
  const isTepWidget = widgetProvider === 'TEPLOHOD' || event.source === 'TEPLOHOD';
  const widgetPayload = primaryOffer?.widgetPayload || {};
  const offerEventId = widgetPayload?.externalEventId || primaryOffer?.externalEventId || event.tcEventId;
  const offerMetaId = widgetPayload?.metaEventId || primaryOffer?.metaEventId || event.tcMetaEventId;
  const offerDeeplink = primaryOffer?.deeplink;
  const offerSource = primaryOffer?.source || event.source;

  // Teplohod: tepWidgetId (виджет из админки) приоритетнее tepEventId (ID события из API)
  const tepWidgetId = widgetPayload?.tepWidgetId ?? null;
  const tepEventId =
    widgetPayload?.tepEventId ??
    (primaryOffer?.externalEventId?.match?.(/^tep-(\d+)$/)?.[1]) ??
    event.tcData?.id ??
    null;
  const offerBadge = primaryOffer?.badge;

  // All active offers for multi-offer display
  const allOffers = (event.offers || []).filter((o: any) => o.status === 'ACTIVE');

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/50">
      {/* Price */}
      {event.priceFrom > 0 ? (
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">{formatPrice(event.priceFrom)}</span>
          <span className="text-sm text-slate-400">/ чел.</span>
        </div>
      ) : (
        <p className="text-lg font-semibold text-slate-600">Цена уточняется</p>
      )}

      {/* Primary offer badge */}
      {offerBadge && (
        <div className="mt-2">
          <OfferBadge badge={offerBadge} />
        </div>
      )}

      {/* Multi-offer display: show alternative purchase options */}
      {allOffers.length > 1 && (
        <div className="mt-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Варианты покупки
          </h3>
          {allOffers.map((offer: any) => (
            <div
              key={offer.id}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 transition ${
                offer.isPrimary ? 'border-primary-300 bg-primary-50' : 'border-slate-200 bg-slate-50'
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
                  {offer.source === 'TC' ? 'TicketsCloud' :
                   offer.source === 'TEPLOHOD' ? 'Теплоход' :
                   offer.operator?.name || 'Дайбилет'}
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
                <TcWidgetButton
                  tcEventId={offer.externalEventId}
                  tcMetaEventId={offer.metaEventId}
                  compact
                >
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

      {/* Sessions preview — кликабельные только для TC-событий (не TEPLOHOD) */}
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
              .filter((s: any) => s.isActive)
              .slice(0, 5)
              .map((session: any) =>
                isWidget && !isTepWidget ? (
                  <TcSessionSlot key={session.id} session={session} />
                ) : (
                  <StaticSessionRow key={session.id} session={session} />
                ),
              )}
          </div>
        </div>
      )}

      {/* Buy button — per offer purchaseType */}
      {isRequest ? (
        /* REQUEST: форма заявки */
        <RequestOfferForm event={event} offer={primaryOffer} />
      ) : isTepWidget && (tepWidgetId || tepEventId || primaryOffer?.externalEventId) ? (
        /* TEPLOHOD: embed-виджет покупки (data-id = tepWidgetId или tepEventId) */
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
              source={offerSource}
              sessions={event.sessions || []}
              address={event.address}
              venueName={venueName}
              priceFrom={event.priceFrom}
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

      {/* Купить (прямой checkout) — только для собственных офферов (не TC, не TEPLOHOD) */}
      {primaryOffer && purchaseType !== 'WIDGET' && !isRequest
        && offerSource !== 'TC' && offerSource !== 'TEPLOHOD' && (
        <div className="mt-3">
          <AddToCartButton
            eventId={event.id}
            offerId={primaryOffer.id}
            eventTitle={event.title}
            eventSlug={event.slug}
            imageUrl={event.imageUrl}
            priceFrom={primaryOffer.priceFrom || event.priceFrom || 0}
            purchaseType={purchaseType}
            source={offerSource}
            deeplink={offerDeeplink}
            badge={offerBadge}
          />
        </div>
      )}

      {/* Trust badges */}
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

/** Форма заявки для REQUEST офферов */
function RequestOfferForm({ event, offer }: { event: any; offer: any }) {
  return (
    <div id="request-form" className="mt-5 space-y-3">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-800">Оставьте заявку</p>
        <p className="text-xs text-amber-600 mt-0.5">
          Оператор свяжется с вами для подтверждения и оплаты
        </p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          try {
            const apiBase = typeof window === 'undefined'
              ? (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') + '/api/v1'
              : (process.env.NEXT_PUBLIC_API_URL || '/api/v1');
            const response = await fetch(`${apiBase}/checkout/request`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  eventId: event.id,
                  offerId: offer?.id,
                  name: data.get('name'),
                  email: data.get('email'),
                  phone: data.get('phone'),
                  comment: data.get('comment'),
                }),
              }
            );
            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              throw new Error(err.message || 'Ошибка отправки');
            }
            form.reset();
            const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (submitBtn) {
              submitBtn.textContent = 'Заявка отправлена!';
              submitBtn.disabled = true;
              submitBtn.className = submitBtn.className.replace('bg-amber-500 hover:bg-amber-600', 'bg-emerald-500');
            }
          } catch (err: unknown) {
            alert((err instanceof Error ? err.message : String(err)) || 'Ошибка отправки заявки');
          }
        }}
        className="space-y-2.5"
      >
        <input
          name="name"
          required
          placeholder="Ваше имя"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
        <input
          name="phone"
          type="tel"
          required
          placeholder="Телефон"
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
        <textarea
          name="comment"
          placeholder="Комментарий (необязательно)"
          rows={2}
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 resize-none"
        />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 text-base font-medium text-white transition hover:bg-amber-600"
        >
          Оставить заявку
        </button>
      </form>
    </div>
  );
}

/** Статичная строка сеанса (для не-TC событий, без виджета) */
function StaticSessionRow({ session }: { session: any }) {
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
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500">
          Распродано
        </span>
      )}
    </div>
  );
}

/** Базовая санитизация HTML: оставляем только безопасные теги */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

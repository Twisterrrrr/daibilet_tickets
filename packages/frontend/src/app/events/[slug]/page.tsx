import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Clock,
  MapPin,
  Users,
  Calendar,
  ArrowRight,
  Building2,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import { EventCard } from '@/components/ui/EventCard';
import { BuyButton } from '@/components/ui/BuyModal';
import { TcWidgetButton } from '@/components/ui/TcWidget';
import { formatPrice, CATEGORY_LABELS } from '@daibilet/shared';

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

/** Извлечь название площадки из tcData */
function getVenueName(tcData: any): string | null {
  if (!tcData?.venue) return null;
  if (typeof tcData.venue === 'string') {
    const match = tcData.venue.match(/name=([^;]+)/);
    return match ? match[1].trim() : null;
  }
  return tcData.venue.name || null;
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  let event: any = null;
  try {
    event = await api.getEventBySlug(slug);
  } catch {
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
  const buyUrl = event.tcEventId ? getTcBuyUrl(event.tcEventId) : null;
  const hasActiveSessions =
    event.sessions?.some((s: any) => s.isActive && s.availableTickets > 0) ?? false;
  const categoryLabel =
    CATEGORY_LABELS[event.category as keyof typeof CATEGORY_LABELS] || 'Событие';

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
            <img
              src={event.imageUrl}
              alt={event.title}
              className="h-full w-full object-cover opacity-80"
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {categoryLabel}
              </span>
              <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl lg:text-4xl leading-tight">
                {event.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/80">
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
              {venueName && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <Building2 className="h-5 w-5 text-primary-500" />
                  <p className="mt-1.5 text-xs text-slate-500">Площадка</p>
                  <p className="text-sm font-medium text-slate-900 line-clamp-2">{venueName}</p>
                </div>
              )}
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

            {/* Mobile buy button */}
            {event.tcEventId && (
              <div className="lg:hidden">
                <BuyCard
                  event={event}
                  buyUrl={buyUrl}
                  hasActiveSessions={hasActiveSessions}
                  categoryLabel={categoryLabel}
                  venueName={venueName}
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

/** Карточка покупки (sidebar + mobile) */
function BuyCard({
  event,
  buyUrl,
  hasActiveSessions,
  categoryLabel,
  venueName,
}: {
  event: any;
  buyUrl: string | null;
  hasActiveSessions: boolean;
  categoryLabel: string;
  venueName: string | null;
}) {
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

      {/* Sessions preview */}
      {event.sessions && event.sessions.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Calendar className="h-3.5 w-3.5" />
            Ближайшие сеансы
          </h3>
          <div className="mt-2.5 space-y-1.5">
            {event.sessions
              .filter((s: any) => s.isActive)
              .slice(0, 3)
              .map((session: any) => {
                const fmt = formatSessionDate(session.startsAt);
                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5"
                  >
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
              })}
          </div>
        </div>
      )}

      {/* Buy button */}
      {event.tcEventId ? (
        <div className="mt-5">
          {(event.source === 'TC' || !event.source) ? (
            /* TC: кнопка-виджет — по клику tcwidget.js откроет popup */
            <TcWidgetButton tcEventId={event.tcEventId}>
              Купить билет
            </TcWidgetButton>
          ) : (
            /* TEPLOHOD и другие: наша модалка */
            <BuyButton
              eventTitle={event.title}
              eventImage={event.imageUrl}
              tcEventId={event.tcEventId}
              source={event.source}
              sessions={event.sessions || []}
              address={event.address}
              venueName={venueName}
              priceFrom={event.priceFrom}
            />
          )}
        </div>
      ) : (
        <button
          disabled
          className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-200 px-6 py-3.5 text-base font-medium text-slate-400"
        >
          Билеты недоступны
        </button>
      )}

      {/* Planner CTA */}
      {event.city && (
        <Link
          href={`/planner?city=${event.city.slug}`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
        >
          Добавить в программу поездки
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}

      {/* Trust badges */}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
        <Shield className="h-4 w-4 text-emerald-500" />
        <span className="text-xs text-slate-500">
          Безопасная оплата через {event.source === 'TEPLOHOD' ? 'teplohod.info' : 'Дайбилет'}
        </span>
      </div>
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

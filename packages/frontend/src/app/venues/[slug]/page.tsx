import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  Clock, MapPin, Phone, Globe, Mail, Star, Train, ChevronRight,
  Ticket, Calendar, ImageIcon, CheckCircle, Users, Zap, ChevronDown,
  ShieldCheck, Baby, Accessibility, Headphones, Navigation,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice, VENUE_TYPE_LABELS, type VenueType } from '@daibilet/shared';
import { TicketsBlock } from '@/components/venue/TicketsBlock';
import { MobileStickyBar } from '@/components/venue/MobileStickyBar';
import { VenueReviewsBlock } from '@/components/venue/VenueReviewsBlock';
import { VenueCard } from '@/components/ui/VenueCard';

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const res = await api.getVenues({ limit: 200 });
    return res.items.map((v: any) => ({ slug: v.slug }));
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
    const venue = await api.getVenueBySlug(slug);
    return {
      title: venue.metaTitle || `${venue.title} — билеты, часы работы, адрес | Дайбилет`,
      description: venue.metaDescription || venue.shortDescription || stripHtml(venue.description || '').slice(0, 160),
    };
  } catch {
    return { title: 'Место не найдено' };
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// --- Helpers ---
const DAY_MAP_RU: Record<string, string> = {
  'Пн': 'mon', 'Вт': 'tue', 'Ср': 'wed', 'Чт': 'thu', 'Пт': 'fri', 'Сб': 'sat', 'Вс': 'sun',
};
const DAY_NAMES: Record<string, string> = {
  mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс',
};
const DAY_NAMES_FULL: Record<string, string> = {
  mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг',
  fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье',
};
const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SCHEMA_DAY: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

const FEATURE_LABELS: Record<string, { label: string; icon: string }> = {
  no_queue: { label: 'Без очереди', icon: 'zap' },
  audio_guide: { label: 'Аудиогид', icon: 'headphones' },
  kids_friendly: { label: 'Подходит детям', icon: 'baby' },
  wheelchair: { label: 'Доступная среда', icon: 'accessibility' },
  guided_tour: { label: 'С экскурсоводом', icon: 'users' },
  photo_allowed: { label: 'Можно фотографировать', icon: 'check' },
  cafe: { label: 'Есть кафе', icon: 'check' },
  gift_shop: { label: 'Сувенирный магазин', icon: 'check' },
};

function normalizeHours(raw: Record<string, string> | null | undefined): Record<string, string> {
  if (!raw) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalized = DAY_MAP_RU[key] || key.toLowerCase();
    result[normalized] = value;
  }
  return result;
}

function getTodayKey(): string {
  const d = new Date().getDay();
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d];
}

function isOpenNow(hours: Record<string, string>): boolean {
  const todayKey = getTodayKey();
  const todayHours = hours[todayKey];
  if (!todayHours || todayHours.toLowerCase().includes('выходной')) return false;
  const parts = todayHours.split(/[–\-]/);
  if (parts.length < 2) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = (parts[0] || '').trim().split(':').map(Number);
  const [ch, cm] = (parts[1] || '').trim().split(':').map(Number);
  const openMin = (oh || 0) * 60 + (om || 0);
  const closeMin = (ch || 0) * 60 + (cm || 0);
  return currentMinutes >= openMin && currentMinutes < closeMin;
}

function FeatureIcon({ name }: { name: string }) {
  switch (name) {
    case 'zap': return <Zap size={14} />;
    case 'headphones': return <Headphones size={14} />;
    case 'baby': return <Baby size={14} />;
    case 'accessibility': return <Accessibility size={14} />;
    case 'users': return <Users size={14} />;
    default: return <CheckCircle size={14} />;
  }
}

// === PAGE ===

export default async function VenuePage({ params }: Props) {
  const { slug } = await params;

  let venue: any;
  try {
    venue = await api.getVenueBySlug(slug);
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Место не найдено</h1>
          <Link href="/venues" className="text-blue-600 hover:underline">Вернуться к каталогу</Link>
        </div>
      </div>
    );
  }

  const hours = normalizeHours(venue.openingHours);
  const todayKey = getTodayKey();
  const todayHours = hours[todayKey] ?? null;
  const typeLabel = VENUE_TYPE_LABELS[venue.venueType as VenueType] || venue.venueType;
  const openNow = isOpenNow(hours);
  const hasNoQueue = (venue.features || []).includes('no_queue');

  const permanentExhibitions = venue.exhibitions?.filter((e: any) => e.isPermanent) || [];
  const temporaryExhibitions = venue.exhibitions?.filter((e: any) => !e.isPermanent) || [];
  const highlights: string[] = venue.highlights || [];
  const faq: { q: string; a: string }[] = venue.faq || [];
  const features: string[] = venue.features || [];
  const primaryOffer = venue.offers?.[0];

  // Quick facts for hero (2-3 bullet points)
  const quickFacts: string[] = [];
  if (venue.metro) quickFacts.push(venue.metro);
  if (features.includes('kids_friendly')) quickFacts.push('Подходит детям');
  if (features.includes('audio_guide')) quickFacts.push('Аудиогид');
  if (venue.district) quickFacts.push(venue.district);
  const displayFacts = quickFacts.slice(0, 3);

  // JSON-LD
  const offersJsonLd = (venue.offers || [])
    .filter((o: any) => o.priceFrom)
    .map((o: any) => ({
      '@type': 'Offer',
      price: (o.priceFrom / 100).toFixed(0),
      priceCurrency: 'RUB',
      availability: o.availabilityMode === 'SOLD_OUT'
        ? 'https://schema.org/SoldOut'
        : 'https://schema.org/InStock',
      url: o.deeplink || venue.website || '',
    }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': venue.venueType === 'MUSEUM' ? 'Museum'
           : venue.venueType === 'GALLERY' ? 'Museum'
           : venue.venueType === 'THEATER' ? 'PerformingArtsTheater'
           : venue.venueType === 'PARK' ? 'Park'
           : 'TouristAttraction',
    name: venue.title,
    description: venue.shortDescription || stripHtml(venue.description || ''),
    image: venue.imageUrl,
    address: venue.address ? { '@type': 'PostalAddress', streetAddress: venue.address, addressLocality: venue.city?.name, addressCountry: 'RU' } : undefined,
    geo: venue.lat && venue.lng ? { '@type': 'GeoCoordinates', latitude: venue.lat, longitude: venue.lng } : undefined,
    telephone: venue.phone,
    url: venue.website,
    aggregateRating: venue.rating > 0 ? { '@type': 'AggregateRating', ratingValue: venue.rating, reviewCount: venue.reviewCount } : undefined,
    ...(offersJsonLd.length > 0 && { makesOffer: offersJsonLd }),
    ...(Object.keys(hours).length > 0 && {
      openingHoursSpecification: DAY_ORDER
        .filter((d) => hours[d] && !hours[d].toLowerCase().includes('выходной'))
        .map((d) => {
          const parts = hours[d].split(/[–\-]/);
          return { '@type': 'OpeningHoursSpecification', dayOfWeek: SCHEMA_DAY[d], opens: (parts[0] || '').trim(), closes: (parts[1] || '').trim() };
        }),
    }),
  };

  // FAQ JSON-LD (FAQPage schema — отдельный блок для SEO)
  const faqJsonLd = faq.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  } : null;

  // Determine CTA for sticky bar and hero
  const stickyCtaHref = primaryOffer?.purchaseType === 'REDIRECT' && primaryOffer?.deeplink
    ? primaryOffer.deeplink
    : '#tickets';
  const stickyIsExternal = primaryOffer?.purchaseType === 'REDIRECT' && !!primaryOffer?.deeplink;

  // Check if venue events are OPEN_DATE
  const isOpenDate = venue.exhibitions?.some((e: any) => e.dateMode === 'OPEN_DATE') || false;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}

      {/* ═══ 0. HERO — Above the fold ═══ */}
      <section className="relative bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        {venue.imageUrl && (
          <div className="absolute inset-0 opacity-30">
            <Image src={venue.imageUrl} alt={venue.title} fill className="object-cover" priority sizes="100vw" />
          </div>
        )}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-14">
          {/* Breadcrumbs (compact) */}
          <nav className="flex items-center text-xs text-white/50 gap-1 mb-4">
            <Link href="/" className="hover:text-white/80">Главная</Link>
            <ChevronRight size={12} />
            <Link href="/venues" className="hover:text-white/80">Музеи и Арт</Link>
            {venue.city && (<><ChevronRight size={12} /><Link href={`/venues?city=${venue.city.slug}`} className="hover:text-white/80">{venue.city.name}</Link></>)}
          </nav>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div className="max-w-2xl">
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2.5 py-1 bg-white/15 backdrop-blur rounded-full text-xs font-medium">{typeLabel}</span>
                {openNow && (
                  <span className="px-2.5 py-1 bg-emerald-500/90 rounded-full text-xs font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Открыто сейчас
                  </span>
                )}
                {hasNoQueue && (
                  <span className="px-2.5 py-1 bg-amber-500/90 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Zap size={12} /> Без очереди
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">{venue.title}</h1>

              {/* Rating */}
              {venue.rating > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={16} className={i <= Math.round(venue.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'} />
                    ))}
                  </div>
                  <span className="font-bold text-lg">{venue.rating.toFixed(1)}</span>
                  <a href="#reviews" className="text-white/60 hover:text-white/90 text-sm underline-offset-2 hover:underline">
                    {venue.reviewCount} отзывов
                  </a>
                  {venue.recommendPercent > 0 && (
                    <span className="text-emerald-400 text-sm font-medium">{venue.recommendPercent}% рекомендуют</span>
                  )}
                </div>
              )}

              {/* Quick facts */}
              {displayFacts.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-white/70">
                  {displayFacts.map((f, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-white/40" />
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* CTA block (desktop) */}
            <div className="hidden md:flex flex-col items-end gap-2 flex-shrink-0">
              {venue.priceFrom && (
                <div className="text-right">
                  <p className="text-white/60 text-sm">Билет от</p>
                  <p className="text-3xl font-extrabold">{formatPrice(venue.priceFrom)}</p>
                </div>
              )}
              {primaryOffer ? (
                primaryOffer.purchaseType === 'REDIRECT' && primaryOffer.deeplink ? (
                  <a href={primaryOffer.deeplink} target="_blank" rel="noopener noreferrer"
                    className="px-8 py-3.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-500/25">
                    Купить билет
                  </a>
                ) : (
                  <a href="#tickets" className="px-8 py-3.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-500/25">
                    Выбрать билет
                  </a>
                )
              ) : (
                <a href="#tickets" className="px-8 py-3.5 bg-blue-500 hover:bg-blue-400 text-white rounded-xl font-bold text-lg transition-colors shadow-lg shadow-blue-500/25">
                  Купить билет
                </a>
              )}
              {todayHours && (
                <p className="text-xs text-white/50">Сегодня {todayHours}</p>
              )}
              {/* Sentinel for IntersectionObserver — sticky bar appears when this scrolls out */}
              <div id="hero-cta-sentinel" className="h-0 w-0" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 1. STICKY BOTTOM BAR (mobile — appears on scroll) ═══ */}
      <MobileStickyBar
        priceFrom={venue.priceFrom}
        ctaHref={stickyCtaHref}
        ctaText="Купить билет"
        isExternal={stickyIsExternal}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-10 pb-24 md:pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">

            {/* ═══ 2. БИЛЕТЫ (интерактивный блок) ═══ */}
            <TicketsBlock
              offers={venue.offers || []}
              isOpenDate={isOpenDate}
              venueName={venue.title}
              website={venue.website}
            />

            {/* ═══ 3. СОЦИАЛЬНОЕ ДОКАЗАТЕЛЬСТВО ═══ */}
            <section id="reviews">
              <VenueReviewsBlock
                venueId={venue.id}
                venueSlug={venue.slug}
                externalRating={venue.externalRating}
                externalSource={venue.externalSource}
              />
            </section>

            {/* ═══ 4. ЧТО ВНУТРИ ═══ */}
            <section>
              <h2 className="text-xl font-bold mb-4">О месте</h2>
              {/* Highlights — быстрые буллеты */}
              {highlights.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{h}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Features */}
              {features.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {features.map((f) => {
                    const feat = FEATURE_LABELS[f];
                    if (!feat) return null;
                    return (
                      <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                        <FeatureIcon name={feat.icon} />
                        {feat.label}
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Short description */}
              {venue.description && (
                <div className="prose prose-sm max-w-none text-gray-600 line-clamp-6"
                  dangerouslySetInnerHTML={{ __html: venue.description }}
                />
              )}
            </section>

            {/* Gallery */}
            {venue.galleryUrls && venue.galleryUrls.length > 0 && (
              <section>
                <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                  {venue.galleryUrls.map((url: string, i: number) => (
                    <div key={i} className="flex-shrink-0 w-64 h-44 rounded-xl overflow-hidden snap-start">
                      <Image src={url} alt={`${venue.title} — фото ${i + 1}`} width={256} height={176} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ═══ 5. ПРАКТИЧЕСКАЯ ИНФОРМАЦИЯ ═══ */}
            <section>
              <h2 className="text-xl font-bold mb-4">Как посетить</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hours */}
                {Object.keys(hours).length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                      <Clock size={16} className="text-gray-400" /> Часы работы
                    </h3>
                    <div className="space-y-1.5">
                      {DAY_ORDER.map((day) => {
                        const dh = hours[day];
                        const isToday = day === todayKey;
                        return (
                          <div key={day} className={`flex justify-between text-sm ${isToday ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>
                            <span>{DAY_NAMES[day]}{isToday ? ' (сегодня)' : ''}</span>
                            <span>{dh || 'Выходной'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Address & directions */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                    <Navigation size={16} className="text-gray-400" /> Как добраться
                  </h3>
                  {venue.address && (
                    <p className="text-sm text-gray-700 mb-2">{venue.address}</p>
                  )}
                  {venue.metro && (
                    <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-2">
                      <Train size={14} /> м. {venue.metro}
                    </p>
                  )}
                  {venue.phone && (
                    <p className="text-sm">
                      <a href={`tel:${venue.phone}`} className="text-blue-600 hover:underline">{venue.phone}</a>
                    </p>
                  )}
                  {venue.website && (
                    <p className="text-sm mt-1">
                      <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        <Globe size={14} /> Официальный сайт
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ═══ 6. ВЫСТАВКИ И СОБЫТИЯ ═══ */}
            {(permanentExhibitions.length > 0 || temporaryExhibitions.length > 0) && (
              <section>
                <h2 className="text-xl font-bold mb-4">Выставки и события</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...temporaryExhibitions, ...permanentExhibitions].map((e: any) => (
                    <Link key={e.id} href={`/events/${e.slug}`}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                      {e.imageUrl && (
                        <div className="relative h-32 overflow-hidden">
                          <Image src={e.imageUrl} alt={e.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                          {e.isPermanent && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 rounded text-[10px] font-bold text-gray-700">Постоянная</span>
                          )}
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">{e.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                          {e.endDate && !e.isPermanent && (
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              до {new Date(e.endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {e.priceFrom && <span>от {formatPrice(e.priceFrom)}</span>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* ═══ 7. FAQ ═══ */}
            {faq.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Частые вопросы</h2>
                <div className="space-y-2">
                  {faq.map((item, i) => (
                    <details key={i} className="group bg-white rounded-xl border border-gray-200">
                      <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                        <span className="font-medium text-sm text-gray-900">{item.q}</span>
                        <ChevronDown size={18} className="text-gray-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="px-4 pb-4 text-sm text-gray-600">{item.a}</div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Похожие места */}
            {venue.relatedVenues && venue.relatedVenues.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Похожие места</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {venue.relatedVenues.map((v: any) => (
                    <VenueCard
                      key={v.id}
                      slug={v.slug}
                      title={v.title}
                      shortTitle={v.shortTitle}
                      venueType={v.venueType}
                      imageUrl={v.imageUrl}
                      address={v.address}
                      priceFrom={v.priceFrom}
                      rating={Number(v.rating) || 0}
                      reviewCount={v.reviewCount || 0}
                      city={v.city}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Related Articles */}
            {venue.relatedArticles && venue.relatedArticles.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Читайте также</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {venue.relatedArticles.map((article: any) => (
                    <Link key={article.slug} href={`/blog/${article.slug}`}
                      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                      {article.coverImage && (
                        <div className="relative h-28 overflow-hidden">
                          <Image src={article.coverImage} alt={article.title} fill className="object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      )}
                      <div className="p-3">
                        <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">{article.title}</h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ═══ SIDEBAR (desktop) ═══ */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              {/* Quick purchase card */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                {venue.priceFrom && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500">Билет от</p>
                    <p className="text-2xl font-extrabold text-gray-900">{formatPrice(venue.priceFrom)}</p>
                  </div>
                )}
                {primaryOffer?.purchaseType === 'REDIRECT' && primaryOffer?.deeplink ? (
                  <a href={primaryOffer.deeplink} target="_blank" rel="noopener noreferrer"
                    className="block w-full text-center px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm">
                    Купить билет
                  </a>
                ) : (
                  <a href="#tickets"
                    className="block w-full text-center px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm">
                    Выбрать билет
                  </a>
                )}
                {/* Status badges */}
                <div className="mt-3 space-y-2">
                  {openNow && todayHours && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      Открыто сегодня до {todayHours.split(/[–\-]/)[1]?.trim()}
                    </div>
                  )}
                  {!openNow && todayHours && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock size={14} /> Сегодня: {todayHours}
                    </div>
                  )}
                  {hasNoQueue && (
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <Zap size={14} /> Можно без очереди
                    </div>
                  )}
                </div>
              </div>

              {/* Contact info */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <h3 className="font-bold text-sm text-gray-900">Контакты</h3>
                {venue.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{venue.address}</span>
                  </div>
                )}
                {venue.metro && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Train size={14} className="text-gray-400" /> м. {venue.metro}
                  </div>
                )}
                {venue.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-gray-400" />
                    <a href={`tel:${venue.phone}`} className="text-blue-600 hover:underline">{venue.phone}</a>
                  </div>
                )}
                {venue.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe size={14} className="text-gray-400" />
                    <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                      {venue.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </div>
                )}
              </div>

              {/* External rating */}
              {venue.externalRating && venue.externalSource && (
                <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 rounded-xl text-sm">
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">{Number(venue.externalRating).toFixed(1)}</span>
                  <span className="text-gray-500">
                    {venue.externalSource === 'yandex_maps' ? 'Яндекс.Карты' : venue.externalSource === '2gis' ? '2ГИС' : venue.externalSource}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

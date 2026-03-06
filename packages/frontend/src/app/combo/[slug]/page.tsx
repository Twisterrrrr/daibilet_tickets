import { formatPrice } from '@daibilet/shared';
import { Calendar, CheckCircle, ChevronRight, Clock, MapPin, Star } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FaqSection } from '@/components/landing/FaqSection';
import { api } from '@/lib/api';
import { toComboDetailVM } from '../_comboVm';

export const revalidate = 21600;

export async function generateStaticParams() {
  try {
    const combos = await api.getCombos();
    return combos.map((c) => ({ slug: c.slug }));
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
    const data = await api.getComboBySlug(slug);
    const metaTitle = typeof data.metaTitle === 'string' ? data.metaTitle : null;
    const title = typeof data.title === 'string' ? data.title : '';
    const metaDesc = typeof data.metaDescription === 'string' ? data.metaDescription : null;
    const subtitle = typeof data.subtitle === 'string' ? data.subtitle : null;
    const desc = typeof data.description === 'string' ? data.description : null;
    return {
      title: metaTitle || `${title} | Дайбилет`,
      description: metaDesc || subtitle || desc || undefined,
    };
  } catch {
    return { title: 'Программа не найдена | Дайбилет' };
  }
}

const SLOT_LABELS: Record<string, string> = {
  MORNING: 'Утро',
  AFTERNOON: 'День',
  EVENING: 'Вечер',
};

const SLOT_COLORS: Record<string, string> = {
  MORNING: 'bg-amber-50 text-amber-700 border-amber-200',
  AFTERNOON: 'bg-sky-50 text-sky-700 border-sky-200',
  EVENING: 'bg-violet-50 text-violet-700 border-violet-200',
};

export default async function ComboDetailPage({ params }: Props) {
  const { slug } = await params;

  let raw: Awaited<ReturnType<typeof api.getComboBySlug>>;
  try {
    raw = await api.getComboBySlug(slug);
  } catch {
    notFound();
  }

  const data = toComboDetailVM(raw);
  const features = data.features;
  const includes = data.includes;
  const faq = data.faq;
  const days = data.days;
  const upsells = data.upsells;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white py-16">
        <div className="container mx-auto px-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center text-sm text-indigo-300 mb-6 flex-wrap">
            <Link href="/" className="hover:text-white">
              Главная
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <Link href="/combo" className="hover:text-white">
              Программы
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <Link href={`/cities/${data.city.slug}`} className="hover:text-white">
              {data.city.name}
            </Link>
            <ChevronRight className="w-4 h-4 mx-1" />
            <span className="text-white">{data.title}</span>
          </nav>

          <h1 className="text-3xl md:text-5xl font-bold mb-4">{data.title}</h1>
          {data.subtitle && <p className="text-xl text-indigo-200 max-w-3xl">{data.subtitle}</p>}

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <span className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full text-sm">
              <MapPin className="w-4 h-4" />
              {data.city.name}
            </span>
            <span className="flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-full text-sm">
              <Calendar className="w-4 h-4" />
              {data.dayCount} {data.dayCount === 1 ? 'день' : data.dayCount < 5 ? 'дня' : 'дней'}
            </span>
            {data.suggestedPrice && (
              <span className="flex items-center gap-1 bg-indigo-500/30 px-3 py-1.5 rounded-full text-sm font-medium">
                от {formatPrice(data.suggestedPrice)}
              </span>
            )}
          </div>

          {/* CTA */}
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#program"
              className="bg-white text-indigo-900 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
            >
              Смотреть программу
            </a>
            <Link
              href={`/events?city=${data.city.slug}`}
              className="border border-white/30 text-white px-8 py-3 rounded-xl font-medium hover:bg-white/10 transition-colors"
            >
              Все события
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      {features.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
                <span className="text-4xl mb-3 block">{f.icon}</span>
                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* What's included */}
      {includes.length > 0 && (
        <section className="container mx-auto px-4 pb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Что включено</h2>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="grid md:grid-cols-2 gap-3">
              {includes.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Program by days */}
      <section id="program" className="container mx-auto px-4 pb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Программа по дням</h2>

        {days.length > 0 ? (
          <div className="space-y-8">
            {days.map((day) => (
              <div key={day.dayNumber}>
                <h3 className="text-lg font-bold text-gray-800 mb-4">День {day.dayNumber}</h3>
                <div className="space-y-4">
                  {day.slots.map((slot, si) => (
                    <div
                      key={si}
                      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-start gap-4"
                    >
                      {/* Time badge */}
                      <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-1 flex-shrink-0 md:w-20">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border ${SLOT_COLORS[slot.slot ?? ''] || 'bg-gray-50'}`}
                        >
                          {SLOT_LABELS[slot.slot ?? ''] ?? slot.slot ?? ''}
                        </span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {slot.time ?? '—'}
                        </span>
                      </div>

                      {/* Event image + info */}
                      {slot.event && (
                        <div className="flex gap-3 flex-1 min-w-0">
                          {slot.event.imageUrl && (
                            <Image
                              src={slot.event.imageUrl}
                              alt={slot.event.title}
                              width={64}
                              height={64}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/events/${slot.event.slug}`}
                              className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2"
                            >
                              {slot.event.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                              {(slot.event.durationMinutes ?? 0) > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" /> {slot.event.durationMinutes} мин
                                </span>
                              )}
                              {(slot.event.rating ?? 0) > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                  {Number(slot.event.rating).toFixed(1)}
                                </span>
                              )}
                              {((slot.session?.availableTickets ?? 0) > 0 &&
                                (slot.session?.availableTickets ?? 0) < 20) && (
                                <span className="text-red-500 text-xs font-medium">
                                  Осталось {slot.session?.availableTickets} мест
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Price */}
                      {((slot.adultPrice ?? slot.subtotal ?? 0) as number) > 0 && (
                        <div className="text-right flex-shrink-0">
                          <span className="text-lg font-bold text-indigo-700">
                            {formatPrice(slot.adultPrice ?? slot.subtotal ?? 0)}
                          </span>
                          <span className="text-xs text-gray-400 block">/ чел.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <p className="text-gray-500 mb-4">
              Программа формируется из актуальных событий. Нажмите «Настроить под себя», чтобы получить персональный
              маршрут.
            </p>
            <Link
              href={`/events?city=${data.city.slug}`}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Все события в городе
            </Link>
          </div>
        )}
      </section>

      {/* Pricing summary */}
      {data.pricing && (
        <section className="container mx-auto px-4 pb-12">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
            <h2 className="text-2xl font-bold mb-6">Стоимость программы</h2>

            {/* Price grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">Билеты</p>
                <p className="text-xl font-bold mt-1">{formatPrice(data.pricing.basePrice)}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 text-center">
                <p className="text-xs text-slate-400">Сервисный сбор</p>
                <p className="text-xl font-bold mt-1">
                  {data.pricing.serviceFee > 0 ? formatPrice(data.pricing.serviceFee) : 'Бесплатно'}
                </p>
              </div>
              {data.pricing.markup > 0 && (
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-xs text-slate-400">Сезонная наценка</p>
                  <p className="text-xl font-bold mt-1">{formatPrice(data.pricing.markup)}</p>
                </div>
              )}
              <div className="bg-indigo-500/30 rounded-xl p-4 text-center">
                <p className="text-xs text-indigo-300">Итого за 2 чел.</p>
                <p className="text-2xl font-extrabold mt-1">{formatPrice(data.pricing.grandTotal)}</p>
                <p className="text-xs text-indigo-300 mt-0.5">{formatPrice(data.pricing.perPerson)} / чел.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={`/events?city=${data.city.slug}`}
                className="bg-white text-slate-900 px-8 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors"
              >
                Все события
              </Link>
              <span className="text-sm text-slate-400">
                Цена может варьироваться в зависимости от дат и доступности
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Upsells */}
      {upsells.length > 0 && (
        <section className="container mx-auto px-4 pb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Дополнительные услуги</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upsells.slice(0, 6).map((upsell) => (
              <div
                key={upsell.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start gap-4"
              >
                <span className="text-3xl">{upsell.icon}</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{upsell.name}</h4>
                  {upsell.description && (
                    <p className="text-sm text-gray-600 mt-0.5">{upsell.description}</p>
                  )}
                  <span className="text-indigo-700 font-bold mt-2 block">
                    +{formatPrice(upsell.priceKopecks ?? 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Description (SEO text) */}
      {data.description && (
        <section className="container mx-auto px-4 pb-12">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 prose prose-indigo max-w-none">
            <p className="text-gray-700 leading-relaxed">{data.description}</p>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faq.length > 0 && (
        <section className="container mx-auto px-4 pb-12">
          <FaqSection items={faq} />
        </section>
      )}

      {/* Schema.org Product markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: data.title,
            description: data.subtitle || data.description,
            offers: (data.suggestedPrice ?? 0) > 0
              ? {
                  '@type': 'Offer',
                  price: ((data.suggestedPrice ?? 0) / 100).toFixed(0),
                  priceCurrency: 'RUB',
                  availability: 'https://schema.org/InStock',
                }
              : undefined,
            brand: {
              '@type': 'Brand',
              name: 'Дайбилет',
            },
          }),
        }}
      />
    </main>
  );
}

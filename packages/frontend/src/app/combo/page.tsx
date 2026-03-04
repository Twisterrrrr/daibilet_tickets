import { formatPrice } from '@daibilet/shared';
import { ArrowRight, Calendar, MapPin, Star, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { api } from '@/lib/api';
import { toComboListVM, type ComboListVM } from './_comboVm';

export const revalidate = 21600;

export const metadata: Metadata = {
  title: 'Готовые программы — маршруты по городам России | Дайбилет',
  description:
    'Готовые маршруты и программы для путешествий: Петербург, Москва, Казань. Все билеты и бронирования в одном месте.',
};

export default async function CombosListPage() {
  let rawCombos: Awaited<ReturnType<typeof api.getCombos>> = [];
  try {
    rawCombos = await api.getCombos();
  } catch {
    // API недоступен
  }

  const combos = rawCombos.map(toComboListVM).filter((c) => c.city != null);

  // Группировка по городам
  const byCity = new Map<string, { city: { slug: string; name: string }; combos: ComboListVM[] }>();
  for (const combo of combos) {
    const city = combo.city!;
    const citySlug = city.slug;
    if (!byCity.has(citySlug)) {
      byCity.set(citySlug, { city, combos: [] });
    }
    byCity.get(citySlug)!.combos.push(combo);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Готовые программы</h1>
          <p className="text-xl text-indigo-200 max-w-2xl mx-auto">
            Не хотите планировать? Мы уже собрали лучшие маршруты. Все билеты включены — просто выберите программу.
          </p>
        </div>
      </section>

      {/* Combo cards */}
      <section className="container mx-auto px-4 py-12">
        {combos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">Скоро здесь появятся готовые программы.</p>
            <Link href="/events" className="mt-4 inline-block text-indigo-600 hover:underline">
              Смотреть каталог событий &rarr;
            </Link>
          </div>
        ) : (
          Array.from(byCity.values()).map(({ city, combos: cityCombos }) => (
            <div key={city.slug} className="mb-12">
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">{city.name}</h2>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cityCombos.map((combo) => (
                  <Link
                    key={combo.slug}
                    href={`/combo/${combo.slug}`}
                    className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-indigo-200 transition-all overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b border-gray-100">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                        {combo.title}
                      </h3>
                      {combo.subtitle && <p className="text-sm text-gray-600 mt-1">{combo.subtitle}</p>}
                    </div>

                    {/* Card body */}
                    <div className="p-6">
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {(combo.dayCount ?? 0)}{' '}
                          {(combo.dayCount ?? 0) === 1
                            ? 'день'
                            : (combo.dayCount ?? 0) < 5
                              ? 'дня'
                              : 'дней'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {combo.intensity === 'RELAXED'
                            ? 'Спокойный'
                            : combo.intensity === 'ACTIVE'
                              ? 'Активный'
                              : 'Средний'}{' '}
                          темп
                        </span>
                      </div>

                      {/* Features */}
                      {combo.features && (
                        <div className="space-y-2 mb-4">
                          {(combo.features ?? []).slice(0, 3).map((f, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span>{f.icon ?? ''}</span>
                              <span className="text-gray-700">{f.title ?? ''}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Price + CTA */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        {(combo.suggestedPrice ?? 0) > 0 ? (
                          <div>
                            <span className="text-sm text-gray-500">от </span>
                            <span className="text-xl font-bold text-indigo-700">
                              {formatPrice(combo.suggestedPrice ?? 0)}
                            </span>
                            <span className="text-sm text-gray-500"> / 2 чел.</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Цена по запросу</span>
                        )}
                        <span className="flex items-center gap-1 text-indigo-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                          Подробнее <ArrowRight className="w-4 h-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {/* CTA */}
      <section className="bg-white py-12 border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Ищете что-то конкретное?</h2>
          <p className="text-gray-600 mb-6">Посмотрите все события по категориям, городам и датам</p>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <Star className="w-5 h-5" />
            Смотреть каталог
          </Link>
        </div>
      </section>
    </main>
  );
}

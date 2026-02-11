import Link from 'next/link';
import { MapPin, Ticket, Calendar, QrCode, ArrowRight, TrendingUp } from 'lucide-react';
import { CATEGORY_LABELS, EventCategory } from '@daibilet/shared';
import { api } from '@/lib/api';

// ISR: обновлять каждый час
export const revalidate = 3600;

const features = [
  {
    icon: Ticket,
    title: 'Билеты на всё',
    description: 'Экскурсии, музеи, шоу, концерты — тысячи событий в одном месте',
  },
  {
    icon: Calendar,
    title: 'Умный планировщик',
    description: 'Укажите даты и состав группы — получите готовую программу на каждый день',
  },
  {
    icon: QrCode,
    title: 'Единый ваучер',
    description: 'Один QR-код на всю программу. Билеты на каждое событие — на вашу почту',
  },
];

const categoryMeta = [
  { category: EventCategory.EXCURSION, emoji: '🚶' },
  { category: EventCategory.MUSEUM, emoji: '🏛️' },
  { category: EventCategory.EVENT, emoji: '🎭' },
];

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} событий`;
  if (mod10 === 1) return `${n} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} события`;
  return `${n} событий`;
}

export default async function HomePage() {
  let cities: any[] = [];
  try {
    cities = await api.getCities(true); // только featured-города
  } catch {
    cities = [];
  }

  const topCities = cities;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="container-page relative py-20 sm:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Откройте для себя города России
            </h1>
            <p className="mt-6 text-lg leading-8 text-primary-100">
              Билеты на экскурсии, музеи и мероприятия. Спланируйте идеальную
              программу посещения — мы подберём события под ваши даты и интересы.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link href="/events" className="btn-primary bg-white !text-primary-700 hover:!bg-primary-50">
                <Ticket className="mr-2 h-5 w-5" />
                Смотреть каталог
              </Link>
              <Link href="/planner" className="btn-secondary border-primary-400 !text-white hover:!bg-primary-600">
                Спланировать поездку
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Как это работает */}
      <section className="py-16 sm:py-20">
        <div className="container-page">
          <h2 className="text-center text-3xl font-bold text-slate-900">
            Как это работает
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {features.map((feature, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-100">
                  <feature.icon className="h-7 w-7 text-primary-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-slate-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Категории */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="container-page">
          <h2 className="text-3xl font-bold text-slate-900">Что посмотреть</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {categoryMeta.map(({ category, emoji }) => (
              <Link
                key={category}
                href={`/events?category=${category}`}
                className="card flex items-center gap-4 p-6 transition-transform hover:scale-[1.02]"
              >
                <span className="text-4xl">{emoji}</span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <p className="text-sm text-slate-500">Смотреть все</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Города — из API, по убыванию событий */}
      <section className="py-16 sm:py-20">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Города</h2>
              <p className="mt-1 text-slate-500">Отсортированы по количеству событий</p>
            </div>
            <Link
              href="/cities"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Все города →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {topCities.map((city: any) => (
              <Link
                key={city.slug}
                href={`/cities/${city.slug}`}
                className="card group relative flex h-48 flex-col justify-end overflow-hidden bg-gradient-to-br from-primary-800 to-primary-950 transition-transform hover:scale-[1.02]"
              >
                {city.heroImage && (
                  <img
                    src={city.heroImage}
                    alt={city.name}
                    className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative p-5">
                  <h3 className="text-xl font-bold text-white">{city.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-300">
                      {pluralEvents(city._count?.events ?? 0)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Trip Planner */}
      <section className="bg-gradient-to-r from-primary-600 to-accent-600 py-16 sm:py-20">
        <div className="container-page text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Не знаете, с чего начать?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
            Наш планировщик подберёт идеальную программу под ваши даты,
            бюджет и состав группы. С детьми или вдвоём — найдём лучшее.
          </p>
          <Link
            href="/planner"
            className="btn-primary mt-8 bg-white !text-primary-700 hover:!bg-primary-50"
          >
            <MapPin className="mr-2 h-5 w-5" />
            Попробовать планировщик
          </Link>
        </div>
      </section>
    </>
  );
}

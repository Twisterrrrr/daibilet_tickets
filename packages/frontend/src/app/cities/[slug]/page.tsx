import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Ticket,
  Star,
  Tag,
  TrendingUp,
  Users,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { EventCard } from '@/components/ui/EventCard';
import { VenueCard } from '@/components/ui/VenueCard';
import { CATEGORY_LABELS, EventCategory, formatPrice } from '@daibilet/shared';

// ISR: обновлять каждые 6 часов
export const revalidate = 21600;

/** Предварительная генерация для featured-городов */
export async function generateStaticParams() {
  try {
    const cities = await api.getCities(true);
    return cities.map((c: any) => ({ slug: c.slug }));
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
    const city = await api.getCityBySlug(slug);
    return {
      title:
        city.metaTitle ||
        `${city.name} — экскурсии, музеи и билеты на мероприятия | Дайбилет`,
      description:
        city.metaDescription ||
        city.description ||
        `Лучшие экскурсии, музеи и мероприятия в ${city.name}. Покупайте билеты онлайн на Дайбилет.`,
    };
  } catch {
    return { title: 'Город не найден' };
  }
}

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} событий`;
  if (mod10 === 1) return `${n} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} события`;
  return `${n} событий`;
}

/** Склонение названия региона в предложный падеж ("Также в ...") */
function declineRegionName(name: string): string {
  // Словарь исключений
  const exceptions: Record<string, string> = {
    'Золотое кольцо': 'Золотом кольце',
    'Татарстан': 'Татарстане',
  };
  if (exceptions[name]) return exceptions[name];

  // "Xская область" → "Xской области", "Xая область" → "Xой области"
  if (name.endsWith('ская область')) return name.replace('ская область', 'ской области');
  if (name.endsWith('кая область')) return name.replace('кая область', 'кой области');

  // Общий fallback для "область"
  if (name.endsWith(' область')) return name.replace(' область', ' области');

  return name;
}

/** Краткая информация о городе — рекомендации и must-see */
const CITY_INFO: Record<
  string,
  { brief: string; mustSee: Array<{ name: string; desc: string }> }
> = {
  'saint-petersburg': {
    brief:
      'Культурная столица России с более чем 300 музеями, величественными дворцами, каналами и белыми ночами. Петербург — обязательный пункт для любого путешественника.',
    mustSee: [
      { name: 'Эрмитаж', desc: 'Один из крупнейших музеев мира — 3 млн экспонатов' },
      { name: 'Петропавловская крепость', desc: 'Историческое сердце города на Заячьем острове' },
      { name: 'Дворцовая площадь', desc: 'Главная площадь с Зимним дворцом и Александровской колонной' },
      { name: 'Исаакиевский собор', desc: 'Шедевр архитектуры с панорамной колоннадой' },
      { name: 'Спас на Крови', desc: 'Храм-памятник с 7000 кв.м мозаики' },
      { name: 'Петергоф', desc: 'Дворцово-парковый ансамбль с легендарными фонтанами' },
    ],
  },
  moscow: {
    brief:
      'Столица России — мегаполис с тысячелетней историей. Кремль, Третьяковка, Большой театр и современные парки — Москва удивляет масштабом и разнообразием.',
    mustSee: [
      { name: 'Красная площадь и Кремль', desc: 'Символ России, объект Всемирного наследия ЮНЕСКО' },
      { name: 'Третьяковская галерея', desc: 'Крупнейшее собрание русского искусства' },
      { name: 'Парк Зарядье', desc: 'Современный парк у стен Кремля с «парящим» мостом' },
      { name: 'ВДНХ', desc: 'Крупнейший выставочный комплекс с историческими павильонами' },
      { name: 'Москва-Сити', desc: 'Деловой центр с небоскрёбами и смотровыми площадками' },
      { name: 'Большой театр', desc: 'Легендарная оперная и балетная сцена' },
    ],
  },
  kazan: {
    brief:
      'Столица Татарстана, где Восток встречается с Западом. Уникальное сочетание мечетей и православных соборов, тысячелетняя история и изумительная кухня.',
    mustSee: [
      { name: 'Казанский Кремль', desc: 'Объект ЮНЕСКО — белокаменная крепость с мечетью Кул-Шариф' },
      { name: 'Мечеть Кул-Шариф', desc: 'Главная мечеть Татарстана — символ возрождения культуры' },
      { name: 'Улица Баумана', desc: 'Пешеходная улица — «Казанский Арбат» с магазинами и кафе' },
      { name: 'Остров-град Свияжск', desc: 'Древний город-крепость на острове в устье Свияги' },
      { name: 'Храм всех религий', desc: 'Уникальный архитектурный комплекс — 16 конфессий под одной крышей' },
    ],
  },
  kaliningrad: {
    brief:
      'Самый западный город России с европейским духом. Бывший Кёнигсберг хранит готическую архитектуру, Балтийское побережье с янтарём и уникальную атмосферу.',
    mustSee: [
      { name: 'Кафедральный собор', desc: 'Готический собор XIV века с могилой Иммануила Канта' },
      { name: 'Музей Мирового океана', desc: 'Уникальные экспозиции и подводная лодка Б-413' },
      { name: 'Рыбная деревня', desc: 'Этнографический квартал в стиле немецкой архитектуры' },
      { name: 'Куршская коса', desc: 'Национальный парк ЮНЕСКО — танцующий лес и дюны' },
      { name: 'Янтарный комбинат', desc: 'Крупнейшее месторождение янтаря в мире' },
    ],
  },
  vladimir: {
    brief:
      'Жемчужина Золотого кольца — древняя столица Руси с белокаменными шедеврами XII века, внесёнными в список ЮНЕСКО. Фрески Андрея Рублёва, Золотые ворота и виды на Клязьму.',
    mustSee: [
      { name: 'Золотые ворота', desc: 'Триумфальная арка 1164 года — символ города' },
      { name: 'Успенский собор', desc: 'Шедевр XII века с фресками Андрея Рублёва (ЮНЕСКО)' },
      { name: 'Дмитриевский собор', desc: 'Белокаменная резьба XII века — 600 рельефов (ЮНЕСКО)' },
      { name: 'Патриаршие сады', desc: 'Живописный сад XVI века с видом на Клязьму' },
      { name: 'Водонапорная башня', desc: 'Музей «Старый Владимир» с панорамной площадкой' },
    ],
  },
  yaroslavl: {
    brief:
      'Столица Золотого кольца — тысячелетний город на Волге с историческим центром, включённым в список ЮНЕСКО. Стрелка, уникальные церкви XVII века и набережная Волги.',
    mustSee: [
      { name: 'Стрелка', desc: 'Место основания города — слияние Волги и Которосли' },
      { name: 'Спасо-Преображенский монастырь', desc: 'Кремль Ярославля XII века, место находки «Слова о полку Игореве»' },
      { name: 'Церковь Ильи Пророка', desc: 'Шедевр XVII века с уникальными фресками' },
      { name: 'Набережная Волги', desc: 'Лучшая набережная Поволжья — 3 км вдоль великой реки' },
      { name: 'Толгский монастырь', desc: 'Древняя обитель XIV века с кедровой рощей' },
    ],
  },
  ekaterinburg: {
    brief:
      'Столица Урала — город на границе Европы и Азии. Конструктивистская архитектура, история последнего русского царя и мощная уральская энергетика.',
    mustSee: [
      { name: 'Храм на Крови', desc: 'Храм на месте расстрела царской семьи' },
      { name: 'Ельцин Центр', desc: 'Современный музей-центр с историей новой России' },
      { name: 'Граница Европы и Азии', desc: 'Стела-обелиск на 17-м километре Московского тракта' },
    ],
  },
  'nizhny-novgorod': {
    brief:
      'Город на слиянии Оки и Волги с величественным Кремлём, историческим купеческим центром и знаменитой Стрелкой.',
    mustSee: [
      { name: 'Нижегородский Кремль', desc: 'Крепость XVI века с панорамным видом на Волгу' },
      { name: 'Стрелка', desc: 'Место слияния Оки и Волги — одна из лучших панорам России' },
      { name: 'Большая Покровская', desc: 'Пешеходная улица с историческими особняками' },
    ],
  },
  novosibirsk: {
    brief:
      'Крупнейший город Сибири — научный центр с легендарным Академгородком, зоопарком и оперным театром.',
    mustSee: [
      { name: 'Новосибирский оперный театр', desc: 'Крупнейший театр России — «Сибирский Колизей»' },
      { name: 'Академгородок', desc: 'Научный центр мирового уровня в сосновом бору' },
      { name: 'Зоопарк', desc: 'Один из лучших зоопарков России с уникальными видами' },
    ],
  },
};

export default async function CityPage({ params }: Props) {
  const { slug } = await params;
  let city: any = null;
  try {
    city = await api.getCityBySlug(slug);
  } catch {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Город не найден</h1>
        <p className="mt-2 text-slate-500">Попробуйте выбрать другой город</p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          На главную
        </Link>
      </div>
    );
  }

  // Загрузить venues для города
  let venues: any[] = [];
  try {
    const venuesRes = await api.getVenues({ city: slug, limit: 6 });
    venues = venuesRes.items || [];
  } catch {}

  const info = CITY_INFO[slug];
  const stats = city.stats || {};
  const popularTags = city.popularTags || [];

  const categories = [
    { category: EventCategory.EXCURSION, emoji: '🚶', count: stats.excursionCount || 0 },
    { category: EventCategory.MUSEUM, emoji: '🏛️', count: stats.museumCount || 0 },
    { category: EventCategory.EVENT, emoji: '🎭', count: stats.eventCount || 0 },
  ];

  // Разделяем события: топ-6 рекомендуемых + остальные
  const allEvents = city.events || [];
  const topEvents = allEvents.slice(0, 6);
  const moreEvents = allEvents.slice(6);

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-700 to-primary-900 py-16 sm:py-20">
        {city.heroImage && (
          <Image
            src={city.heroImage}
            alt={city.name}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-20"
          />
        )}
        <div className="container-page relative">
          <div className="flex items-center gap-2 text-sm text-primary-200">
            <Link href="/" className="hover:text-white">Главная</Link>
            <span>/</span>
            <span className="text-white">{city.name}</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">
            {city.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-primary-100">
            {info?.brief || city.description || `Экскурсии, музеи и мероприятия в ${city.name}`}
          </p>

          {/* Stats badges */}
          {stats.totalCount > 0 && (
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
                <TrendingUp className="h-4 w-4 text-emerald-300" />
                {pluralEvents(stats.totalCount)} в каталоге
              </div>
              {categories.filter(c => c.count > 0).map(({ category, emoji, count }) => (
                <div
                  key={category}
                  className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/80"
                >
                  <span>{emoji}</span>
                  {CATEGORY_LABELS[category]}: {count}
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/events?city=${slug}`}
              className="btn-primary bg-white !text-primary-700 hover:!bg-primary-50"
            >
              <Ticket className="mr-2 h-4 w-4" />
              Все события в {city.name}
            </Link>
          </div>
        </div>
      </section>

      {/* Landing pages — спецпредложения для города */}
      {city.landingPages && city.landingPages.length > 0 && (
        <section className="bg-gradient-to-r from-primary-50 to-amber-50 py-8">
          <div className="container-page">
            <h2 className="text-lg font-bold text-slate-900">Популярные направления</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {city.landingPages.map((lp: any) => (
                <Link
                  key={lp.slug}
                  href={`/cities/${slug}/${lp.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 shadow-sm transition-colors hover:bg-primary-100 hover:border-primary-300"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  {lp.title}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Must-see places */}
      {info?.mustSee && info.mustSee.length > 0 && (
        <section className="container-page py-12">
          <h2 className="text-2xl font-bold text-slate-900">
            Что обязательно посетить в {city.name}
          </h2>
          <p className="mt-2 text-slate-500">
            Главные достопримечательности, которые стоит увидеть
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {info.mustSee.map((place, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100 text-lg font-bold text-primary-600">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{place.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{place.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Категории с количеством */}
      <section className="bg-slate-50 py-10">
        <div className="container-page">
          <div className="grid gap-3 sm:grid-cols-3">
            {categories.map(({ category, emoji, count }) => (
              <Link
                key={category}
                href={category === EventCategory.MUSEUM ? `/venues?city=${slug}` : `/events?city=${slug}&category=${category}`}
                className="card flex items-center gap-4 p-5 transition-transform hover:scale-[1.02]"
              >
                <span className="text-3xl">{emoji}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {count > 0 ? pluralEvents(count) : 'Скоро'}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Venues (Музеи и Арт) */}
      {venues.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Музеи и искусство
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Музеи, галереи и арт-пространства
              </p>
            </div>
            <Link
              href={`/venues?city=${slug}`}
              className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:flex sm:items-center sm:gap-1"
            >
              Все места <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue: any) => (
              <VenueCard key={venue.id} {...venue} />
            ))}
          </div>
        </section>
      )}

      {/* Popular tags */}
      {popularTags.length > 0 && (
        <section className="container-page py-10">
          <h3 className="text-lg font-semibold text-slate-900">Популярные теги</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {popularTags.map((t: any) => (
              <Link
                key={t.id}
                href={`/tags/${t.slug}?city=${slug}`}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
              >
                <Tag className="h-3.5 w-3.5" />
                {t.name}
                {t._count?.events > 0 && (
                  <span className="text-xs text-slate-400">({t._count.events})</span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Рекомендуемые события */}
      {topEvents.length > 0 && (
        <section className="container-page pb-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Рекомендуем в {city.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Топ событий по рейтингу
              </p>
            </div>
            <Link
              href={`/events?city=${slug}`}
              className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:flex sm:items-center sm:gap-1"
            >
              Все события <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topEvents.map((event: any) => (
              <EventCard
                key={event.id}
                slug={event.slug}
                title={event.title}
                category={event.category}
                imageUrl={event.imageUrl}
                priceFrom={event.priceFrom}
                rating={event.rating}
                reviewCount={event.reviewCount}
                durationMinutes={event.durationMinutes}
                city={{ slug: city.slug, name: city.name }}
                address={event.address}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ещё события */}
      {moreEvents.length > 0 && (
        <section className="container-page pb-16">
          <h2 className="text-xl font-bold text-slate-900">Ещё события</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {moreEvents.map((event: any) => (
              <EventCard
                key={event.id}
                slug={event.slug}
                title={event.title}
                category={event.category}
                imageUrl={event.imageUrl}
                priceFrom={event.priceFrom}
                rating={event.rating}
                reviewCount={event.reviewCount}
                durationMinutes={event.durationMinutes}
                compact
              />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link
              href={`/events?city=${slug}`}
              className="btn-secondary inline-flex items-center gap-2"
            >
              Все события в {city.name}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Также в регионе — превью событий из соседних городов */}
      {city.regionPreview && city.regionPreview.events?.length > 0 && (
        <section className="bg-gradient-to-b from-slate-50 to-white py-12">
          <div className="container-page">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  Также в {declineRegionName(city.regionPreview.regionName)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  События из соседних городов региона
                </p>
              </div>
              <Link
                href={`/regions/${city.regionPreview.regionSlug}`}
                className="hidden text-sm font-medium text-primary-600 hover:text-primary-700 sm:flex sm:items-center sm:gap-1"
              >
                Все события региона <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
                {city.regionPreview.events.map((event: any) => (
                  <div key={event.id} className="min-w-[260px] flex-shrink-0 sm:min-w-0">
                    <EventCard
                      slug={event.slug}
                      title={event.title}
                      category={event.category}
                      imageUrl={event.imageUrl}
                      priceFrom={event.priceFrom}
                      rating={event.rating}
                      reviewCount={event.reviewCount}
                      durationMinutes={event.durationMinutes}
                      city={event.city}
                      address={event.address}
                      dateMode={event.dateMode}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 text-center sm:hidden">
              <Link
                href={`/regions/${city.regionPreview.regionSlug}`}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                Все события региона
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {allEvents.length === 0 && (
        <section className="container-page pb-16">
          <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center">
            <p className="text-4xl">🎭</p>
            <h2 className="mt-4 text-xl font-semibold text-slate-700">
              События скоро появятся
            </h2>
            <p className="mt-2 text-slate-500">
              Мы подключаем билетные системы — события в {city.name} будут доступны
              в ближайшее время
            </p>
          </div>
        </section>
      )}

      {/* JSON-LD: Place */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Place',
            name: city.name,
            description: city.description || city.metaDescription || `Экскурсии и мероприятия в городе ${city.name}`,
            ...(city.lat && city.lng && {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: Number(city.lat),
                longitude: Number(city.lng),
              },
            }),
            url: `https://daibilet.ru/cities/${city.slug}`,
            image: city.heroImage || undefined,
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
                name: 'Города',
                item: 'https://daibilet.ru/cities',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: city.name,
              },
            ],
          }),
        }}
      />
    </>
  );
}

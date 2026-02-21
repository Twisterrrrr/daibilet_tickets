import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { MuseumsSearch } from './_components/MuseumsSearch';
import { MuseumsCatalogFilters } from './_components/MuseumsCatalogFilters';
import { MuseumsSections } from './_components/MuseumsSections';
import { MuseumRouteBuilder } from './_components/MuseumRouteBuilder';
import { formatPrice } from '@daibilet/shared';
import type { CatalogItem } from '@daibilet/shared';

export const revalidate = 300;

/** Предгенерация для featured-городов */
export async function generateStaticParams() {
  try {
    const cities = await api.getCities(true);
    return cities.map((c: { slug: string }) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

/** Контент посадочной «Музеи» — меняется по городам */
function getMuseumsLandingContent(citySlug: string) {
  if (citySlug === 'saint-petersburg') {
    return {
      cityTitle: 'Санкт-Петербурга',
      heroTitle: 'Музеи Санкт-Петербурга — билеты онлайн без очередей',
      heroSubtitle:
        'Более 40 музеев, дворцов и арт-пространств. Выберите лучший для своего маршрута.',
      anchors: [
        'ermitazh',
        'glavnyy-shtab-ermitazh',
        'isaakievskiy-sobor',
        'petropavlovskaya-krepost',
        'russkiy-muzey-mikhaylovskiy-dvorets',
        'kunstkamera',
        'muzey-faberzhe',
        'erarta',
        'planetariy-1',
        'muzey-zheleznykh-dorog-rossii',
        'muzey-strit-arta',
      ],
      bestChoice: {
        slug: 'ermitazh',
        title: 'Государственный Эрмитаж',
        tip: '2–3 часа посещения · лучше 10:00–12:00',
      },
      faq: [
        {
          q: 'Нужно ли печатать билет?',
          a: 'Обычно достаточно QR-кода на телефоне. Точные правила указаны в карточке музея.',
        },
        {
          q: 'Можно ли вернуть билет?',
          a: 'По правилам конкретного музея/поставщика. Условия — в карточке перед оплатой.',
        },
        {
          q: 'Это билет с открытой датой?',
          a: 'Для большинства музеев — да. Если нужна конкретная дата/сеанс, это будет указано отдельно.',
        },
        {
          q: 'Когда меньше очередей?',
          a: 'Будние дни 10:00–12:00. Эрмитаж и другие популярные музеи — лучше к открытию.',
        },
      ],
      seoText:
        'На Дайбилет можно выбрать музеи Санкт-Петербурга и купить билеты онлайн. ' +
        'Сравнивайте варианты по цене, локации и формату (музей, галерея, арт-пространство), ' +
        'собирайте маршрут на день и добавляйте к музеям экскурсии или вечерние программы.',
    };
  }

  return {
    cityTitle: '',
    heroTitle: 'Музеи — билеты онлайн',
    heroSubtitle: 'Выберите музей и купите билет с открытой датой.',
    anchors: [],
    bestChoice: null as { slug: string; title: string; tip: string } | null,
    faq: [] as Array<{ q: string; a: string }>,
    seoText: '',
  };
}

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string; page?: string; qf?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = getMuseumsLandingContent(slug);
  const title = c.heroTitle;
  const description = `Музеи ${c.cityTitle || ''}: билеты онлайн, открытая дата, подбор по интересам.`.trim();

  return {
    title,
    description,
    alternates: { canonical: `/cities/${slug}/museums` },
    openGraph: { title, description },
  };
}

export default async function CityMuseumsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const content = getMuseumsLandingContent(slug);

  let cityName = content.cityTitle || '';
  try {
    const city = await api.getCityBySlug(slug);
    cityName = city.name || cityName;
  } catch {
    // fallback: humanize slug (saint-petersburg → Saint Petersburg) or leave as is
    if (!cityName) cityName = slug.replace(/-/g, ' ');
  }

  const page = Math.max(1, Number(sp.page || '1') || 1);
  const sort = sp.sort || 'popular';
  const q = sp.q || '';

  let catalog: { items: CatalogItem[]; total: number; totalPages: number };
  let apiUnavailable = false;
  try {
    catalog = await api.getCatalog({
      category: 'MUSEUM',
      city: slug,
      q: q || undefined,
      sort,
      page,
      limit: 24,
      ...(sp.qf && { qf: sp.qf }),
    });
  } catch {
    apiUnavailable = true;
    catalog = { items: [], total: 0, totalPages: 1 };
  }

  const hasMore = page < (catalog.totalPages ?? 1);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Музеи ${content.cityTitle || ''}`.trim() || 'Музеи',
    description: content.heroSubtitle,
    url: `https://daibilet.ru/cities/${slug}/museums`,
  };

  const paginationParams = () => {
    const p: Record<string, string> = {};
    if (q) p.q = q;
    if (sort) p.sort = sort;
    if (sp.qf) p.qf = sp.qf;
    return p;
  };

  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams(paginationParams());
    params.set('page', String(p));
    const qs = params.toString();
    return `/cities/${slug}/museums${qs ? `?${qs}` : ''}`;
  };

  return (
    <main className="container-page mx-auto px-4 pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="py-4 text-sm text-slate-600">
        <Link className="hover:text-slate-900 transition-colors" href="/">
          Главная
        </Link>
        <span className="mx-2">→</span>
        <Link className="hover:text-slate-900 transition-colors" href={`/cities/${slug}`}>
          {cityName || 'Город'}
        </Link>
        <span className="mx-2">→</span>
        <span className="text-slate-900 font-medium">Музеи</span>
      </nav>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {content.heroTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">{content.heroSubtitle}</p>

        <div className="mt-5">
          <MuseumsSearch />
        </div>

        {content.bestChoice && (
          <div className="mt-6 rounded-xl bg-primary-50 p-4 border border-primary-100">
            <div className="text-sm font-medium text-slate-900">
              ⭐ Оптимальный выбор для первого визита
            </div>
            <div className="mt-1 font-semibold text-slate-900">{content.bestChoice.title}</div>
            <div className="mt-1 text-slate-700">{content.bestChoice.tip}</div>
            <div className="mt-3">
              <Link
                href={`/venues/${content.bestChoice.slug}`}
                className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
              >
                Смотреть и купить
              </Link>
            </div>
          </div>
        )}
      </section>

      <MuseumsSections citySlug={slug} content={content} />

      {apiUnavailable && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="font-medium">Сервис временно недоступен</p>
          <p className="mt-1 text-sm">Проверьте, что бэкенд запущен на порту 4000, или повторите попытку позже.</p>
        </div>
      )}

      <section className="mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Все музеи</h2>
            <p className="mt-1 text-sm text-slate-600">
              Найдено: <span className="font-medium text-slate-900">{catalog.total}</span>
            </p>
          </div>
        </div>
        <div className="mt-4">
          <MuseumsCatalogFilters />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.items.map((it: CatalogItem) => (
            <Link
              key={`${it.type}:${it.id}`}
              href={it.type === 'venue' ? `/venues/${it.slug}` : `/events/${it.slug}`}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-100">
                {it.imageUrl ? (
                  <Image
                    src={it.imageUrl}
                    alt={it.title}
                    fill
                    className="object-cover transition group-hover:scale-[1.02]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : null}
              </div>

              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-900">{it.title}</div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                    {it.location?.metro ? <span>{it.location.metro}</span> : null}
                    {it.location?.metro && it.location?.address ? (
                      <span className="text-slate-400">·</span>
                    ) : null}
                    {it.location?.address ? (
                      <span className="line-clamp-1">{it.location.address}</span>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {typeof it.priceFrom === 'number' && it.priceFrom > 0
                      ? `от ${formatPrice(it.priceFrom)}`
                      : '—'}
                  </div>
                  {typeof it.rating === 'number' && it.rating > 0 ? (
                    <div className="mt-1 text-xs text-slate-600">⭐ {it.rating.toFixed(1)}</div>
                  ) : null}
                </div>
              </div>

              {it.badges && it.badges.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {it.badges.slice(0, 3).map((b) => (
                    <span
                      key={b}
                      className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              ) : null}
            </Link>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {page > 1 ? (
            <Link
              href={buildPageUrl(page - 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              Назад
            </Link>
          ) : null}
          {hasMore ? (
            <Link
              href={buildPageUrl(page + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
            >
              Дальше
            </Link>
          ) : null}
        </div>
      </section>

      <MuseumRouteBuilder citySlug={slug} anchors={content.anchors} />

      {content.faq.length > 0 ? (
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Вопросы и ответы</h2>
          <div className="mt-4 space-y-4">
            {content.faq.map((x) => (
              <div key={x.q}>
                <div className="font-medium text-slate-900">{x.q}</div>
                <div className="mt-1 text-slate-600">{x.a}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {content.seoText ? (
        <section className="mt-10 text-sm leading-6 text-slate-600">
          <p>{content.seoText}</p>
        </section>
      ) : null}
    </main>
  );
}

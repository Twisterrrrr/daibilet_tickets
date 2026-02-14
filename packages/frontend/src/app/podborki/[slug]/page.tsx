import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { EventCard } from '@/components/ui/EventCard';

// ISR: обновлять каждые 6 часов
export const revalidate = 21600;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await api.getCollectionBySlug(slug);
    const c = data.collection;
    return {
      title: c.metaTitle || `${c.title} | Дайбилет`,
      description:
        c.metaDescription ||
        c.description?.slice(0, 160) ||
        `${c.title} — подборка событий на Дайбилет`,
      openGraph: {
        title: c.metaTitle || c.title,
        description: c.metaDescription || c.description?.slice(0, 160),
        ...(c.heroImage && { images: [{ url: c.heroImage }] }),
      },
    };
  } catch {
    return { title: 'Подборка не найдена' };
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

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let data: any;
  try {
    data = await api.getCollectionBySlug(slug, page);
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Подборка не найдена</h1>
        <p className="mt-2 text-slate-500">Вероятно, подборка была удалена или деактивирована.</p>
        <Link href="/podborki" className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">
          Все подборки
        </Link>
      </div>
    );
  }

  const { collection, events, total, totalPages, relatedCollections } = data;
  const infoBlocks: { title: string; text: string }[] = Array.isArray(collection.infoBlocks) ? collection.infoBlocks : [];
  const faqItems: { question: string; answer: string }[] = Array.isArray(collection.faq) ? collection.faq : [];

  // JSON-LD: CollectionPage
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: collection.metaDescription || collection.description?.slice(0, 300),
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://daibilet.ru'}/podborki/${slug}`,
    ...(collection.heroImage && { image: collection.heroImage }),
    ...(collection.city && {
      about: {
        '@type': 'City',
        name: collection.city.name,
      },
    }),
    numberOfItems: total,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800">
        {collection.heroImage && (
          <div className="absolute inset-0">
            <Image
              src={collection.heroImage}
              alt={collection.title}
              fill
              className="object-cover opacity-30"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />
          </div>
        )}

        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-16 sm:pb-16 sm:pt-20">
          {/* Breadcrumbs */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-white/60">
            <Link href="/" className="hover:text-white/80 transition-colors">Главная</Link>
            <span>/</span>
            <Link href="/podborki" className="hover:text-white/80 transition-colors">Подборки</Link>
            <span>/</span>
            {collection.city && (
              <>
                <Link href={`/cities/${collection.city.slug}`} className="hover:text-white/80 transition-colors">
                  {collection.city.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-white/90">{collection.title}</span>
          </nav>

          <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {collection.title}
          </h1>

          {collection.subtitle && (
            <p className="mt-3 max-w-2xl text-lg text-white/80">{collection.subtitle}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
            {collection.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {collection.city.name}
              </span>
            )}
            <span>{pluralEvents(total)}</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10">
        {/* ── DESCRIPTION ── */}
        {collection.description && (
          <div className="prose prose-slate mb-10 max-w-none">
            {/* Простой рендер markdown — разбиваем по параграфам */}
            {collection.description.split('\n\n').map((p: string, i: number) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {/* ── EVENTS GRID ── */}
        <section>
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            {total > 0 ? `${pluralEvents(total)} в подборке` : 'События'}
          </h2>

          {events.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {events.map((event: any) => (
                <div key={event.id} className="relative">
                  {event.isPinned && (
                    <div className="absolute -top-2 left-3 z-10 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
                      Рекомендуем
                    </div>
                  )}
                  <EventCard
                    slug={event.slug}
                    title={event.title}
                    category={event.category}
                    imageUrl={event.imageUrl}
                    priceFrom={event.priceFrom}
                    rating={Number(event.rating)}
                    reviewCount={event.reviewCount}
                    durationMinutes={event.durationMinutes}
                    city={event.city}
                    nextSessionAt={event.nextSessionAt}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center">
              <p className="text-slate-500">Событий в подборке пока нет</p>
            </div>
          )}

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/podborki/${slug}${p > 1 ? `?page=${p}` : ''}`}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-primary-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── INFO BLOCKS ── */}
        {infoBlocks.length > 0 && (
          <section className="mt-14">
            <div className="grid gap-8 md:grid-cols-2">
              {infoBlocks.map((block, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="mb-3 text-lg font-bold text-slate-900">{block.title}</h3>
                  <div className="text-slate-600 leading-relaxed">
                    {block.text.split('\n').map((line: string, j: number) => (
                      <p key={j} className={j > 0 ? 'mt-2' : ''}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── FAQ ── */}
        {faqItems.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Часто задаваемые вопросы</h2>
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {faqItems.map((item, i) => (
                <details key={i} className="group">
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-left font-medium text-slate-900 hover:bg-slate-50 transition-colors">
                    {item.question}
                    <ChevronDown className="h-5 w-5 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-6 pb-4 text-slate-600 leading-relaxed">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>

            {/* FAQ JSON-LD */}
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: faqItems.map((item) => ({
                    '@type': 'Question',
                    name: item.question,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: item.answer,
                    },
                  })),
                }),
              }}
            />
          </section>
        )}

        {/* ── RELATED COLLECTIONS ── */}
        {relatedCollections && relatedCollections.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Другие подборки</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedCollections.map((rc: any) => (
                <Link
                  key={rc.slug}
                  href={`/podborki/${rc.slug}`}
                  className="group relative flex h-40 items-end overflow-hidden rounded-xl bg-slate-900 p-4 transition-transform hover:scale-[1.02]"
                >
                  {rc.heroImage && (
                    <Image
                      src={rc.heroImage}
                      alt={rc.title}
                      fill
                      className="object-cover opacity-50 transition-opacity group-hover:opacity-60"
                    />
                  )}
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold text-white">{rc.title}</h3>
                    {rc.subtitle && (
                      <p className="mt-0.5 text-sm text-white/70">{rc.subtitle}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}

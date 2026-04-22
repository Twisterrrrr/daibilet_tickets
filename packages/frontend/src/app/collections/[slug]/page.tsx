import { ChevronDown, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { EventCard } from '@/components/ui/EventCard';
import { api } from '@/lib/api';
import type { CollectionDetailResponse } from '@/lib/api.types';
import { renderSafeMarkdownToHtml } from '@/lib/markdown/renderSafeMarkdown';
import type { EventListItem } from '@daibilet/shared';

// ISR: обновлять каждые 6 часов
export const revalidate = 21600;

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; city?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await api.getCollectionBySlug(slug);
    const c = data.collection;
    return {
      title: c.metaTitle || `${c.title} | Дайбилет`,
      description: c.metaDescription || c.description?.slice(0, 160) || `${c.title} — подборка событий на Дайбилет`,
      alternates: { canonical: `/collections/${encodeURIComponent(slug)}` },
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
  const { page: pageParam, city: cityParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const city = cityParam?.trim() || undefined;

  let data: CollectionDetailResponse;
  try {
    data = await api.getCollectionBySlug(slug, page, city);
  } catch {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Подборка не найдена</h1>
        <p className="mt-2 text-slate-500">Вероятно, подборка была удалена или деактивирована.</p>
        <Link
          href="/collections"
          className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700"
        >
          Все подборки
        </Link>
      </div>
    );
  }

  const { collection, events = [], total = 0, totalPages = 1, relatedCollections = [] } = data as CollectionDetailResponse & {
    events?: EventListItem[];
    relatedCollections?: Array<{ slug: string; title: string; heroImage?: string | null; subtitle?: string | null }>;
  };
  const infoBlocks: { title: string; text: string }[] = Array.isArray(collection.infoBlocks)
    ? collection.infoBlocks
    : [];
  const faqItems: { question: string; answer: string }[] = Array.isArray(collection.faq) ? collection.faq : [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection.title,
    description: collection.metaDescription || collection.description?.slice(0, 300),
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://daibilet.ru'}/collections/${slug}`,
    ...(collection.heroImage && { image: collection.heroImage }),
    ...(collection.city && {
      about: {
        '@type': 'City',
        name: collection.city.name,
      },
    }),
    numberOfItems: total,
  };

  const descriptionHtml = collection.description ? renderSafeMarkdownToHtml(collection.description) : '';

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
          <nav className="mb-6 flex items-center gap-2 text-sm text-white/60">
            <Link href="/" className="hover:text-white/80 transition-colors">
              Главная
            </Link>
            <span>/</span>
            <Link href="/collections" className="hover:text-white/80 transition-colors">
              Подборки
            </Link>
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

          <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">{collection.title}</h1>

          {collection.subtitle && <p className="mt-3 max-w-2xl text-lg text-white/80">{collection.subtitle}</p>}

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
        {collection.description && (
          <div
            className="prose prose-slate mb-10 max-w-none"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}

        <section>
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            {total > 0 ? `${pluralEvents(total)} в подборке` : 'События'}
          </h2>

          {events.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 min-[361px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
              {events.map((event) => (
                <div key={event.id} className="relative">
                  {(event as EventListItem & { isPinned?: boolean }).isPinned && (
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

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                const q = new URLSearchParams();
                if (p > 1) q.set('page', String(p));
                if (city) q.set('city', city);
                const qs = q.toString() ? `?${q}` : '';
                return (
                  <Link
                    key={p}
                    href={`/collections/${slug}${qs}`}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      p === page ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {infoBlocks.length > 0 && (
          <section className="mt-14">
            <div className="grid gap-8 md:grid-cols-2">
              {infoBlocks.map((block, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-6">
                  <h3 className="mb-3 text-lg font-bold text-slate-900">{block.title}</h3>
                  <div className="text-slate-600 leading-relaxed">
                    {block.text.split('\n').map((line: string, j: number) => (
                      <p key={j} className={j > 0 ? 'mt-2' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
                  <div className="px-6 pb-4 text-slate-600 leading-relaxed">{item.answer}</div>
                </details>
              ))}
            </div>
          </section>
        )}

        {relatedCollections.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-6 text-2xl font-bold text-slate-900">Похожие подборки</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {relatedCollections.map((c: { slug: string; title: string; subtitle?: string | null }) => (
                <Link
                  key={c.slug}
                  href={`/collections/${c.slug}`}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="font-semibold text-slate-900">{c.title}</div>
                  {c.subtitle ? <div className="mt-1 text-sm text-slate-600">{c.subtitle}</div> : null}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}


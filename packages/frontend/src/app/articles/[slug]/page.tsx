import { ArrowLeft, Calendar, MapPin, Tag } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { EventCard } from '@/components/ui/EventCard';
import { VenueCard } from '@/components/ui/VenueCard';
import { api } from '@/lib/api';
import { renderSafeMarkdownToHtml } from '@/lib/markdown/renderSafeMarkdown';
import { buildArticleJsonLd } from '@/lib/seo/buildArticleJsonLd';
import type { ArticleDetail } from '@/lib/api.types';
import type { EventListItem, VenueListItem } from '@daibilet/shared';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await api.getArticleBySlug(slug);
    return {
      title: article.metaTitle || article.title,
      description: article.metaDescription || article.excerpt,
    };
  } catch {
    return { title: 'Статья не найдена' };
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type RelatedLanding = { id: string; slug: string; title: string; city: { slug: string; name: string } };
type RelatedCollection = { id: string; slug: string; title: string; heroImage?: string | null };

export default async function PublicArticlePage({ params }: Props) {
  const { slug } = await params;
  let article: ArticleDetail | null = null;
  try {
    article = await api.getArticleBySlug(slug);
  } catch {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Статья не найдена</h1>
        <Link href="/articles" className="btn-primary mt-6 inline-flex">
          Все статьи
        </Link>
      </div>
    );
  }

  type ArticleEventRecord = { event?: EventListItem | null };
  type ArticleTagRecord = { tag?: { slug: string; name: string } | null };

  const rawArticleEvents = (article as Record<string, unknown>).articleEvents;
  const linkedEvents: EventListItem[] = Array.isArray(rawArticleEvents)
    ? rawArticleEvents
        .map((ae) => {
          if (!ae || typeof ae !== 'object') return null;
          const rec = ae as ArticleEventRecord;
          return rec.event ?? null;
        })
        .filter((ev): ev is EventListItem => !!ev)
    : [];

  const rawArticleTags = (article as Record<string, unknown>).articleTags;
  const tags: { slug: string; name: string }[] = Array.isArray(rawArticleTags)
    ? rawArticleTags
        .map((at) => {
          if (!at || typeof at !== 'object') return null;
          const rec = at as ArticleTagRecord;
          return rec.tag ?? null;
        })
        .filter((t): t is { slug: string; name: string } => !!t)
    : [];

  const relatedLandings = (article as ArticleDetail & { relatedLandings?: RelatedLanding[] }).relatedLandings ?? [];
  const relatedCollections =
    (article as ArticleDetail & { relatedCollections?: RelatedCollection[] }).relatedCollections ?? [];

  let relatedVenues: VenueListItem[] = [];
  try {
    if (article.city?.slug) {
      const venuesRes = await api.getVenues({ city: article.city.slug, limit: 4, sort: 'rating' });
      relatedVenues = (venuesRes.items as VenueListItem[]) || [];
    }
  } catch {
    // ignore
  }

  const articleJsonLd = buildArticleJsonLd(article);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 py-12">
        <div className="container-page max-w-3xl">
          <Link href="/articles" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" />
            Все статьи
          </Link>

          <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">{article.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-400">
            {article.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {formatDate(article.publishedAt)}
              </span>
            )}
            {article.city && (
              <Link href={`/cities/${article.city.slug}`} className="flex items-center gap-1.5 hover:text-white">
                <MapPin className="h-4 w-4" />
                {article.city.name}
              </Link>
            )}
          </div>

          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link
                  key={t.slug}
                  href={`/tags/${t.slug}`}
                  className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 hover:bg-white/20"
                >
                  <Tag className="h-3 w-3" />
                  {t.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {article.coverImage && (
        <div className="container-page max-w-3xl -mt-2">
          <Image
            src={article.coverImage}
            alt={article.title}
            width={1200}
            height={630}
            className="w-full rounded-2xl shadow-lg"
          />
        </div>
      )}

      <article className="container-page max-w-3xl py-10">
        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: renderSafeMarkdownToHtml(article.content || '') }}
        />
      </article>

      {(relatedLandings.length > 0 || relatedCollections.length > 0) && (
        <section className="container-page max-w-3xl pb-10">
          <h2 className="text-xl font-bold text-slate-900">Подборки и лендинги</h2>
          <div className="mt-4 flex flex-col gap-2">
            {relatedLandings.map((l) => (
              <Link
                key={l.id}
                href={`/cities/${l.city.slug}/${l.slug}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 hover:border-primary-400"
              >
                <span className="font-medium">{l.title}</span>
                <span className="ml-2 text-sm text-slate-500">лендинг · {l.city.name}</span>
              </Link>
            ))}
            {relatedCollections.map((c) => (
              <Link
                key={c.id}
                href={`/collections/${c.slug}`}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 hover:border-primary-400"
              >
                <span className="font-medium">{c.title}</span>
                <span className="ml-2 text-sm text-slate-500">подборка</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {linkedEvents.length > 0 && (
        <section className="container-page max-w-3xl pb-10">
          <h2 className="text-xl font-bold text-slate-900">Упомянутые события</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {linkedEvents.map((event) => (
              <EventCard
                key={event.id}
                slug={event.slug}
                title={event.title}
                category={event.category}
                imageUrl={event.imageUrl}
                priceFrom={event.priceFrom}
                rating={event.rating}
                reviewCount={event.reviewCount ?? 0}
                durationMinutes={event.durationMinutes ?? null}
                compact
              />
            ))}
          </div>
        </section>
      )}

      {relatedVenues.length > 0 && (
        <section className="container-page max-w-3xl pb-16">
          <h2 className="text-xl font-bold text-slate-900">
            Музеи и арт-пространства{article.city ? ` — ${article.city.name}` : ''}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {relatedVenues.map((venue) => (
              <VenueCard
                key={venue.id}
                slug={venue.slug}
                title={venue.title}
                venueType={venue.venueType ?? ''}
                imageUrl={venue.imageUrl}
                address={venue.address}
                metro={venue.metro}
                priceFrom={venue.priceFrom}
                rating={Number(venue.rating) || 0}
                reviewCount={venue.reviewCount ?? 0}
                city={venue.city}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

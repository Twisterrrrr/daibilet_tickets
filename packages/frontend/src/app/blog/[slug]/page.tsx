import { ArrowLeft, Calendar, MapPin, Tag } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, MapPin, ArrowLeft, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { EventCard } from '@/components/ui/EventCard';
import { VenueCard } from '@/components/ui/VenueCard';
import { api } from '@/lib/api';
import { getSeoMeta } from '@/lib/seo/getSeoMeta';

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

/** Простой Markdown → HTML (заголовки, жирный, ссылки, списки, HR) */
function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="mt-6 mb-3 text-lg font-bold text-slate-900">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="mt-8 mb-4 text-xl font-bold text-slate-900">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="mt-8 mb-4 text-2xl font-bold text-slate-900">$1</h1>')
    .replace(
      /\*\*\[(.+?)\]\((.+?)\)\*\*/g,
      '<a href="$2" class="font-semibold text-primary-600 hover:underline">$1</a>',
    )
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary-600 hover:underline">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-700">$1</li>')
    .replace(/^---$/gm, '<hr class="my-8 border-slate-200" />')
    .replace(/\n\n/g, '</p><p class="mt-3 text-slate-700 leading-relaxed">')
    .replace(/^/, '<p class="text-slate-700 leading-relaxed">')
    .replace(/$/, '</p>');
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  let article: any = null;
  try {
    article = await api.getArticleBySlug(slug);
  } catch {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Статья не найдена</h1>
        <Link href="/blog" className="btn-primary mt-6 inline-flex">
          Все статьи
        </Link>
      </div>
    );
  }

  const linkedEvents = article.articleEvents?.map((ae: any) => ae.event).filter(Boolean) || [];
  const tags = article.articleTags?.map((at: any) => at.tag).filter(Boolean) || [];

  // Подгружаем venue-карточки по городу статьи (для перелинковки)
  let relatedVenues: any[] = [];
  try {
    if (article.city?.slug) {
      const venuesRes = await api.getVenues({ city: article.city.slug, limit: 4, sort: 'rating' });
      relatedVenues = venuesRes.items || [];
    }
  } catch {
    // ignore
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 py-12">
        <div className="container-page max-w-3xl">
          <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
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
              {tags.map((t: any) => (
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

      {/* Cover image */}
      {article.coverImage && (
        <div className="container-page max-w-3xl -mt-2">
          <img src={article.coverImage} alt={article.title} className="w-full rounded-2xl shadow-lg" />
        </div>
      )}

      {/* Content */}
      <article className="container-page max-w-3xl py-10">
        <div
          className="prose prose-slate max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content || '') }}
        />
      </article>

      {/* Linked events */}
      {linkedEvents.length > 0 && (
        <section className="container-page max-w-3xl pb-10">
          <h2 className="text-xl font-bold text-slate-900">Упомянутые события</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {linkedEvents.map((event: any) => (
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

      {/* Related venues — перелинковка с музеями/арт-пространствами */}
      {relatedVenues.length > 0 && (
        <section className="container-page max-w-3xl pb-16">
          <h2 className="text-xl font-bold text-slate-900">
            Музеи и арт-пространства{article.city ? ` — ${article.city.name}` : ''}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {relatedVenues.map((venue: any) => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

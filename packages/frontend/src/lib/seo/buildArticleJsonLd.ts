/**
 * PR-6 (B1): Генератор JSON-LD Article schema для статей блога.
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'https://daibilet.ru';

export interface ArticleForJsonLd {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string | null;
  coverImage?: string | null;
  imageUrl?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  city?: { name?: string; slug?: string } | null;
  [key: string]: unknown;
}

/** Собрать JSON-LD Article schema для статьи */
export function buildArticleJsonLd(article: ArticleForJsonLd): Record<string, unknown> {
  const url = `${BASE_URL}/blog/${article.slug}`;
  const imageUrl = article.coverImage || article.imageUrl;
  const image = imageUrl
    ? (imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`)
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || (article.content ? String(article.content).slice(0, 160) : undefined),
    url,
    ...(image && { image: image }),
    ...(article.publishedAt && { datePublished: article.publishedAt }),
    ...(article.updatedAt && { dateModified: article.updatedAt }),
    publisher: {
      '@type': 'Organization',
      name: 'Дайбилет',
      url: BASE_URL,
    },
    ...(article.city && {
      about: {
        '@type': 'Place',
        name: article.city.name || article.city.slug,
      },
    }),
  };
}

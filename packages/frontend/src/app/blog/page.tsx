import { ArrowRight, BookOpen, Calendar, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { api } from '@/lib/api';
import type { PaginatedResponse, ArticleListItem } from '@/lib/api.types';

export const metadata: Metadata = {
  title: 'Блог — статьи о путешествиях по России | Дайбилет',
  description:
    'Полезные статьи о лучших экскурсиях, музеях и мероприятиях в городах России. Советы путешественникам от Дайбилет.',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function BlogPage() {
  let articles: PaginatedResponse<ArticleListItem> = { items: [], total: 0, page: 1, totalPages: 0 };
  try {
    articles = await api.getArticles();
  } catch {
    // ignore
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-800 to-slate-900 py-16">
        <div className="container-page">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/" className="hover:text-white">
              Главная
            </Link>
            <span>/</span>
            <span className="text-white">Блог</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">Блог Дайбилет</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Путеводители по городам, подборки лучших экскурсий и советы для путешественников
          </p>
        </div>
      </section>

      {/* Articles grid */}
      <section className="container-page py-12">
        {articles.items.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.items.map((article) => (
              <Link
                key={article.id}
                href={`/blog/${article.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg"
              >
                {/* Cover image */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary-100 to-primary-200">
                  {article.coverImage ? (
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      sizes="(min-width: 1024px) 25vw, 50vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="h-12 w-12 text-primary-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5">
                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {article.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(article.publishedAt)}
                      </span>
                    )}
                    {article.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {article.city.name}
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 text-lg font-bold text-slate-900 line-clamp-2 group-hover:text-primary-600">
                    {article.title}
                  </h2>

                  {article.excerpt && (
                    <p className="mt-2 flex-1 text-sm text-slate-500 line-clamp-3">{article.excerpt}</p>
                  )}

                  {/* Tags */}
                  {article.articleTags && (article.articleTags as unknown[]).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(article.articleTags as { tag: { slug: string; name: string } }[]).slice(0, 3).map((at) => (
                        <span
                          key={at.tag.slug}
                          className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                        >
                          {at.tag.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="mt-4 flex items-center gap-1 text-sm font-medium text-primary-600">
                    Читать далее
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 py-20 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-slate-300" />
            <h2 className="mt-4 text-xl font-semibold text-slate-700">Статьи скоро появятся</h2>
            <p className="mt-2 text-slate-500">Мы готовим полезные материалы о путешествиях по городам России</p>
            <Link href="/events" className="btn-primary mt-6 inline-flex items-center gap-2">
              Смотреть каталог событий
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

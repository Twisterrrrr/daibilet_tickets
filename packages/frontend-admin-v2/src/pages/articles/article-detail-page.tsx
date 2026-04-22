import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { ArticleDetailView } from '@/features/article-detail/article-detail-view';
import { blueprintArticleDetail } from '@/shared/config/admin-v2-blueprints';
import { IntegrationBlueprint } from '@/shared/layout/admin-v2-blueprint';
import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { formatDateShort, formatDateTime } from '@/shared/lib/format';
import { getMockArticleById } from '@/shared/mock/articles';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/lib/cn';
import { PageGlyph } from '@/shared/ui/page-glyph';

export function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const article = useMemo(() => (id ? getMockArticleById(id) : undefined), [id]);

  if (!id) return <Navigate to="/articles" replace />;
  if (!article) return <Navigate to="/articles" replace />;

  const publishedBadge =
    article.publishedAt != null ? (
      <Badge variant="default">Опубликовано {formatDateShort(article.publishedAt)}</Badge>
    ) : null;

  return (
    <DetailPageLayout
      title={article.title}
      subtitle={article.excerpt}
      glyph={<PageGlyph icon={BookOpen} tone="peach" />}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <Badge variant={article.status === 'В продакшене' ? 'success' : 'default'}>{article.status}</Badge>
          <code className="rounded-control border border-border-soft bg-surface-alt px-2 py-0.5 text-small text-text-secondary">
            /{article.slug}
          </code>
          {publishedBadge}
          <Badge variant="default">Обновлено {formatDateTime(article.updatedAt)}</Badge>
        </span>
      }
      actions={
        <Link to="/articles" className={cn(buttonVariants({ variant: 'ghost', size: 'md' }), 'no-underline')}>
          К списку статей
        </Link>
      }
      tabs={<ArticleDetailView article={article} />}
      blueprint={<IntegrationBlueprint {...blueprintArticleDetail} />}
    />
  );
}

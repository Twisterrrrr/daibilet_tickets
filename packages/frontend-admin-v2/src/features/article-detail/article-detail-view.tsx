import type { ArticleDetail } from '@/shared/mock/articles';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { formatDateShort, formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { SectionTitle } from '@/shared/ui/section-title';
import { Surface } from '@/shared/ui/surface';

export function ArticleDetailView({ article }: { article: ArticleDetail }) {
  return (
    <DetailTabs
      defaultValue="overview"
      items={[
        { id: 'overview', label: 'Обзор', content: <ArticleOverview article={article} /> },
        { id: 'content', label: 'Контент', content: <ArticleContent article={article} /> },
        { id: 'seo', label: 'SEO', content: <ArticleSeo article={article} /> },
        { id: 'system', label: 'Системное', content: <ArticleSystem article={article} /> },
      ]}
    />
  );
}

function ArticleOverview({ article }: { article: ArticleDetail }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant={article.status === 'В продакшене' ? 'success' : 'default'}>{article.status}</Badge>
        <Badge variant="default">Чтение ~{article.readingMinutes} мин</Badge>
        {article.publishedAt ? (
          <Badge variant="default">Опубликовано {formatDateShort(article.publishedAt)}</Badge>
        ) : (
          <Badge variant="warning">Не опубликовано</Badge>
        )}
      </div>
      <Surface padding="md">
        <SectionTitle title="Лид" description="Краткое описание для списков и карточек." />
        <p className="mt-4 text-body text-text-secondary">{article.excerpt}</p>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Автор и теги" />
        <p className="mt-4 text-body text-text-primary">{article.author}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {article.tags.map((t) => (
            <Badge key={t} variant="default">
              {t}
            </Badge>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function ArticleContent({ article }: { article: ArticleDetail }) {
  return (
    <div className="space-y-6">
      <Surface padding="md">
        <SectionTitle title="Текст (фрагмент)" description="Полный редактор подключится к API статьи." />
        <p className="mt-4 whitespace-pre-wrap text-body text-text-secondary">{article.bodyPreview}</p>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Обложка" />
        <p className="mt-4 break-all font-mono text-small text-text-secondary">{article.heroImage ?? '— не задано'}</p>
      </Surface>
    </div>
  );
}

function ArticleSeo({ article }: { article: ArticleDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Meta" />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">Title</dt>
          <dd className="mt-1 text-body text-text-primary">{article.metaTitle}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Description</dt>
          <dd className="mt-1 text-body text-text-secondary">{article.metaDescription}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Slug</dt>
          <dd className="mt-1 font-mono text-small text-text-primary">/{article.slug}</dd>
        </div>
      </dl>
    </Surface>
  );
}

function ArticleSystem({ article }: { article: ArticleDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Идентификаторы" description="Без форм и сохранения." />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">ID</dt>
          <dd className="mt-1 font-mono text-small text-text-primary">{article.id}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Обновлено</dt>
          <dd className="mt-1 text-small text-text-secondary">{formatDateTime(article.updatedAt)}</dd>
        </div>
      </dl>
    </Surface>
  );
}

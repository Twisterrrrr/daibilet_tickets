import { LayoutTemplate } from 'lucide-react';

import { ListPageLayout } from '@/shared/layout/list-page-layout';
import { PageGlyph } from '@/shared/ui/page-glyph';

export function PlaceholderPage({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <ListPageLayout
      title={title}
      headerGlyph={<PageGlyph icon={LayoutTemplate} tone="amber" />}
      subtitle={
        subtitle ??
        'В Admin V2 этот раздел пока представлен навигационной заглушкой: структура меню совпадает с legacy, экран будет подключён позже.'
      }
    >
      <div className="rounded-card border border-dashed border-border-soft bg-surface-alt/40 px-6 py-12 text-center text-body text-text-secondary">
        Пустой макет области контента — без логики и API.
      </div>
    </ListPageLayout>
  );
}

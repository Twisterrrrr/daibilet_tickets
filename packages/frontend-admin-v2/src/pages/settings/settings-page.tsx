import { Settings } from 'lucide-react';

import { DetailPageLayout } from '@/shared/layout/detail-page-layout';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { PageGlyph } from '@/shared/ui/page-glyph';
import { SectionTitle } from '@/shared/ui/section-title';
import { Surface } from '@/shared/ui/surface';

export function SettingsPage() {
  return (
    <DetailPageLayout
      title="Настройки"
      subtitle="Визуальный каркас разделов — без форм и сохранения."
      glyph={<PageGlyph icon={Settings} tone="slate" />}
      tabs={
        <DetailTabs
          defaultValue="general"
          items={[
            {
              id: 'general',
              label: 'Общее',
              content: (
                <Surface padding="md">
                  <SectionTitle
                    title="Общие параметры"
                    description="Название проекта, часовой пояс, контакты поддержки."
                  />
                  <p className="mt-6 text-body text-text-secondary">
                    Плейсхолдер контента: позже здесь появятся поля. Сейчас важно зафиксировать ритм страницы и
                    отступы.
                  </p>
                </Surface>
              ),
            },
            {
              id: 'seo',
              label: 'SEO',
              content: (
                <Surface padding="md">
                  <SectionTitle title="SEO по умолчанию" description="Title шаблоны, open graph, индексация." />
                  <p className="mt-6 text-body text-text-secondary">
                    Блок для глобальных SEO-настроек сайта-агрегатора.
                  </p>
                </Surface>
              ),
            },
            {
              id: 'marketing',
              label: 'Маркетинг',
              content: (
                <Surface padding="md">
                  <SectionTitle title="Маркетинг" description="UTM, промокампании, баннерные зоны (макет)." />
                  <p className="mt-6 text-body text-text-secondary">Никаких ярких панелей — только структура.</p>
                </Surface>
              ),
            },
            {
              id: 'integrations',
              label: 'Интеграции',
              content: (
                <Surface padding="md">
                  <SectionTitle title="Интеграции" description="Платежи, CRM, аналитика — каркас списка." />
                  <ul className="mt-6 space-y-3 text-small text-text-secondary">
                    <li>— Платёжный шлюз (подключение)</li>
                    <li>— Webhook-уведомления</li>
                    <li>— Экспорт в BI (скоро)</li>
                  </ul>
                </Surface>
              ),
            },
          ]}
        />
      }
    />
  );
}

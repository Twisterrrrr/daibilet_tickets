import { Link } from 'react-router-dom';

import type { CityHubDetail } from '@/shared/mock/cities';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { cn } from '@/shared/lib/cn';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { buttonVariants } from '@/shared/ui/button';
import { SectionTitle } from '@/shared/ui/section-title';
import { Surface } from '@/shared/ui/surface';
import { StatCard } from '@/widgets/stat-card/stat-card';

export function CityHubView({ city }: { city: CityHubDetail }) {
  return (
    <DetailTabs
      defaultValue="overview"
      items={[
        { id: 'overview', label: 'Обзор', content: <CityOverviewTab city={city} /> },
        { id: 'main', label: 'Основное', content: <CityMainTab city={city} /> },
        { id: 'content', label: 'Контент', content: <CityContentTab city={city} /> },
        { id: 'seo', label: 'SEO', content: <CitySeoTab city={city} /> },
        { id: 'catalog', label: 'Каталог', content: <CityCatalogTab city={city} /> },
      ]}
    />
  );
}

function CityOverviewTab({ city }: { city: CityHubDetail }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {city.metrics.map((m) => (
          <StatCard key={m.label} label={m.label} value={m.value} hint={m.hint} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={city.isActive ? 'success' : 'default'}>{city.isActive ? 'Активен' : 'Неактивен'}</Badge>
        <Badge variant={city.isFeatured ? 'accent' : 'default'}>
          {city.isFeatured ? 'В избранном на витрине' : 'Без приоритета витрины'}
        </Badge>
        <Badge variant="default">Версия {city.version}</Badge>
      </div>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Быстрые переходы" description="Связанные списки с префильтром по городу — после интеграции API." />
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/events"
            className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'no-underline')}
          >
            События ({city.eventsCount})
          </Link>
          <Link
            to="/venues"
            className={cn(buttonVariants({ variant: 'secondary', size: 'md' }), 'no-underline')}
          >
            Площадки ({city.venuesCount})
          </Link>
        </div>
      </Surface>
      <Surface padding="md">
        <SectionTitle title="Перенос с legacy" description="Короткий чек-лист; детали — в блоке «План интеграции» внизу страницы." />
        <ul className="mt-4 space-y-2 text-small text-text-secondary">
          {city.highlightBulletPoints.map((line, i) => (
            <li key={i}>— {line}</li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}

function CityMainTab({ city }: { city: CityHubDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Surface padding="md">
        <SectionTitle
          title="Идентификаторы и справочник"
          description="Поля модели City (Prisma) — только отображение. В mock id короткий; в проде — UUID."
        />
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-label text-text-muted">ID (UUID)</dt>
            <dd className="mt-1 break-all font-mono text-small text-text-primary">{city.id}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Название</dt>
            <dd className="mt-1 text-body text-text-primary">{city.name}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Slug (URL)</dt>
            <dd className="mt-1 font-mono text-body text-text-primary">{city.slug}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Регион (группировка)</dt>
            <dd className="mt-1 text-body text-text-primary">{city.region}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Алиасы поиска</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {city.aliases.map((a) => (
                <Badge key={a} variant="default">
                  {a}
                </Badge>
              ))}
            </dd>
          </div>
        </dl>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Гео и время" description="lat / lng / timezone — как в БД." />
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-label text-text-muted">Часовой пояс</dt>
            <dd className="mt-1 text-body text-text-primary">{city.timezone}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Широта</dt>
            <dd className="mt-1 font-mono text-body text-text-primary">{city.lat ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Долгота</dt>
            <dd className="mt-1 font-mono text-body text-text-primary">{city.lng ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Создан · обновлён</dt>
            <dd className="mt-1 text-small text-text-secondary">
              {formatDateTime(city.createdAt)} · {formatDateTime(city.updatedAt)}
            </dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Активен · избранный · версия</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              <Badge variant={city.isActive ? 'success' : 'default'}>{city.isActive ? 'Да' : 'Нет'}</Badge>
              <Badge variant={city.isFeatured ? 'accent' : 'default'}>{city.isFeatured ? 'Да' : 'Нет'}</Badge>
              <Badge variant="default">v{city.version}</Badge>
            </dd>
          </div>
        </dl>
      </Surface>
      <Surface padding="md" className="lg:col-span-2">
        <SectionTitle title="Обложка (heroImage)" description="URL обложки хаба на витрине." />
        <p className="mt-4 break-all font-mono text-small text-text-secondary">
          {city.heroImage ?? '— не задано'}
        </p>
      </Surface>
    </div>
  );
}

function CityContentTab({ city }: { city: CityHubDetail }) {
  return (
    <div className="space-y-6">
      <Surface padding="md">
        <SectionTitle title="Лид и описание" description="Тексты страницы города (description в БД — длинный текст)." />
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-label text-text-muted">Подзаголовок / лид (витрина)</p>
            <p className="mt-1 text-body text-text-primary">{city.heroSubtitle}</p>
          </div>
          <div>
            <p className="text-label text-text-muted">Описание</p>
            <p className="mt-1 whitespace-pre-wrap text-body text-text-secondary">{city.description}</p>
          </div>
        </div>
      </Surface>
      <div>
        <SectionTitle
          title="Зоны хаба"
          description="Логические блоки контента и промо (отдельные сущности или конфиг — по продукту)."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {city.zones.map((z) => (
            <Surface key={z.id} padding="md" tone="muted">
              <p className="text-section text-text-primary">{z.title}</p>
              <p className="mt-3 text-small text-text-secondary">{z.detail}</p>
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
}

function CitySeoTab({ city }: { city: CityHubDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Meta" description="metaTitle и metaDescription из модели City." />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">Meta title</dt>
          <dd className="mt-1 text-body text-text-primary">{city.metaTitle}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Meta description</dt>
          <dd className="mt-1 whitespace-pre-wrap text-body text-text-secondary">{city.metaDescription}</dd>
        </div>
      </dl>
    </Surface>
  );
}

function CityCatalogTab({ city }: { city: CityHubDetail }) {
  return (
    <div className="space-y-6">
      <Surface padding="md">
        <SectionTitle title="Агрегаты каталога" description="Счётчики для админки и витрины (источник — API / кэш)." />
        <dl className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-label text-text-muted">События (витрина)</dt>
            <dd className="mt-1 text-h2 text-text-primary">{city.eventsCount}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Площадки</dt>
            <dd className="mt-1 text-h2 text-text-primary">{city.venuesCount}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Поставщиков (mock)</dt>
            <dd className="mt-1 text-h2 text-text-primary">
              {city.suppliersCount != null ? city.suppliersCount : '—'}
            </dd>
          </div>
        </dl>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Связи в продукте" description="Те же связи, что у City в Prisma: events, venues, collections, locations…" />
        <ul className="mt-4 list-inside list-disc space-y-2 text-small text-text-secondary">
          <li>События и площадки привязаны по cityId</li>
          <li>Подборки (collections) и лендинги могут быть привязаны к городу</li>
          <li>Локации (точки отправления) фильтруются по городу</li>
        </ul>
      </Surface>
    </div>
  );
}

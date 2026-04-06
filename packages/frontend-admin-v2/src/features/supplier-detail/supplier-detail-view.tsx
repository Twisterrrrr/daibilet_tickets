import { Link } from 'react-router-dom';

import type { SupplierDetail } from '@/entities/supplier/types';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Surface } from '@/shared/ui/surface';
import { SectionTitle } from '@/shared/ui/section-title';

export function SupplierDetailView({ supplier }: { supplier: SupplierDetail }) {
  return (
    <DetailTabs
      defaultValue="overview"
      items={[
        { id: 'overview', label: 'Обзор', content: <SupplierOverviewTab supplier={supplier} /> },
        { id: 'contacts', label: 'Контакты', content: <SupplierContactsTab supplier={supplier} /> },
        { id: 'catalog', label: 'Каталог', content: <SupplierCatalogTab supplier={supplier} /> },
        { id: 'system', label: 'Системное', content: <SupplierSystemTab supplier={supplier} /> },
      ]}
    />
  );
}

function SupplierOverviewTab({ supplier }: { supplier: SupplierDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Surface padding="md">
        <SectionTitle title="Профиль" description="Публичное имя и юр. лицо." />
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-label text-text-muted">Название</dt>
            <dd className="mt-1 text-body font-medium text-text-primary">{supplier.name}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Юридическое лицо</dt>
            <dd className="mt-1 text-body text-text-secondary">{supplier.legalName}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Роль / тип</dt>
            <dd className="mt-1 text-body text-text-secondary">{supplier.operatorLabel}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Статус</dt>
            <dd className="mt-2">
              <StatusBadge value={supplier.status} kind="supplier" />
            </dd>
          </div>
        </dl>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Метрики (мок)" />
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-label text-text-muted">Событий в каталоге</dt>
            <dd className="mt-1 text-body text-text-primary">{supplier.eventsCount}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Качество каталога</dt>
            <dd className="mt-2">
              <Badge variant="accent">{supplier.catalogQuality}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Заказов за 30 дней</dt>
            <dd className="mt-1 text-body text-text-primary">{supplier.ordersCount30d}</dd>
          </div>
        </dl>
        <p className="mt-6 text-small text-text-secondary">
          Создан {formatDateTime(supplier.createdAt)} · обновлён {formatDateTime(supplier.updatedAt)}
        </p>
      </Surface>
    </div>
  );
}

function SupplierContactsTab({ supplier }: { supplier: SupplierDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Контакты" description="Без реальных PII в моках." />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">Email</dt>
          <dd className="mt-1 text-body text-text-secondary">{supplier.contactEmail}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">Телефон</dt>
          <dd className="mt-1 text-body text-text-secondary">{supplier.contactPhone}</dd>
        </div>
      </dl>
    </Surface>
  );
}

function SupplierCatalogTab({ supplier: _supplier }: { supplier: SupplierDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Каталог" description="Связь с событиями — через список с фильтром." />
      <p className="mt-6 text-body text-text-secondary">
        Откройте раздел «События» с фильтром по поставщику после подключения API.
      </p>
      <div className="mt-4">
        <Link className="text-accent underline" to="/events">
          Перейти к событиям
        </Link>
      </div>
    </Surface>
  );
}

function SupplierSystemTab({ supplier }: { supplier: SupplierDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Системное" />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">id (мок)</dt>
          <dd className="mt-1 font-mono text-small text-text-secondary">{supplier.id}</dd>
        </div>
        {supplier.notes ? (
          <div>
            <dt className="text-label text-text-muted">Заметка менеджера</dt>
            <dd className="mt-1 text-body text-text-secondary">{supplier.notes}</dd>
          </div>
        ) : null}
      </dl>
    </Surface>
  );
}

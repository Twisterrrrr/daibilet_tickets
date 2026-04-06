import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { SupplierDetail } from '@/entities/supplier/types';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { formatDateTime } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Surface } from '@/shared/ui/surface';
import { SectionTitle } from '@/shared/ui/section-title';

export function SupplierDetailView({ supplier }: { supplier: SupplierDetail }) {
  const [isActive, setIsActive] = useState(supplier.isActive);
  const [isExchangeFrozen, setIsExchangeFrozen] = useState(supplier.isExchangeFrozen);
  const [saving, setSaving] = useState(false);

  const canDisableSales = isActive;
  const canEnableSales = !isActive;
  const canFreeze = !isExchangeFrozen;
  const canUnfreeze = isExchangeFrozen;

  const statusText = useMemo(() => {
    if (!isActive) return 'Поставщик отключен: карточки доступны, но покупка запрещена.';
    if (isExchangeFrozen) return 'Обмен данными заморожен (B2B API / интеграции). Покупка зависит от isActive.';
    return 'Поставщик активен.';
  }, [isActive, isExchangeFrozen]);

  async function patchSupplier(payload: { isActive?: boolean; isExchangeFrozen?: boolean }) {
    setSaving(true);
    try {
      await fetch(`/api/v1/admin/suppliers/${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DetailTabs
      defaultValue="overview"
      items={[
        {
          id: 'overview',
          label: 'Обзор',
          content: (
            <SupplierOverviewTab
              supplier={supplier}
              isActive={isActive}
              isExchangeFrozen={isExchangeFrozen}
              statusText={statusText}
              saving={saving}
              onDisableSales={async () => {
                setIsActive(false);
                await patchSupplier({ isActive: false });
              }}
              onEnableSales={async () => {
                setIsActive(true);
                await patchSupplier({ isActive: true });
              }}
              onFreezeExchange={async () => {
                setIsExchangeFrozen(true);
                await patchSupplier({ isExchangeFrozen: true });
              }}
              onUnfreezeExchange={async () => {
                setIsExchangeFrozen(false);
                await patchSupplier({ isExchangeFrozen: false });
              }}
              canDisableSales={canDisableSales}
              canEnableSales={canEnableSales}
              canFreeze={canFreeze}
              canUnfreeze={canUnfreeze}
            />
          ),
        },
        { id: 'contacts', label: 'Контакты', content: <SupplierContactsTab supplier={supplier} /> },
        { id: 'catalog', label: 'Каталог', content: <SupplierCatalogTab supplier={supplier} /> },
        { id: 'system', label: 'Системное', content: <SupplierSystemTab supplier={supplier} /> },
      ]}
    />
  );
}

function SupplierOverviewTab({
  supplier,
  isActive,
  isExchangeFrozen,
  statusText,
  saving,
  onDisableSales,
  onEnableSales,
  onFreezeExchange,
  onUnfreezeExchange,
  canDisableSales,
  canEnableSales,
  canFreeze,
  canUnfreeze,
}: {
  supplier: SupplierDetail;
  isActive: boolean;
  isExchangeFrozen: boolean;
  statusText: string;
  saving: boolean;
  onDisableSales: () => Promise<void>;
  onEnableSales: () => Promise<void>;
  onFreezeExchange: () => Promise<void>;
  onUnfreezeExchange: () => Promise<void>;
  canDisableSales: boolean;
  canEnableSales: boolean;
  canFreeze: boolean;
  canUnfreeze: boolean;
}) {
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
          <div>
            <dt className="text-label text-text-muted">Операционный режим</dt>
            <dd className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={isActive ? 'success' : 'danger'}>{isActive ? 'Продажи: ON' : 'Продажи: OFF'}</Badge>
              <Badge variant={isExchangeFrozen ? 'warning' : 'default'}>
                {isExchangeFrozen ? 'Обмен: FROZEN' : 'Обмен: ON'}
              </Badge>
            </dd>
            <dd className="mt-2 text-small text-text-secondary">{statusText}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Действия</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              <Button variant={canDisableSales ? 'destructive' : 'secondary'} disabled={!canDisableSales || saving} onClick={onDisableSales}>
                Отключить продажи
              </Button>
              <Button variant="secondary" disabled={!canEnableSales || saving} onClick={onEnableSales}>
                Включить продажи
              </Button>
              <Button variant="secondary" disabled={!canFreeze || saving} onClick={onFreezeExchange}>
                Заморозить обмен
              </Button>
              <Button variant="secondary" disabled={!canUnfreeze || saving} onClick={onUnfreezeExchange}>
                Разморозить обмен
              </Button>
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

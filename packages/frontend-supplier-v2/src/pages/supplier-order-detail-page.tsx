import { FileText } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { SUPPLIER_API } from '@/shared/domain/supplier-scope';
import { api } from '@/shared/lib/api';
import { PageGlyph } from '@/shared/ui/page-glyph';
import {
  ErrorPanel,
  LoadingBlock,
  PageHeader,
  SectionCard,
} from '@/shared/ui/page-primitives';

export interface SupplierOrderDetailDto {
  id: string;
  status: string;
  shortCode: string | null;
  eventId: string;
  eventTitle: string | null;
  eventSlug: string | null;
  quantity: number;
  priceSnapshot: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  totalPrice: number | null;
  slaMinutes: number;
  expiresAt: string | null;
  expireReason: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string | null;
  checkoutSessionStatus: string | null;
  checkoutSessionId: string | null;
  offersSnapshot: unknown;
}

function formatMoneyKopeks(kopeks: number): string {
  return (kopeks / 100).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SupplierOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SupplierOrderDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SupplierOrderDetailDto>(SUPPLIER_API.order(id));
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!id) return <Navigate to="/orders" replace />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data?.shortCode || 'Заявка'}
        subtitle={data?.eventTitle || (loading ? 'Загрузка…' : '')}
        glyph={<PageGlyph icon={FileText} tone="slate" />}
        actions={
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 rounded-control border border-border-soft px-3 py-1.5 text-small text-text-primary hover:bg-surface-alt"
          >
            ← К списку
          </Link>
        }
      />

      {loading ? <LoadingBlock label="Загружаем заявку…" /> : null}
      {error ? <ErrorPanel title="Не удалось загрузить" description={error} onRetry={() => void load()} /> : null}
      {!loading && !error && data ? (
        <SectionCard title="Детали заявки">
          <dl className="grid gap-4 text-small sm:grid-cols-2">
            <div>
              <dt className="text-label text-text-muted">Статус</dt>
              <dd className="mt-1 text-text-primary">{data.status}</dd>
            </div>
            <div>
              <dt className="text-label text-text-muted">Количество</dt>
              <dd className="mt-1 text-text-primary">{data.quantity}</dd>
            </div>
            <div>
              <dt className="text-label text-text-muted">Цена (снимок)</dt>
              <dd className="mt-1 text-text-primary">{formatMoneyKopeks(data.priceSnapshot)}</dd>
            </div>
            {data.totalPrice != null ? (
              <div>
                <dt className="text-label text-text-muted">Сессия checkout</dt>
                <dd className="mt-1 text-text-primary">{formatMoneyKopeks(data.totalPrice)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-label text-text-muted">Клиент</dt>
              <dd className="mt-1 text-text-primary">
                {data.customerName || '—'}
                {data.customerEmail ? <div className="text-text-muted">{data.customerEmail}</div> : null}
                {data.customerPhone ? <div className="text-text-muted">{data.customerPhone}</div> : null}
              </dd>
            </div>
            <div>
              <dt className="text-label text-text-muted">Создана</dt>
              <dd className="mt-1 text-text-primary">{formatDate(data.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-label text-text-muted">Срок ответа</dt>
              <dd className="mt-1 text-text-primary">
                {data.slaMinutes ? `${data.slaMinutes} мин` : '—'}
                {data.expiresAt ? <div className="text-text-muted">до {formatDate(data.expiresAt)}</div> : null}
              </dd>
            </div>
            {data.adminNote ? (
              <div className="sm:col-span-2">
                <dt className="text-label text-text-muted">Заметка админа</dt>
                <dd className="mt-1 text-text-primary">{data.adminNote}</dd>
              </div>
            ) : null}
          </dl>
        </SectionCard>
      ) : null}
    </div>
  );
}

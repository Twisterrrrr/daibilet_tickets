import { Link } from 'react-router-dom';

import type { OrderDetail } from '@/entities/order/types';
import { DetailTabs } from '@/shared/layout/detail-tabs';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/badge';
import { StatusBadge } from '@/shared/ui/status-badge';
import { Surface } from '@/shared/ui/surface';
import { SectionTitle } from '@/shared/ui/section-title';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';

export function OrderDetailView({ order }: { order: OrderDetail }) {
  return (
    <DetailTabs
      defaultValue="overview"
      items={[
        { id: 'overview', label: 'Обзор', content: <OrderOverviewTab order={order} /> },
        { id: 'buyer', label: 'Покупатель и событие', content: <OrderBuyerEventTab order={order} /> },
        { id: 'lines', label: 'Позиции', content: <OrderLinesTab order={order} /> },
        { id: 'system', label: 'Системное', content: <OrderSystemTab order={order} /> },
      ]}
    />
  );
}

function OrderOverviewTab({ order }: { order: OrderDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Surface padding="md">
        <SectionTitle title="Сводка" description="Статус и оплата — только чтение." />
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-label text-text-muted">Код заказа</dt>
            <dd className="mt-1 font-mono text-body text-text-primary">{order.code}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Статус</dt>
            <dd className="mt-2">
              <StatusBadge value={order.status} kind="order" />
            </dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Сумма</dt>
            <dd className="mt-1 text-body font-medium text-text-primary">{formatMoney(order.amount, order.currency)}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Способ оплаты</dt>
            <dd className="mt-1 text-body text-text-secondary">{order.paymentMethod}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Платёж (внешний id)</dt>
            <dd className="mt-1 font-mono text-small text-text-secondary">{order.paymentExternalRef}</dd>
          </div>
        </dl>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Связи" description="Переходы в карточки каталога." />
        <ul className="mt-6 space-y-3 text-body">
          <li>
            <span className="text-label text-text-muted">Событие: </span>
            <Link className="text-accent underline" to={`/events/${order.eventId}`}>
              {order.eventTitle}
            </Link>
          </li>
          <li>
            <span className="text-label text-text-muted">Поставщик: </span>
            <Link className="text-accent underline" to={`/suppliers/${order.supplierId}`}>
              {order.supplierName}
            </Link>
          </li>
        </ul>
        <p className="mt-6 text-small text-text-secondary">
          Создан {formatDateTime(order.createdAt)} · обновлён {formatDateTime(order.updatedAt)}
        </p>
      </Surface>
    </div>
  );
}

function OrderBuyerEventTab({ order }: { order: OrderDetail }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Surface padding="md">
        <SectionTitle title="Покупатель" />
        <dl className="mt-6 space-y-4">
          <div>
            <dt className="text-label text-text-muted">Имя</dt>
            <dd className="mt-1 text-body text-text-primary">{order.buyerName}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Email</dt>
            <dd className="mt-1 text-body text-text-secondary">{order.buyerEmail}</dd>
          </div>
          <div>
            <dt className="text-label text-text-muted">Телефон</dt>
            <dd className="mt-1 text-body text-text-secondary">{order.buyerPhone}</dd>
          </div>
        </dl>
      </Surface>
      <Surface padding="md" tone="muted">
        <SectionTitle title="Событие" />
        <p className="mt-6 text-body text-text-primary">{order.eventTitle}</p>
        <div className="mt-4">
          <Link className="text-small text-accent underline" to={`/events/${order.eventId}`}>
            Открыть карточку события
          </Link>
        </div>
      </Surface>
    </div>
  );
}

function OrderLinesTab({ order }: { order: OrderDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Позиции заказа" description="Мок состава; позже — строки из API." />
      <Table className="mt-6">
        <TableHeader>
          <TableRow>
            <TableHead>Наименование</TableHead>
            <TableHead>Кол-во</TableHead>
            <TableHead>Цена</TableHead>
            <TableHead>Сумма</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.lineItems.map((li) => (
            <TableRow key={li.id}>
              <TableCell className="text-text-primary">{li.title}</TableCell>
              <TableCell>{li.quantity}</TableCell>
              <TableCell>{formatMoney(li.unitPrice, li.currency)}</TableCell>
              <TableCell className="font-medium">{formatMoney(li.quantity * li.unitPrice, li.currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Surface>
  );
}

function OrderSystemTab({ order }: { order: OrderDetail }) {
  return (
    <Surface padding="md">
      <SectionTitle title="Системное" description="Идентификаторы и внутренние пометки." />
      <dl className="mt-6 space-y-4">
        <div>
          <dt className="text-label text-text-muted">id (мок)</dt>
          <dd className="mt-1 font-mono text-small text-text-secondary">{order.id}</dd>
        </div>
        <div>
          <dt className="text-label text-text-muted">eventId / supplierId</dt>
          <dd className="mt-1 font-mono text-small text-text-secondary">
            {order.eventId} · {order.supplierId}
          </dd>
        </div>
        {order.internalNote ? (
          <div>
            <dt className="text-label text-text-muted">Внутренняя заметка</dt>
            <dd className="mt-1 text-body text-text-secondary">{order.internalNote}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-6">
        <Badge variant="default">Интеграция: см. план подключения к GET /admin/orders/:id</Badge>
      </div>
    </Surface>
  );
}

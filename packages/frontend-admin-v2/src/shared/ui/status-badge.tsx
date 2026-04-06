import type { EventStatus } from '@/entities/event/types';
import type { OrderStatus } from '@/entities/order/types';
import type { SupplierStatus } from '@/entities/supplier/types';
import type { VenueStatus, VenueType } from '@/entities/venue/types';
import { cn } from '@/shared/lib/cn';

import { Badge, type BadgeProps } from './badge';

const EVENT_STATUS_MAP: Record<EventStatus, BadgeProps['variant']> = {
  draft: 'default',
  scheduled: 'warning',
  published: 'success',
  archived: 'default',
};

const VENUE_STATUS_MAP: Record<VenueStatus, BadgeProps['variant']> = {
  draft: 'default',
  ready: 'warning',
  live: 'success',
  paused: 'default',
};

const ORDER_STATUS_MAP: Record<OrderStatus, BadgeProps['variant']> = {
  pending: 'warning',
  paid: 'success',
  refunded: 'default',
  cancelled: 'danger',
};

const SUPPLIER_STATUS_MAP: Record<SupplierStatus, BadgeProps['variant']> = {
  active: 'success',
  onboarding: 'warning',
  suspended: 'danger',
};

const LABELS: Record<string, string> = {
  draft: 'Черновик',
  scheduled: 'Запланировано',
  published: 'Опубликовано',
  archived: 'Архив',
  pending: 'Ожидает',
  paid: 'Оплачен',
  refunded: 'Возврат',
  cancelled: 'Отменён',
  ready: 'Готово',
  live: 'В эфире',
  paused: 'Пауза',
  active: 'Активен',
  onboarding: 'Онбординг',
  suspended: 'Приостановлен',
  internal: 'Внутренний',
  supplier: 'Поставщик',
  import: 'Импорт',
  partner: 'Партнёр',
  MUSEUM: 'Музей',
  GALLERY: 'Галерея',
  ART_SPACE: 'Арт-пространство',
  EXHIBITION_HALL: 'Выставочный зал',
  THEATER: 'Театр',
  PALACE: 'Дворец / усадьба',
  PARK: 'Парк / заповедник',
};

function label(key: string): string {
  return LABELS[key] ?? key;
}

export function StatusBadge({
  value,
  kind,
  className,
}: {
  value: string;
  kind: 'event' | 'venue' | 'order' | 'supplier' | 'source' | 'venue-type';
  className?: string;
}) {
  let variant: BadgeProps['variant'] = 'default';
  if (kind === 'event') {
    variant = EVENT_STATUS_MAP[value as EventStatus] ?? 'default';
  } else if (kind === 'venue') {
    variant = VENUE_STATUS_MAP[value as VenueStatus] ?? 'default';
  } else if (kind === 'order') {
    variant = ORDER_STATUS_MAP[value as OrderStatus] ?? 'default';
  } else if (kind === 'supplier') {
    variant = SUPPLIER_STATUS_MAP[value as SupplierStatus] ?? 'default';
  } else if (kind === 'source') {
    variant = value === 'internal' ? 'accent' : 'default';
  } else if (kind === 'venue-type') {
    variant = 'default';
  }

  const text = label(value);

  return (
    <Badge variant={variant} className={cn(className)}>
      {text}
    </Badge>
  );
}

export function eventStatusLabel(s: EventStatus): string {
  return label(s);
}

export function venueTypeLabel(t: VenueType): string {
  return label(t);
}

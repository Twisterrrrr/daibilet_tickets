import { StatusPill } from '@/components/shared/status-pill/StatusPill';

function deriveLifecycleLabel(input: {
  isArchived?: boolean;
  isPast?: boolean;
  publishStatus?: string | null;
  isActive?: boolean;
}): { label: string; tone: 'success' | 'warning' | 'danger' | 'outline' } {
  if (input.isArchived) return { label: 'В архиве', tone: 'warning' };
  if (input.isPast) return { label: 'Прошло', tone: 'outline' };
  if (String(input.publishStatus || '').toUpperCase() === 'DRAFT') return { label: 'Черновик', tone: 'outline' };
  if (input.isActive === false) return { label: 'Неактивно', tone: 'outline' };
  return { label: 'Активно', tone: 'success' };
}

export function EventLifecycleCell(props: {
  isArchived?: boolean;
  isPast?: boolean;
  publishStatus?: string | null;
  isActive?: boolean;
}) {
  const d = deriveLifecycleLabel(props);
  return <StatusPill label={d.label} tone={d.tone} />;
}


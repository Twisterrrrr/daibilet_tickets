'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export type ReadinessStatus = 'READY' | 'NEEDS_WORK' | 'BLOCKED' | 'UNKNOWN';

/** Единый маппинг цветов для readiness — Event и Venue summary panels */
const READINESS_CLASSES: Record<ReadinessStatus, string> = {
  READY: 'bg-emerald-600 hover:bg-emerald-600 text-white',
  NEEDS_WORK: 'border-amber-300 bg-amber-50 text-amber-900',
  BLOCKED: '',
  UNKNOWN: 'border-muted-foreground/30 bg-muted/50 text-muted-foreground',
};

const READINESS_LABELS: Record<ReadinessStatus, string> = {
  READY: 'READY',
  NEEDS_WORK: 'NEEDS_WORK',
  BLOCKED: 'BLOCKED',
  UNKNOWN: 'UNKNOWN',
};

const READINESS_ICONS: Record<ReadinessStatus, typeof CheckCircle2 | typeof AlertCircle> = {
  READY: CheckCircle2,
  NEEDS_WORK: AlertCircle,
  BLOCKED: AlertCircle,
  UNKNOWN: AlertCircle,
};

type Props = {
  status: ReadinessStatus;
  /** Компактный режим без иконки */
  compact?: boolean;
};

export function ReadinessBadge({ status, compact }: Props) {
  const Icon = READINESS_ICONS[status];
  const label = READINESS_LABELS[status];
  const customClass = READINESS_CLASSES[status];
  const gapClass = compact ? '' : 'gap-1';

  if (status === 'BLOCKED') {
    return (
      <Badge variant="destructive" className={gapClass}>
        {!compact && <Icon className="h-3 w-3 shrink-0" />}
        {label}
      </Badge>
    );
  }

  return (
    <Badge
      variant={status === 'UNKNOWN' ? 'outline' : 'secondary'}
      className={[customClass, gapClass].filter(Boolean).join(' ')}
    >
      {!compact && <Icon className="h-3 w-3 shrink-0" />}
      {label}
    </Badge>
  );
}

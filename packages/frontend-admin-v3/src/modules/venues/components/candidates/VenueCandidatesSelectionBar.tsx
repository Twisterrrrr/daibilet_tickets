import { Button } from '@/components/ui/button';
import * as React from 'react';

type Props = {
  count: number;
  onApprove: () => void;
  onReject: () => void;
  onClear: () => void;
  busy?: boolean;
};

export function VenueCandidatesSelectionBar({ count, onApprove, onReject, onClear, busy }: Props) {
  if (count <= 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <span>
        Выбрано: <strong className="tabular-nums">{count}</strong>
      </span>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="default" disabled={busy} onClick={onApprove}>
          Принять выбранные
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={onReject}>
          Отклонить выбранные
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={onClear}>
          Снять выбор
        </Button>
      </div>
    </div>
  );
}

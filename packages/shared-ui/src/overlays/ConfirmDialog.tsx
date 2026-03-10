import type { ReactNode } from 'react';
import { clsx } from 'clsx';

export interface ConfirmDialogProps {
  title?: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function ConfirmDialog({
  title = 'Вы уверены?',
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  variant = 'default',
  open,
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className={clsx('fixed inset-0 z-50 flex items-center justify-center', className)}>
      <div className="absolute inset-0 bg-slate-950/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={clsx(
              'rounded-lg px-3 py-1.5 text-xs font-medium text-white',
              variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800',
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


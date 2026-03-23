import React from 'react';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  className?: string;
}

const toneClass: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
};

export function StatusBadge({ label, tone = 'neutral', className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[tone]} ${className ?? ''}`.trim()}
    >
      {label}
    </span>
  );
}


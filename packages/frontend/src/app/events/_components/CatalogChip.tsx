'use client';

import { X } from 'lucide-react';

export function CatalogChip({
  label,
  active,
  onClick,
  className = '',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[2.25rem] items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all ${
        active
          ? 'border-primary-400 bg-primary-50 text-primary-800 shadow-sm ring-1 ring-primary-200/60'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      } ${className}`}
    >
      {label}
      {active && <X className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />}
    </button>
  );
}


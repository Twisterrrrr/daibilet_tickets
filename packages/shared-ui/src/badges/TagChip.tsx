import React from 'react';

interface TagChipProps {
  label: string;
  className?: string;
}

export function TagChip({ label, className }: TagChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 ${className ?? ''}`.trim()}
    >
      {label}
    </span>
  );
}


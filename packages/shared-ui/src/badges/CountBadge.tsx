import React from 'react';

interface CountBadgeProps {
  count: number;
  className?: string;
}

export function CountBadge({ count, className }: CountBadgeProps) {
  return (
    <span
      className={`inline-flex min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 ${className ?? ''}`.trim()}
    >
      {count}
    </span>
  );
}


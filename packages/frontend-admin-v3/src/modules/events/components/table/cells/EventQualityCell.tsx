import { cn } from '@/shared/lib/cn';

export function EventQualityCell({ score }: { score?: number | null }) {
  if (score === null || score === undefined) return <span className="text-muted-foreground">—</span>;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const tone = clamped >= 85 ? 'bg-emerald-600' : clamped >= 65 ? 'bg-amber-500' : 'bg-rose-600';
  return (
    <span
      className={cn(
        'inline-flex h-6 min-w-10 items-center justify-center rounded-full px-2 text-xs font-semibold text-white tabular-nums',
        tone,
      )}
      title={`Качество: ${clamped}/100`}
      aria-label={`Качество: ${clamped}/100`}
    >
      {clamped}
    </span>
  );
}


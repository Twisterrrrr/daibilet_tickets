import { Button } from '@/components/ui/button';

type Props = {
  venueTitle: string;
  cityLine?: string;
  onReset: () => void;
};

export function VenueCandidatesSimilarContextBanner({ venueTitle, cityLine, onReset }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
      <span>
        Показаны кандидаты для сопоставления с площадкой: <strong>{venueTitle}</strong>
        {cityLine ? <span className="text-muted-foreground"> · {cityLine}</span> : null}
      </span>
      <Button type="button" size="sm" variant="outline" onClick={onReset}>
        Сбросить контекст
      </Button>
    </div>
  );
}

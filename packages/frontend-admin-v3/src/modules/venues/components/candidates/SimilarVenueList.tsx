import { Badge } from '@/components/ui/badge';
import type { AdminVenueSimilarItem } from '@/modules/venues/api/candidates';
import { cn } from '@/shared/lib/cn';
import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';

type Props = {
  items: AdminVenueSimilarItem[];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  emptyLabel?: string;
  readOnly?: boolean;
  /** Ссылки на карточки площадки (для экрана кандидатов). */
  linkCanonicalVenues?: boolean;
};

export function SimilarVenueList({
  items,
  selectedId,
  onSelect,
  emptyLabel = 'Похожих записей не найдено',
  readOnly = false,
  linkCanonicalVenues = false,
}: Props) {
  const location = useLocation();
  const venueLinkState = React.useMemo(
    () => ({ fromCandidatesPath: `${location.pathname}${location.search}` }),
    [location.pathname, location.search],
  );

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const rowClass = (active: boolean) =>
    cn(
      'w-full rounded-md border px-3 py-2 text-left text-sm transition-colors',
      active ? 'border-primary bg-muted' : 'border-transparent hover:bg-muted/60',
    );

  return (
    <ul className="max-h-72 space-y-2 overflow-y-auto rounded-md border p-2">
      {items.map((v) => {
        const active = selectedId === v.id;
        const titleNode =
          linkCanonicalVenues && (readOnly || !onSelect) ? (
            <Link
              to={`/admin-v3/venues/${v.id}`}
              state={venueLinkState}
              className="font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {v.title}
            </Link>
          ) : (
            <span className="font-medium">{v.title}</span>
          );

        const inner = (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              {titleNode}
              <span className="text-xs text-muted-foreground">{v.lifecycleStatus}</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {v.similarityReasons.slice(0, 4).map((r) => (
                <Badge key={r} variant="outline" className="font-mono text-[10px]">
                  {r}
                </Badge>
              ))}
              <span className="text-xs text-muted-foreground">score {Math.round(v.similarityScore)}</span>
            </div>
            {v.address ? <div className="mt-1 text-xs text-muted-foreground">{v.address}</div> : null}
          </>
        );

        return (
          <li key={v.id}>
            {readOnly || !onSelect ? (
              <div className={rowClass(false)}>{inner}</div>
            ) : (
              <button type="button" onClick={() => onSelect(v.id)} className={rowClass(active)}>
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

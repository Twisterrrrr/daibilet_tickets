import { Badge } from '@/components/ui/badge';
import type { EventRowItem } from '../types';
import { Link } from 'react-router-dom';

function clampBadges<T>(arr: T[], max: number): { visible: T[]; extra: number } {
  const visible = arr.slice(0, max);
  const extra = Math.max(0, arr.length - visible.length);
  return { visible, extra };
}

export function EventMainCell({ item }: { item: EventRowItem }) {
  const sections = item.sectionsDerived ?? [];
  const subcats = item.subcategoriesCanonical ?? [];

  const sec = clampBadges(sections, 2);
  const sub = clampBadges(subcats, 2);

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="min-w-0">
        <Link
          to={`/admin-v3/events/${item.id}`}
          className="font-medium leading-5 hover:underline"
          title={item.title}
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.title}
        </Link>
        {item.slug ? (
          <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground" title={item.slug}>
            {item.slug}
          </div>
        ) : null}

        {sec.visible.length || sub.visible.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {sec.visible.map((s) => (
              <Badge key={`sec-${s.slug}`} variant="info" className="max-w-[180px] truncate">
                {s.name}
              </Badge>
            ))}
            {sub.visible.map((s) => (
              <Badge
                key={`sub-${s.id}`}
                variant={s.isActive === false ? 'warning' : 'outline'}
                className="max-w-[180px] truncate"
                title={s.isActive === false ? 'legacy / неактивна' : undefined}
              >
                {s.name}
                {s.isActive === false ? <span className="ml-1 text-[10px]">legacy</span> : null}
              </Badge>
            ))}
            {sec.extra + sub.extra > 0 ? (
              <Badge variant="outline" className="tabular-nums text-muted-foreground">
                +{sec.extra + sub.extra}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}


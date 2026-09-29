import { Badge } from '@/components/ui/badge';

export type TagChip = { id: string; slug: string };
export type TagGroupId =
  | 'THEME'
  | 'FORMAT'
  | 'AUDIENCE'
  | 'LANGUAGE'
  | 'SPECIAL'
  | 'SEASON'
  | 'POPULAR'
  | 'OTHER'
  | 'UNKNOWN';

const GROUP_LABELS: Record<TagGroupId, string> = {
  THEME: 'Тема',
  FORMAT: 'Формат',
  AUDIENCE: 'Аудитория',
  LANGUAGE: 'Язык',
  SPECIAL: 'Особое',
  SEASON: 'Сезон',
  POPULAR: 'Популярные',
  OTHER: 'Другое',
  UNKNOWN: 'UNKNOWN',
};

export function TagGroupsGrid(props: {
  groups: Partial<Record<TagGroupId, TagChip[]>>;
  showOther?: boolean;
  showUnknown?: boolean;
  className?: string;
}) {
  const showOther = props.showOther ?? true;
  const showUnknown = props.showUnknown ?? true;

  const order: TagGroupId[] = ['THEME', 'FORMAT', 'AUDIENCE', 'LANGUAGE', 'SPECIAL', 'SEASON', 'POPULAR'];
  if (showOther) order.push('OTHER');
  if (showUnknown) order.push('UNKNOWN');

  return (
    <div className={props.className ?? ''}>
      <div className="grid gap-3 lg:grid-cols-2">
        {order.map((group) => {
          const rows = props.groups[group] ?? [];
          if (!rows.length && (group === 'OTHER' || group === 'UNKNOWN')) return null;

          const isWarn = group === 'UNKNOWN';
          return (
            <div key={group} className={'rounded-md border p-3 ' + (isWarn ? 'border-warning/30 bg-warning/10' : 'border-border bg-card')}>
              <div className="flex items-center justify-between">
                <div className={'text-xs font-semibold uppercase tracking-wide ' + (isWarn ? 'text-warning-foreground' : 'text-muted-foreground')}>
                  {GROUP_LABELS[group]}
                </div>
                <Badge variant="outline" className={'border-border font-normal ' + (isWarn ? 'text-warning-foreground' : 'text-muted-foreground')}>
                  {rows.length}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rows.length ? (
                  rows.map((tag) => (
                    <Badge key={tag.id} variant={isWarn ? 'outline' : 'secondary'} className="border border-border/60">
                      {tag.slug}
                    </Badge>
                  ))
                ) : (
                  <div className={'text-xs ' + (isWarn ? 'text-warning-foreground/90' : 'text-muted-foreground')}>-</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

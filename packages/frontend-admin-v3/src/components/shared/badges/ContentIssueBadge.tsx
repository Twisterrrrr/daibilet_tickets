import { Badge } from '@/components/ui/badge';

export function ContentIssueBadge({ count, tone }: { count: number; tone: 'warning' | 'danger' }) {
  if (count <= 0) return null;
  return (
    <Badge variant={tone}>
      {tone === 'danger' ? 'Ошибки' : 'Проблемы'}: <span className="tabular-nums">{count}</span>
    </Badge>
  );
}


import { Badge } from '@/components/ui/badge';

export type StatusTone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

export function StatusPill({ label, tone = 'default' }: { label: string; tone?: StatusTone }) {
  return <Badge variant={tone}>{label}</Badge>;
}


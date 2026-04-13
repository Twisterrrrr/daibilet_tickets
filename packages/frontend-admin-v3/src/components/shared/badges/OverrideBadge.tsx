import { Badge } from '@/components/ui/badge';

export function OverrideBadge({ hidden }: { hidden: boolean }) {
  return <Badge variant={hidden ? 'warning' : 'info'}>{hidden ? 'Override: hidden' : 'Override'}</Badge>;
}


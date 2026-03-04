import { Badge } from '@/components/ui/badge';

type Props = {
  inCatalog: boolean;
};

export function InCatalogBadge({ inCatalog }: Props) {
  return (
    <Badge variant={inCatalog ? 'outline' : 'destructive'}>
      {inCatalog ? 'Да' : 'Нет'}
    </Badge>
  );
}


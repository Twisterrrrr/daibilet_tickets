import { PageHeader } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function FrozenPage({ title, reason }: { title: string; reason: string }) {
  return (
    <>
      <PageHeader
        title={title}
        description="Модуль заморожен (Frozen) — не имитируем прод-поведение без бэкенда."
        meta={
          <Badge variant="outline" className="border-warning/30 bg-warning/10 font-normal text-warning-foreground">
            Frozen
          </Badge>
        }
      />

      <Card className="border-border p-4 text-sm text-muted-foreground">{reason}</Card>
    </>
  );
}


import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { ErrorState } from '@/components/shared/states/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createAdminSubcategory } from '../api/subcategories.api';
import { useMutation } from '@tanstack/react-query';
import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function SubcategoryCreatePage() {
  const nav = useNavigate();
  const [slug, setSlug] = React.useState('');
  const [code, setCode] = React.useState('');
  const [nameRu, setNameRu] = React.useState('');
  const [type, setType] = React.useState('EVENT_ONLY');
  const [layer, setLayer] = React.useState('SECONDARY');

  const mut = useMutation({
    mutationFn: () =>
      createAdminSubcategory({
        slug,
        code,
        nameRu,
        type,
        layer,
        isActive: true,
        isLandingEnabled: false,
        landingMode: 'DISABLED',
        sortOrder: 0,
      }),
    onSuccess: (row) => {
      nav(`/admin-v3/subcategories/${row.id}`);
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Создать подкатегорию"
        actions={
          <Button type="button" variant="outline" asChild>
            <Link to="/admin-v3/subcategories">К списку</Link>
          </Button>
        }
      />

      {mut.isError ? (
        <ErrorState title="Не удалось создать" description={mut.error instanceof Error ? mut.error.message : 'Ошибка'} />
      ) : null}

      <div className="grid gap-4 rounded-lg border bg-card p-5 sm:max-w-[720px]">
        <div className="grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Slug</div>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="walking-excursion" />
        </div>
        <div className="grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Code</div>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WALKING" className="font-mono" />
        </div>
        <div className="grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Name (RU)</div>
          <Input value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="Пешеходные экскурсии" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Type</div>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="EVENT_ONLY">EVENT_ONLY</option>
              <option value="VENUE_ONLY">VENUE_ONLY</option>
              <option value="UNIVERSAL">UNIVERSAL</option>
            </select>
          </div>
          <div className="grid gap-2">
            <div className="text-xs font-medium text-muted-foreground">Layer</div>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={layer}
              onChange={(e) => setLayer(e.target.value)}
            >
              <option value="PRIMARY">PRIMARY</option>
              <option value="SECONDARY">SECONDARY</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" disabled={mut.isPending} onClick={() => mut.mutate()}>
            Создать
          </Button>
          <Button type="button" variant="outline" disabled={mut.isPending} asChild>
            <Link to="/admin-v3/subcategories">Отмена</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}


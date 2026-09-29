import * as React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import { DataTableShell, EmptyState, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, Ticket } from 'lucide-react';

import { getVenue, patchVenue } from '@/modules/venues/api/venues';
import type { VenueDetailDto, VenueTypeUi } from '@/modules/venues/types';
import { VENUE_TYPES, venueTypeLabel } from '@/lib/venueTypes';

function statusFromVenue(row: VenueDetailDto): 'draft' | 'ready' | 'live' | 'paused' | 'incomplete' | 'error' {
  if (row.lifecycleStatus === 'DRAFT') return 'draft';
  if (row.isPublished) return 'live';
  return 'paused';
}

function venueLifecycleLabelRu(s?: string | null): string {
  const u = String(s ?? '')
    .trim()
    .toUpperCase();
  if (!u) return '—';
  if (u === 'DRAFT') return 'Черновик';
  if (u === 'PUBLISHED' || u === 'PUBLISH' || u === 'LIVE' || u === 'ACTIVE') return 'Опубликовано';
  if (u === 'ARCHIVED') return 'Архив';
  return String(s);
}

function eventModeLabelRu(isPermanent: boolean | null | undefined, dateMode?: string | null): string {
  if (isPermanent) return 'Постоянно';
  const d = String(dateMode ?? '').trim();
  if (!d) return '—';
  const up = d.toUpperCase();
  if (up === 'PERMANENT') return 'Постоянно';
  return d;
}

type TabId = 'overview' | 'type' | 'events' | 'offers';

const TAB_IDS: TabId[] = ['overview', 'type', 'events', 'offers'];

export function VenueDetailPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab') as TabId | null;
  const tab: TabId = rawTab && TAB_IDS.includes(rawTab) ? rawTab : 'overview';

  const setTab = (t: TabId) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };

  const [data, setData] = React.useState<VenueDetailDto | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [venueTypeDraft, setVenueTypeDraft] = React.useState<VenueTypeUi | ''>('');
  const [otherLabelDraft, setOtherLabelDraft] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const res = await getVenue(id);
        if (!cancelled) {
          setData(res);
          setVenueTypeDraft((res.venueType as VenueTypeUi) ?? '');
          setOtherLabelDraft(res.venueTypeOtherLabel ?? '');
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const v = data;
  const events = v?.events ?? [];
  const offers = v?.offers ?? [];
  const canSaveType = Boolean(v?.version != null && venueTypeDraft);

  async function saveVenueType() {
    if (!id || !v?.version || !venueTypeDraft) return;
    if (venueTypeDraft === 'OTHER' && !otherLabelDraft.trim()) {
      setError('Для типа "Другое" заполните уточнение.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const next = await patchVenue(id, {
        version: v.version,
        venueType: venueTypeDraft,
        venueTypeOtherLabel: venueTypeDraft === 'OTHER' ? otherLabelDraft.trim() : null,
      });
      setData(next);
      setVenueTypeDraft((next.venueType as VenueTypeUi) ?? '');
      setOtherLabelDraft(next.venueTypeOtherLabel ?? '');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить тип площадки');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={v ? v.title : 'Площадка'}
        description={v?.slug ? v.slug : undefined}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin-v4/venues">Назад к списку</Link>
            </Button>
            <Button size="sm" disabled>
              Редактировать (later)
            </Button>
          </div>
        }
      />

      {error ? <div className="mb-3 text-sm text-destructive">{error}</div> : null}

      <Card className="mb-3 border-border p-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('overview')}
            className={`rounded-full border px-3 py-1 text-xs ${tab === 'overview' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}
          >
            Обзор
          </button>
          <button
            type="button"
            onClick={() => setTab('type')}
            className={`rounded-full border px-3 py-1 text-xs ${tab === 'type' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}
          >
            Тип площадки
          </button>
          <button
            type="button"
            onClick={() => setTab('events')}
            className={`rounded-full border px-3 py-1 text-xs ${tab === 'events' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}
          >
            События
          </button>
          <button
            type="button"
            onClick={() => setTab('offers')}
            className={`rounded-full border px-3 py-1 text-xs ${tab === 'offers' ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-secondary'}`}
          >
            Офферы
          </button>
        </div>
      </Card>

      {tab === 'overview' ? (
        <Card className="mb-3 border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={v ? statusFromVenue(v) : 'paused'} label={v ? venueLifecycleLabelRu(v.lifecycleStatus) : undefined} />
            <Badge variant="outline" className="border-border font-normal text-muted-foreground">
              id: <span className="ml-1 font-mono">{id}</span>
            </Badge>
            {v?.venueType ? (
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                {venueTypeLabel(v.venueType)}
              </Badge>
            ) : null}
            {v?.city ? (
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                Город: {v.city.name}
              </Badge>
            ) : null}
            {v?.displayAddress ? (
              <Badge variant="outline" className="border-border font-normal text-muted-foreground">
                {v.displayAddress}
              </Badge>
            ) : null}
          </div>
        </Card>
      ) : null}

      {tab === 'type' ? (
        <Card className="mb-3 border-border p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Тип площадки
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                value={venueTypeDraft}
                onChange={(e) => setVenueTypeDraft(e.target.value as VenueTypeUi)}
                disabled={saving || loading}
              >
                <option value="">Выберите тип</option>
                {VENUE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Уточнение для «Другое»
              <Input
                value={otherLabelDraft}
                onChange={(e) => setOtherLabelDraft(e.target.value)}
                placeholder="Например: планетарий"
                disabled={saving || loading || venueTypeDraft !== 'OTHER'}
                className="h-9"
              />
            </label>
            <div className="flex items-end">
              <Button size="sm" onClick={saveVenueType} disabled={!canSaveType || saving || loading}>
                {saving ? 'Сохраняем...' : 'Сохранить тип'}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === 'events' ? (
        <Card className="mb-3 border-border">
          <DataTableShell
            columns={['Активные события', 'Цена', 'Режим']}
            loading={loading}
            empty={!loading && !error && v && events.length === 0 ? <EmptyState icon={Ticket} title="Событий нет" description="У площадки нет активных событий." /> : null}
          >
            {events.map((e) => (
              <tr key={e.id} className="border-b border-border/60 hover:bg-secondary/40">
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium">{e.title}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">{e.slug}</div>
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{e.priceFrom ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{eventModeLabelRu(e.isPermanent, e.dateMode)}</td>
              </tr>
            ))}
          </DataTableShell>
        </Card>
      ) : null}

      {tab === 'offers' ? (
        <Card className="mb-3 border-border">
          <DataTableShell
            columns={['Офферы', 'Источник', 'Тип', 'Цена', 'Статус']}
            loading={loading}
            empty={!loading && !error && v && offers.length === 0 ? <EmptyState icon={Building2} title="Офферов нет" description="У площадки нет активных офферов." /> : null}
          >
            {offers.map((o) => (
              <tr key={o.id} className="border-b border-border/60 hover:bg-secondary/40">
                <td className="px-4 py-3 font-mono text-xs">{o.id}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{o.source}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{o.purchaseType ?? '—'}</td>
                <td className="px-4 py-3 text-sm tabular-nums text-muted-foreground">{o.priceFrom ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{o.status ?? '—'}</td>
              </tr>
            ))}
          </DataTableShell>
        </Card>
      ) : null}
    </>
  );
}

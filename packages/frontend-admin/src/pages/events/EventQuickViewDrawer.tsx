'use client';

import { Calendar, Copy, ExternalLink, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { adminApi } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateRu, formatTimeRu } from '@/lib/sessions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuickViewEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  category: string;
  source: string;
  isActive: boolean;
  priceFrom: number | null;
  updatedAt: string;
  groupingKey: string | null;
  canonicalOfId: string | null;
  city?: { slug: string; name: string } | null;
  venue?: { id: string; title: string; slug: string } | null;
  override?: {
    isHidden?: boolean;
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    category?: string | null;
  } | null;
}

interface SessionRow {
  id: string;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
  soldCount: number;
  locked: boolean;
  isCancelled: boolean;
}

interface QualityResponse {
  isSellable: boolean;
  issues: { code: string; message: string; severity: string }[];
}

const CATEGORY_LABELS: Record<string, string> = {
  EXCURSION: 'Экскурсии',
  MUSEUM: 'Музеи',
  EVENT: 'Мероприятия',
};

const SOURCE_LABELS: Record<string, string> = {
  TC: 'TicketsCloud',
  TEPLOHOD: 'Теплоход',
  MANUAL: 'Ручной ввод',
};

/** Пометка ownership: S = source, L = local (override), D = derived (mapping). */
function OwnershipBadge({ kind }: { kind: 'S' | 'L' | 'D' }) {
  const label = kind === 'S' ? 'Источник' : kind === 'L' ? 'Редакция' : 'Маппинг';
  return (
    <span
      className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-border bg-muted px-1 text-[10px] font-medium text-muted-foreground"
      title={label}
    >
      {kind}
    </span>
  );
}

function formatPrice(kopecks: number | null): string {
  if (kopecks == null) return '—';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(kopecks / 100);
}

// ─── Props ───────────────────────────────────────────────────────────────────

export type EventQuickViewDrawerProps = {
  eventId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function EventQuickViewDrawer({
  eventId,
  open,
  onOpenChange,
}: EventQuickViewDrawerProps) {
  const navigate = useNavigate();
  const [event, setEvent] = useState<QuickViewEvent | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [quality, setQuality] = useState<QualityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [hideLoading, setHideLoading] = useState(false);

  useEffect(() => {
    if (!open || !eventId) {
      setEvent(null);
      setSessions([]);
      setQuality(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    Promise.all([
      adminApi.get<QuickViewEvent>(`/admin/events/${eventId}`),
      adminApi
        .get<{ rows: SessionRow[] }>(
          `/admin/events/${eventId}/sessions?from=${fromStr}&to=${toStr}`,
        )
        .then((r) => r.rows.slice(0, 3)),
      adminApi
        .get<QualityResponse>(`/admin/events/${eventId}/quality`)
        .catch(() => null),
    ])
      .then(([ev, sess, q]) => {
        setEvent(ev);
        setSessions(sess ?? []);
        setQuality(q ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, [open, eventId]);

  const handleOpenEditor = () => {
    if (eventId) {
      onOpenChange(false);
      navigate(`/events/${eventId}`);
    }
  };

  const handleSchedule = () => {
    if (eventId) {
      onOpenChange(false);
      navigate(`/events/${eventId}?tab=sessions`);
    }
  };

  const handlePreview = async () => {
    if (!eventId) return;
    setPreviewLoading(true);
    try {
      const res = await adminApi.post<{ previewUrl: string }>(
        `/admin/previews/events/${eventId}`,
      );
      if (res.previewUrl) window.open(res.previewUrl, '_blank');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!eventId) return;
    try {
      const res = await adminApi.post<{ id: string }>(
        `/admin/events/${eventId}/duplicate`,
      );
      if (res.id) {
        onOpenChange(false);
        navigate(`/events/${res.id}`);
      }
    } catch {
      // keep drawer open
    }
  };

  const handleToggleHide = async () => {
    if (!eventId || !event) return;
    setHideLoading(true);
    try {
      const nextHidden = !(event.override?.isHidden ?? false);
      await adminApi.patch(`/admin/events/${eventId}/hide`, { isHidden: nextHidden });
      setEvent((e) =>
        e ? { ...e, override: { ...e.override, isHidden: nextHidden } } : e,
      );
    } catch {
      // keep state
    } finally {
      setHideLoading(false);
    }
  };

  const isHidden = event?.override?.isHidden ?? false;
  const inCatalog = event != null && event.isActive && !isHidden;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Быстрый просмотр</SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && event && (
          <div className="flex flex-col gap-4 py-4">
            {/* Header: image, title, badges */}
            <div className="space-y-2">
              {event.imageUrl ? (
                <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                  <img
                    src={event.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-md bg-muted text-muted-foreground text-sm">
                  Нет изображения
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight flex-1">{event.title}</h3>
                <OwnershipBadge
                  kind={event.override?.title !== undefined && event.override?.title !== null ? 'L' : 'S'}
                />
              </div>
              <p className="text-xs text-muted-foreground break-all">{event.slug}</p>
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="secondary">
                  {CATEGORY_LABELS[event.category] ?? event.category}
                </Badge>
                <OwnershipBadge
                  kind={event.override?.category !== undefined && event.override?.category !== null ? 'L' : 'S'}
                />
                <Badge variant="outline">
                  {SOURCE_LABELS[event.source] ?? event.source}
                </Badge>
                {event.city && (
                  <Badge variant="outline">{event.city.name}</Badge>
                )}
                {event.venue && (
                  <Badge variant="outline">{event.venue.title}</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Статус</span>
                <span>
                  {isHidden ? (
                    <Badge variant="destructive">
                      <EyeOff className="mr-1 h-3 w-3" />
                      Скрыт
                    </Badge>
                  ) : event.isActive ? (
                    <Badge variant="default">
                      <Eye className="mr-1 h-3 w-3" />
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Неактивен</Badge>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">В каталоге</span>
                <span>{inCatalog ? 'Да' : 'Нет'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Цена от</span>
                <span>{formatPrice(event.priceFrom)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Обновлено</span>
                <span>
                  {event.updatedAt
                    ? formatDateRu(
                        new Date(event.updatedAt).toISOString(),
                      ) +
                      ' ' +
                      formatTimeRu(
                        new Date(event.updatedAt).toISOString(),
                      )
                    : '—'}
                </span>
              </div>
              {event.groupingKey && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Группа</span>
                  <span className="truncate max-w-[180px]">
                    {event.groupingKey}
                  </span>
                </div>
              )}
            </div>

            {/* Quality */}
            {quality != null && (
              <>
                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="font-medium">Готовность к публикации</div>
                  <div>
                    {quality.isSellable ? (
                      <Badge variant="default">Готово</Badge>
                    ) : (
                      <Badge variant="secondary">
                        {quality.issues.length} проблем
                      </Badge>
                    )}
                  </div>
                  {quality.issues.length > 0 && (
                    <ul className="list-inside list-disc text-xs text-muted-foreground">
                      {quality.issues.slice(0, 3).map((i, idx) => (
                        <li key={idx}>{i.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            {/* Nearest sessions */}
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-1 font-medium">
                <Calendar className="h-4 w-4" />
                Ближайшие сеансы
              </div>
              {sessions.length === 0 ? (
                <p className="text-muted-foreground text-xs">Нет предстоящих</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex justify-between rounded border px-2 py-1.5"
                    >
                      <span>
                        {formatDateRu(s.startsAt)} {formatTimeRu(s.startsAt)}
                        {s.isCancelled && (
                          <span className="ml-1 text-destructive">
                            (отменён)
                          </span>
                        )}
                        {s.locked && !s.isCancelled && (
                          <span className="ml-1 text-muted-foreground">
                            (заблокирован)
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {s.soldCount}
                        {s.capacity != null ? ` / ${s.capacity}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* SEO summary + ownership */}
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="font-medium">SEO и источник полей</div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li className="flex items-center gap-1">
                  Заголовок: {event.title.length} симв.
                  <OwnershipBadge
                    kind={event.override?.title !== undefined && event.override?.title !== null ? 'L' : 'S'}
                  />
                </li>
                <li className="flex items-center gap-1">
                  Описание: {event.description?.trim() ? 'есть' : 'нет'}
                  <OwnershipBadge
                    kind={
                      event.override?.description !== undefined && event.override?.description !== null ? 'L' : 'S'
                    }
                  />
                </li>
                <li className="flex items-center gap-1">
                  Изображение: {event.imageUrl ? 'есть' : 'нет'}
                  <OwnershipBadge
                    kind={
                      event.override?.imageUrl !== undefined && event.override?.imageUrl !== null ? 'L' : 'S'
                    }
                  />
                </li>
                <li>Slug: {event.slug || '—'}</li>
              </ul>
            </div>

            {/* Actions */}
            <Separator />
            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant={isHidden ? 'default' : 'outline'}
                onClick={handleToggleHide}
                disabled={hideLoading}
                className="w-full gap-2"
              >
                {hideLoading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                {isHidden ? 'Показать в каталоге' : 'Скрыть в каталоге'}
              </Button>
              <Button size="sm" onClick={handleOpenEditor} className="w-full">
                Открыть редактор
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSchedule}
                className="w-full"
              >
                Расписание
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePreview}
                disabled={previewLoading}
                className="w-full"
              >
                {previewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Предпросмотр
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDuplicate}
                className="w-full"
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Дублировать
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

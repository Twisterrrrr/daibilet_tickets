'use client';

import { AlertCircle, CheckCircle2, Gauge, Layers, Radio, ShoppingCart, Sparkles } from 'lucide-react';

import type { EventAdminSummary } from '@/api/adminEventSummary';
import { ReadinessBadge } from '@/components/admin/ReadinessBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CHECK_LABELS: Record<keyof EventAdminSummary['readiness']['checklist'], string> = {
  hasImage: 'Картинка',
  hasDescription: 'Описание',
  hasFutureSlots: 'Будущие слоты',
  hasPrice: 'Цена',
  hasVenue: 'Площадка / локация',
  hasCategory: 'Категория',
  hasAge: 'Возраст',
};

function tierBadge(tier: EventAdminSummary['promotion']['tier']) {
  if (tier === 'TOP')
    return (
      <Badge className="bg-violet-600 hover:bg-violet-600">
        <Sparkles className="mr-1 h-3 w-3" />
        Топ
      </Badge>
    );
  if (tier === 'POPULAR')
    return (
      <Badge className="bg-primary hover:bg-primary">
        <Sparkles className="mr-1 h-3 w-3" />
        Популярное
      </Badge>
    );
  return <Badge variant="outline">Нет</Badge>;
}

type Props = {
  summary: EventAdminSummary | null;
  loading: boolean;
  error: string | null;
};

export function EventAdminSummaryPanel({ summary, loading, error }: Props) {
  if (loading && !summary) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Витрина и операции</CardTitle>
          <CardDescription>Загрузка сводки…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error && !summary) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Витрина и операции</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!summary) return null;

  const { readiness, promotion, operations, commercial, integration } = summary;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-4 w-4" />
              Готовность к витрине
            </CardTitle>
            <ReadinessBadge status={readiness.status} />
          </div>
          <CardDescription>Данные с сервера (качество события + чеклист)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {(Object.entries(CHECK_LABELS) as [keyof typeof CHECK_LABELS, string][]).map(([key, label]) => (
              <li key={key} className="flex items-center gap-2">
                {readiness.checklist[key] ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                )}
                <span className={readiness.checklist[key] ? 'text-foreground' : 'text-amber-800'}>{label}</span>
              </li>
            ))}
          </ul>
          {readiness.issues.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
              <p className="mb-1 font-medium text-slate-700">Проблемы</p>
              <ul className="space-y-1">
                {readiness.issues.map((i) => (
                  <li key={i.code} className="text-slate-600">
                    <span className="font-mono text-[10px] text-slate-400">{i.code}</span> — {i.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Продвижение
            </CardTitle>
            {tierBadge(promotion.tier)}
          </div>
          <CardDescription>Ручное усиление → уровень (без дублирования логики на фронте)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Ручное усиление:</span>{' '}
            <span className="font-mono font-medium">{promotion.manualBoost}</span>
          </p>
          {promotion.helpText && <p className="text-xs text-muted-foreground">{promotion.helpText}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gauge className="h-4 w-4" />
            Слоты и загрузка
          </CardTitle>
          <CardDescription>Будущие сеансы и ёмкость (агрегат по сессиям)</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Ближайший слот</span>
            <p className="font-medium">
              {operations.nextSessionAt
                ? new Date(operations.nextSessionAt).toLocaleString('ru-RU')
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Будущих слотов</span>
            <p className="font-medium">{operations.futureSessionsCount}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Ёмкость / продано / доступно</span>
            <p className="font-medium">
              {operations.capacity.total} / {operations.capacity.sold} / {operations.capacity.available}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            Коммерция (30 дней)
          </CardTitle>
          <CardDescription>
            {commercial.dataQuality === 'PARTIAL' && (
              <span className="text-amber-700">Частичные данные — {commercial.note}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p>
            Заявок (заказов): <span className="font-medium">{commercial.last30dOrders}</span>
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Конверсия и возвраты: пока не считаются на сервере (null).
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="h-4 w-4" />
            Источник и синхронизация
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Источник</span>
            <p className="font-mono font-medium">{integration.source}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Последняя синхронизация</span>
            <p className="font-medium">
              {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString('ru-RU') : '—'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Статус</span>
            <p className="font-medium">{integration.syncStatus}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Группа дублей</span>
            <p className="font-medium">{integration.hasDuplicates ? 'Да' : 'Нет'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

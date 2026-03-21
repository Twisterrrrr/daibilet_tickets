'use client';

import { CalendarX2, ExternalLink, Gauge, Layers, Pencil, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { VenueAdminSummary } from '@/api/adminVenueSummary';
import { ReadinessBadge } from '@/components/admin/ReadinessBadge';
import { StorefrontVisibilityBadge } from '@/components/admin/StorefrontVisibilityBadge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

const PUBLIC_SITE_BASE = import.meta.env.VITE_PUBLIC_SITE_URL || 'https://daibilet.ru';

type Props = {
  summary: VenueAdminSummary | null;
  loading: boolean;
  error: string | null;
};

export function VenueAdminSummaryPanel({ summary, loading, error }: Props) {
  if (loading && !summary) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Витрина площадки</CardTitle>
          <CardDescription>Загрузка сводки…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error && !summary) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Витрина площадки</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!summary) return null;

  const { storefront, content, relatedEvents, truncated } = summary;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4" />
                Витрина
              </CardTitle>
              {storefront.isFeatured && (
                <Badge className="bg-violet-600 hover:bg-violet-600">В подборке</Badge>
              )}
            </div>
            <CardDescription>Активные события, слоты, рейтинг, готовность</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Активных событий</span>
              <p className="font-medium">{storefront.activeEventsCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">С будущими слотами</span>
              <p className="font-medium">{storefront.eventsWithFutureSlotsCount}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Средний рейтинг</span>
              <p className="font-medium">
                {storefront.avgEventRating != null
                  ? storefront.avgEventRating.toFixed(1)
                  : '—'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Доля готовых</span>
              <p className="font-medium">
                {storefront.readyRatio != null
                  ? `${(storefront.readyRatio * 100).toFixed(0)}%`
                  : '—'}{' '}
                <span className="text-xs text-muted-foreground">
                  ({storefront.readyDataQuality})
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-4 w-4" />
              Контент
            </CardTitle>
            <CardDescription>venueTemplateData</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <p>
              <span className="text-muted-foreground">Шаблон:</span>{' '}
              {content.hasVenueTemplateData ? 'Заполнен' : 'Пусто'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">События площадки</CardTitle>
          <CardDescription>
            {relatedEvents.length} событий
            {truncated && ' (показаны первые, список обрезан)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {relatedEvents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Качество</TableHead>
                  <TableHead>Видимость</TableHead>
                  <TableHead>Рейтинг</TableHead>
                  <TableHead className="w-[120px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedEvents.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <span className="font-medium">{ev.title}</span>
                      {ev.category && (
                        <span className="ml-2 text-xs text-muted-foreground">{ev.category}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ReadinessBadge status={ev.readinessStatus} />
                    </TableCell>
                    <TableCell>
                      <StorefrontVisibilityBadge visibility={ev.storefrontVisibility} />
                    </TableCell>
                    <TableCell>
                      {ev.rating != null ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          {ev.rating.toFixed(1)}
                          {ev.reviewCount > 0 && (
                            <span className="text-muted-foreground text-xs">
                              ({ev.reviewCount})
                            </span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={ev.adminUrlPath} title="Редактировать">
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(`${PUBLIC_SITE_BASE}${ev.publicUrlPath}`, '_blank')
                          }
                          title="Открыть на сайте"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
              <CalendarX2 className="h-12 w-12 text-muted-foreground/50" />
              <div>
                <p className="font-medium text-muted-foreground">Нет привязанных событий</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Привяжите события к площадке через поле «Место» при редактировании события
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

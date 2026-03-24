import { CalendarClock } from 'lucide-react';

import type { EventWizardDraft } from '@daibilet/shared-ui';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  draft: EventWizardDraft | null;
  onOpenCalendar: () => void;
}

export function ScheduleSummary({ draft, onOpenCalendar }: Props) {
  if (!draft) return null;

  const { schedule } = draft;
  const slots = schedule.startsAtList;

  if (!slots.length) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-slate-500" />
            <CardTitle className="text-base">Расписание</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>В мастере ещё не задано расписание. Добавьте правило и сеансы на шаге «Расписание».</span>
          <Button variant="outline" size="sm" onClick={onOpenCalendar}>
            Открыть календарь
          </Button>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...slots].sort();
  const first = new Date(sorted[0]);
  const last = new Date(sorted[sorted.length - 1]);

  const rangeLabel =
    first.toDateString() === last.toDateString()
      ? first.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
      : `${first.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })} — ${last.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
        })}`;

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-slate-500" />
          <CardTitle className="text-base">Расписание</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenCalendar}>
          Открыть календарь
        </Button>
      </CardHeader>
      <CardContent className="space-y-1 text-sm text-slate-700">
        <div>
          Диапазон:&nbsp;
          <span className="font-medium">{rangeLabel}</span>
        </div>
        <div>
          Сеансов по расписанию:&nbsp;
          <span className="font-medium">{slots.length}</span>
        </div>
      </CardContent>
    </Card>
  );
}


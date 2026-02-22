'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type TemplateData = Record<string, unknown>;

interface EventTemplateFieldsProps {
  category: string;
  subcategories: string[];
  templateData: TemplateData;
  onChange: (data: TemplateData) => void;
}

/** Поля шаблона в зависимости от типа события (PageTemplateSpecs) */
export function EventTemplateFields({ category, subcategories, templateData, onChange }: EventTemplateFieldsProps) {
  const update = (key: string, value: unknown) => {
    onChange({ ...templateData, [key]: value });
  };

  const get = (key: string): string => {
    const v = templateData[key];
    if (key === 'cast' && Array.isArray(v)) {
      return (v as { name?: string; role?: string }[])
        .map((c) => (c.role ? `${c.name ?? ''} — ${c.role}` : (c.name ?? '')))
        .join('\n');
    }
    if (Array.isArray(v)) return (v as string[]).join('\n');
    return (v as string) ?? '';
  };

  const setArray = (key: string, text: string) => {
    const arr = text.trim()
      ? text
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    update(key, arr);
  };

  const isRiver = subcategories.includes('RIVER');

  // EXCURSION
  if (category === 'EXCURSION') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Шаблон «Экскурсия»</CardTitle>
          <CardDescription>Маршрут, меню, правила — показываются на странице при заполнении</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Маршрут</Label>
            <Textarea
              rows={3}
              value={get('route')}
              onChange={(e) => update('route', e.target.value || undefined)}
              placeholder="Дворцовая наб. → Нева → Разводные мосты..."
            />
          </div>
          {isRiver && (
            <>
              <div className="space-y-2">
                <Label>Название теплохода</Label>
                <Input
                  value={get('shipName')}
                  onChange={(e) => update('shipName', e.target.value || undefined)}
                  placeholder="Петровский"
                />
              </div>
              <div className="space-y-2">
                <Label>Меню (если есть)</Label>
                <Textarea
                  rows={2}
                  value={get('menu')}
                  onChange={(e) => update('menu', e.target.value || undefined)}
                  placeholder="Фруктовая тарелка, кофе, чай..."
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label>Правила</Label>
            <Textarea
              rows={2}
              value={get('rules')}
              onChange={(e) => update('rules', e.target.value || undefined)}
              placeholder="Одежда по погоде, рекомендуем взять с собой..."
            />
          </div>
          <div className="space-y-2">
            <Label>«Прогулка вам понравится» (преимущества)</Label>
            <Textarea
              rows={2}
              value={get('advantages')}
              onChange={(e) => update('advantages', e.target.value || undefined)}
              placeholder="Панорамные виды, опытный капитан..."
            />
          </div>
          <div className="space-y-2">
            <Label>Правила бронирования</Label>
            <Textarea
              rows={2}
              value={get('bookingRules')}
              onChange={(e) => update('bookingRules', e.target.value || undefined)}
              placeholder="Возврат за 24 часа до начала..."
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // MUSEUM
  if (category === 'MUSEUM') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Шаблон «Музей»</CardTitle>
          <CardDescription>Режим работы, правила — берутся из Venue при привязке к месту</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Правила посещения (дополнительно)</Label>
            <Textarea
              rows={3}
              value={get('rules')}
              onChange={(e) => update('rules', e.target.value || undefined)}
              placeholder="Фото без вспышки, сумки в гардероб..."
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  // EVENT
  if (category === 'EVENT') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Шаблон «Мероприятие»</CardTitle>
          <CardDescription>Программа, состав, зал — для концертов, спектаклей, шоу</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Программа / сет-лист</Label>
            <Textarea
              rows={3}
              value={get('program')}
              onChange={(e) => setArray('program', e.target.value)}
              placeholder={'Каждый пункт — с новой строки\n1. Вступление\n2. Основная программа\n3. Финал'}
            />
          </div>
          <div className="space-y-2">
            <Label>Состав (артисты, ведущие)</Label>
            <Textarea
              rows={3}
              value={get('cast')}
              onChange={(e) => {
                const text = e.target.value;
                const lines = text.trim()
                  ? text
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : [];
                const cast = lines.map((line) => {
                  const dash = line.indexOf(' — ');
                  if (dash > 0) return { name: line.slice(0, dash).trim(), role: line.slice(dash + 3).trim() };
                  return { name: line, role: '' };
                });
                update('cast', cast.length ? cast : undefined);
              }}
              placeholder={'Имя — Роль (каждая строка)\nИван Петров — ведущий\nАнна Сидорова — певица'}
            />
          </div>
          <div className="space-y-2">
            <Label>Зал / площадка</Label>
            <Input
              value={get('hall')}
              onChange={(e) => update('hall', e.target.value || undefined)}
              placeholder="Большой зал, 500 мест"
            />
          </div>
          <div className="space-y-2">
            <Label>Правила (опоздания, возвраты)</Label>
            <Textarea
              rows={2}
              value={get('rules')}
              onChange={(e) => update('rules', e.target.value || undefined)}
              placeholder="Опоздавшие не допускаются. Возврат за 24 часа..."
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

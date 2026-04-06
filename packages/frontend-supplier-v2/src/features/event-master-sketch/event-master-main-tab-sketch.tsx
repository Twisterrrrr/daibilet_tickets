import { ChevronDown, Link2 } from 'lucide-react';
import { useState } from 'react';

import { FieldSketch, SelectSketch } from '@/features/event-master-sketch/event-master-sketch-fields';
import { Button } from '@/features/event-master-sketch/sketch-primitives';
import { cn } from '@/shared/lib/cn';

type EventKindSketch = 'excursion' | 'event';
type CitySketch = 'spb' | 'msk' | 'other';

const TEXT_ACCORDION_ITEMS: { id: string; title: string; hint?: string; placeholder: string }[] = [
  {
    id: 'lead-alt',
    title: 'Краткое описание',
    hint: 'Если нужен отдельный вариант; иначе поле выше.',
    placeholder: 'Альтернативный краткий текст…',
  },
  { id: 'highlights', title: 'Хайлайты или ключевые моменты', placeholder: '3–5 тезисов…' },
  { id: 'features', title: 'Особенности', placeholder: 'Чем отличается от похожих…' },
  { id: 'notes', title: 'Стоит учесть', placeholder: 'Одежда, доступность…' },
  { id: 'transport', title: 'Транспорт', placeholder: 'На чём добираемся…' },
  { id: 'route', title: 'Маршрут', placeholder: 'Точки, порядок, время…' },
  { id: 'audience', title: 'Кому подойдёт', placeholder: 'Семьи, компании…' },
];

export function EventMasterMainTabSketch({
  variant,
  mockEventId,
  onCreateDraft,
}: {
  variant: 'admin' | 'supplier';
  mockEventId: string | null;
  onCreateDraft: () => void;
}) {
  const [eventKind, setEventKind] = useState<EventKindSketch>('excursion');
  const [city, setCity] = useState<CitySketch>('spb');
  const [accordionOpen, setAccordionOpen] = useState<string | null>(null);

  const toggleAccordion = (id: string) => {
    setAccordionOpen((prev) => (prev === id ? null : id));
  };

  return (
    <div className="max-w-5xl space-y-5 lg:space-y-4">
      <p className="text-[13px] leading-snug text-text-secondary lg:text-small">
        Медиа и SEO — отдельные вкладки после «Расписание». Мок, волна R — API.
      </p>

      <div className="grid gap-4 border-border-soft lg:grid-cols-2 lg:gap-x-10 lg:gap-y-2">
        <div className="space-y-2.5 lg:space-y-2">
          <FieldSketch
            variant="title"
            label="Название"
            placeholder="Например: Прогулка на катере по каналам"
            hint="До ~80 символов."
          />
          <FieldSketch
            variant="compact"
            label="Подзаголовок"
            placeholder="Второй ряд в карточке"
            hint="Необязательно."
          />
        </div>
        <div className="space-y-2.5 lg:space-y-2">
          <FieldSketch variant="compact" label="Slug" placeholder="progulka-na-katere" hint="Латиница, дефисы." />
          <div className="flex items-start gap-2 rounded-control border border-border-soft bg-surface-alt px-2.5 py-2">
            <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-text-muted">URL</p>
              <p className="mt-0.5 break-all font-mono text-[12px] text-text-primary">
                daibilet.ru/events/progulka-na-katere
              </p>
            </div>
          </div>
          <div>
            <span className="text-label text-text-muted">Теги</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {['Семьи', 'На воде', 'В центре'].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border-soft bg-surface px-2.5 py-0.5 text-[11px] text-text-secondary"
                >
                  {tag}
                </span>
              ))}
              <span className="rounded-full border border-dashed border-border-soft px-2.5 py-0.5 text-[11px] text-text-muted">
                + тег
              </span>
            </div>
          </div>
          <SelectSketch label="Возраст" hint="Витрина и покупка — волна R.">
            <option value="">0+</option>
            <option>6+</option>
            <option>12+</option>
            <option>16+</option>
            <option>18+</option>
          </SelectSketch>
        </div>
      </div>

      <div className="border-t border-border-soft pt-5 lg:grid lg:grid-cols-2 lg:gap-x-10 lg:pt-4">
        <div className="space-y-2.5 lg:space-y-2">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <span className="text-label shrink-0 text-text-muted">Тип</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Тип мероприятия">
              {(
                [
                  { id: 'excursion' as const, label: 'Экскурсия' },
                  { id: 'event' as const, label: 'Мероприятие' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={eventKind === opt.id}
                  onClick={() => setEventKind(opt.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors',
                    eventKind === opt.id
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border-soft text-text-secondary hover:border-border',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] leading-snug text-text-muted">
            Маршрут/транспорт — в блоках ниже. Тип площадки — в «Площадки».
          </p>
          {variant === 'admin' ? (
            <SelectSketch label="Поставщик" hint="Внутреннее или партнёр.">
              <option value="">Не привязано</option>
              <option>ООО «Водные маршруты»</option>
            </SelectSketch>
          ) : (
            <div className="rounded-control border border-border-soft bg-surface-alt px-2.5 py-2 text-[13px] text-text-secondary">
              Поставщик: текущий кабинет (мок)
            </div>
          )}
          <div className="space-y-1.5">
            <span className="text-label text-text-muted">Город</span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'spb' as const, label: 'Санкт-Петербург' },
                  { id: 'msk' as const, label: 'Москва' },
                  { id: 'other' as const, label: 'Другой…' },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCity(c.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                    city === c.id
                      ? 'border-accent bg-accent/10 text-text-primary'
                      : 'border-border-soft text-text-secondary hover:border-border',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {city === 'other' ? (
              <FieldSketch variant="compact" label="Город (свой)" placeholder="Казань" hint="Волна R." />
            ) : null}
          </div>
        </div>

        <div className="mt-4 space-y-2.5 border-t border-border-soft pt-4 lg:mt-0 lg:border-t-0 lg:pt-0">
          <FieldSketch
            variant="compact"
            label="Локация (адрес)"
            placeholder="Наб. Фонтанки, 41 — вход с набережной"
            hint="Потом — совпадения из базы."
          />
          <div className="rounded-control border border-border-soft bg-surface-alt/80 px-2.5 py-2">
            <p className="text-[10px] text-text-muted">Из базы (мок)</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                className="rounded-full border border-accent/30 bg-accent/5 px-2 py-0.5 text-[11px] text-text-primary"
              >
                Причал у Летнего
              </button>
              <button type="button" className="rounded-full border border-border-soft px-2 py-0.5 text-[11px] text-text-secondary">
                Новая — заявка
              </button>
            </div>
          </div>
          <SelectSketch label="Площадка" hint="Venue; может подставиться по адресу.">
            <option value="">Выберите</option>
            <option>Эрмитаж — Главный штаб</option>
            <option>Причал «Нева-тур»</option>
          </SelectSketch>
        </div>
      </div>

      <div className="border-t border-border-soft pt-5 lg:pt-4">
        <div className="space-y-2.5 lg:space-y-2">
          <FieldSketch
            label="Краткое описание"
            placeholder="2–3 предложения для карточки"
            multiline
            rows={3}
          />
          <FieldSketch
            label="Описание"
            placeholder="Оферта, что входит, длительность, условия…"
            multiline
            rows={7}
          />
          <div className="space-y-1.5 pt-1">
            {TEXT_ACCORDION_ITEMS.map((item) => {
              const open = accordionOpen === item.id;
              return (
                <div key={item.id} className="overflow-hidden rounded-control border border-border-soft">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left text-[13px] font-medium text-text-primary hover:bg-surface-alt/80"
                    aria-expanded={open}
                    onClick={() => toggleAccordion(item.id)}
                  >
                    {item.title}
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 shrink-0 text-text-muted transition-transform', open && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                  {open ? (
                    <div className="border-t border-border-soft bg-surface-alt/30 px-2.5 py-2">
                      {item.hint ? <p className="mb-1.5 text-[10px] text-text-muted">{item.hint}</p> : null}
                      <FieldSketch label="Текст" placeholder={item.placeholder} multiline rows={4} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!mockEventId ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border-soft pt-5">
          <Button type="button" variant="primary" size="md" onClick={onCreateDraft}>
            Создать черновик (мок)
          </Button>
          <span className="text-[12px] text-text-muted">Далее — «Продажи», «Качество».</span>
        </div>
      ) : null}
    </div>
  );
}

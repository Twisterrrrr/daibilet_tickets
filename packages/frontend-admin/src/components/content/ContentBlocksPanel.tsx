'use client';

import {
  dedupeSpecsByKey,
  filterContentJsonSpecs,
} from '@daibilet/shared';
import type { TemplateFieldSpec } from '@daibilet/shared';
import { Eye, FileJson, LayoutList } from 'lucide-react';
import { useMemo } from 'react';

import { JsonEditor } from '@/components/ui/JsonEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export type ContentBlocksValue = Record<string, unknown>;

type ExtraFaqRow = { q: string; a: string };

function getString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return String(v);
}

function FieldInput({
  spec,
  value,
  onChange,
}: {
  spec: TemplateFieldSpec;
  value: ContentBlocksValue;
  onChange: (next: ContentBlocksValue) => void;
}) {
  const key = spec.key;
  const raw = value[key];

  const patch = (val: unknown) => {
    const next = { ...value };
    if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
      delete next[key];
    } else {
      next[key] = val;
    }
    onChange(next);
  };

  if (key === 'extraFaq') {
    const rows: ExtraFaqRow[] = Array.isArray(raw)
      ? (raw as ExtraFaqRow[]).map((r) => ({ q: r.q ?? '', a: r.a ?? '' }))
      : [];
    const setRows = (nextRows: ExtraFaqRow[]) => {
      patch(nextRows.filter((r) => r.q.trim() || r.a.trim()));
    };
    return (
      <div className="space-y-3">
        <Label>{spec.label}</Label>
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 rounded-md border p-2 sm:grid-cols-2">
            <Input
              placeholder="Вопрос"
              value={row.q}
              onChange={(e) => {
                const n = [...rows];
                n[i] = { ...n[i], q: e.target.value };
                setRows(n);
              }}
            />
            <Textarea
              placeholder="Ответ"
              rows={2}
              value={row.a}
              onChange={(e) => {
                const n = [...rows];
                n[i] = { ...n[i], a: e.target.value };
                setRows(n);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="sm:col-span-2"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
            >
              Удалить вопрос
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => setRows([...rows, { q: '', a: '' }])}>
          + Добавить вопрос
        </Button>
      </div>
    );
  }

  if ((key === 'advantages' || key === 'collections' || key === 'halls') && spec.inputType === 'textarea') {
    const lines = Array.isArray(raw) ? (raw as string[]).join('\n') : getString(raw);
    const label = spec.label;
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Textarea
          rows={4}
          value={lines}
          onChange={(e) => {
            const t = e.target.value.trim();
            if (!t) {
              patch(undefined);
              return;
            }
            patch(
              t.split('\n').map((s) => s.trim()).filter(Boolean),
            );
          }}
          placeholder="Каждый пункт с новой строки"
        />
      </div>
    );
  }

  if (spec.inputType === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`cb-${key}`}
          className="h-4 w-4 rounded border-gray-300"
          checked={raw === true}
          onChange={(e) => patch(e.target.checked ? true : undefined)}
        />
        <Label htmlFor={`cb-${key}`} className="cursor-pointer font-normal">
          {spec.label}
        </Label>
      </div>
    );
  }

  if (spec.inputType === 'textarea' || spec.inputType === 'richtext') {
    return (
      <div className="space-y-2">
        <Label>{spec.label}</Label>
        <Textarea
          rows={spec.inputType === 'richtext' ? 6 : 4}
          value={getString(raw)}
          onChange={(e) => patch(e.target.value || undefined)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{spec.label}</Label>
      <Input
        value={getString(raw)}
        onChange={(e) => patch(e.target.value || undefined)}
      />
    </div>
  );
}

function PreviewPane({ value, fields }: { value: ContentBlocksValue; fields: TemplateFieldSpec[] }) {
  const entries = fields
    .map((f) => ({ spec: f, v: value[f.key] }))
    .filter((x) => x.v !== undefined && x.v !== null && x.v !== '');

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Нет заполненных блоков — заполните форму или вставьте JSON.</p>;
  }

  return (
    <div className="max-w-none space-y-4">
      {entries.map(({ spec, v }) => (
        <section key={spec.key}>
          <h4 className="mb-1 text-sm font-semibold text-foreground">{spec.label}</h4>
          <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm text-foreground">
            {spec.key === 'extraFaq' && Array.isArray(v)
              ? (v as ExtraFaqRow[]).map((row, i) => (
                  <div key={i} className="mb-2 border-b border-dashed pb-2 last:mb-0 last:border-0 last:pb-0">
                    <strong>{row.q}</strong>
                    <p className="mt-1 text-muted-foreground">{row.a}</p>
                  </div>
                ))
              : Array.isArray(v)
                ? (v as string[]).join(' · ')
                : typeof v === 'boolean'
                  ? v
                    ? 'Да'
                    : 'Нет'
                  : String(v)}
          </div>
        </section>
      ))}
    </div>
  );
}

type Props = {
  cardTitle: string;
  cardDescription?: string;
  /** Полный список specs (будут отфильтрованы CONTENT_JSON и дедуплицированы). */
  fieldSpecs: TemplateFieldSpec[];
  value: ContentBlocksValue;
  onChange: (next: ContentBlocksValue) => void;
};

export function ContentBlocksPanel({ cardTitle, cardDescription, fieldSpecs, value, onChange }: Props) {
  const fields = useMemo(
    () => dedupeSpecsByKey(filterContentJsonSpecs(fieldSpecs)),
    [fieldSpecs],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{cardTitle}</CardTitle>
        {cardDescription && <CardDescription>{cardDescription}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="form">
          <TabsList className="mb-4">
            <TabsTrigger value="form" className="gap-1">
              <LayoutList className="h-3.5 w-3.5" />
              Форма
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-1">
              <Eye className="h-3.5 w-3.5" />
              Предпросмотр
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1">
              <FileJson className="h-3.5 w-3.5" />
              Raw JSON
            </TabsTrigger>
          </TabsList>
          <TabsContent value="form" className="space-y-4">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет полей контента для этого типа в registry.</p>
            ) : (
              fields.map((spec: TemplateFieldSpec) => (
                <FieldInput key={spec.key} spec={spec} value={value} onChange={onChange} />
              ))
            )}
          </TabsContent>
          <TabsContent value="preview">
            <PreviewPane value={value} fields={fields} />
          </TabsContent>
          <TabsContent value="raw">
            <JsonEditor
              value={value}
              onChange={(parsed) => onChange(typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {})}
              label="JSON (все поля блока)"
              schema="Редактирование JSON напрямую перезаписывает объект целиком при сохранении."
              rows={12}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

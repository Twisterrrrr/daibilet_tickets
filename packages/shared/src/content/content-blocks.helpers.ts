import type { TemplateFieldSpec } from './page-template-specs';

/** Только поля, хранящиеся в CONTENT_JSON (contentTemplateData / venueTemplateData). */
export function filterContentJsonSpecs(specs: TemplateFieldSpec[]): TemplateFieldSpec[] {
  return specs.filter((s) => s.storage === 'CONTENT_JSON');
}

/** Убрать дубликаты по key (первое вхождение сохраняется). */
export function dedupeSpecsByKey(specs: TemplateFieldSpec[]): TemplateFieldSpec[] {
  const seen = new Set<string>();
  const out: TemplateFieldSpec[] = [];
  for (const s of specs) {
    if (seen.has(s.key)) continue;
    seen.add(s.key);
    out.push(s);
  }
  return out;
}

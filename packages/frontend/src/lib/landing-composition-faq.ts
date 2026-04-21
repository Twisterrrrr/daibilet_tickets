import type { LandingCompositionBlockPublic } from '@/lib/api.types';

function asRecord(x: unknown): Record<string, unknown> | null {
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

/**
 * Извлекает пункты FAQ из блока композиции (payload.items / payload.faq или JSON в body).
 * Логика совпадает с `LandingCompositionRenderer`, чтобы SSR и клиент вели себя одинаково.
 */
export function faqItemsFromCompositionBlock(b: LandingCompositionBlockPublic): { question: string; answer: string }[] {
  const pl = asRecord(b.payload);
  const rawItems = pl?.items ?? pl?.faq;
  if (Array.isArray(rawItems)) {
    return rawItems
      .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
      .map((i) => ({
        question: String(i.question ?? i.q ?? ''),
        answer: String(i.answer ?? i.a ?? ''),
      }))
      .filter((i) => i.question || i.answer);
  }
  if (typeof b.body === 'string' && b.body.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(b.body) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((i): i is Record<string, unknown> => i != null && typeof i === 'object')
          .map((i) => ({
            question: String(i.question ?? ''),
            answer: String(i.answer ?? ''),
          }))
          .filter((i) => i.question || i.answer);
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

/**
 * True, если среди блоков композиции есть включённый FAQ с непустым контентом
 * (публичный API уже отдаёт только isEnabled-блоки).
 * В этом случае legacy `landing.faq` на CITY-странице не показываем — избегаем дубля контента и id.
 */
export function compositionProvidesRenderableFaq(blocks: LandingCompositionBlockPublic[] | undefined): boolean {
  if (!blocks?.length) return false;
  const sorted = [...blocks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  for (const b of sorted) {
    if (b.type === 'FAQ' && faqItemsFromCompositionBlock(b).length > 0) return true;
  }
  return false;
}

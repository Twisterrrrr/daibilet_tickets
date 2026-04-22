/**
 * Лейблы схожести для merge preview (0…1 → HIGH / MEDIUM / LOW).
 * Адреса: при отсутствии одного из значений — NONE на уровне вызывающего кода.
 */

import { VenueImportService } from './venue-import.service';
import { tokenizeNormalized } from './venue-match.utils';

export type SimilarityStrength = 'HIGH' | 'MEDIUM' | 'LOW';

export function similarity01ToLabel(score: number): SimilarityStrength {
  if (score >= 0.85) return 'HIGH';
  if (score >= 0.6) return 'MEDIUM';
  return 'LOW';
}

function jaccard01(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 && tokensB.length === 0) return 1;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  let inter = 0;
  for (const t of tokensB) {
    if (setA.has(t)) inter += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return union ? inter / union : 0;
}

/** Схожесть названий по нормализованному тексту и токенам (стабильная эвристика). */
export function mergePreviewTitleSimilarity01(
  titleA: string | null | undefined,
  titleB: string | null | undefined,
): number {
  const n1 = titleA ? VenueImportService.normalizeText(titleA) : '';
  const n2 = titleB ? VenueImportService.normalizeText(titleB) : '';
  if (!n1 && !n2) return 1;
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 1;
  return jaccard01(tokenizeNormalized(n1), tokenizeNormalized(n2));
}

/**
 * Схожесть адресов для отображения.
 * @returns null если у одной из сторон нет адреса — тогда label NONE.
 */
export function mergePreviewAddressSimilarity01(
  addrA: string | null | undefined,
  addrB: string | null | undefined,
): number | null {
  const t1 = addrA?.trim();
  const t2 = addrB?.trim();
  if (!t1 || !t2) return null;
  const n1 = VenueImportService.normalizeText(t1);
  const n2 = VenueImportService.normalizeText(t2);
  if (n1 === n2) return 1;
  return jaccard01(tokenizeNormalized(n1), tokenizeNormalized(n2));
}

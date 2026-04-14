/**
 * Explainable similarity для admin moderation (похожие DRAFT / ACTIVE площадки).
 * Без fuzzy-ML: только нормализованные строки и токены.
 */

const WORD_SPLIT = /[\s,.;:/\\|()[\]{}«»"'`]+/u;

export function tokenizeNormalized(s: string | null | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .toLowerCase()
    .split(WORD_SPLIT)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{N}]+$/u, ''))
    .filter((t) => t.length > 0);
}

/** Простая эвристика «номер дома» — последовательность цифр */
export function extractHouseNumbers(s: string | null | undefined): string[] {
  if (!s) return [];
  const m = s.match(/\d+[а-яa-z]?/gi);
  return m ?? [];
}

export type SimilaritySignals = {
  score: number;
  reasons: string[];
};

const REASON = {
  SAME_NORMALIZED_NAME: 'same_normalized_name',
  SAME_NORMALIZED_ADDRESS: 'same_normalized_address',
  ADDRESS_TOKEN_OVERLAP: 'address_token_overlap',
  NAME_PREFIX_MATCH: 'name_prefix_match',
  SAME_RAW_NAME: 'same_raw_name',
  SAME_HOUSE_NUMBER: 'same_house_number',
} as const;

export function computeVenueSimilarity(
  base: {
    normalizedName: string | null;
    normalizedAddress: string | null;
    rawName: string | null;
    rawAddress: string | null;
  },
  other: {
    normalizedName: string | null;
    normalizedAddress: string | null;
    rawName: string | null;
    rawAddress: string | null;
  },
): SimilaritySignals {
  const reasons: string[] = [];
  let score = 0;

  const nn = base.normalizedName?.trim() || null;
  const on = other.normalizedName?.trim() || null;
  if (nn && on && nn === on) {
    reasons.push(REASON.SAME_NORMALIZED_NAME);
    score += 45;
  }

  const na = base.normalizedAddress?.trim() || null;
  const oa = other.normalizedAddress?.trim() || null;
  if (na && oa && na === oa) {
    reasons.push(REASON.SAME_NORMALIZED_ADDRESS);
    score += 40;
  } else if (na && oa) {
    const ta = tokenizeNormalized(na);
    const tb = tokenizeNormalized(oa);
    const setA = new Set(ta);
    const overlap = tb.filter((t) => setA.has(t));
    if (overlap.length >= 2 || (overlap.length >= 1 && Math.min(ta.length, tb.length) <= 2)) {
      reasons.push(REASON.ADDRESS_TOKEN_OVERLAP);
      score += Math.min(25, 8 + overlap.length * 4);
    }
  }

  const rn = base.rawName?.trim() || null;
  const ron = other.rawName?.trim() || null;
  if (rn && ron && rn.toLowerCase() === ron.toLowerCase()) {
    reasons.push(REASON.SAME_RAW_NAME);
    score += 15;
  }

  if (nn && on && nn.length >= 4 && on.length >= 4 && (nn.startsWith(on.slice(0, 8)) || on.startsWith(nn.slice(0, 8)))) {
    reasons.push(REASON.NAME_PREFIX_MATCH);
    score += 10;
  }

  const hnA = extractHouseNumbers(na || base.rawAddress || '');
  const hnB = extractHouseNumbers(oa || other.rawAddress || '');
  if (hnA.length && hnB.length && hnA.some((h) => hnB.includes(h))) {
    reasons.push(REASON.SAME_HOUSE_NUMBER);
    score += 12;
  }

  return { score: Math.min(100, score), reasons: Array.from(new Set(reasons)) };
}

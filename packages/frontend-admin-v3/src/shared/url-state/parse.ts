const DEFAULT_ALIASES: Record<string, string[]> = {
  page: ['p'],
  pageSize: ['perPage'],
  q: ['search'],
  sort: ['orderBy'],
  order: ['direction'],
};

export function getParamWithAliases(
  sp: URLSearchParams,
  key: string,
  aliases: Record<string, string[]> = DEFAULT_ALIASES,
): string | null {
  const direct = sp.get(key);
  if (direct != null) return direct;
  const list = aliases[key] ?? [];
  for (const a of list) {
    const v = sp.get(a);
    if (v != null) return v;
  }
  return null;
}

export function readInt(sp: URLSearchParams, key: string, fallback: number): number {
  const raw = getParamWithAliases(sp, key);
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function readIntClamped(
  sp: URLSearchParams,
  key: string,
  fallback: number,
  clamp: { min: number; max: number },
): number {
  const n = readInt(sp, key, fallback);
  return Math.max(clamp.min, Math.min(clamp.max, n));
}

export function readBool01(sp: URLSearchParams, key: string): boolean | undefined {
  const raw = getParamWithAliases(sp, key);
  if (raw == null) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === '1' || v === 'true' || v === 'yes') return true;
  if (v === '0' || v === 'false' || v === 'no') return false;
  return undefined;
}

export function readEnum<T extends string>(
  sp: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const raw = getParamWithAliases(sp, key);
  if (raw == null) return fallback;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

export function readString(sp: URLSearchParams, key: string, fallback = ''): string {
  const raw = getParamWithAliases(sp, key);
  if (raw == null) return fallback;
  return raw;
}

export function normalizeCsvValues(values: string[], opts?: { lower?: boolean; upper?: boolean }): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const t0 = String(raw ?? '').trim();
    if (!t0) continue;
    const t = opts?.upper ? t0.toUpperCase() : opts?.lower ? t0.toLowerCase() : t0;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  out.sort();
  return out;
}

export function readCsv(
  sp: URLSearchParams,
  key: string,
  opts?: { lower?: boolean; upper?: boolean },
): string[] {
  const raw = getParamWithAliases(sp, key);
  if (raw == null) return [];
  const parts = raw.split(',').map((x) => x.trim());
  return normalizeCsvValues(parts, opts);
}

/** Supports legacy `sort=field:dir` format as a fallback. */
export function readSortAndOrder(
  sp: URLSearchParams,
  allowedSort: readonly string[],
  defaults: { sort: string; order: 'asc' | 'desc' },
): { sort: string; order: 'asc' | 'desc' } {
  const sortRaw = getParamWithAliases(sp, 'sort');
  const orderRaw = getParamWithAliases(sp, 'order');

  // Legacy: sort="field:asc|desc"
  if (sortRaw && sortRaw.includes(':') && !orderRaw) {
    const [field, dir] = sortRaw.split(':', 2);
    const sort = allowedSort.includes(field) ? field : defaults.sort;
    const order = dir === 'asc' || dir === 'desc' ? dir : defaults.order;
    return { sort, order };
  }

  const sort = sortRaw && allowedSort.includes(sortRaw) ? sortRaw : defaults.sort;
  const order = orderRaw === 'asc' || orderRaw === 'desc' ? orderRaw : defaults.order;
  return { sort, order };
}


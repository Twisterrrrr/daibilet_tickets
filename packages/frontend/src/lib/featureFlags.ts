/**
 * Feature Flags — загрузка с /api/v1/public/feature-flags.
 * isEnabled(flag, ctx) с поддержкой rules (cityId, operatorId и т.д.)
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export interface FeatureFlagState {
  enabled: boolean;
  rules?: Record<string, unknown>;
}

let cachedFlags: Record<string, FeatureFlagState> | null = null;
let fetchPromise: Promise<Record<string, FeatureFlagState>> | null = null;

export async function fetchFeatureFlags(): Promise<Record<string, FeatureFlagState>> {
  if (cachedFlags) return cachedFlags;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/public/feature-flags`, {
        next: { revalidate: 60 },
      });
      if (!res.ok) return {};
      const data = (await res.json()) as Record<string, FeatureFlagState>;
      cachedFlags = data;
      return data;
    } catch {
      return {};
    }
  })();

  return fetchPromise;
}

/**
 * Проверить, включён ли флаг.
 * ctx — опциональный контекст (cityId, operatorId и т.д.) для rulesJson.
 * fallback: если flags не загрузились — safe default false для рисковых флагов.
 */
export function isEnabled(
  flags: Record<string, FeatureFlagState> | null,
  key: string,
  ctx?: { cityId?: string; operatorId?: string },
): boolean {
  if (!flags || !(key in flags)) return false;
  const f = flags[key];
  if (!f.enabled) return false;

  const rules = f.rules as { cityIds?: string[]; excludeCityIds?: string[] } | undefined;
  if (!rules) return true;

  if (ctx?.cityId && rules.excludeCityIds?.includes(ctx.cityId)) return false;
  if (ctx?.cityId && rules.cityIds?.length && !rules.cityIds.includes(ctx.cityId)) return false;

  return true;
}

/**
 * Rate limit config from env.
 * Env vars: THROTTLE_TTL, THROTTLE_LIMIT (default/public)
 *   THROTTLE_SEARCH_TTL, THROTTLE_SEARCH_LIMIT
 *   THROTTLE_CHECKOUT_TTL, THROTTLE_CHECKOUT_LIMIT
 *   THROTTLE_AUTH_TTL, THROTTLE_AUTH_LIMIT (admin login)
 *   THROTTLE_REVIEWS_TTL, THROTTLE_REVIEWS_LIMIT
 */

export interface ThrottleLimit {
  ttl: number;
  limit: number;
}

function parseEnv(prefix: string, fallbackTtl: number, fallbackLimit: number): ThrottleLimit {
  const ttlKey = prefix ? `THROTTLE_${prefix}_TTL` : 'THROTTLE_TTL';
  const limitKey = prefix ? `THROTTLE_${prefix}_LIMIT` : 'THROTTLE_LIMIT';
  const ttl = parseInt(process.env[ttlKey] ?? '', 10);
  const limit = parseInt(process.env[limitKey] ?? '', 10);
  return {
    ttl: Number.isFinite(ttl) ? ttl : fallbackTtl,
    limit: Number.isFinite(limit) ? limit : fallbackLimit,
  };
}

export interface ThrottleConfig {
  default: ThrottleLimit;
  search: ThrottleLimit;
  checkout: ThrottleLimit;
  auth: ThrottleLimit;
  reviews: ThrottleLimit;
}

/** Returns throttle limits from env with fallbacks. */
export function getThrottleConfig(): ThrottleConfig {
  const def = parseEnv('', 60_000, 30);
  return {
    default: def,
    search: parseEnv('SEARCH', 60_000, 60),
    checkout: parseEnv('CHECKOUT', 60_000, 10),
    auth: parseEnv('AUTH', 60_000, 5),
    reviews: parseEnv('REVIEWS', 60_000, 10),
  };
}

/** ThrottlerModule.forRoot array — один throttler default, per-route через @Throttle({ default: { ttl, limit } }). */
export function getThrottlerOptions(): Array<{ name: string; ttl: number; limit: number }> {
  const c = getThrottleConfig();
  return [{ name: 'default', ttl: c.default.ttl, limit: c.default.limit }];
}

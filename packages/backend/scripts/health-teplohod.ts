/**
 * Только Teplohod.info: проверка доступности и сколько событий отдаёт API (compact).
 *
 * Запуск:
 *   cd packages/backend
 *   npx tsx scripts/health-teplohod.ts
 *
 * ENV:
 *   TEP_API_URL — база (по умолчанию https://api.teplohod.info/v1)
 *   TEP_HTTP_TIMEOUT_MS — таймаут запросов (по умолчанию 120000)
 *   TEP_PROBE_FULL=1 — дополнительно дернуть GET /events (без compact, может быть долго / требует белый IP)
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

function loadRootEnv(): string | null {
  const rootEnv = resolve(process.cwd(), '..', '..', '.env');
  const localEnv = resolve(process.cwd(), '.env');
  const loaded = existsSync(rootEnv) ? rootEnv : existsSync(localEnv) ? localEnv : null;
  if (loaded) config({ path: loaded });
  return loaded;
}

function toInt(v: string | undefined, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

async function probeArray(
  label: string,
  url: string,
  timeoutMs: number,
): Promise<{ label: string; url: string; ok: boolean; ms: number; status?: number; count?: number; error?: string }> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: '*/*',
        'User-Agent': 'Daibilet/health-teplohod',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const ms = Date.now() - started;
    const status = res.status;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { label, url, ok: false, ms, status, error: `HTTP ${status}: ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) {
      return { label, url, ok: false, ms, status, error: 'response is not a JSON array' };
    }
    return { label, url, ok: true, ms, status, count: json.length };
  } catch (e) {
    const ms = Date.now() - started;
    return { label, url, ok: false, ms, error: (e as Error).message };
  }
}

async function main() {
  const envPath = loadRootEnv();
  const base = (process.env.TEP_API_URL || 'https://api.teplohod.info/v1').replace(/\/$/, '');
  const timeoutMs = toInt(process.env.TEP_HTTP_TIMEOUT_MS, 120_000);
  const probeFull = process.env.TEP_PROBE_FULL === '1';

  const citiesUrl = `${base}/cities`;
  const eventsCompactUrl = `${base}/events?compact`;
  const eventsFullUrl = `${base}/events`;

  const probes: Awaited<ReturnType<typeof probeArray>>[] = [];
  probes.push(await probeArray('cities', citiesUrl, Math.min(timeoutMs, 60_000)));
  probes.push(await probeArray('events_compact', eventsCompactUrl, timeoutMs));
  if (probeFull) {
    probes.push(await probeArray('events_full', eventsFullUrl, timeoutMs));
  }

  const out = {
    envLoaded: envPath,
    baseUrl: base,
    timeoutMs,
    probeFull,
    probes,
  };
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Выгрузка снимка Teplohod API в fixtures/teplohod (нужен VPN / доступ к api.teplohod.info).
 *
 * Запуск:
 *   cd packages/backend
 *   pnpm run tep:export-fixtures
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = (process.env.TEP_API_URL || 'https://api.teplohod.info/v1').replace(/\/$/, '');
const OUT_DIR = resolve(process.cwd(), process.env.TEP_FIXTURES_DIR ?? 'fixtures/teplohod');
const TIMEOUT_MS = Number(process.env.TEP_HTTP_TIMEOUT_MS ?? 120_000);

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${BASE}${path}`;
  console.log(`GET ${url}`);
  const res = await fetch(url, {
    method: 'GET',
    headers: { Accept: '*/*', 'User-Agent': 'Daibilet/export-teplohod-snapshot' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

function sha256File(path: string): { sha256: string; bytes: number } {
  const buf = readFileSync(path);
  return {
    sha256: createHash('sha256').update(buf).digest('hex'),
    bytes: buf.length,
  };
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  const cities = await fetchJson<unknown[]>('/cities');
  const events = await fetchJson<Array<{ id: number; eventTimes?: unknown[] }>>('/events?compact');

  const citiesPath = resolve(OUT_DIR, 'cities.json');
  const eventsPath = resolve(OUT_DIR, 'events-compact.json');
  const manifestPath = resolve(OUT_DIR, 'manifest.json');

  writeFileSync(citiesPath, JSON.stringify(cities, null, 4) + '\n', 'utf8');
  writeFileSync(eventsPath, JSON.stringify(events, null, 4) + '\n', 'utf8');

  const withTimes = events.filter((e) => Array.isArray(e.eventTimes) && e.eventTimes.length > 0).length;
  const manifest = {
    exportedAt: new Date().toISOString(),
    source: BASE,
    endpoints: {
      cities: '/v1/cities',
      eventsCompact: '/v1/events?compact',
    },
    eventsCount: events.length,
    withEventTimes: withTimes,
    withoutEventTimes: events.length - withTimes,
    totalEventTimeSlots: events.reduce((s, e) => s + (e.eventTimes?.length ?? 0), 0),
    files: {
      'cities.json': sha256File(citiesPath),
      'events-compact.json': sha256File(eventsPath),
    },
    notes: [
      'Snapshot for environments without VPN access to api.teplohod.info',
      'Use with TEP_API_URL pointing to local fixture bridge (see README.md)',
    ],
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

  console.log('');
  console.log(`Saved to ${OUT_DIR}`);
  console.log(`  cities: ${cities.length}`);
  console.log(`  events: ${events.length} (with eventTimes: ${withTimes})`);
}

main().catch((err) => {
  console.error('[export-teplohod-snapshot] failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});

/**
 * Локальный HTTP-мост к снимку Teplohod API (fixtures).
 * Для Codex / CI / офлайн-разработки без VPN до api.teplohod.info.
 *
 * Запуск:
 *   cd packages/backend
 *   pnpm run tep:fixture-bridge
 *
 * ENV:
 *   TEP_BRIDGE_PORT      — порт (по умолчанию 8787)
 *   TEP_FIXTURES_DIR       — каталог fixtures (по умолчанию ./fixtures/teplohod)
 *
 * В .env backend:
 *   TEP_API_URL=http://127.0.0.1:8787/v1
 */
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type TepEvent = { id: number; eventTimes?: unknown[] };

const PORT = Number(process.env.TEP_BRIDGE_PORT ?? 8787);
const FIXTURES_DIR = resolve(process.cwd(), process.env.TEP_FIXTURES_DIR ?? 'fixtures/teplohod');

function readJson<T>(filename: string): T {
  const filePath = resolve(FIXTURES_DIR, filename);
  if (!existsSync(filePath)) {
    throw new Error(`Fixture not found: ${filePath}`);
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'X-Teplohod-Fixture-Bridge': '1',
  });
  res.end(payload);
}

function loadEvents(): TepEvent[] {
  return readJson<TepEvent[]>('events-compact.json');
}

function loadCities(): unknown[] {
  return readJson<unknown[]>('cities.json');
}

function findEventById(id: string): TepEvent | undefined {
  const num = Number(id);
  if (!Number.isFinite(num)) return undefined;
  return loadEvents().find((e) => e.id === num);
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  if (!req.url) {
    sendJson(res, 400, { error: 'missing url' });
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, User-Agent',
    });
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  // Health / root
  if (url.pathname === '/' || url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      service: 'teplohod-fixture-bridge',
      fixturesDir: FIXTURES_DIR,
      basePath: '/v1',
    });
    return;
  }

  // GET /v1/cities
  if (url.pathname === '/v1/cities') {
    sendJson(res, 200, loadCities());
    return;
  }

  // GET /v1/events/:id
  const eventById = url.pathname.match(/^\/v1\/events\/(\d+)$/);
  if (eventById) {
    const event = findEventById(eventById[1]);
    if (!event) {
      sendJson(res, 404, { error: `event ${eventById[1]} not found in fixtures` });
      return;
    }
    sendJson(res, 200, event);
    return;
  }

  // GET /v1/events (compact, full, with optional city_id — API игнорирует фильтр, отдаём тот же снимок)
  if (url.pathname === '/v1/events') {
    sendJson(res, 200, loadEvents());
    return;
  }

  sendJson(res, 404, {
    error: 'not found',
    path: url.pathname,
    supported: ['/v1/cities', '/v1/events', '/v1/events?compact', '/v1/events/:id'],
  });
}

function main(): void {
  if (!existsSync(resolve(FIXTURES_DIR, 'events-compact.json'))) {
    console.error(`[teplohod-fixture-bridge] Missing fixtures in ${FIXTURES_DIR}`);
    console.error('Run: git checkout fixtures -- packages/backend/fixtures/teplohod');
    process.exit(1);
  }

  const events = loadEvents();
  const cities = loadCities();

  const server = http.createServer(handleRequest);
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[teplohod-fixture-bridge] listening on http://127.0.0.1:${PORT}/v1`);
    console.log(`[teplohod-fixture-bridge] fixtures: ${FIXTURES_DIR}`);
    console.log(`[teplohod-fixture-bridge] cities=${cities.length} events=${events.length}`);
    console.log('');
    console.log('Set in .env:');
    console.log(`  TEP_API_URL=http://127.0.0.1:${PORT}/v1`);
    console.log('');
    console.log('Then sync:');
    console.log('  curl -X POST http://localhost:4000/api/v1/tep/sync');
  });
}

main();

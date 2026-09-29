/**
 * Health check: "сколько событий кто отдает" (TEP / TC) + сколько у нас в БД.
 *
 * Не запускает импорт. Только читает внешние API и делает COUNT(*) в нашей БД.
 *
 * Запуск:
 *   cd packages/backend
 *   npx tsx scripts/health-sources.ts
 *
 * ENV (опционально):
 *   TEP_HTTP_TIMEOUT_MS=120000
 *   TC_GRPC_ENDPOINT=simple.ticketscloud.com:443
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { PrismaClient } from '../src/prisma-client';
import { TcGrpcService } from '../src/catalog/tc-grpc.service';

function loadRootEnv() {
  const rootEnv = resolve(process.cwd(), '..', '..', '.env');
  const localEnv = resolve(process.cwd(), '.env');
  const loaded = existsSync(rootEnv) ? rootEnv : existsSync(localEnv) ? localEnv : null;
  if (loaded) config({ path: loaded });
  return loaded;
}

function toInt(v: string | undefined, def: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

async function probeJsonCount(url: string, timeoutMs: number): Promise<{ ok: boolean; status?: number; count?: number; err?: string }> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const status = res.status;
    if (!res.ok) return { ok: false, status, err: `HTTP ${status}` };
    const json = (await res.json()) as unknown;
    if (!Array.isArray(json)) return { ok: false, status, err: 'unexpected json (not array)' };
    return { ok: true, status, count: json.length };
  } catch (e) {
    return { ok: false, err: (e as Error).message };
  }
}

async function main() {
  const envPath = loadRootEnv();
  const tepBase = process.env.TEP_API_URL || 'https://api.teplohod.info/v1';
  const tcGrpcEndpoint = process.env.TC_GRPC_ENDPOINT || 'simple.ticketscloud.com:443';
  const timeoutMs = toInt(process.env.TEP_HTTP_TIMEOUT_MS, 120_000);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter, log: ['error'] });
  await prisma.$connect();

  // =========================
  // DB counts (source of truth for "у нас")
  // =========================
  const [dbAll, dbTep, dbTc] = await Promise.all([
    prisma.event.count({ where: { isDeleted: false } }),
    prisma.event.count({ where: { isDeleted: false, source: 'TEPLOHOD' } }),
    prisma.event.count({ where: { isDeleted: false, source: 'TC' } }),
  ]);

  // =========================
  // TEP external counts
  // =========================
  const tepCompactUrl = `${tepBase}/events?compact`;
  const tepCitiesUrl = `${tepBase}/cities`;
  const [tepCities, tepEventsCompact] = await Promise.all([
    probeJsonCount(tepCitiesUrl, Math.min(timeoutMs, 30_000)),
    probeJsonCount(tepCompactUrl, timeoutMs),
  ]);

  // =========================
  // TC external counts (gRPC tc-simple)
  // =========================
  const tcGrpc = new TcGrpcService({
    // minimal ConfigService shim used by constructor (only get()).
    // We intentionally avoid importing Nest container here.
    get: (k: string, def?: string) => {
      if (k === 'TC_GRPC_ENDPOINT') return tcGrpcEndpoint;
      if (k === 'TC_API_TOKEN') return process.env.TC_API_TOKEN || '';
      return def;
    },
  } as any);

  const tc: { ready: boolean; health?: string; eventsAny?: number; err?: string } = { ready: false };
  try {
    await tcGrpc.onModuleInit();
    tc.ready = tcGrpc.isReady();
    if (tc.ready) {
      const h = await tcGrpc.healthCheck();
      tc.health = h?.status ?? 'unknown';
      const events = await tcGrpc.fetchEvents({ status: 0 });
      tc.eventsAny = events.length;
    } else {
      tc.err = 'gRPC client not ready (check TC_API_TOKEN)';
    }
  } catch (e) {
    tc.err = (e as Error).message;
  } finally {
    tcGrpc.onModuleDestroy();
  }

  const out = {
    envLoaded: envPath ?? null,
    external: {
      teplohod: {
        baseUrl: tepBase,
        timeoutMs,
        cities: tepCities,
        eventsCompact: tepEventsCompact,
      },
      ticketscloud: {
        grpc: {
          endpoint: tcGrpcEndpoint,
          ready: tc.ready,
          health: tc.health ?? null,
          eventsAny: tc.eventsAny ?? null,
          error: tc.err ?? null,
        },
      },
    },
    db: {
      eventsAll: dbAll,
      eventsBySource: {
        TEPLOHOD: dbTep,
        TC: dbTc,
      },
    },
  };

  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


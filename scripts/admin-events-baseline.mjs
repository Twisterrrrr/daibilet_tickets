/**
 * Baseline probe for GET /api/v1/admin/events (Admin V3).
 *
 * Usage (PowerShell):
 *   $env:ADMIN_TOKEN="...jwt..."
 *   node scripts/admin-events-baseline.mjs --url http://127.0.0.1:4000/api/v1 --q "limit=50&page=1&lite=1"
 *
 * Notes:
 * - Endpoint requires Authorization: Bearer <token>
 * - Keep `lite=1` for list-page baseline (default in Admin V3).
 */
import { performance } from 'node:perf_hooks';

function readArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const baseUrl = readArg('--url') ?? process.env.API_URL ?? 'http://127.0.0.1:4000/api/v1';
const q = readArg('--q') ?? 'limit=50&page=1&lite=1';
const token = process.env.ADMIN_TOKEN ?? '';

if (!token) {
  console.error('Missing ADMIN_TOKEN env var (JWT).');
  process.exit(2);
}

const url = `${baseUrl.replace(/\/$/, '')}/admin/events?${q.replace(/^\?/, '')}`;

const t0 = performance.now();
const res = await fetch(url, {
  headers: {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
  },
});
const t1 = performance.now();
const text = await res.text();
const t2 = performance.now();

let parsed = null;
try {
  parsed = JSON.parse(text);
} catch {
  // ignore
}

const bytes = Buffer.byteLength(text, 'utf8');
const msHeaders = t1 - t0;
const msBody = t2 - t1;
const msTotal = t2 - t0;

const items = parsed && typeof parsed === 'object' ? parsed.items : null;
const total = parsed && typeof parsed === 'object' ? parsed.total : null;

console.log(
  JSON.stringify(
    {
      url,
      status: res.status,
      ok: res.ok,
      timingMs: {
        headers: Math.round(msHeaders),
        body: Math.round(msBody),
        total: Math.round(msTotal),
      },
      response: {
        bytes,
        kb: Math.round((bytes / 1024) * 10) / 10,
        itemsCount: Array.isArray(items) ? items.length : null,
        total: typeof total === 'number' ? total : null,
      },
    },
    null,
    2,
  ),
);


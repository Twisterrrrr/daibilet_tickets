#!/usr/bin/env node
/**
 * Фаза 9 — автоматический smoke при запущенном API.
 * 1) Публичный health (как `smoke-public-health.mjs`).
 * 2) Без JWT: выборочные GET `/admin/*` должны вернуть 401 или 403 (не 5xx / не 404 маршрута).
 * 3) Опционально: `SMOKE_ADMIN_BEARER` — Bearer-токен админа; тогда те же URL — 200 и минимальная форма тела.
 *
 * Переменные: `SMOKE_API_BASE_URL` (как в smoke-public-health), `SMOKE_ADMIN_BEARER` (опционально).
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const healthScript = join(__dirname, 'smoke-public-health.mjs');

const base = (process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const bearer = (process.env.SMOKE_ADMIN_BEARER || '').trim();

const ADMIN_GETS = [
  '/api/v1/admin/events?page=1&limit=5&lite=1',
  '/api/v1/admin/events?needsAttention=true&page=1&limit=1',
  '/api/v1/admin/external-orders?page=1&limit=5',
  '/api/v1/admin/external-orders?search=test&page=1&limit=5',
  '/api/v1/admin/landings?lite=1&page=1&limit=5',
  '/api/v1/admin/tags?page=1&limit=5',
];

function assert(cond, msg) {
  if (!cond) {
    console.error(`[smoke-phase9] ${msg}`);
    process.exit(1);
  }
}

async function fetchNoAuth(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  return { url, res };
}

async function fetchAuth(path) {
  const url = `${base}${path}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return { url, res };
}

async function main() {
  const h = spawnSync(process.execPath, [healthScript], { stdio: 'inherit', env: process.env, cwd: root });
  assert(h.status === 0, 'smoke-public-health завершился с ошибкой');

  if (bearer) {
    console.log('[smoke-phase9] Режим с SMOKE_ADMIN_BEARER — проверка 200 + форма ответа');
    for (const path of ADMIN_GETS) {
      const { url, res } = await fetchAuth(path);
      assert(res.ok, `Ожидался 2xx для ${url}, получено ${res.status}`);
      let body;
      try {
        body = await res.json();
      } catch {
        assert(false, `Ответ не JSON: ${url}`);
      }
      if (path.includes('/admin/events')) {
        assert(Array.isArray(body.items), `/admin/events: ожидался массив items (${url})`);
      } else if (path.includes('/admin/external-orders')) {
        assert(Array.isArray(body.items), `/admin/external-orders: ожидался массив items (${url})`);
      } else if (path.includes('/admin/landings')) {
        assert(Array.isArray(body.items), `/admin/landings: ожидался массив items (${url})`);
      } else if (path.includes('/admin/tags')) {
        assert(Array.isArray(body.items), `/admin/tags: ожидался массив items (${url})`);
      }
      console.log(`[smoke-phase9] OK (auth) ${res.status} ${path}`);
    }
  } else {
    console.log('[smoke-phase9] Без SMOKE_ADMIN_BEARER — проверка что админ-листы закрыты (401/403), не 5xx');
    for (const path of ADMIN_GETS) {
      const { url, res } = await fetchNoAuth(path);
      assert(res.status === 401 || res.status === 403, `Ожидался 401/403 для ${url}, получено ${res.status}`);
      console.log(`[smoke-phase9] OK (guest) ${res.status} ${path}`);
    }
  }

  console.log('[smoke-phase9] Все проверки пройдены.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

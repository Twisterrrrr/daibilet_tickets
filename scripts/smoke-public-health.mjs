#!/usr/bin/env node
/**
 * Публичный health без авторизации (фаза 9).
 * Использование: `pnpm smoke:health` при запущенном backend (по умолчанию http://127.0.0.1:4000).
 * См. также `pnpm smoke:phase9` — health + проверка админ-маршрутов (фаза 9).
 * Переменная окружения: SMOKE_API_BASE_URL — origin без завершающего слэша (например https://staging.daibilet.ru).
 */
const base = (process.env.SMOKE_API_BASE_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
const url = `${base}/api/v1/health`;

async function main() {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch (e) {
    console.error(`[smoke-public-health] Не удалось запросить ${url}:`, e?.message || e);
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`[smoke-public-health] HTTP ${res.status} ${res.statusText} для ${url}`);
    process.exit(1);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    console.error(`[smoke-public-health] Ответ не JSON: ${url}`);
    process.exit(1);
  }
  const st = body?.status;
  if (st !== 'ok' && st !== 'degraded') {
    console.error(`[smoke-public-health] Неожиданный status в теле:`, body);
    process.exit(1);
  }
  console.log(`[smoke-public-health] OK ${url} → status=${st}`, body?.db != null ? `db=${body.db}` : '');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

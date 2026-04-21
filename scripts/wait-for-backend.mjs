#!/usr/bin/env node
/**
 * Ждёт HTTP 200 от бэкенда перед стартом зависимых dev-серверов (admin-v3 и т.д.).
 * См. корневой script "dev" в package.json.
 *
 * Для ручного запуска только Vite без бэкенда: pnpm dev:admin-v3
 */
const url = process.env.BACKEND_HEALTH_URL ?? 'http://127.0.0.1:4000/api/v1/health';
const delayMs = 400;
const maxMs = 120_000;
const started = Date.now();

process.stderr.write(`[wait-backend] Ожидание ${url}…\n`);

while (Date.now() - started < maxMs) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      process.stderr.write(`[wait-backend] Готово за ${Math.round((Date.now() - started) / 1000)} с\n`);
      process.exit(0);
    }
  } catch {
    /* ECONNREFUSED, таймаут fetch — повтор */
  }
  await new Promise((r) => setTimeout(r, delayMs));
}

process.stderr.write('[wait-backend] Таймаут: бэкенд не ответил. Запустите `pnpm dev:backend` или проверьте PORT.\n');
process.exit(1);

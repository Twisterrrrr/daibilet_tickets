/**
 * FULL SYNC (dev) — полный ресинк каталога через backend API.
 *
 * Источники:
 * - Ticketscloud (TC) — события, офферы, сеансы, города
 * - Teplohod.info — события, офферы, сеансы
 * - Retag — пересвязывание тегов
 * - Cache invalidate — сброс кэша каталога после синка
 *
 * Запуск (из корня монорепо):
 *   FULL_SYNC=1 pnpm --filter @daibilet/backend full:sync
 *
 * Требования:
 * - Backend dev сервер уже запущен (PORT или 4000 по умолчанию)
 * - ENV FULL_SYNC=1 обязательно, иначе скрипт завершится с ошибкой
 */

const API_BASE = process.env.API_URL || 'http://127.0.0.1:4000';

async function runFullSync(): Promise<void> {
  if (process.env.FULL_SYNC !== '1') {
    // Жёсткая защита от случайного запуска без явного флага.
    // В проде этот скрипт не используется, но флаг оставляем обязательным.
    console.error('FULL SYNC ABORTED: set FULL_SYNC=1 in env to run this command.');
    process.exitCode = 1;
    return;
  }

  const url = `${API_BASE}/api/v1/sync/all`;
  const startedAt = new Date();
  console.log(`\n=== FULL SYNC (dev) → ${url} ===\n`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const elapsedSec = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      console.error(`FULL SYNC FAILED: HTTP ${res.status} after ${elapsedSec}s`);
      if (bodyText) {
        console.error(bodyText);
      }
      process.exitCode = 1;
      return;
    }

    const data = (await res.json()) as Record<string, unknown>;
    console.log(`FULL SYNC OK in ${elapsedSec}s\n`);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(
      `FULL SYNC ERROR: cannot reach backend at ${API_BASE}. ` +
        'Make sure dev backend is running (pnpm dev:backend).',
    );
    console.error((e as Error).message);
    process.exitCode = 1;
  }
}

runFullSync().catch((e) => {
  console.error('FULL SYNC UNHANDLED ERROR:', e);
  process.exit(1);
});


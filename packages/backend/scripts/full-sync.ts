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
 *
 * Важно:
 * - Этот скрипт НЕ держит долгий HTTP-запрос. Он ставит sync job в BullMQ очередь
 *   (admin endpoint) и затем опрашивает статус job до завершения.
 * - Для admin endpoint нужен токен: передайте ADMIN_TOKEN (значение admin_token из localStorage).
 */

const API_BASE = process.env.API_URL || 'http://localhost:4000';

type SyncEnqueueResponse = {
  success: boolean;
  message?: string;
  jobId: string;
  queued?: boolean;
};

type SyncProgressResponse = {
  jobId: string;
  state: string;
  message?: string;
  timestamp?: number | null;
  processedOn?: number | null;
  finishedOn?: number | null;
  failedReason?: string | null;
  returnvalue?: unknown;
};

async function runFullSync(): Promise<void> {
  if (process.env.FULL_SYNC !== '1') {
    // Жёсткая защита от случайного запуска без явного флага.
    // В проде этот скрипт не используется, но флаг оставляем обязательным.
    console.error('FULL SYNC ABORTED: set FULL_SYNC=1 in env to run this command.');
    process.exitCode = 1;
    return;
  }

  const email = process.env.ADMIN_EMAIL || '';
  const password = process.env.ADMIN_PASSWORD || '';

  const login = async (): Promise<string> => {
    if (!email || !password) return '';
    const loginUrl = `${API_BASE}/api/v1/auth/login`;
    console.log(`No ADMIN_TOKEN provided → login via ${loginUrl}`);
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      console.error(`FULL SYNC LOGIN FAILED: HTTP ${res.status}`);
      if (bodyText) console.error(bodyText);
      return '';
    }
    const body = (await res.json().catch(() => null)) as { accessToken?: string } | null;
    return (body?.accessToken || '').trim();
  };

  let token = (process.env.ADMIN_TOKEN || '').trim();
  if (!token) {
    token = await login();
  }

  if (!token) {
    console.error(
      'FULL SYNC ABORTED: missing auth token.\n' +
        '- Option A: set ADMIN_TOKEN (admin_token from Admin V4 localStorage)\n' +
        '- Option B: set ADMIN_EMAIL and ADMIN_PASSWORD to auto-login',
    );
    process.exitCode = 1;
    return;
  }

  const enqueueUrl = `${API_BASE}/api/v1/admin/settings/ops/sync/full`;
  const progressUrl = `${API_BASE}/api/v1/admin/settings/ops/sync/progress`;
  const startedAt = new Date();
  const overallTimeoutMs = Number(process.env.FULL_SYNC_TIMEOUT_MS) || 5_400_000; // 90 min default (matches sync worker hard-timeout)
  const overallTimeoutMin = Math.round(overallTimeoutMs / 60_000);
  // Прогресс-эндпоинт защищён throttler'ом, поэтому поллим редко.
  const pollMs = Number(process.env.FULL_SYNC_POLL_MS) || 10_000;
  console.log(
    `\n=== FULL SYNC (dev) → enqueue BullMQ job (overallTimeout=${overallTimeoutMin}m, poll=${Math.round(
      pollMs / 1000,
    )}s) ===\n`,
  );

  try {
    const enqueueRes = await fetch(enqueueUrl, {
      method: 'POST',
      // jwt guard expects bearer admin_token
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!enqueueRes.ok) {
      const bodyText = await enqueueRes.text().catch(() => '');
      console.error(`FULL SYNC ENQUEUE FAILED: HTTP ${enqueueRes.status}`);
      if (bodyText) console.error(bodyText);
      process.exitCode = 1;
      return;
    }

    const enqueue = (await enqueueRes.json().catch(() => null)) as SyncEnqueueResponse | null;
    const jobId = enqueue?.jobId || 'singleton_sync_full';
    console.log(`Enqueued: jobId=${jobId}${enqueue?.queued === false ? ' (duplicate/already running)' : ''}`);

    const deadlineAt = Date.now() + overallTimeoutMs;
    let lastState = '';
    while (Date.now() < deadlineAt) {
      let res = await fetch(`${progressUrl}?jobId=${encodeURIComponent(jobId)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401 && !process.env.ADMIN_TOKEN && email && password) {
        // Dev servers can restart during long sync; if JWT secret rotates/misconfigured,
        // retry once by re-login.
        const refreshed = await login();
        if (refreshed) {
          token = refreshed;
          res = await fetch(`${progressUrl}?jobId=${encodeURIComponent(jobId)}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }

      if (res.status === 429) {
        // Too many requests — просто подождём и продолжим (job в очереди продолжает выполняться).
        await new Promise((r) => setTimeout(r, Math.max(pollMs, 15_000)));
        continue;
      }

      if (!res.ok) {
        const bodyText = await res.text().catch(() => '');
        console.error(`FULL SYNC PROGRESS FAILED: HTTP ${res.status}`);
        if (bodyText) console.error(bodyText);
        process.exitCode = 1;
        return;
      }

      const progress = (await res.json()) as SyncProgressResponse;
      const state = progress?.state || 'unknown';
      if (state !== lastState) {
        const elapsedSec = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
        console.log(`[${elapsedSec}s] state=${state}`);
        lastState = state;
      }

      if (state === 'completed') {
        const elapsedSec = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
        console.log(`\nFULL SYNC OK in ${elapsedSec}s\n`);
        if (progress.returnvalue !== undefined) {
          console.log(JSON.stringify(progress.returnvalue, null, 2));
        }
        return;
      }

      if (state === 'failed') {
        const elapsedSec = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
        console.error(`\nFULL SYNC FAILED in ${elapsedSec}s\n`);
        if (progress.failedReason) console.error(progress.failedReason);
        process.exitCode = 1;
        return;
      }

      await new Promise((r) => setTimeout(r, pollMs));
    }

    console.error(`\nFULL SYNC TIMEOUT: exceeded overall timeout ${overallTimeoutMin}m while waiting for job\n`);
    process.exitCode = 1;
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


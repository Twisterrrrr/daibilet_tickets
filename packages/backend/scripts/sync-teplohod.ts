/**
 * Запуск импорта teplohod.info и вывод активных событий.
 *
 * Вариант 1: бэкенд запущен → POST /api/v1/tep/sync
 * Вариант 2: только вывод активных событий из БД (Prisma)
 *
 * Запуск:
 *   cd packages/backend && npm run sync:tep
 *   cd packages/backend && npm run sync:tep -- --list-only  # только список, без sync
 */
import { PrismaClient } from '@prisma/client';

const API_BASE = process.env.API_URL || 'http://localhost:4000';

async function runTepSync(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/tep/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      console.warn(`Sync API ${res.status}: ${await res.text()}`);
      return false;
    }
    const data = (await res.json()) as Record<string, unknown>;
    console.log('Результат sync:', JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    console.warn(
      `Не удалось вызвать sync API (${API_BASE}). Запустите бэкенд: pnpm dev:backend`,
    );
    console.warn((e as Error).message);
    return false;
  }
}

async function listActiveEvents(prisma: PrismaClient) {
  const active = await prisma.event.findMany({
    where: {
      source: 'TEPLOHOD',
      isActive: true,
      isDeleted: false,
      offers: {
        some: { status: 'ACTIVE', isDeleted: false },
      },
    },
    select: {
      id: true,
      tcEventId: true,
      title: true,
      slug: true,
      priceFrom: true,
      city: { select: { name: true, slug: true } },
      offers: {
        where: { status: 'ACTIVE', isDeleted: false },
        select: {
          externalEventId: true,
          widgetPayload: true,
          purchaseType: true,
        },
      },
    },
    orderBy: { title: 'asc' },
  });

  console.log(`\n=== Активные TEPLOHOD события (${active.length}) ===\n`);
  for (const e of active) {
    const payload = (e.offers[0] as any)?.widgetPayload || {};
    const tepWidgetId = payload.tepWidgetId ?? '-';
    const tepEventId = payload.tepEventId ?? e.tcEventId?.replace(/^tep-/, '') ?? '-';
    const title = (e.title ?? '').slice(0, 55);
    const price = e.priceFrom != null ? `${(e.priceFrom / 100).toLocaleString('ru-RU')} ₽` : '—';
    console.log(
      `${(e.tcEventId ?? '').padEnd(12)} ${(e.city?.name ?? '-').padEnd(18)} ${price.padEnd(12)} ` +
        `widget=${String(tepWidgetId).padEnd(6)} event=${tepEventId}\t${title}${(e.title?.length ?? 0) > 55 ? '...' : ''}`,
    );
  }
}

async function main() {
  const listOnly = process.argv.includes('--list-only');
  const prisma = new PrismaClient();

  if (!listOnly) {
    console.log('\n=== Импорт teplohod.info ===\n');
    await runTepSync();
  }

  await listActiveEvents(prisma);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

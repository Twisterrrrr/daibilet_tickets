/**
 * Предсоздание партиций для event_sessions_partitioned (месячные партиции по startsAt).
 * Идемпотентно — партиции создаются через IF NOT EXISTS.
 *
 * Запуск (1‑й день месяца через cron или вручную):
 *   npx tsx scripts/ensure-event-sessions-partitions.ts
 *
 * Создаёт партиции для следующих 3 месяцев, если их ещё нет.
 * Требует миграцию 20260312120000_event_sessions_partitioned_scaffold.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  for (let n = 1; n <= 3; n++) {
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + n, 1);
    const yyyyMm = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}-01`;

    await prisma.$executeRawUnsafe(
      "SELECT create_event_sessions_partition('event_sessions_partitioned'::regclass, $1::date)",
      yyyyMm
    );
    console.log(`Partition ensured for ${yyyyMm}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

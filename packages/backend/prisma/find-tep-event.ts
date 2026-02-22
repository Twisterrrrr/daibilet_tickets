/**
 * Поиск tep-события по tcEventId.
 * Запуск: npx tsx prisma/find-tep-event.ts 370
 */
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env
const rootEnv = resolve(process.cwd(), '../../.env');
const backendEnv = resolve(process.cwd(), '../.env');
const envPath = [rootEnv, backendEnv, resolve(__dirname, '../../.env')].find(existsSync);
if (envPath) {
  const env = readFileSync(envPath, 'utf-8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2] || '370';
  const tcEventId = id.startsWith('tep-') ? id : `tep-${id}`;

  const event = await prisma.event.findUnique({
    where: { tcEventId },
    include: {
      city: { select: { slug: true, name: true } },
      offers: { where: { isDeleted: false }, select: { id: true, status: true, widgetPayload: true } },
      sessions: {
        where: { isActive: true },
        select: { startsAt: true, availableTickets: true },
        orderBy: { startsAt: 'asc' },
        take: 5,
      },
      override: { select: { isHidden: true, category: true } },
    },
  });

  if (!event) {
    console.log(`Событие ${tcEventId} НЕ НАЙДЕНО в БД. Возможные причины:`);
    console.log('  - не прошло sync (API teplohod не вернул, или нет city mapping)');
    console.log('  - никогда не синкалось');
    return;
  }

  const futureSessions = event.sessions.filter((s) => s.startsAt >= new Date());
  console.log(`\n=== ${tcEventId} ===`);
  console.log(`id: ${event.id}`);
  console.log(`title: ${event.title}`);
  console.log(`slug: ${event.slug}`);
  console.log(`category: ${event.category}, subcategories: ${event.subcategories.join(', ') || '-'}`);
  console.log(`city: ${event.city?.name} (${event.city?.slug})`);
  console.log(`isActive: ${event.isActive}, isDeleted: ${event.isDeleted}`);
  console.log(`canonicalOfId: ${event.canonicalOfId ?? '-'}`);
  console.log(`override.isHidden: ${event.override?.isHidden ?? false}`);
  console.log(`offers: ${event.offers.length} (active: ${event.offers.filter((o) => o.status === 'ACTIVE').length})`);
  console.log(`sessions (активных): ${event.sessions.length}, будущих: ${futureSessions.length}`);
  if (event.sessions.length > 0) {
    console.log(
      '  первые 5:',
      event.sessions.map((s) => s.startsAt.toISOString().slice(0, 16)),
    );
  }
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

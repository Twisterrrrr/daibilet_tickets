/**
 * Скрипт: отвязать тег от всех мероприятий.
 * Использование: npx tsx scripts/unlink-tag-from-events.ts <slug>
 * Пример: npx tsx scripts/unlink-tag-from-events.ts kanatka-nn
 */
import { PrismaClient } from '@prisma/client';

const slug = process.argv[2];
if (!slug) {
  console.error('Usage: npx tsx scripts/unlink-tag-from-events.ts <slug>');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const tag = await prisma.tag.findFirst({ where: { slug } });
  if (!tag) {
    console.log(`Тег "${slug}" не найден.`);
    return;
  }
  const result = await prisma.eventTag.deleteMany({ where: { tagId: tag.id } });
  console.log(`Тег "${tag.name}" (${slug}) отвязан от ${result.count} мероприятий.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

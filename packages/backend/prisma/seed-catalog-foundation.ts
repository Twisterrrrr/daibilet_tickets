/**
 * Минимальный seed после catalog foundation (запуск вручную, когда БД приведена к новой схеме).
 *
 * Пример: npx tsx prisma/seed-catalog-foundation.ts
 */
import { PrismaClient, LocationKind, PublishStatus, SourceType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const city =
    (await prisma.city.findFirst({ where: { isActive: true } })) ??
    (await prisma.city.create({
      data: {
        slug: 'spb',
        name: 'Санкт-Петербург',
        isActive: true,
      },
    }));

  const op =
    (await prisma.operator.findFirst({ where: { isActive: true } })) ??
    (await prisma.operator.create({
      data: {
        name: 'Demo Operator',
        slug: 'demo-operator',
        isActive: true,
      },
    }));

  await prisma.location.upsert({
    where: { slug: 'demo-location-spb' },
    create: {
      slug: 'demo-location-spb',
      name: 'Демо-локация',
      kind: LocationKind.OTHER,
      cityId: city.id,
      operatorId: op.id,
      source: SourceType.MANUAL,
      publishStatus: PublishStatus.DRAFT,
      isActive: true,
    },
    update: {},
  });

  console.log('Catalog foundation seed: ok (demo Location).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

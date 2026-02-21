/**
 * Экспорт событий из БД в CSV (без API, без JWT).
 * Запуск: npx ts-node prisma/export-events-csv.ts
 */
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function escapeCsv(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  const outPath = path.join(__dirname, `../../events-${Date.now()}.csv`);
  const stream = fs.createWriteStream(outPath, { encoding: 'utf8' });

  stream.write('\uFEFF'); // BOM for Excel
  const headers = [
    'id', 'tcEventId', 'title', 'slug', 'city', 'citySlug', 'category',
    'source', 'priceFrom', 'isActive', 'address', 'lastSyncAt', 'createdAt',
  ];
  stream.write(headers.join(',') + '\n');

  let cursor: string | undefined;
  let total = 0;

  while (true) {
    const batch = await prisma.event.findMany({
      where: { isDeleted: false },
      include: { city: { select: { name: true, slug: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    for (const e of batch) {
      const row = [
        escapeCsv(e.id),
        escapeCsv(e.tcEventId),
        escapeCsv(e.title),
        escapeCsv(e.slug),
        escapeCsv((e as any).city?.name),
        escapeCsv((e as any).city?.slug),
        escapeCsv(e.category),
        escapeCsv(e.source),
        escapeCsv(e.priceFrom),
        escapeCsv(e.isActive),
        escapeCsv(e.address),
        escapeCsv(e.lastSyncAt?.toISOString?.()),
        escapeCsv(e.createdAt?.toISOString?.()),
      ];
      stream.write(row.join(',') + '\n');
      total++;
    }

    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;
    if (batch.length < 500) break;
  }

  stream.end();
  console.log(`Экспортировано ${total} событий → ${outPath}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

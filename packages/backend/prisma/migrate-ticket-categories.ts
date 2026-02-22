/**
 * Data migration: for each EventOffer without TariffCategory,
 * create base category + TicketPrice from priceFrom / compareAtPriceCents.
 *
 * Spec: docs/TicketsQuotasRefundsReporting.md
 * Run: pnpm run db:migrate:ticket-categories
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env
const envPath = [resolve(__dirname, '../.env'), resolve(__dirname, '../../.env')].find(existsSync);
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
  console.log('=== Migrate Ticket Categories: base category + price from priceFrom ===\n');

  const offers = await prisma.eventOffer.findMany({
    where: { isDeleted: false },
    include: {
      ticketCategories: { take: 1 },
      event: { select: { priceFrom: true } },
    },
  });

  const withoutCategory = offers.filter((o) => o.ticketCategories.length === 0);
  console.log(`Total offers: ${offers.length}, without TariffCategory: ${withoutCategory.length}\n`);

  let created = 0;
  let skipped = 0;

  for (const offer of withoutCategory) {
    const priceFrom = offer.priceFrom ?? (offer.event?.priceFrom as number | undefined) ?? 0;
    if (priceFrom <= 0) {
      skipped++;
      continue;
    }

    const existingBase = await prisma.tariffCategory.findFirst({
      where: { offerId: offer.id, code: 'base' },
    });
    if (existingBase) {
      skipped++;
      continue;
    }

    const category = await prisma.tariffCategory.create({
      data: {
        offerId: offer.id,
        code: 'base',
        title: 'Билет',
        kind: 'PRIMARY',
        isActive: true,
        isDefaultForCard: true,
        sortOrder: 0,
      },
    });

    await prisma.ticketPrice.create({
      data: {
        offerId: offer.id,
        categoryId: category.id,
        currency: 'RUB',
        priceCents: priceFrom,
        compareAtPriceCents: null,
        status: 'ACTIVE',
      },
    });

    created++;
    console.log(`  + ${offer.id.slice(0, 8)}... priceFrom=${priceFrom}`);
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

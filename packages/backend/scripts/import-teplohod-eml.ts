/**
 * CLI: импорт .eml писем Teplohod → ExternalOrderLink (TEPLOHOD)
 *
 * Пример:
 *   cd packages/backend
 *   npx tsx scripts/import-teplohod-eml.ts "C:\path\to\Message.eml"
 */
import 'dotenv/config';

import { readFileSync } from 'fs';

import { PrismaClient, TicketProviderCode } from '@/prisma-client';

import { parseTeplohodOrderEmailDetails } from '../src/integrations/providers/teplohod/teplohod-email.parser';

function usage(): never {
  // eslint-disable-next-line no-console
  console.error('Usage: npx tsx scripts/import-teplohod-eml.ts <path1.eml> [path2.eml] ...');
  process.exit(1);
}

async function main() {
  const paths = process.argv.slice(2).filter(Boolean);
  if (paths.length === 0) usage();

  const prisma = new PrismaClient();
  try {
    for (const p of paths) {
      const raw = readFileSync(p, 'utf-8');
      const parsed = parseTeplohodOrderEmailDetails(raw);
      if (!parsed.externalOrderId) {
        // eslint-disable-next-line no-console
        console.error(`SKIP ${p}: cannot extract externalOrderId (Номер билета)`);
        continue;
      }

      const payloadJson = {
        source: 'teplohod_eml_import',
        importedAt: new Date().toISOString(),
        customerEmail: parsed.customerEmail,
        pinCode: parsed.pinCode,
        walkTitle: parsed.walkTitle,
        date: parsed.dateRaw,
        time: parsed.timeRaw,
        eventDateTimeLocalIso: parsed.eventDateTimeLocalIso,
      };

      const row = await prisma.externalOrderLink.upsert({
        where: {
          provider_externalOrderId: {
            provider: TicketProviderCode.TEPLOHOD,
            externalOrderId: parsed.externalOrderId,
          },
        },
        create: {
          provider: TicketProviderCode.TEPLOHOD,
          externalOrderId: parsed.externalOrderId,
          payloadJson,
        },
        update: {
          payloadJson,
        },
        select: { id: true, provider: true, externalOrderId: true, createdAt: true, updatedAt: true },
      });

      // eslint-disable-next-line no-console
      console.log(
        `IMPORTED ${p} -> ${row.provider}:${row.externalOrderId} id=${row.id} updatedAt=${row.updatedAt.toISOString()}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


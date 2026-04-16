/**
 * CLI: rebuild Order mirror from CheckoutSession (best-effort, idempotent).
 *
 * Usage:
 *   cd packages/backend && node --loader ts-node/esm ./scripts/rebuild-orders-from-checkout.ts --hours 48 --limit 500
 *
 * If you have pnpm scripts, you can wire it later as `pnpm run rebuild:orders`.
 */
import 'dotenv/config';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { OrderProjectionService } from '../src/orders/order-projection.service';

function parseArgInt(argv: string[], name: string, fallback: number): number {
  const i = argv.indexOf(name);
  if (i < 0) return fallback;
  const raw = argv[i + 1];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function main() {
  const hours = Math.max(1, parseArgInt(process.argv, '--hours', 48));
  const limit = Math.max(1, Math.min(5000, parseArgInt(process.argv, '--limit', 1000)));

  const createdFrom = new Date(Date.now() - hours * 3600 * 1000);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const projection = app.get(OrderProjectionService);

    const sessions = await prisma.checkoutSession.findMany({
      where: { createdAt: { gte: createdFrom } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true },
    });

    let ok = 0;
    let failed = 0;

    for (const s of sessions) {
      try {
        await projection.reconcileByCheckoutSession(s.id);
        ok += 1;
      } catch (e) {
        failed += 1;
        // best-effort: continue
        // eslint-disable-next-line no-console
        console.warn(`reconcile failed sessionId=${s.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ hours, limit, sessions: sessions.length, ok, failed }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


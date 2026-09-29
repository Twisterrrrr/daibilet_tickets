/**
 * Dev reset for Imported Sales maturity smoke.
 *
 * Goal:
 * - remove "old" data that can interfere with partial imports
 * - keep it safe: must be explicitly confirmed and must not run in production
 *
 * Usage:
 *   cd packages/backend
 *   CONFIRM_DEV_RESET=1 pnpm exec tsx scripts/dev-reset-imported-sales.ts
 *
 * Optional:
 *   CONFIRM_DEV_RESET=1 RESET_ALL_EVENTS=1 pnpm exec tsx scripts/dev-reset-imported-sales.ts
 */
import 'dotenv/config';

import { PrismaClient } from '../src/prisma-client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function mustConfirm() {
  if (process.env.CONFIRM_DEV_RESET !== '1') {
    console.error('ABORTED: set CONFIRM_DEV_RESET=1 to run dev reset.');
    process.exit(1);
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('ABORTED: dev reset must not run in production.');
    process.exit(1);
  }
}

async function main() {
  mustConfirm();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
  const resetAllEvents = process.env.RESET_ALL_EVENTS === '1';

  console.log(
    JSON.stringify(
      {
        action: 'dev-reset-imported-sales',
        resetAllEvents,
      },
      null,
      2,
    ),
  );

  // Order matters due to FK relations.
  const deleted = {
    externalTickets: 0,
    externalOrderLinks: 0,
    providerWebhookLogs: 0,
    supplierIntegrationRuns: 0,
    supplierIntegrationIssues: 0,
    sourceCategoryUnknowns: 0,
    sourceCategoryMappings: 0,
    eventSessionProviderLinks: 0,
    eventSessions: 0,
    eventOffers: 0,
    eventProviderLinks: 0,
    eventTags: 0,
    eventSubcategoryLinks: 0,
    eventOverrides: 0,
    events: 0,
  };

  // External orders mirror
  deleted.externalTickets = (await prisma.externalTicket.deleteMany({})).count;
  deleted.externalOrderLinks = (await prisma.externalOrderLink.deleteMany({})).count;

  // Webhook logs (operational noise)
  deleted.providerWebhookLogs = (await prisma.providerWebhookLog.deleteMany({})).count;

  // Mapping inbox
  deleted.sourceCategoryUnknowns = (await prisma.sourceCategoryUnknown.deleteMany({})).count;
  deleted.sourceCategoryMappings = (await prisma.sourceCategoryMapping.deleteMany({})).count;

  // Integration telemetry (optional but usually "old noise" in dev)
  deleted.supplierIntegrationRuns = (await prisma.supplierIntegrationRun.deleteMany({})).count;
  deleted.supplierIntegrationIssues = (await prisma.supplierIntegrationIssue.deleteMany({})).count;

  // Catalog: imported events only (or all events if requested)
  const eventWhere = resetAllEvents ? {} : { source: { in: ['TC', 'TEPLOHOD'] as const } };

  deleted.eventSessionProviderLinks = (await prisma.eventSessionProviderLink.deleteMany({ where: { session: { event: eventWhere } } })).count;
  deleted.eventSessions = (await prisma.eventSession.deleteMany({ where: { event: eventWhere } })).count;
  deleted.eventOffers = (await prisma.eventOffer.deleteMany({ where: { event: eventWhere } })).count;
  deleted.eventProviderLinks = (await prisma.eventProviderLink.deleteMany({ where: { event: eventWhere } })).count;
  deleted.eventTags = (await prisma.eventTag.deleteMany({ where: { event: eventWhere } })).count;
  deleted.eventSubcategoryLinks = (await prisma.eventSubcategoryLink.deleteMany({ where: { event: eventWhere } })).count;
  deleted.eventOverrides = (await prisma.eventOverride.deleteMany({ where: { event: eventWhere } })).count;
  deleted.events = (await prisma.event.deleteMany({ where: eventWhere } as any)).count;

  console.log(JSON.stringify({ ok: true, deleted }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


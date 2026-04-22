/**
 * Foundation fixtures seed (C1/C2/C4) — modular version.
 *
 * Run (from packages/backend):
 *   npx tsx prisma/seed-foundation-fixtures.ts
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

import { createScriptPrismaClient } from '../scripts/_prisma';
import { seedFoundationFixtures } from './seeds/seed-foundation-fixtures';

dotenv.config({ path: path.join(__dirname, '../.env') });

const { prisma, pool } = createScriptPrismaClient();

async function main() {
  console.log('Seeding foundation fixtures (modular)...');
  const result = await seedFoundationFixtures(prisma);
  console.log(`Done. Registry refs: ${result.refs}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });


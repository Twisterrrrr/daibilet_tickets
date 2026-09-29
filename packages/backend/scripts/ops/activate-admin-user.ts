import { config as dotenvConfig } from 'dotenv';
import path from 'path';
import { createScriptPrismaClient } from '../_prisma';

dotenvConfig({ path: path.resolve(process.cwd(), '..', '..', '.env') });

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@daibilet.ru').trim().toLowerCase();
  if (!email) {
    throw new Error('ADMIN_EMAIL is required');
  }

  const { prisma, pool } = createScriptPrismaClient();
  try {
    const updated = await prisma.adminUser.update({
      where: { email },
      data: { isActive: true },
      select: { id: true, email: true, role: true, isActive: true },
    });
    console.log(`[activate-admin-user] OK`, updated);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[activate-admin-user] FAILED', e);
  process.exit(1);
});


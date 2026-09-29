import 'dotenv/config';
import bcrypt from 'bcrypt';

import { createScriptPrismaClient } from './_prisma';

async function main() {
  const email = (process.env.ADMIN_INITIAL_EMAIL || 'admin@daibilet.ru').toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD || 'changeme123';
  const passwordHash = await bcrypt.hash(password, 12);

  const { prisma, pool } = createScriptPrismaClient();
  await prisma.$connect();

  try {
    await prisma.adminUser.upsert({
      where: { email },
      update: { role: 'ADMIN', isActive: true },
      create: {
        email,
        passwordHash,
        name: 'Admin',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log(`[seed-admin-only] AdminUser ensured: ${email}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[seed-admin-only] Failed:', e);
  process.exit(1);
});


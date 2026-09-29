import 'dotenv/config';
import bcrypt from 'bcrypt';

import { createScriptPrismaClient } from './_prisma';

async function main() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const newPassword = process.env.ADMIN_PASSWORD || '';

  if (!email) {
    throw new Error('ADMIN_EMAIL is required');
  }
  if (!newPassword) {
    throw new Error('ADMIN_PASSWORD is required');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const { prisma, pool } = createScriptPrismaClient();
  await prisma.$connect();

  try {
    const user = await prisma.adminUser.findUnique({ where: { email } });
    if (!user) {
      throw new Error(`AdminUser not found: ${email}`);
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        refreshTokenHash: null,
      },
    });

    // Не логируем пароль/хэши — только факт операции.
    console.log(`[reset-admin-password] Password updated for: ${email}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('[reset-admin-password] Failed:', e instanceof Error ? e.message : String(e));
  process.exit(1);
});


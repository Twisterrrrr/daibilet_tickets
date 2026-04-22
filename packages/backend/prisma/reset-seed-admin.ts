/**
 * Reset-track utility: create initial AdminUser in TARGET DB.
 *
 * Usage:
 *   TARGET_DATABASE_URL=... RESET_ADMIN_EMAIL=... RESET_ADMIN_PASSWORD=... pnpm --filter @daibilet/backend db:reset:seed-admin
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';
import bcrypt from 'bcrypt';

config({ path: path.resolve(process.cwd(), '../../.env') });

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing required env: ${name}`);
  return v.trim();
}

async function main() {
  const targetUrl = mustGetEnv('TARGET_DATABASE_URL');
  const email = mustGetEnv('RESET_ADMIN_EMAIL').toLowerCase();
  const password = mustGetEnv('RESET_ADMIN_PASSWORD');
  const name = (process.env.RESET_ADMIN_NAME ?? 'Reset Admin').trim();

  const prisma = new PrismaClient({
    datasources: { db: { url: targetUrl } },
  });

  try {
    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      console.log(`AdminUser already exists: ${email}`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log(`AdminUser created: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


/**
 * Одноразовый/повторяемый dev-seed: подарочный сертификат номиналом 1 ₽ (100 коп.) для тестов корзины.
 * Публичный API покупки сертификата не даст 1 ₽ из-за нижней границы в CheckoutService.getGiftCertificateAmountBounds.
 *
 * Запуск из packages/backend:
 *   npx tsx scripts/seed-dev-gift-cert-1rub.ts
 */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

for (const p of [resolve(__dirname, '../../../.env'), resolve(__dirname, '../../.env')]) {
  if (existsSync(p)) {
    loadEnv({ path: p });
    break;
  }
}
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

/** Фиксированный код, чтобы не плодить дубликаты при повторном запуске */
const CODE = 'GC-DEV-1RUB';
const AMOUNT_KOPECKS = 100;

async function main() {
  const dup = await prisma.giftCertificate.findUnique({ where: { code: CODE } });
  if (dup) {
    console.log(`Уже есть сертификат ${CODE}, номинал ${dup.amount} коп., статус ${dup.status}`);
    return;
  }

  const sessionId = randomUUID();
  const shortCode = `CS-SEED1RUB-${Date.now().toString(36).toUpperCase()}`;

  await prisma.$transaction(async (tx) => {
    await tx.checkoutSession.create({
      data: {
        id: sessionId,
        shortCode,
        cartSnapshot: [],
        status: 'COMPLETED',
        totalPrice: AMOUNT_KOPECKS,
        completedAt: new Date(),
        customerName: 'Dev seed',
        customerEmail: 'dev-seed@local.test',
        customerPhone: '+79000000000',
        giftCertificateSnapshot: {
          amount: AMOUNT_KOPECKS,
          recipientEmail: 'dev-seed@local.test',
          senderName: 'Dev',
        },
      },
    });
    await tx.giftCertificate.create({
      data: {
        checkoutSessionId: sessionId,
        amount: AMOUNT_KOPECKS,
        code: CODE,
        recipientEmail: 'dev-seed@local.test',
        senderName: 'Dev',
        message: 'Тест 1 ₽ (scripts/seed-dev-gift-cert-1rub.ts)',
        status: 'ISSUED',
      },
    });
  });

  console.log(`Готово. Код сертификата: ${CODE} (1 ₽). Применяйте в корзине при сумме ≥ 1 ₽.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

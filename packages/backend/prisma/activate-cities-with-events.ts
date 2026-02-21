/**
 * Однократная активация городов, у которых есть события, но isActive=false.
 * Запуск: npx ts-node prisma/activate-cities-with-events.ts
 */
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.city.updateMany({
    where: {
      isActive: false,
      events: {
        some: {
          isDeleted: false,
          isActive: true,
          source: 'TC',
        },
      },
    },
    data: { isActive: true },
  });
  console.log(`Активировано городов: ${result.count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

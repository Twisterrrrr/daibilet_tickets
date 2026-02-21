/**
 * Активирует города с событиями, генерирует описания, очищает кэш.
 * Запуск: npx ts-node prisma/fix-cities-for-catalog.ts
 */
/* eslint-disable @typescript-eslint/no-require-imports */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateDescription(name: string) {
  return `Экскурсии, музеи и мероприятия в ${name}. Покупайте билеты онлайн.`;
}

async function main() {
  const activated = await prisma.city.updateMany({
    where: {
      isActive: false,
      events: { some: { isDeleted: false } },
    },
    data: { isActive: true },
  });

  const citiesWithoutDesc = await prisma.city.findMany({
    where: {
      isActive: true,
      OR: [{ description: null }, { description: '' }],
      events: { some: { isDeleted: false, isActive: true } },
    },
    select: { id: true, name: true },
  });

  for (const c of citiesWithoutDesc) {
    await prisma.city.update({
      where: { id: c.id },
      data: { description: generateDescription(c.name) },
    });
  }

  console.log(`Активировано городов: ${activated.count}`);
  console.log(`Добавлено описаний: ${citiesWithoutDesc.length}`);
  console.log('Кэш Redis нужно очистить вручную или через POST .../cache/invalidate');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

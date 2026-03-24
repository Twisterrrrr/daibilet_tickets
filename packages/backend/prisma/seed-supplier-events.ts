import { PrismaClient, EventAudience, EventCategory, EventSubcategory, ModerationStatus, OfferSource, CreatedByType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding supplier demo events (standalone script)...');

  const operator = await prisma.operator.upsert({
    where: { slug: 'test-supplier' },
    update: { isSupplier: true },
    create: {
      slug: 'test-supplier',
      name: 'Test Supplier',
      isSupplier: true,
      trustLevel: 1,
      trustScore: 40,
      trustProfileScore: 16,
      trustCatalogScore: 16,
      trustOperationsScore: 4,
      trustReputationScore: 2,
      trustStabilityScore: 2,
      trustPenaltyScore: 0,
      commissionRate: 0.25,
      promoRate: null,
      promoUntil: null,
      companyName: 'ИП Тестовый Партнёр',
      inn: '000000000000',
      contactEmail: 'partner.test@daibilet.ru',
      contactPhone: '+7 800 123-45-67',
    },
  });

  console.log(`  operatorId=${operator.id}`);

  const spbCity = await prisma.city.findUnique({ where: { slug: 'saint-petersburg' } });
  if (!spbCity) {
    console.error('❌ City saint-petersburg not found, cannot seed events');
    return;
  }

  const nightCruise = await prisma.event.upsert({
    where: { slug: 'night-cruise-neva-test' },
    update: {},
    create: {
      cityId: spbCity.id,
      source: OfferSource.MANUAL,
      tcEventId: 'seed-night-cruise',
      title: 'Ночная прогулка по рекам и каналам',
      slug: 'night-cruise-neva-test',
      description: 'Классическая ночная прогулка на развод мостов для тестового поставщика.',
      shortDescription: 'Ночная прогулка по Неве и каналам с разводом мостов.',
      category: EventCategory.EXCURSION,
      audience: EventAudience.ALL,
      subcategories: [EventSubcategory.RIVER],
      durationMinutes: 120,
      address: 'Санкт-Петербург, Дворцовая набережная',
      priceFrom: 120000,
      isActive: true,
      imageUrl: 'https://images.unsplash.com/photo-1521292270410-a8c53642e9d0?w=800',
      galleryUrls: [],
      supplierId: operator.id,
      operatorId: operator.id,
      moderationStatus: ModerationStatus.APPROVED,
      createdByType: CreatedByType.SUPPLIER,
    },
  });

  const dayCruise = await prisma.event.upsert({
    where: { slug: 'day-walking-tour-test' },
    update: {},
    create: {
      cityId: spbCity.id,
      source: OfferSource.MANUAL,
      tcEventId: 'seed-day-walking',
      title: 'Дневной круиз по Неве',
      slug: 'day-walking-tour-test',
      description: 'Дневная обзорная прогулка по Неве для тестового поставщика.',
      shortDescription: 'Дневной круиз с гидом по рекам и каналам.',
      category: EventCategory.EXCURSION,
      audience: EventAudience.ALL,
      subcategories: [EventSubcategory.RIVER],
      durationMinutes: 90,
      address: 'Санкт-Петербург, Английская набережная',
      priceFrom: 80000,
      isActive: false,
      imageUrl: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=800',
      galleryUrls: [],
      supplierId: operator.id,
      operatorId: operator.id,
      moderationStatus: ModerationStatus.PENDING_REVIEW,
      createdByType: CreatedByType.SUPPLIER,
    },
  });

  console.log('  ✓ Demo events upserted', {
    nightCruiseId: nightCruise.id,
    dayCruiseId: dayCruise.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


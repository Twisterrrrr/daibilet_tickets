/**
 * Seed: создать 5 примеров подборок (Collections).
 *
 * Запуск: npx tsx prisma/seed-collections.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Seed: Collections (Подборки) ===\n');

  // Получить города
  const spb = await prisma.city.findFirst({ where: { slug: 'saint-petersburg' } });
  const kazan = await prisma.city.findFirst({ where: { slug: 'kazan' } });

  if (!spb) {
    console.log('⚠ Город saint-petersburg не найден. Создаю подборки без привязки к городу.');
  }

  const collections = [
    {
      slug: 'nochnye-ekskursii-spb',
      title: 'Ночные экскурсии Петербурга',
      subtitle: 'Белые ночи, разводные мосты и ночные прогулки по каналам',
      cityId: spb?.id || null,
      filterTags: ['night'],
      filterCategory: 'EXCURSION',
      filterSubcategory: null,
      filterAudience: null,
      heroImage: 'https://images.unsplash.com/photo-1556610961-2fecc5927173?w=1200',
      description: `Петербург ночью — это совершенно другой город. Разводные мосты, подсвеченные дворцы, пустые набережные и волшебная атмосфера белых ночей.\n\nМы собрали лучшие ночные экскурсии: водные прогулки с видом на развод мостов, пешеходные маршруты по ночному центру и автобусные туры с панорамным обзором.`,
      metaTitle: 'Ночные экскурсии в Петербурге — билеты онлайн | Дайбилет',
      metaDescription: 'Лучшие ночные экскурсии по Санкт-Петербургу: водные прогулки, развод мостов, ночные музеи. Купить билеты онлайн на Дайбилет.',
      faq: [
        { question: 'Во сколько начинаются ночные экскурсии?', answer: 'Большинство ночных экскурсий стартуют в 23:00–01:00. Точное время зависит от сезона и расписания разводки мостов.' },
        { question: 'Подходят ли ночные экскурсии для детей?', answer: 'Некоторые экскурсии допускают детей от 6 лет в сопровождении взрослых. Рекомендуем проверить ограничения в карточке события.' },
        { question: 'Что взять с собой на ночную экскурсию?', answer: 'Тёплую одежду (даже летом на воде прохладно), заряженный телефон для фото, удобную обувь.' },
      ],
      infoBlocks: [
        { title: 'Когда лучше ехать', text: 'Сезон белых ночей (конец мая — середина июля) — лучшее время для ночных экскурсий. Разводку мостов можно увидеть с апреля по ноябрь.' },
        { title: 'Как выбрать экскурсию', text: 'Водные прогулки — для романтики и фото. Пешеходные — для истории и деталей. Автобусные — для панорамного обзора. Выбирайте по настроению!' },
      ],
      sortOrder: 1,
    },
    {
      slug: 'muzei-kazani-detyam',
      title: 'Музеи Казани для детей',
      subtitle: 'Интерактивные экспозиции и увлекательные экскурсии для всей семьи',
      cityId: kazan?.id || null,
      filterTags: [],
      filterCategory: 'MUSEUM',
      filterSubcategory: null,
      filterAudience: 'KIDS',
      heroImage: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=1200',
      description: `Казань — город с богатой историей и культурой. Мы выбрали музеи и выставки, которые будут интересны детям: интерактивные экспозиции, научные шоу и семейные мастер-классы.\n\nЛучший способ провести выходные с детьми — узнать что-то новое вместе!`,
      metaTitle: 'Музеи Казани для детей — билеты и расписание | Дайбилет',
      metaDescription: 'Интерактивные музеи и выставки Казани для детей и всей семьи. Расписание, цены, онлайн-бронирование на Дайбилет.',
      faq: [
        { question: 'С какого возраста можно в музеи?', answer: 'Большинство музеев Казани принимают детей от 3 лет. Для малышей до 3 лет вход обычно бесплатный.' },
        { question: 'Есть ли скидки для детей?', answer: 'Да, большинство музеев предлагают детские билеты (обычно 50% от взрослого) и семейные тарифы.' },
      ],
      infoBlocks: [],
      sortOrder: 2,
    },
    {
      slug: 'luchshie-muzei-rossii',
      title: 'Лучшие музеи России',
      subtitle: 'ТОП-музеи страны: от Эрмитажа до Третьяковки',
      cityId: null, // кросс-городская
      filterTags: [],
      filterCategory: 'MUSEUM',
      filterSubcategory: null,
      filterAudience: null,
      heroImage: 'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1200',
      description: `Россия — страна великих музеев. Эрмитаж, Третьяковская галерея, Русский музей, Кунсткамера — каждый из них хранит мировые шедевры.\n\nВ этой подборке — билеты и расписание лучших музеев страны. Покупайте онлайн, проходите без очереди.`,
      metaTitle: 'Лучшие музеи России — билеты онлайн, без очереди | Дайбилет',
      metaDescription: 'Купить билеты в Эрмитаж, Третьяковку, Русский музей и другие лучшие музеи России онлайн. Без очереди, электронные билеты.',
      faq: [
        { question: 'Можно ли пройти без очереди?', answer: 'Да! Электронные билеты с Дайбилет позволяют пройти через отдельный вход без очереди в кассу.' },
        { question: 'За сколько дней нужно покупать?', answer: 'В высокий сезон рекомендуем за 3–7 дней. В будние дни — можно в день посещения.' },
      ],
      infoBlocks: [
        { title: 'Совет', text: 'Планируйте 2–3 часа на большие музеи (Эрмитаж, Третьяковка). Для небольших экспозиций достаточно 1–1.5 часа.' },
      ],
      sortOrder: 3,
    },
    {
      slug: 'romanticheskiy-piter',
      title: 'Романтический Петербург',
      subtitle: 'Идеальные места для пар: прогулки, рестораны и закаты',
      cityId: spb?.id || null,
      filterTags: ['romantic'],
      filterCategory: null,
      filterSubcategory: null,
      filterAudience: null,
      heroImage: 'https://images.unsplash.com/photo-1548834925-e48f8a27ae2f?w=1200',
      description: `Петербург — один из самых романтичных городов мира. Каналы, мосты, дворцы и белые ночи создают идеальную атмосферу для свиданий.\n\nМы собрали лучшие романтические экскурсии, вечерние прогулки и места для двоих.`,
      metaTitle: 'Романтический Петербург — экскурсии для двоих | Дайбилет',
      metaDescription: 'Романтические экскурсии в Петербурге: вечерние прогулки, ужин на теплоходе, закаты на крышах. Билеты онлайн.',
      faq: [
        { question: 'Какая экскурсия самая романтичная?', answer: 'Вечерняя прогулка на теплоходе с ужином — классика. Для любителей приключений — экскурсия по крышам на закате.' },
      ],
      infoBlocks: [],
      sortOrder: 4,
    },
    {
      slug: 'zolotoe-koltso',
      title: 'Золотое кольцо: что посмотреть',
      subtitle: 'Древние города, монастыри и кремли — маршрут по сердцу России',
      cityId: null, // кросс-городская
      filterTags: [],
      filterCategory: null,
      filterSubcategory: null,
      filterAudience: null,
      additionalFilters: null,
      heroImage: 'https://images.unsplash.com/photo-1520106212299-d99c443e4568?w=1200',
      description: `Золотое кольцо — легендарный туристический маршрут по древним городам России: Владимир, Суздаль, Ярославль, Кострома, Сергиев Посад и другие.\n\nКаждый город — это кремли, монастыри, музеи и уникальная атмосфера русской провинции. Мы собрали лучшие экскурсии и билеты.`,
      metaTitle: 'Золотое кольцо России — экскурсии и билеты | Дайбилет',
      metaDescription: 'Экскурсии по городам Золотого кольца: Владимир, Суздаль, Ярославль, Кострома. Билеты в музеи и кремли онлайн.',
      faq: [
        { question: 'Сколько дней нужно на Золотое кольцо?', answer: 'Минимум 3 дня для 2–3 городов. Для полного маршрута (8 городов) — 7–10 дней.' },
        { question: 'Как добраться?', answer: 'Из Москвы на машине, поезде или автобусе. Все города Золотого кольца находятся в 2–5 часах от Москвы.' },
      ],
      infoBlocks: [
        { title: 'Маршрут', text: 'Классический маршрут: Москва → Сергиев Посад → Переславль-Залесский → Ростов → Ярославль → Кострома → Суздаль → Владимир → Москва.' },
        { title: 'Лучшее время', text: 'Лето (июнь–август) и золотая осень (сентябрь–октябрь) — идеальны для фото и прогулок. Зима — для ценителей русской зимней сказки.' },
      ],
      sortOrder: 5,
    },
  ];

  for (const data of collections) {
    const existing = await prisma.collection.findUnique({ where: { slug: data.slug } });
    if (existing) {
      console.log(`⏭ Подборка "${data.slug}" уже существует, пропускаю`);
      continue;
    }

    await prisma.collection.create({
      data: {
        slug: data.slug,
        title: data.title,
        subtitle: data.subtitle,
        cityId: data.cityId,
        filterTags: data.filterTags,
        filterCategory: data.filterCategory,
        filterSubcategory: data.filterSubcategory,
        filterAudience: data.filterAudience,
        additionalFilters: (data as any).additionalFilters ?? undefined,
        pinnedEventIds: [],
        excludedEventIds: [],
        heroImage: data.heroImage,
        description: data.description,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        faq: data.faq.length > 0 ? data.faq : undefined,
        infoBlocks: data.infoBlocks.length > 0 ? data.infoBlocks : undefined,
        isActive: true,
        sortOrder: data.sortOrder,
      },
    });

    console.log(`✅ Создана подборка: "${data.title}" (${data.slug})`);
  }

  console.log('\n=== Готово ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

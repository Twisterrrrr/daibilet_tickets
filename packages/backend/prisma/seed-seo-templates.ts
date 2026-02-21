/**
 * Seed: SeoTemplate — production-шаблоны L0/L1/L2 для excursions, museums, events.
 * Запуск: npx tsx prisma/seed-seo-templates.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEMPLATES = [
  // === EXCURSIONS ===
  {
    type: 'excursion',
    level: 0,
    priority: 0,
    titleTpl: 'Экскурсии в {{city}} — цены {{year}}, билеты онлайн',
    h1Tpl: 'Экскурсии в {{city}}',
    descriptionTpl:
      '{{count}} экскурсий в {{city}}: пешие, автобусные, водные. Онлайн-оплата, электронные билеты, мгновенное подтверждение.',
    bodyTpl: `{{type_title_plural}} в {{city_gen}} — удобный способ увидеть город без лишней подготовки.
Сейчас доступно {{count}} вариантов: от коротких прогулок до насыщенных маршрутов на несколько часов.

Как выбрать:
• Формат: пешеходная, автобусная, водная или комбинированная.
• Тематика: обзорные, исторические, авторские, ночные.
• Время и длительность: подберите удобный слот и продолжительность.

Цены: обычно от {{price_from}} до {{price_to}} ₽ (зависит от формата и программы).
Оплата онлайн, после покупки вы получите электронный билет/подтверждение. {{season_hint}}`,
  },
  {
    type: 'excursion',
    level: 1,
    priority: 0,
    titleTpl: '{{filter_title}} экскурсии в {{city}} — билеты и цены {{year}}',
    h1Tpl: '{{filter_title}} экскурсии в {{city}}',
    descriptionTpl: '{{count}} вариантов: расписание, цены от {{price_from}} ₽, онлайн-оплата и электронный билет.',
    bodyTpl: `{{filter_title}} экскурсии в {{city_gen}} — популярный формат для тех, кто хочет получить максимум впечатлений за разумное время.
В каталоге доступно {{count}} вариантов с разными темпом, маршрутом и продолжительностью.

Что обычно входит:
• Маршрут с ключевыми точками и остановками
• Работа гида (или аудиосопровождение — если указано)
• Рекомендации по времени, одежде и сезонности

Практика выбора:
• Если идёте впервые — ориентируйтесь на рейтинг и обзорный маршрут.
• Если уже были в городе — выбирайте тематические программы.
• Уточняйте место старта и длительность.

Цены: от {{price_from}} до {{price_to}} ₽. Электронное подтверждение после оплаты. {{season_hint}}`,
  },
  {
    type: 'excursion',
    level: 2,
    priority: 0,
    titleTpl: '{{filter_title}} {{filter_title2}} экскурсии в {{city}} — цены {{year}}',
    h1Tpl: '{{filter_title}} {{filter_title2}} экскурсии в {{city}}',
    descriptionTpl: '{{count}} вариантов. Подберите дату и время, оплатите онлайн и получите электронный билет.',
    bodyTpl: `Подборка: {{filter_title}} + {{filter_title2}} экскурсии в {{city_gen}}.
Это точечный формат — для тех, кто хочет конкретную тему и конкретный способ путешествия по городу.

Сейчас доступно {{count}} вариантов.
Совет: сравнивайте по времени старта, длительности и программе — это быстрее, чем ориентироваться только по цене.

Цены: от {{price_from}} до {{price_to}} ₽. После оплаты вы получите электронное подтверждение. {{season_hint}}`,
  },
  // === MUSEUMS (venues) ===
  {
    type: 'venue',
    level: 0,
    priority: 0,
    titleTpl: 'Музеи в {{city}} — билеты онлайн, цены {{year}}',
    h1Tpl: 'Музеи в {{city}}',
    descriptionTpl: '{{count}} музеев и выставок в {{city}}: расписание, цены, электронные билеты и варианты посещения.',
    bodyTpl: `Музеи в {{city_gen}} — это классический план на любой сезон и погоду.
В каталоге доступно {{count}} вариантов: от крупных государственных музеев до камерных частных коллекций.

Как выбрать:
• Тематика: искусство, история, техника, интерактив.
• Формат: входной билет, экскурсия, аудиогид, тайм-слот.
• Удобство: адрес, метро, время работы.

Цены: чаще всего от {{price_from}} до {{price_to}} ₽.
После оплаты вы получите электронный билет/подтверждение. {{season_hint}}`,
  },
  {
    type: 'venue',
    level: 1,
    priority: 0,
    titleTpl: '{{filter_title}} музеи в {{city}} — билеты и цены {{year}}',
    h1Tpl: '{{filter_title}} музеи в {{city}}',
    descriptionTpl: '{{count}} вариантов: цены от {{price_from}} ₽, электронный билет, удобный выбор даты/слота.',
    bodyTpl: `{{filter_title}} музеи в {{city_gen}} — подборка для тех, кому важна конкретная тематика и формат впечатлений.
Сейчас доступно {{count}} вариантов.

Что проверить перед покупкой:
• Нужен ли тайм-слот и есть ли ограничение по времени
• Есть ли экскурсия/аудиогид
• Правила посещения (дети, фото, льготы — если указано)

Цены: от {{price_from}} до {{price_to}} ₽. Электронный билет приходит после оплаты. {{season_hint}}`,
  },
  {
    type: 'venue',
    level: 2,
    priority: 0,
    titleTpl: '{{filter_title}} {{filter_title2}} музеи в {{city}} — цены {{year}}',
    h1Tpl: '{{filter_title}} {{filter_title2}} музеи в {{city}}',
    descriptionTpl: '{{count}} вариантов. Быстрый подбор, онлайн-оплата и электронное подтверждение.',
    bodyTpl: `Подборка: {{filter_title}} + {{filter_title2}} музеи в {{city_gen}}.
Сейчас доступно {{count}} вариантов — выбирайте по времени, стоимости и условиям входа.

Цены: от {{price_from}} до {{price_to}} ₽. После оплаты — электронный билет/подтверждение. {{season_hint}}`,
  },
  // === EVENTS ===
  {
    type: 'event',
    level: 0,
    priority: 0,
    titleTpl: 'Мероприятия в {{city}} — афиша и билеты онлайн {{year}}',
    h1Tpl: 'Мероприятия в {{city}}',
    descriptionTpl:
      '{{count}} событий в {{city}}: концерты, театр, шоу, фестивали. Билеты онлайн и электронное подтверждение.',
    bodyTpl: `Мероприятия в {{city_gen}} — это афиша на сегодня, выходные и ближайшие недели.
Сейчас доступно {{count}} событий: концерты, театр, фестивали и шоу.

Как выбрать:
• Дата и время — учитывайте вход/посадку
• Площадка — локация и формат зала
• Тип билета — танцпол/рассадка/VIP (если указано)

Цены: от {{price_from}} до {{price_to}} ₽. Онлайн-оплата и электронное подтверждение покупки. {{season_hint}}`,
  },
  {
    type: 'event',
    level: 1,
    priority: 0,
    titleTpl: '{{filter_title}} в {{city}} — билеты, афиша {{year}}',
    h1Tpl: '{{filter_title}} в {{city}}',
    descriptionTpl: '{{count}} вариантов. Выберите дату, площадку и купите билет онлайн — подтверждение сразу после оплаты.',
    bodyTpl: `{{filter_title}} в {{city_gen}} — подборка событий по жанру/типу, чтобы быстрее найти "то самое".
Сейчас доступно {{count}} вариантов.

Перед покупкой проверьте:
• дату и время начала
• площадку и формат (рассадка/танцпол)
• возрастные ограничения (если указано)

Цены: от {{price_from}} до {{price_to}} ₽. После оплаты — электронный билет/подтверждение. {{season_hint}}`,
  },
  {
    type: 'event',
    level: 2,
    priority: 0,
    titleTpl: '{{filter_title}} {{filter_title2}} в {{city}} — билеты {{year}}',
    h1Tpl: '{{filter_title}} {{filter_title2}} в {{city}}',
    descriptionTpl: '{{count}} событий. Быстрый подбор и онлайн-оплата, электронный билет после покупки.',
    bodyTpl: `Подборка: {{filter_title}} + {{filter_title2}} в {{city_gen}}.
Сейчас доступно {{count}} событий — сравните площадки, время и стоимость, чтобы выбрать оптимальный вариант.

Цены: от {{price_from}} до {{price_to}} ₽. Онлайн-оплата и электронное подтверждение. {{season_hint}}`,
  },
];

async function main() {
  console.log('Seeding SEO templates...');

  for (const t of TEMPLATES) {
    await prisma.seoTemplate.upsert({
      where: { type_level: { type: t.type, level: t.level } },
      update: {
        priority: t.priority,
        titleTpl: t.titleTpl,
        h1Tpl: t.h1Tpl,
        descriptionTpl: t.descriptionTpl,
        bodyTpl: t.bodyTpl,
      },
      create: {
        type: t.type,
        level: t.level,
        priority: t.priority,
        titleTpl: t.titleTpl,
        h1Tpl: t.h1Tpl,
        descriptionTpl: t.descriptionTpl,
        bodyTpl: t.bodyTpl,
      },
    });
  }

  console.log(`  ✓ ${TEMPLATES.length} SEO templates`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

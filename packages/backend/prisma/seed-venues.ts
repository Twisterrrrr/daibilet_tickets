/**
 * Seed: ТОП-музеи и арт-пространства для всех городов.
 *
 * Правила:
 *  - Идемпотентность: upsert по slug (update если есть, create если нет)
 *  - Slug генерируется из shortTitle или title (транслитерация)
 *  - Не создаёт Event — только Venue
 *  - Реальные данные: адреса, координаты, часы работы, цены
 *
 * Запуск: npx tsx prisma/seed-venues.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Types ────────────────────────────────────────
interface VenueSeed {
  slug: string;
  title: string;
  shortTitle?: string;
  venueType: string;
  description: string;
  shortDescription: string;
  address: string;
  lat: number;
  lng: number;
  metro?: string;
  district?: string;
  phone?: string;
  website?: string;
  priceFrom?: number; // копейки
  openingHours?: Record<string, string | null>;
  citySlug: string;
  // Conversion fields
  highlights?: string[];
  features?: string[];
  faq?: Array<{ q: string; a: string }>;
}

// ─── Slug Generator ───────────────────────────────
const TRANSLIT: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
};

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((c) => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// ════════════════════════════════════════════════════
// ДАННЫЕ
// ════════════════════════════════════════════════════

const VENUES: VenueSeed[] = [
  // ═══════════ САНКТ-ПЕТЕРБУРГ (14) ═══════════
  {
    slug: 'ermitazh',
    title: 'Государственный Эрмитаж',
    shortTitle: 'Эрмитаж',
    venueType: 'MUSEUM',
    description: 'Один из крупнейших и старейших художественных музеев мира. Коллекция насчитывает около 3 миллионов экспонатов — от древности до наших дней. Главный музейный комплекс расположен в Зимнем дворце на Дворцовой набережной.',
    shortDescription: 'Крупнейший художественный музей мира в Зимнем дворце',
    address: 'Дворцовая наб., 34, Санкт-Петербург',
    lat: 59.9398,
    lng: 30.3146,
    metro: 'Адмиралтейская',
    district: 'Центральный',
    phone: '+7 (812) 710-90-79',
    website: 'https://hermitagemuseum.org',
    priceFrom: 50000,
    openingHours: { mon: null, tue: '10:30–18:00', wed: '10:30–21:00', thu: '10:30–18:00', fri: '10:30–21:00', sat: '10:30–18:00', sun: '10:30–18:00' },
    citySlug: 'saint-petersburg',
    highlights: [
      '3 миллиона экспонатов',
      'Зимний дворец — объект ЮНЕСКО',
      'Импрессионисты, Рембрандт, Леонардо да Винчи',
      'Рыцарский зал, Египетский зал, Малахитовая гостиная',
      'Входит в топ-5 музеев мира',
    ],
    features: ['no_queue', 'audio_guide', 'kids_friendly', 'wheelchair', 'cafe', 'gift_shop'],
    faq: [
      { q: 'Можно ли вернуть билет?', a: 'Да, возврат возможен не позднее чем за 2 часа до визита.' },
      { q: 'Есть ли льготные билеты?', a: 'Бесплатно для детей до 14 лет, студентов РФ. Первый четверг месяца — бесплатный вход.' },
      { q: 'Можно ли без очереди?', a: 'Да, при покупке электронного билета проход через отдельный вход без очереди.' },
      { q: 'Сколько времени нужно на осмотр?', a: 'Минимум 2–3 часа для основных залов, полный обход — 4–5 часов.' },
    ],
  },
  {
    slug: 'generalnyj-shtab',
    title: 'Главный штаб (Эрмитаж)',
    shortTitle: 'Генштаб',
    venueType: 'MUSEUM',
    description: 'Восточное крыло Главного штаба — филиал Эрмитажа, посвящённый искусству XIX–XX веков. Коллекции импрессионистов и постимпрессионистов — Моне, Ренуар, Пикассо, Матисс, Гоген.',
    shortDescription: 'Импрессионисты и авангард в здании Генштаба',
    address: 'Дворцовая пл., 6–8, Санкт-Петербург',
    lat: 59.9389,
    lng: 30.3180,
    metro: 'Адмиралтейская',
    district: 'Центральный',
    website: 'https://hermitagemuseum.org',
    priceFrom: 50000,
    openingHours: { mon: null, tue: '10:30–18:00', wed: '10:30–21:00', thu: '10:30–18:00', fri: '10:30–21:00', sat: '10:30–18:00', sun: '10:30–18:00' },
    citySlug: 'saint-petersburg',
    features: ['no_queue', 'audio_guide', 'wheelchair'],
  },
  {
    slug: 'russkij-muzej',
    title: 'Государственный Русский музей (Михайловский дворец)',
    shortTitle: 'Русский музей',
    venueType: 'MUSEUM',
    description: 'Крупнейшее в мире собрание русского искусства. Основная экспозиция в Михайловском дворце. Коллекция включает свыше 400 000 экспонатов — от икон XII века до современного искусства.',
    shortDescription: 'Крупнейшая коллекция русского искусства в Михайловском дворце',
    address: 'ул. Инженерная, 4, Санкт-Петербург',
    lat: 59.9387,
    lng: 30.3322,
    metro: 'Невский проспект',
    district: 'Центральный',
    phone: '+7 (812) 595-42-48',
    website: 'https://rusmuseum.ru',
    priceFrom: 40000,
    openingHours: { mon: '10:00–18:00', tue: null, wed: '10:00–18:00', thu: '13:00–21:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'saint-petersburg',
    highlights: [
      '400 000+ произведений русского искусства',
      'Иконы XII века, Айвазовский, Репин, Малевич',
      'Михайловский дворец — шедевр Росси',
      'Летний сад и Михайловский сад рядом',
    ],
    features: ['audio_guide', 'kids_friendly', 'wheelchair', 'gift_shop'],
    faq: [
      { q: 'Чем отличается от Эрмитажа?', a: 'Русский музей — это исключительно русское искусство, а Эрмитаж — мировое.' },
      { q: 'Какие филиалы входят?', a: 'Михайловский дворец, Корпус Бенуа, Строгановский дворец, Мраморный дворец, Михайловский замок.' },
    ],
  },
  {
    slug: 'muzej-faberze',
    title: 'Музей Фаберже',
    venueType: 'MUSEUM',
    description: 'Частный музей во дворце Нарышкиных-Шуваловых на набережной Фонтанки. Главная коллекция — 9 императорских пасхальных яиц Фаберже и другие произведения декоративно-прикладного искусства.',
    shortDescription: 'Императорские яйца Фаберже в дворце Шуваловых',
    address: 'наб. реки Фонтанки, 21, Санкт-Петербург',
    lat: 59.9358,
    lng: 30.3433,
    metro: 'Гостиный двор',
    district: 'Центральный',
    phone: '+7 (812) 333-26-55',
    website: 'https://fabergemuseum.ru',
    priceFrom: 50000,
    openingHours: { mon: '10:00–20:45', tue: '10:00–20:45', wed: '10:00–20:45', thu: '10:00–20:45', fri: '10:00–20:45', sat: '10:00–20:45', sun: '10:00–20:45' },
    citySlug: 'saint-petersburg',
    features: ['no_queue', 'audio_guide', 'gift_shop'],
  },
  {
    slug: 'kunstkamera',
    title: 'Кунсткамера (Музей антропологии и этнографии)',
    shortTitle: 'Кунсткамера',
    venueType: 'MUSEUM',
    description: 'Первый музей России, основанный Петром I в 1714 году. Расположен на Университетской набережной Васильевского острова. Этнографические коллекции и знаменитая анатомическая коллекция.',
    shortDescription: 'Первый музей России, основанный Петром I',
    address: 'Университетская наб., 3, Санкт-Петербург',
    lat: 59.9415,
    lng: 30.3045,
    metro: 'Адмиралтейская',
    district: 'Василеостровский',
    phone: '+7 (812) 328-14-12',
    website: 'https://kunstkamera.ru',
    priceFrom: 40000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'saint-petersburg',
    features: ['audio_guide', 'kids_friendly'],
  },
  {
    slug: 'erarta',
    title: 'Музей современного искусства Эрарта',
    shortTitle: 'Эрарта',
    venueType: 'ART_SPACE',
    description: 'Крупнейший частный музей современного искусства в России. Более 2800 произведений в постоянной коллекции и регулярные временные выставки. Расположен на Васильевском острове.',
    shortDescription: 'Крупнейший частный музей современного искусства',
    address: '29-я линия В.О., 2, Санкт-Петербург',
    lat: 59.9322,
    lng: 30.2520,
    metro: 'Василеостровская',
    district: 'Василеостровский',
    phone: '+7 (812) 324-08-09',
    website: 'https://erarta.com',
    priceFrom: 100000,
    openingHours: { mon: null, tue: null, wed: '10:00–22:00', thu: '10:00–22:00', fri: '10:00–22:00', sat: '10:00–22:00', sun: '10:00–22:00' },
    citySlug: 'saint-petersburg',
    features: ['audio_guide', 'cafe', 'gift_shop'],
  },
  {
    slug: 'muzej-strit-arta',
    title: 'Музей стрит-арта',
    venueType: 'ART_SPACE',
    description: 'Единственный в России музей уличного искусства, расположенный на территории действующего завода. Масштабные муралы, инсталляции и выставки уличных художников со всего мира.',
    shortDescription: 'Единственный музей уличного искусства в России',
    address: 'шоссе Революции, 84, Санкт-Петербург',
    lat: 59.9584,
    lng: 30.4312,
    metro: 'Площадь Ленина',
    district: 'Красногвардейский',
    website: 'https://streetartmuseum.ru',
    priceFrom: 50000,
    openingHours: { mon: null, tue: null, wed: null, thu: null, fri: null, sat: '12:00–20:00', sun: '12:00–20:00' },
    citySlug: 'saint-petersburg',
    features: ['photo_allowed'],
  },
  {
    slug: 'planetarij-1',
    title: 'Планетарий №1',
    venueType: 'MUSEUM',
    description: 'Самый большой планетарий в мире, расположенный в здании бывшего газгольдера. Купол диаметром 37 метров, полнокупольные шоу, космические экспозиции и интерактивные программы.',
    shortDescription: 'Самый большой планетарий в мире',
    address: 'наб. Обводного канала, 74, лит. Ц, Санкт-Петербург',
    lat: 59.9117,
    lng: 30.3299,
    metro: 'Обводный канал',
    district: 'Адмиралтейский',
    phone: '+7 (812) 407-19-17',
    website: 'https://planetarium.one',
    priceFrom: 60000,
    openingHours: { mon: '10:00–22:00', tue: '10:00–22:00', wed: '10:00–22:00', thu: '10:00–22:00', fri: '10:00–22:00', sat: '10:00–22:00', sun: '10:00–22:00' },
    citySlug: 'saint-petersburg',
    features: ['kids_friendly', 'wheelchair', 'cafe'],
  },
  {
    slug: 'petropavlovskaya-krepost',
    title: 'Петропавловская крепость',
    shortTitle: 'Петропавловка',
    venueType: 'MUSEUM',
    description: 'Историческое ядро Санкт-Петербурга на Заячьем острове. Петропавловский собор — усыпальница императоров, музей истории города, тюрьма Трубецкого бастиона, пляж и потрясающие виды на Неву.',
    shortDescription: 'Историческое ядро Петербурга на Заячьем острове',
    address: 'Петропавловская крепость, 3, Санкт-Петербург',
    lat: 59.9500,
    lng: 30.3167,
    metro: 'Горьковская',
    district: 'Петроградский',
    phone: '+7 (812) 230-64-31',
    website: 'https://spbmuseum.ru',
    priceFrom: 35000,
    openingHours: { mon: '10:00–18:00', tue: '10:00–18:00', wed: null, thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'saint-petersburg',
    features: ['kids_friendly', 'photo_allowed'],
  },
  {
    slug: 'muzej-blokady',
    title: 'Музей обороны и блокады Ленинграда',
    shortTitle: 'Музей блокады',
    venueType: 'MUSEUM',
    description: 'Музей, посвящённый обороне и блокаде Ленинграда в 1941–1944 годах. Документы, личные вещи, фотографии, дневники и предметы быта блокадников. Один из важнейших мемориальных музеев России.',
    shortDescription: 'Память о 900 днях блокады Ленинграда',
    address: 'Соляной пер., 9, Санкт-Петербург',
    lat: 59.9449,
    lng: 30.3412,
    metro: 'Чернышевская',
    district: 'Центральный',
    phone: '+7 (812) 275-72-08',
    website: 'https://blokadamus.ru',
    priceFrom: 30000,
    openingHours: { mon: null, tue: null, wed: '10:00–18:00', thu: '12:00–20:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'saint-petersburg',
    features: ['audio_guide'],
  },
  {
    slug: 'muzej-zheleznykh-dorog',
    title: 'Музей железных дорог России',
    shortTitle: 'Музей ж/д',
    venueType: 'MUSEUM',
    description: 'Один из крупнейших железнодорожных музеев мира. Более 100 единиц подвижного состава, интерактивные экспозиции, макеты, симуляторы. Расположен в двух зданиях рядом с Балтийским вокзалом.',
    shortDescription: 'Крупнейший ж/д музей: паровозы, симуляторы, макеты',
    address: 'наб. Обводного канала, 114, Санкт-Петербург',
    lat: 59.9073,
    lng: 30.2960,
    metro: 'Балтийская',
    district: 'Адмиралтейский',
    phone: '+7 (812) 457-23-16',
    website: 'https://rzd-museum.ru',
    priceFrom: 40000,
    openingHours: { mon: null, tue: null, wed: '10:00–18:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'saint-petersburg',
    features: ['kids_friendly', 'wheelchair', 'cafe', 'gift_shop'],
  },
  {
    slug: 'isaakievskij-sobor',
    title: 'Исаакиевский собор',
    venueType: 'MUSEUM',
    description: 'Крупнейший православный собор Санкт-Петербурга и одно из высочайших купольных сооружений мира. Действует как музей-памятник. Колоннада — одна из лучших смотровых площадок города.',
    shortDescription: 'Монументальный собор и лучшая смотровая площадка',
    address: 'Исаакиевская пл., 4, Санкт-Петербург',
    lat: 59.9338,
    lng: 30.3061,
    metro: 'Адмиралтейская',
    district: 'Центральный',
    phone: '+7 (812) 315-97-32',
    website: 'https://cathedral.ru',
    priceFrom: 40000,
    openingHours: { mon: '10:00–18:00', tue: '10:00–18:00', wed: null, thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'saint-petersburg',
    features: ['audio_guide', 'photo_allowed'],
  },
  {
    slug: 'spas-na-krovi',
    title: 'Храм Спаса на Крови',
    venueType: 'MUSEUM',
    description: 'Один из самых красивых храмов России, построенный на месте смертельного ранения Александра II. Потрясающий мозаичный интерьер общей площадью более 7000 кв. м.',
    shortDescription: 'Шедевр мозаичного искусства на канале Грибоедова',
    address: 'наб. канала Грибоедова, 2Б, Санкт-Петербург',
    lat: 59.9400,
    lng: 30.3286,
    metro: 'Невский проспект',
    district: 'Центральный',
    phone: '+7 (812) 315-16-36',
    website: 'https://cathedral.ru',
    priceFrom: 40000,
    openingHours: { mon: '10:00–18:00', tue: '10:00–18:00', wed: null, thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'saint-petersburg',
    features: ['audio_guide', 'photo_allowed'],
  },

  // ═══════════ МОСКВА (11) ═══════════
  {
    slug: 'tretyakovskaya-galereya',
    title: 'Государственная Третьяковская галерея',
    shortTitle: 'Третьяковка',
    venueType: 'GALLERY',
    description: 'Национальный музей русского изобразительного искусства X–XXI веков. Основная экспозиция в Лаврушинском переулке: иконы, живопись, скульптура — от Рублёва до Врубеля.',
    shortDescription: 'Главное собрание русского искусства',
    address: 'Лаврушинский пер., 10, Москва',
    lat: 55.7415,
    lng: 37.6208,
    metro: 'Третьяковская',
    district: 'Замоскворечье',
    phone: '+7 (495) 957-07-27',
    website: 'https://tretyakovgallery.ru',
    priceFrom: 50000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–21:00', fri: '10:00–21:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'moscow',
    highlights: [
      'Иконы Рублёва, «Троица»',
      'Картины Айвазовского, Репина, Шишкина',
      'Более 190 000 произведений',
      'В самом центре Москвы',
      'Интерактивный аудиогид',
    ],
    features: ['no_queue', 'audio_guide', 'kids_friendly', 'wheelchair', 'gift_shop'],
    faq: [
      { q: 'Чем отличается от Новой Третьяковки?', a: 'Основная Третьяковка — классическое русское искусство (иконы, XIX век). Новая — XX–XXI век (авангард, соцреализм, современность).' },
      { q: 'Можно ли с детьми?', a: 'Да, есть специальные программы для детей. До 18 лет вход бесплатный.' },
    ],
  },
  {
    slug: 'novaya-tretyakovka',
    title: 'Новая Третьяковка',
    venueType: 'GALLERY',
    description: 'Филиал Третьяковской галереи на Крымском Валу. Искусство XX–XXI веков: авангард, соцреализм, нонконформизм, современное искусство. Масштабные временные выставки.',
    shortDescription: 'Русское искусство XX–XXI веков на Крымском Валу',
    address: 'ул. Крымский Вал, 10, Москва',
    lat: 55.7352,
    lng: 37.6056,
    metro: 'Октябрьская',
    district: 'Якиманка',
    phone: '+7 (495) 957-07-27',
    website: 'https://tretyakovgallery.ru',
    priceFrom: 50000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–21:00', fri: '10:00–21:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'moscow',
    features: ['audio_guide', 'wheelchair', 'cafe'],
  },
  {
    slug: 'pushkinskij-muzej',
    title: 'ГМИИ им. А.С. Пушкина',
    shortTitle: 'Пушкинский музей',
    venueType: 'MUSEUM',
    description: 'Один из крупнейших российских музеев зарубежного искусства. Египетские древности, античная скульптура, средневековое искусство, живопись старых мастеров, импрессионисты.',
    shortDescription: 'Мировое искусство от античности до XX века',
    address: 'ул. Волхонка, 12, Москва',
    lat: 55.7473,
    lng: 37.6052,
    metro: 'Кропоткинская',
    district: 'Хамовники',
    phone: '+7 (495) 697-95-78',
    website: 'https://pushkinmuseum.art',
    priceFrom: 50000,
    openingHours: { mon: null, tue: '11:00–20:00', wed: '11:00–20:00', thu: '11:00–21:00', fri: '11:00–21:00', sat: '11:00–20:00', sun: '11:00–20:00' },
    citySlug: 'moscow',
    features: ['no_queue', 'audio_guide', 'wheelchair', 'cafe', 'gift_shop'],
  },
  {
    slug: 'garazh',
    title: 'Музей современного искусства «Гараж»',
    shortTitle: 'Гараж',
    venueType: 'ART_SPACE',
    description: 'Один из важнейших центров современной культуры в Москве, расположенный в Парке Горького. Выставки, образовательные программы, архив, книжный магазин.',
    shortDescription: 'Современное искусство в Парке Горького',
    address: 'ул. Крымский Вал, 9, стр. 32, Москва',
    lat: 55.7312,
    lng: 37.6040,
    metro: 'Октябрьская',
    district: 'Якиманка',
    phone: '+7 (495) 645-05-20',
    website: 'https://garagemca.org',
    priceFrom: 50000,
    openingHours: { mon: '11:00–22:00', tue: '11:00–22:00', wed: '11:00–22:00', thu: '11:00–22:00', fri: '11:00–22:00', sat: '11:00–22:00', sun: '11:00–22:00' },
    citySlug: 'moscow',
    features: ['wheelchair', 'cafe', 'gift_shop'],
  },
  {
    slug: 'multimedia-art-muzej',
    title: 'Мультимедиа Арт Музей (МАММ)',
    shortTitle: 'МАММ',
    venueType: 'ART_SPACE',
    description: 'Музей, посвящённый фотографии, мультимедийному и современному искусству. Расположен на Остоженке. Регулярные выставки российских и международных художников.',
    shortDescription: 'Фотография и мультимедийное искусство на Остоженке',
    address: 'ул. Остоженка, 16, Москва',
    lat: 55.7425,
    lng: 37.5958,
    metro: 'Кропоткинская',
    district: 'Хамовники',
    phone: '+7 (495) 637-11-00',
    website: 'https://mamm-mdf.ru',
    priceFrom: 50000,
    openingHours: { mon: null, tue: '12:00–21:00', wed: '12:00–21:00', thu: '12:00–21:00', fri: '12:00–21:00', sat: '12:00–21:00', sun: '12:00–21:00' },
    citySlug: 'moscow',
    features: ['wheelchair', 'photo_allowed'],
  },
  {
    slug: 'moskovskij-planetarij',
    title: 'Московский планетарий',
    shortTitle: 'Планетарий',
    venueType: 'MUSEUM',
    description: 'Один из старейших планетариев мира, открытый в 1929 году. Большой звёздный зал, интерактивный музей «Лунариум», обсерватория и кинотеатр 4D.',
    shortDescription: 'Старейший планетарий России с 1929 года',
    address: 'ул. Садовая-Кудринская, 5, стр. 1, Москва',
    lat: 55.7617,
    lng: 37.5839,
    metro: 'Баррикадная',
    district: 'Пресненский',
    phone: '+7 (495) 221-76-90',
    website: 'https://planetarium-moscow.ru',
    priceFrom: 60000,
    openingHours: { mon: null, tue: null, wed: '10:00–21:00', thu: '10:00–21:00', fri: '10:00–21:00', sat: '10:00–21:00', sun: '10:00–21:00' },
    citySlug: 'moscow',
    features: ['kids_friendly', 'wheelchair', 'cafe', 'gift_shop'],
  },
  {
    slug: 'muzej-kosmonavtiki',
    title: 'Музей космонавтики',
    venueType: 'MUSEUM',
    description: 'Один из крупнейших научно-технических музеев мира. Расположен в цоколе монумента «Покорителям космоса» на ВДНХ. Космические аппараты, скафандры, тренажёры.',
    shortDescription: 'История освоения космоса у монумента на ВДНХ',
    address: 'просп. Мира, 111, Москва',
    lat: 55.8229,
    lng: 37.6397,
    metro: 'ВДНХ',
    district: 'Останкинский',
    phone: '+7 (495) 683-79-14',
    website: 'https://kosmo-museum.ru',
    priceFrom: 35000,
    openingHours: { mon: null, tue: '10:00–19:00', wed: '10:00–19:00', thu: '10:00–21:00', fri: '10:00–19:00', sat: '10:00–21:00', sun: '10:00–19:00' },
    citySlug: 'moscow',
    features: ['kids_friendly', 'wheelchair', 'audio_guide', 'cafe', 'gift_shop'],
  },
  {
    slug: 'istoricheskij-muzej',
    title: 'Государственный исторический музей',
    shortTitle: 'Исторический музей',
    venueType: 'MUSEUM',
    description: 'Крупнейший национальный исторический музей России, расположенный на Красной площади. Коллекция: от палеолита до XX века, более 5 миллионов предметов.',
    shortDescription: 'История России от палеолита на Красной площади',
    address: 'Красная пл., 1, Москва',
    lat: 55.7553,
    lng: 37.6178,
    metro: 'Охотный Ряд',
    district: 'Тверской',
    phone: '+7 (495) 692-37-31',
    website: 'https://shm.ru',
    priceFrom: 50000,
    openingHours: { mon: '10:00–18:00', tue: '10:00–18:00', wed: '10:00–21:00', thu: '10:00–18:00', fri: '10:00–21:00', sat: '10:00–21:00', sun: '10:00–18:00' },
    citySlug: 'moscow',
    features: ['audio_guide', 'wheelchair', 'gift_shop'],
  },
  {
    slug: 'moskovskij-kreml',
    title: 'Музеи Московского Кремля',
    shortTitle: 'Кремль',
    venueType: 'MUSEUM',
    description: 'Государственный историко-культурный музей-заповедник. Оружейная палата, Алмазный фонд, Успенский собор, колокольня Ивана Великого и другие музеи на территории Кремля.',
    shortDescription: 'Оружейная палата, Алмазный фонд, соборы Кремля',
    address: 'Московский Кремль, Москва',
    lat: 55.7520,
    lng: 37.6175,
    metro: 'Библиотека им. Ленина',
    district: 'Тверской',
    phone: '+7 (495) 697-03-49',
    website: 'https://kreml.ru',
    priceFrom: 50000,
    openingHours: { mon: '10:00–17:00', tue: '10:00–17:00', wed: '10:00–17:00', thu: null, fri: '10:00–17:00', sat: '10:00–17:00', sun: '10:00–17:00' },
    citySlug: 'moscow',
    features: ['audio_guide', 'guided_tour'],
  },
  {
    slug: 'ges-2',
    title: 'Дом культуры «ГЭС-2»',
    shortTitle: 'ГЭС-2',
    venueType: 'ART_SPACE',
    description: 'Культурный центр фонда V-A-C в здании бывшей электростанции на Болотной набережной. Выставки, перформансы, кинопоказы, лекции. Архитектор реконструкции — Ренцо Пьяно.',
    shortDescription: 'Арт-центр в бывшей электростанции от Ренцо Пьяно',
    address: 'Болотная наб., 15, Москва',
    lat: 55.7420,
    lng: 37.6100,
    metro: 'Кропоткинская',
    district: 'Якиманка',
    phone: '+7 (495) 990-00-00',
    website: 'https://ges-2.org',
    priceFrom: 0,
    openingHours: { mon: null, tue: '12:00–22:00', wed: '12:00–22:00', thu: '12:00–22:00', fri: '12:00–22:00', sat: '12:00–22:00', sun: '12:00–22:00' },
    citySlug: 'moscow',
    features: ['wheelchair', 'cafe', 'gift_shop', 'photo_allowed'],
  },

  // ═══════════ КАЗАНЬ (5) ═══════════
  {
    slug: 'kazanskij-kreml',
    title: 'Казанский Кремль',
    shortTitle: 'Кремль',
    venueType: 'MUSEUM',
    description: 'Древняя крепость и объект ЮНЕСКО. На территории: мечеть Кул-Шариф, Благовещенский собор, башня Сююмбике, музеи. Символ слияния восточной и западной культур.',
    shortDescription: 'Объект ЮНЕСКО — мечеть Кул-Шариф и башня Сююмбике',
    address: 'Кремль, Казань',
    lat: 55.7989,
    lng: 49.1057,
    metro: 'Кремлёвская',
    district: 'Вахитовский',
    phone: '+7 (843) 567-80-01',
    website: 'https://kazan-kremlin.ru',
    priceFrom: 0,
    openingHours: { mon: '08:00–18:00', tue: '08:00–18:00', wed: '08:00–18:00', thu: '08:00–18:00', fri: '08:00–18:00', sat: '08:00–18:00', sun: '08:00–18:00' },
    citySlug: 'kazan',
    highlights: [
      'Объект Всемирного наследия ЮНЕСКО',
      'Мечеть Кул-Шариф — символ Казани',
      'Башня Сююмбике — «падающая» башня',
      'Бесплатный вход на территорию',
    ],
    features: ['kids_friendly', 'wheelchair', 'audio_guide', 'photo_allowed', 'gift_shop'],
    faq: [
      { q: 'Вход платный?', a: 'Вход на территорию Кремля бесплатный. Платные — отдельные музеи и выставки внутри.' },
      { q: 'Можно ли зайти в мечеть?', a: 'Да, Кул-Шариф открыта для посещения. Соблюдайте дресс-код: закрытые плечи и колени.' },
    ],
  },
  {
    slug: 'muzej-islamskoj-kultury',
    title: 'Музей исламской культуры',
    venueType: 'MUSEUM',
    description: 'Расположен в цокольном этаже мечети Кул-Шариф. Экспозиции о роли ислама в истории Поволжья, коллекция Коранов, каллиграфия, предметы быта мусульман.',
    shortDescription: 'История ислама в Поволжье в мечети Кул-Шариф',
    address: 'Казанский Кремль, Казань',
    lat: 55.7985,
    lng: 49.1048,
    metro: 'Кремлёвская',
    district: 'Вахитовский',
    website: 'https://kazan-kremlin.ru',
    priceFrom: 20000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'kazan',
    features: ['audio_guide'],
  },
  {
    slug: 'natsionalnyj-muzej-rt',
    title: 'Национальный музей Республики Татарстан',
    shortTitle: 'Национальный музей РТ',
    venueType: 'MUSEUM',
    description: 'Старейший и крупнейший музей Татарстана. Коллекции по истории, археологии, этнографии края — от булгарского периода до наших дней. Более 800 000 экспонатов.',
    shortDescription: 'История Татарстана от булгар до наших дней',
    address: 'ул. Кремлёвская, 2, Казань',
    lat: 55.7958,
    lng: 49.1096,
    metro: 'Кремлёвская',
    district: 'Вахитовский',
    phone: '+7 (843) 292-89-84',
    website: 'https://tatmuseum.ru',
    priceFrom: 25000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–20:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'kazan',
    features: ['audio_guide', 'kids_friendly'],
  },
  {
    slug: 'galereya-sovremennogo-iskusstva-kazan',
    title: 'Галерея современного искусства ГМИИ РТ',
    shortTitle: 'Галерея современного искусства',
    venueType: 'GALLERY',
    description: 'Филиал Государственного музея изобразительных искусств РТ, посвящённый современному искусству. Выставки российских и международных художников в современном пространстве.',
    shortDescription: 'Современное искусство Татарстана и мира',
    address: 'ул. Карла Маркса, 57, Казань',
    lat: 55.7928,
    lng: 49.1230,
    district: 'Вахитовский',
    website: 'https://izo-museum.ru',
    priceFrom: 20000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–20:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'kazan',
    features: ['photo_allowed'],
  },
  {
    slug: 'muzej-chak-chaka',
    title: 'Музей Чак-Чака',
    venueType: 'MUSEUM',
    description: 'Интерактивный музей, посвящённый главному татарскому лакомству. Экскурсии с дегустацией, мастер-классы по приготовлению чак-чака, история татарской кухни в уютной обстановке.',
    shortDescription: 'Интерактивный музей татарского лакомства',
    address: 'ул. Парижской коммуны, 18, Казань',
    lat: 55.7893,
    lng: 49.1152,
    district: 'Вахитовский',
    phone: '+7 (843) 239-40-39',
    website: 'https://muzey-chak-chaka.ru',
    priceFrom: 45000,
    openingHours: { mon: '10:00–20:00', tue: '10:00–20:00', wed: '10:00–20:00', thu: '10:00–20:00', fri: '10:00–20:00', sat: '10:00–20:00', sun: '10:00–20:00' },
    citySlug: 'kazan',
    features: ['kids_friendly', 'guided_tour'],
  },

  // ═══════════ КАЛИНИНГРАД (4) ═══════════
  {
    slug: 'muzej-mirovogo-okeana',
    title: 'Музей Мирового океана',
    venueType: 'MUSEUM',
    description: 'Единственный в России комплексный маринистический музей. Подводная лодка Б-413, научно-исследовательское судно «Витязь», экспозиции по океанологии, морской геологии и экологии.',
    shortDescription: 'Подводная лодка, корабли и тайны океана',
    address: 'наб. Петра Великого, 1, Калининград',
    lat: 54.7064,
    lng: 20.5001,
    district: 'Центральный',
    phone: '+7 (4012) 34-02-44',
    website: 'https://world-ocean.ru',
    priceFrom: 30000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'kaliningrad',
    highlights: [
      'Подводная лодка Б-413 — можно зайти внутрь',
      'Судно «Витязь» — легенда океанологии',
      'Аквариумы с морскими обитателями',
      'Экспозиция «Глубина»',
    ],
    features: ['kids_friendly', 'wheelchair', 'cafe', 'gift_shop'],
  },
  {
    slug: 'muzej-yantarya',
    title: 'Музей янтаря',
    venueType: 'MUSEUM',
    description: 'Расположен в фортификационной башне Дона у озера Верхнего. Единственный в России музей одного минерала. Коллекция янтаря от древних включений до современных ювелирных шедевров.',
    shortDescription: 'Единственный музей янтаря в крепостной башне',
    address: 'пл. Маршала Василевского, 1, Калининград',
    lat: 54.7227,
    lng: 20.5106,
    district: 'Центральный',
    phone: '+7 (4012) 46-68-88',
    website: 'https://ambermuseum.ru',
    priceFrom: 35000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'kaliningrad',
    features: ['audio_guide', 'kids_friendly', 'gift_shop'],
  },
  {
    slug: 'kafedralnyj-sobor-kaliningrad',
    title: 'Кафедральный собор (Остров Канта)',
    shortTitle: 'Кафедральный собор',
    venueType: 'MUSEUM',
    description: 'Готический собор XIV века на острове Канта (Кнайпхоф). Могила Иммануила Канта, музей собора, органный зал с регулярными концертами. Символ Калининграда.',
    shortDescription: 'Готический собор XIV века и могила Иммануила Канта',
    address: 'ул. Канта, 1, Калининград',
    lat: 54.7068,
    lng: 20.5116,
    district: 'Центральный',
    phone: '+7 (4012) 63-17-05',
    website: 'https://sobor-kaliningrad.ru',
    priceFrom: 30000,
    openingHours: { mon: '10:00–18:00', tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'kaliningrad',
    features: ['audio_guide', 'photo_allowed'],
  },
  {
    slug: 'fridlandskie-vorota',
    title: 'Музей «Фридландские ворота»',
    shortTitle: 'Фридландские ворота',
    venueType: 'MUSEUM',
    description: 'Музей в одних из сохранившихся городских ворот Кёнигсберга. Экспозиции об истории города, его жителях и повседневной жизни. Мультимедийная «прогулка по улицам старого Кёнигсберга».',
    shortDescription: 'Виртуальная прогулка по старому Кёнигсбергу',
    address: 'ул. Дзержинского, 30, Калининград',
    lat: 54.7010,
    lng: 20.5231,
    district: 'Центральный',
    phone: '+7 (4012) 64-40-20',
    website: 'https://ffriedland.ru',
    priceFrom: 20000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'kaliningrad',
    features: ['kids_friendly', 'audio_guide'],
  },

  // ═══════════ ВЛАДИМИР (3) ═══════════
  {
    slug: 'uspenskij-sobor-vladimir',
    title: 'Успенский собор',
    venueType: 'MUSEUM',
    description: 'Белокаменный собор XII века — объект ЮНЕСКО. Послужил образцом для Успенского собора Московского Кремля. Сохранились фрески Андрея Рублёва (XV век).',
    shortDescription: 'Белокаменный шедевр XII века с фресками Рублёва',
    address: 'ул. Большая Московская, 56, Владимир',
    lat: 56.1270,
    lng: 40.4108,
    district: 'Центральный',
    phone: '+7 (4922) 32-42-63',
    website: 'https://vladmuseum.ru',
    priceFrom: 15000,
    openingHours: { mon: null, tue: '10:00–17:00', wed: '10:00–17:00', thu: '10:00–17:00', fri: '10:00–17:00', sat: '10:00–17:00', sun: '10:00–17:00' },
    citySlug: 'vladimir',
    highlights: [
      'Объект ЮНЕСКО (XII век)',
      'Фрески Андрея Рублёва',
      'Прообраз Успенского собора Кремля',
    ],
    features: ['audio_guide', 'photo_allowed'],
  },
  {
    slug: 'zolotye-vorota-vladimir',
    title: 'Золотые ворота',
    venueType: 'MUSEUM',
    description: 'Памятник древнерусской архитектуры XII века — единственные сохранившиеся городские ворота Древней Руси. Внутри — музей-диорама «Штурм Владимира ордами Батыя».',
    shortDescription: 'Единственные сохранившиеся ворота Древней Руси',
    address: 'ул. Большая Московская, 1А, Владимир',
    lat: 56.1295,
    lng: 40.3968,
    district: 'Центральный',
    website: 'https://vladmuseum.ru',
    priceFrom: 15000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'vladimir',
    features: ['audio_guide'],
  },
  {
    slug: 'palaty-vladimir',
    title: 'Музейный центр «Палаты»',
    shortTitle: 'Палаты',
    venueType: 'MUSEUM',
    description: 'Музейный комплекс во Владимире, объединяющий экспозиции по истории Владимирского края, детский музейный центр, картинную галерею и выставочные залы.',
    shortDescription: 'Музей истории Владимирского края и картинная галерея',
    address: 'ул. Большая Московская, 58, Владимир',
    lat: 56.1265,
    lng: 40.4122,
    district: 'Центральный',
    phone: '+7 (4922) 32-22-02',
    website: 'https://vladmuseum.ru',
    priceFrom: 20000,
    openingHours: { mon: null, tue: '10:00–17:00', wed: '10:00–17:00', thu: '10:00–17:00', fri: '10:00–17:00', sat: '10:00–17:00', sun: '10:00–17:00' },
    citySlug: 'vladimir',
    features: ['kids_friendly', 'audio_guide'],
  },

  // ═══════════ ЯРОСЛАВЛЬ (3) ═══════════
  {
    slug: 'yaroslavskij-muzej-zapovednik',
    title: 'Ярославский музей-заповедник (Спасо-Преображенский монастырь)',
    shortTitle: 'Музей-заповедник',
    venueType: 'MUSEUM',
    description: 'Крупнейший музей Ярославля в стенах Спасо-Преображенского монастыря XVI века. Здесь нашли «Слово о полку Игореве». Смотровая площадка, иконы, фрески, коллекция древнерусского искусства.',
    shortDescription: 'Монастырь XVI века, где нашли «Слово о полку Игореве»',
    address: 'Богоявленская пл., 25, Ярославль',
    lat: 57.6215,
    lng: 39.8923,
    district: 'Кировский',
    phone: '+7 (4852) 30-38-69',
    website: 'https://yarmp.yar.ru',
    priceFrom: 20000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '10:00–18:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'yaroslavl',
    highlights: [
      'Место находки «Слова о полку Игореве»',
      'Смотровая площадка на звоннице',
      'Фрески XVI века',
    ],
    features: ['audio_guide', 'photo_allowed', 'kids_friendly'],
  },
  {
    slug: 'yaroslavskij-khudozhestvennyj-muzej',
    title: 'Ярославский художественный музей',
    shortTitle: 'Художественный музей',
    venueType: 'GALLERY',
    description: 'Крупнейшая коллекция русского искусства в провинции. Более 75 000 произведений: иконы XIII–XX веков, живопись, графика, скульптура. Расположен в Губернаторском доме на Волге.',
    shortDescription: 'Крупнейшая коллекция русского искусства в провинции',
    address: 'Волжская наб., 23, Ярославль',
    lat: 57.6278,
    lng: 39.8878,
    district: 'Кировский',
    phone: '+7 (4852) 72-78-38',
    website: 'https://yarartmuseum.ru',
    priceFrom: 20000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '12:00–20:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'yaroslavl',
    features: ['audio_guide', 'gift_shop'],
  },
  {
    slug: 'planetarij-tereshkovoj',
    title: 'Планетарий имени Валентины Терешковой',
    shortTitle: 'Планетарий Терешковой',
    venueType: 'MUSEUM',
    description: 'Современный планетарий с космическим музеем, обсерваторией и кинотеатром. Полнокупольные программы, интерактивные экспозиции о космосе. Назван в честь первой женщины-космонавта.',
    shortDescription: 'Современный планетарий и музей космоса',
    address: 'ул. Чайковского, 3, Ярославль',
    lat: 57.6196,
    lng: 39.8507,
    district: 'Кировский',
    phone: '+7 (4852) 72-93-72',
    website: 'https://yarplaneta.ru',
    priceFrom: 25000,
    openingHours: { mon: null, tue: '10:00–19:00', wed: '10:00–21:00', thu: '10:00–19:00', fri: '10:00–19:00', sat: '10:00–19:00', sun: '10:00–19:00' },
    citySlug: 'yaroslavl',
    features: ['kids_friendly', 'wheelchair', 'gift_shop'],
  },

  // ═══════════ НИЖНИЙ НОВГОРОД (3) ═══════════
  {
    slug: 'nizhegorodskij-kreml',
    title: 'Нижегородский Кремль',
    shortTitle: 'Кремль',
    venueType: 'MUSEUM',
    description: 'Крепость XVI века на слиянии Оки и Волги. 13 башен, прогулка по стенам с видом на Стрелку, экспозиция военной техники, музеи и выставки. Главная достопримечательность города.',
    shortDescription: 'Крепость XVI века на слиянии Оки и Волги',
    address: 'Кремль, Нижний Новгород',
    lat: 56.3283,
    lng: 43.9954,
    district: 'Нижегородский',
    phone: '+7 (831) 282-25-40',
    website: 'https://ngiamz.ru',
    priceFrom: 0,
    openingHours: { mon: '06:00–22:00', tue: '06:00–22:00', wed: '06:00–22:00', thu: '06:00–22:00', fri: '06:00–22:00', sat: '06:00–22:00', sun: '06:00–22:00' },
    citySlug: 'nizhny-novgorod',
    highlights: [
      '13 башен XVI века',
      'Прогулка по стенам — виды на Стрелку',
      'Бесплатный вход на территорию',
      'Экспозиция военной техники',
    ],
    features: ['kids_friendly', 'photo_allowed', 'wheelchair'],
  },
  {
    slug: 'arsenal-nn',
    title: 'Арсенал — Центр современного искусства',
    shortTitle: 'Арсенал',
    venueType: 'ART_SPACE',
    description: 'Филиал ГЦСИ в Нижегородском Кремле. Выставки современного российского и международного искусства, лекции, кинопоказы, перформансы. Одна из ведущих арт-площадок Поволжья.',
    shortDescription: 'Современное искусство в Нижегородском Кремле',
    address: 'Кремль, корпус 6, Нижний Новгород',
    lat: 56.3280,
    lng: 43.9940,
    district: 'Нижегородский',
    phone: '+7 (831) 422-45-54',
    website: 'https://arsenal-museum.art',
    priceFrom: 25000,
    openingHours: { mon: null, tue: '12:00–20:00', wed: '12:00–20:00', thu: '12:00–20:00', fri: '12:00–20:00', sat: '12:00–20:00', sun: '12:00–20:00' },
    citySlug: 'nizhny-novgorod',
    features: ['wheelchair', 'photo_allowed'],
  },
  {
    slug: 'nkhudomuzej',
    title: 'Нижегородский художественный музей',
    shortTitle: 'Художественный музей',
    venueType: 'GALLERY',
    description: 'Один из старейших художественных музеев России (с 1896 года). Русское искусство от икон до авангарда, коллекция западноевропейского искусства. Две площадки: Кремль и Верхне-Волжская набережная.',
    shortDescription: 'Один из старейших художественных музеев России',
    address: 'Верхневолжская наб., 3, Нижний Новгород',
    lat: 56.3306,
    lng: 43.9881,
    district: 'Нижегородский',
    phone: '+7 (831) 439-13-73',
    website: 'https://artmuseumnn.ru',
    priceFrom: 25000,
    openingHours: { mon: null, tue: '10:00–18:00', wed: '10:00–18:00', thu: '12:00–20:00', fri: '10:00–18:00', sat: '10:00–18:00', sun: '10:00–18:00' },
    citySlug: 'nizhny-novgorod',
    features: ['audio_guide', 'gift_shop'],
  },
];

// ════════════════════════════════════════════════════
// RUNNER
// ════════════════════════════════════════════════════

async function main() {
  console.log('═══ Seed: Venues (Музеи и Арт) ═══\n');
  console.log(`  Всего venue в массиве: ${VENUES.length}\n`);

  // Resolve city IDs
  const cities = await prisma.city.findMany({ select: { id: true, slug: true } });
  const cityMap = new Map(cities.map((c) => [c.slug, c.id]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const v of VENUES) {
    const cityId = cityMap.get(v.citySlug);
    if (!cityId) {
      console.log(`  SKIP: город "${v.citySlug}" не найден → ${v.title}`);
      skipped++;
      continue;
    }

    const data = {
      title: v.title,
      shortTitle: v.shortTitle || null,
      venueType: v.venueType as any,
      description: v.description,
      shortDescription: v.shortDescription,
      address: v.address,
      lat: v.lat,
      lng: v.lng,
      metro: v.metro || null,
      district: v.district || null,
      phone: v.phone || null,
      website: v.website || null,
      priceFrom: v.priceFrom ?? null,
      openingHours: v.openingHours ? (v.openingHours as any) : undefined,
      highlights: v.highlights ? (v.highlights as any) : undefined,
      features: v.features || [],
      faq: v.faq ? (v.faq as any) : undefined,
      isActive: true,
      isFeatured: true,
    };

    const existing = await prisma.venue.findUnique({ where: { slug: v.slug } });

    if (existing) {
      // Update — не трогаем imageUrl, galleryUrls (могли быть заполнены вручную)
      await prisma.venue.update({
        where: { slug: v.slug },
        data: {
          ...data,
          cityId, // на случай если город изменился (spb → saint-petersburg)
        },
      });
      console.log(`  ↻ UPDATE: ${v.title} (${v.citySlug})`);
      updated++;
    } else {
      // Create
      await prisma.venue.create({
        data: {
          ...data,
          slug: v.slug,
          cityId,
          imageUrl: null,
          galleryUrls: [],
        },
      });
      console.log(`  + CREATE: ${v.title} (${v.citySlug})`);
      created++;
    }
  }

  console.log(`\n═══ Результат ═══`);
  console.log(`  Создано: ${created}`);
  console.log(`  Обновлено: ${updated}`);
  console.log(`  Пропущено: ${skipped}`);
  console.log(`  Итого в массиве: ${VENUES.length}`);

  // Отчёт по городам
  const byCitySlug = new Map<string, number>();
  for (const v of VENUES) {
    byCitySlug.set(v.citySlug, (byCitySlug.get(v.citySlug) || 0) + 1);
  }
  console.log(`\n  По городам:`);
  for (const [slug, count] of byCitySlug) {
    console.log(`    ${slug}: ${count}`);
  }

  // ── Включить Калининград в каталоге (был скрыт из-за отсутствия контента) ──
  const kld = await prisma.city.findUnique({ where: { slug: 'kaliningrad' } });
  if (kld && !kld.isFeatured) {
    await prisma.city.update({
      where: { slug: 'kaliningrad' },
      data: { isFeatured: true },
    });
    console.log('\n  ✓ Калининград включён в каталоге (isFeatured: true)');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

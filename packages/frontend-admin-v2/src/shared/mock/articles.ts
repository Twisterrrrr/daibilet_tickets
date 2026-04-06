export interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  status: 'Черновик' | 'В продакшене';
  publishedAt: string | null;
}

export interface ArticleDetail extends ArticleRow {
  excerpt: string;
  bodyPreview: string;
  author: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  updatedAt: string;
  heroImage: string | null;
  readingMinutes: number;
}

const DETAILS: ArticleDetail[] = [
  {
    id: 'a-1',
    title: 'Как выбрать экскурсию по Неве',
    slug: 'nev-guide',
    status: 'В продакшене',
    publishedAt: '2025-03-01T12:00:00.000Z',
    excerpt: 'Краткий гид по типам маршрутов, длительности и сезону.',
    bodyPreview:
      'Нева и каналы: разные форматы от 40 минут до полного дня. В материале разбираем описание слота, карту посадки и сезон бронирования.',
    author: 'Редакция Дайбилет',
    tags: ['СПб', 'вода', 'гид'],
    metaTitle: 'Экскурсии по Неве — как выбрать маршрут',
    metaDescription: 'Советы по выбору прогулки по Неве и каналам: длительность, тип судна, сезон.',
    updatedAt: '2025-03-15T09:30:00.000Z',
    heroImage: 'https://cdn.example/articles/nev-hero.webp',
    readingMinutes: 6,
  },
  {
    id: 'a-2',
    title: 'Музеи Петербурга без очередей',
    slug: 'museums-no-queue',
    status: 'Черновик',
    publishedAt: null,
    excerpt: 'Черновик: лайфхаки по билетам и слотам в высокий сезон.',
    bodyPreview:
      'Заготовка: Эрмитаж, Русский музей, кластеры на Васильевском. Нужны ссылки на события и тайм-слоты.',
    author: 'М. Орлова',
    tags: ['музеи', 'СПб'],
    metaTitle: 'Музеи Петербурга — без очередей',
    metaDescription: 'Как спланировать визит в музеи Санкт-Петербурга без очередей.',
    updatedAt: '2025-03-18T16:00:00.000Z',
    heroImage: null,
    readingMinutes: 8,
  },
];

function toRow(d: ArticleDetail): ArticleRow {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    status: d.status,
    publishedAt: d.publishedAt,
  };
}

export function getMockArticles(): ArticleRow[] {
  return DETAILS.map(toRow);
}

export function getMockArticleById(id: string): ArticleDetail | undefined {
  return DETAILS.find((a) => a.id === id);
}

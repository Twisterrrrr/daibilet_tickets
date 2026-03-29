export interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  status: 'Черновик' | 'В продакшене';
  publishedAt: string | null;
}

const ROWS: ArticleRow[] = [
  {
    id: 'a-1',
    title: 'Как выбрать экскурсию по Неве',
    slug: 'nev-guide',
    status: 'В продакшене',
    publishedAt: '2025-03-01T12:00:00.000Z',
  },
  {
    id: 'a-2',
    title: 'Музеи Петербурга без очередей',
    slug: 'museums-no-queue',
    status: 'Черновик',
    publishedAt: null,
  },
];

export function getMockArticles(): ArticleRow[] {
  return [...ROWS];
}

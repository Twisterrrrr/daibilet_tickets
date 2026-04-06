export interface CollectionRow {
  id: string;
  title: string;
  slug: string;
  itemsCount: number;
  status: 'Черновик' | 'Опубликовано';
}

export interface CollectionDetail extends CollectionRow {
  description: string;
  curatedBy: string;
  itemTitles: string[];
  metaTitle: string;
  metaDescription: string;
  updatedAt: string;
  pinnedFirst: boolean;
}

const DETAILS: CollectionDetail[] = [
  {
    id: 'col-1',
    title: 'Выходные в Петербурге',
    slug: 'spb-weekend',
    itemsCount: 24,
    status: 'Опубликовано',
    description: 'Подборка для гостя на 2-3 дня: вода, дворцы, легкий музейный блок.',
    curatedBy: 'Команда витрины',
    itemTitles: [
      'Развод мостов — вечерняя Нева',
      'Петергоф малый круг',
      'Исаакий + колоннада',
      'Реки и каналы 1,5 ч',
    ],
    metaTitle: 'Выходные в Санкт-Петербурге — подборка событий',
    metaDescription: 'Соберите идеальные выходные в СПб: экскурсии и активности на двое суток.',
    updatedAt: '2025-03-12T11:00:00.000Z',
    pinnedFirst: true,
  },
  {
    id: 'col-2',
    title: 'Семейный май',
    slug: 'family-may',
    itemsCount: 18,
    status: 'Черновик',
    description: 'Черновик майской витрины для семей с детьми 6-14 лет.',
    curatedBy: 'Контент-редактор',
    itemTitles: ['Зоопарк и парки', 'Интерактивный музей', 'Теплоход с детской зоной'],
    metaTitle: 'Семейный отдых в мае',
    metaDescription: 'Куда пойти с детьми в мае — подборка на Дайбилет.',
    updatedAt: '2025-03-05T14:20:00.000Z',
    pinnedFirst: false,
  },
];

function toRow(d: CollectionDetail): CollectionRow {
  return {
    id: d.id,
    title: d.title,
    slug: d.slug,
    itemsCount: d.itemsCount,
    status: d.status,
  };
}

export function getMockCollections(): CollectionRow[] {
  return DETAILS.map(toRow);
}

export function getMockCollectionById(id: string): CollectionDetail | undefined {
  return DETAILS.find((c) => c.id === id);
}

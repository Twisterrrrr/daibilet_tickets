export interface ModerationQueueRow {
  id: string;
  title: string;
  type: 'Событие' | 'Площадка' | 'Медиа';
  supplier: string;
  submittedAt: string;
  status: 'Ожидает' | 'В работе' | 'Отклонено';
  /** Текст превью для правой панели (макет) */
  summary: string;
  city?: string;
  duration?: string;
}

const ROWS: ModerationQueueRow[] = [
  {
    id: 'mq-1',
    title: 'Ночная водная прогулка',
    type: 'Событие',
    supplier: 'СПБ Ривер Тур',
    submittedAt: '2025-03-24T11:00:00.000Z',
    status: 'Ожидает',
    city: 'Санкт-Петербург',
    duration: '1 ч 30 мин',
    summary:
      'Ночная прогулка по Неве и каналам с гидом. Старт у Аничкова моста, в программе подсветка дворцов и мини-бар на борту. Черновик: поставщик просит опубликовать без финальной вычитки SEO.',
  },
  {
    id: 'mq-2',
    title: 'Музей на Английской',
    type: 'Площадка',
    supplier: 'Дайбилет Экскурсии',
    submittedAt: '2025-03-23T09:30:00.000Z',
    status: 'В работе',
    city: 'Санкт-Петербург',
    summary:
      'Лофт-пространство для лекций и мастер-классов, вместимость до 80 человек. Проверить соответствие фото интерьера актуальной отделке; уточнить часы работы выходного дня.',
  },
  {
    id: 'mq-3',
    title: 'Обложка: «Крыши Петербурга»',
    type: 'Медиа',
    supplier: 'RoofSPB',
    submittedAt: '2025-03-22T16:20:00.000Z',
    status: 'Отклонено',
    summary:
      'Горизонтальное изображение 16:9, есть логотип стороннего сервиса в кадре — ранее отклонено по правилу чистоты медиа.',
  },
];

export function getMockModerationQueue(): ModerationQueueRow[] {
  return [...ROWS];
}

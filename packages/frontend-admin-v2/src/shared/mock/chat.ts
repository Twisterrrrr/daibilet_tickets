export interface ChatThreadRow {
  id: string;
  preview: string;
  user: string;
  unread: number;
  updatedAt: string;
}

const ROWS: ChatThreadRow[] = [
  {
    id: 'ch-1',
    preview: 'Здравствуйте, можно перенести сеанс?',
    user: 'Екатерина В.',
    unread: 1,
    updatedAt: '2025-03-24T14:20:00.000Z',
  },
  {
    id: 'ch-2',
    preview: 'Спасибо, всё получилось',
    user: 'Илья К.',
    unread: 0,
    updatedAt: '2025-03-23T10:05:00.000Z',
  },
];

export function getMockChatThreads(): ChatThreadRow[] {
  return [...ROWS];
}

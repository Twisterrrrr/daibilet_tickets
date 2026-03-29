export interface SupportTicketRow {
  id: string;
  code: string;
  subject: string;
  category: 'Оплата' | 'Билет' | 'Возврат' | 'Другое';
  status: 'Открыт' | 'В работе' | 'Закрыт';
  updatedAt: string;
}

const ROWS: SupportTicketRow[] = [
  {
    id: 'st-1',
    code: 'TK-90821',
    subject: 'Не пришёл билет на почту',
    category: 'Билет',
    status: 'Открыт',
    updatedAt: '2025-03-24T12:00:00.000Z',
  },
  {
    id: 'st-2',
    code: 'TK-90802',
    subject: 'Двойное списание',
    category: 'Оплата',
    status: 'В работе',
    updatedAt: '2025-03-23T16:00:00.000Z',
  },
];

export function getMockSupportTickets(): SupportTicketRow[] {
  return [...ROWS];
}

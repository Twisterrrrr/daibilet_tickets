export type NotificationType = 'order' | 'moderation' | 'limit' | 'system';

export interface SupplierNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  linkLabel?: string;
  isRead: boolean;
  createdAt: string;
}

// Next: заменить на реальный API /supplier/notifications
export const mockNotifications: SupplierNotification[] = [
  {
    id: 'n1',
    type: 'order',
    title: 'Новый заказ DAI-2026-0012',
    message: 'Ночная прогулка по рекам и каналам · 3 билета · 2 400 ₽',
    link: '/reports',
    linkLabel: 'Отчёты',
    isRead: false,
    createdAt: '2026-03-09T14:30:00',
  },
  {
    id: 'n2',
    type: 'moderation',
    title: 'Событие одобрено',
    message: '«Джаз на теплоходе» прошло модерацию и опубликовано в каталоге.',
    link: '/events',
    linkLabel: 'Мои события',
    isRead: false,
    createdAt: '2026-03-09T12:00:00',
  },
  {
    id: 'n3',
    type: 'moderation',
    title: 'Событие отклонено',
    message: '«Экскурсия “Мосты и дворцы”» — описание не соответствует требованиям. Уберите рекламные ссылки.',
    link: '/events',
    linkLabel: 'Исправить',
    isRead: false,
    createdAt: '2026-03-09T10:15:00',
  },
  {
    id: 'n4',
    type: 'limit',
    title: 'Приближение к лимиту событий',
    message:
      'Вы использовали 4 из 5 доступных слотов для активных событий. Повысьте уровень доверия для увеличения лимита.',
    link: '/settings',
    linkLabel: 'Настройки',
    isRead: false,
    createdAt: '2026-03-09T09:00:00',
  },
];


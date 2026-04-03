import { TicketProviderCode } from '@prisma/client';

/** Человекочитаемые подписи для admin API (вне ProviderDescriptor). */
export const TICKET_PROVIDER_DISPLAY_LABEL: Record<TicketProviderCode, string> = {
  [TicketProviderCode.MANUAL]: 'Manual / Admin',
  [TicketProviderCode.TICKETS_CLOUD]: 'Ticketscloud',
  [TicketProviderCode.TEPLOHOD]: 'Teplohod',
  [TicketProviderCode.RADARIO]: 'Radario',
  [TicketProviderCode.QTICKETS]: 'Qtickets',
  [TicketProviderCode.INTICKETS]: 'Intickets',
  [TicketProviderCode.EDINOE_POLE]: 'Edinoe Pole',
  [TicketProviderCode.TICKETNET]: 'TicketNet / Infotech',
  [TicketProviderCode.YANDEX_TICKETS]: 'Yandex Tickets',
  [TicketProviderCode.MOSRU_RUSSPASS]: 'Mos.ru / Russpass',
  [TicketProviderCode.LANIT]: 'Lanit',
};

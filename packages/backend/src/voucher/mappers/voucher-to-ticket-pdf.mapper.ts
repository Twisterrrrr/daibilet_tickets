import { Prisma } from '@/prisma-client';

import { TicketPdfData } from '../types/ticket-pdf-data.type';

export type VoucherTicketPayload = Prisma.VoucherGetPayload<{
  include: {
    package: {
      include: {
        city: true;
        items: {
          include: {
            event: true;
            session: true;
          };
        };
      };
    };
  };
}>;

function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Moscow',
  }).format(date);
}

function formatTime(date: Date | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(date);
}

export function mapVoucherToTicketPdfData(
  voucher: VoucherTicketPayload,
  input: {
    serviceName: string;
    organizerFallback: string;
    statusLabel?: string;
  },
): TicketPdfData {
  const pkg = voucher.package;
  const firstItem = pkg.items?.[0];
  const event = firstItem?.event;
  const session = firstItem?.session;
  const quantity = (firstItem?.adultTickets ?? 0) + (firstItem?.childTickets ?? 0);

  const eventTitle = event?.title?.trim() || 'Событие';
  const venueName = eventTitle;
  const venueAddress = event?.address?.trim() || pkg.city?.name || 'Адрес уточняется';
  const customerName = pkg.customerName?.trim() || pkg.email || 'Покупатель';
  const organizerName = input.organizerFallback || 'Организатор';

  return {
    eventTitle,
    date: formatDate(session?.startsAt),
    time: formatTime(session?.startsAt),
    venueName,
    venueAddress,
    customerName,
    quantity: String(Math.max(quantity, 1)),
    orderNumber: pkg.code || pkg.id,
    ticketType: 'Стандарт',
    ticketId: voucher.shortCode,
    organizerName,
    serviceName: input.serviceName,
    statusLabel: input.statusLabel || 'Подтверждено',
    qrPayload: voucher.publicUrl,
  };
}


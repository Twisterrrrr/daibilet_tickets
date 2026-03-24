import { describe, expect, it } from 'vitest';

import { mapVoucherToTicketPdfData } from '../mappers/voucher-to-ticket-pdf.mapper';

describe('mapVoucherToTicketPdfData', () => {
  it('maps core fields from voucher payload', () => {
    const voucher = {
      shortCode: 'V-ABC123',
      publicUrl: 'https://example.com/v/V-ABC123',
      package: {
        id: 'pkg-1',
        code: 'ORD-77',
        customerName: 'Иван Иванов',
        email: 'ivan@test.local',
        city: { name: 'Санкт-Петербург' },
        items: [
          {
            adultTickets: 2,
            childTickets: 1,
            event: {
              title: 'Прогулка по Неве',
              address: 'Дворцовая наб., 1',
            },
            session: {
              startsAt: new Date('2026-04-01T15:30:00.000Z'),
            },
          },
        ],
      },
    } as any;

    const dto = mapVoucherToTicketPdfData(voucher, {
      serviceName: 'Daibilet',
      organizerFallback: 'Партнер Daibilet',
      statusLabel: 'Подтверждено',
    });

    expect(dto.eventTitle).toBe('Прогулка по Неве');
    expect(dto.venueAddress).toBe('Дворцовая наб., 1');
    expect(dto.customerName).toBe('Иван Иванов');
    expect(dto.quantity).toBe('3');
    expect(dto.orderNumber).toBe('ORD-77');
    expect(dto.ticketId).toBe('V-ABC123');
    expect(dto.qrPayload).toBe('https://example.com/v/V-ABC123');
  });

  it('uses fallback values when source data is incomplete', () => {
    const voucher = {
      shortCode: 'V-FALL',
      publicUrl: '',
      package: {
        id: 'pkg-fallback',
        code: null,
        customerName: null,
        email: 'buyer@sample.local',
        city: { name: 'Казань' },
        items: [],
      },
    } as any;

    const dto = mapVoucherToTicketPdfData(voucher, {
      serviceName: 'Daibilet',
      organizerFallback: 'Организатор по умолчанию',
    });

    expect(dto.eventTitle).toBe('Событие');
    expect(dto.venueAddress).toBe('Казань');
    expect(dto.customerName).toBe('buyer@sample.local');
    expect(dto.orderNumber).toBe('pkg-fallback');
    expect(dto.ticketType).toBe('Стандарт');
    expect(dto.statusLabel).toBe('Подтверждено');
  });
});


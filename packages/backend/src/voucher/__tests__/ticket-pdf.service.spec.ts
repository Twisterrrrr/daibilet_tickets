import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import { TicketPdfService } from '../ticket-pdf.service';
import { TicketPdfData } from '../types/ticket-pdf-data.type';

const mocked = vi.hoisted(() => ({
  qrToDataUrlMock: vi.fn(),
  pdfMock: vi.fn(),
  setContentMock: vi.fn(),
  closePageMock: vi.fn(),
  browserCloseMock: vi.fn(),
  launchMock: vi.fn(),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: mocked.qrToDataUrlMock,
  },
  toDataURL: mocked.qrToDataUrlMock,
}));

vi.mock('puppeteer', () => ({
  default: {
    launch: mocked.launchMock,
  },
}));

describe('TicketPdfService', () => {
  it('generates A4 pdf buffer via puppeteer', async () => {
    mocked.qrToDataUrlMock.mockResolvedValue('data:image/png;base64,QR');
    mocked.pdfMock.mockResolvedValue(Uint8Array.from([1, 2, 3, 4]));
    mocked.setContentMock.mockResolvedValue(undefined);
    mocked.closePageMock.mockResolvedValue(undefined);
    mocked.browserCloseMock.mockResolvedValue(undefined);
    mocked.launchMock.mockResolvedValue({
      newPage: async () => ({
        setContent: mocked.setContentMock,
        pdf: mocked.pdfMock,
        close: mocked.closePageMock,
      }),
      close: mocked.browserCloseMock,
    });

    const config = {
      get: (key: string, defaultValue?: string) => {
        if (key === 'PUPPETEER_NO_SANDBOX') return 'true';
        if (key === 'PUPPETEER_HEADLESS') return 'true';
        return defaultValue;
      },
    } as ConfigService;

    const service = new TicketPdfService(config);

    const data: TicketPdfData = {
      eventTitle: 'Тест',
      date: '01 апреля 2026',
      time: '18:30',
      venueName: 'Тестовая площадка',
      venueAddress: 'Тестовый адрес',
      customerName: 'Тестовый пользователь',
      quantity: '1',
      orderNumber: 'ORD-1',
      ticketType: 'Стандарт',
      ticketId: 'V-TEST1',
      organizerName: 'Организатор',
      serviceName: 'Daibilet',
      statusLabel: 'Подтверждено',
      qrPayload: 'https://example.com/v/V-TEST1',
    };

    const pdf = await service.generateTicketPdfBuffer(data);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.length).toBeGreaterThan(0);
    expect(mocked.qrToDataUrlMock).toHaveBeenCalledWith('https://example.com/v/V-TEST1', expect.any(Object));
    expect(mocked.setContentMock).toHaveBeenCalledWith(expect.stringContaining('Тест'), { waitUntil: 'networkidle0' });
    expect(mocked.pdfMock).toHaveBeenCalledWith(
      expect.objectContaining({
        format: 'A4',
        printBackground: true,
      }),
    );
    expect(mocked.browserCloseMock).toHaveBeenCalled();
  });
});


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MailService } from '../mail.service';

// ---------------------
// Tests
// ---------------------

describe('MailService', () => {
  // =========================================
  // DRY RUN mode (SMTP_HOST not configured)
  // =========================================

  describe('when SMTP is not configured (DRY RUN)', () => {
    let service: MailService;
    const mockMailer = { sendMail: vi.fn() };

    beforeEach(() => {
      vi.clearAllMocks();

      const mockConfig = {
        get: vi.fn((key: string, defaultValue?: string) => {
          if (key === 'SMTP_HOST') return ''; // falsy → DRY RUN
          if (key === 'APP_URL') return 'http://localhost:3000';
          if (key === 'ADMIN_EMAIL') return 'admin@test.com';
          return defaultValue;
        }),
      };

      service = new MailService(mockMailer as any, mockConfig as any);
    });

    it('sendOrderCreated should return false and not call mailer', async () => {
      const result = await service.sendOrderCreated('test@test.com', {
        customerName: 'John',
        shortCode: 'CS-TEST',
        items: [{ title: 'Event', quantity: 1, price: 100 }],
        totalPrice: 100,
      });

      expect(result).toBe(false);
      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('sendReviewVerification should return false in DRY RUN', async () => {
      const result = await service.sendReviewVerification('user@test.com', {
        authorName: 'Author',
        eventTitle: 'Test Event',
        verifyUrl: 'https://example.com/verify',
      });

      expect(result).toBe(false);
      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('notifyAdminNewTicket should not call mailer in DRY RUN', async () => {
      await service.notifyAdminNewTicket({
        ticketCode: 'TK-1',
        name: 'John',
        email: 'john@test.com',
        category: 'general',
        message: 'Test message',
      });

      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });

    it('sendOrderConfirmed should return false in DRY RUN', async () => {
      const result = await service.sendOrderConfirmed('user@test.com', {
        customerName: 'User',
        shortCode: 'CS-123',
        items: [{ title: 'Concert', quantity: 1, price: 500 }],
        totalPrice: 500,
      });

      expect(result).toBe(false);
      expect(mockMailer.sendMail).not.toHaveBeenCalled();
    });
  });

  // =========================================
  // Enabled mode (SMTP_HOST configured)
  // =========================================

  describe('when SMTP is configured', () => {
    let service: MailService;
    const mockMailer = { sendMail: vi.fn().mockResolvedValue({}) };

    beforeEach(() => {
      vi.clearAllMocks();
      mockMailer.sendMail.mockResolvedValue({});

      const mockConfig = {
        get: vi.fn((key: string, defaultValue?: string) => {
          if (key === 'SMTP_HOST') return 'smtp.test.com';
          if (key === 'APP_URL') return 'https://daibilet.ru';
          if (key === 'ADMIN_EMAIL') return 'admin@daibilet.ru';
          return defaultValue;
        }),
      };

      service = new MailService(mockMailer as any, mockConfig as any);
    });

    it('should call mailer.sendMail when enabled', async () => {
      const result = await service.sendReviewVerification('user@test.com', {
        authorName: 'Author',
        eventTitle: 'Test Event',
        verifyUrl: 'https://example.com/verify',
      });

      expect(result).toBe(true);
      expect(mockMailer.sendMail).toHaveBeenCalledTimes(1);
    });

    it('sendOrderCreated should use correct template and subject', async () => {
      const shortCode = 'CS-ABC123';

      await service.sendOrderCreated('buyer@test.com', {
        customerName: 'Buyer',
        shortCode,
        items: [{ title: 'Concert', quantity: 2, price: 500 }],
        totalPrice: 1000,
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'buyer@test.com',
          subject: `Заказ ${shortCode} оформлен — Дайбилет`,
          template: 'order-created',
          context: expect.objectContaining({
            customerName: 'Buyer',
            shortCode,
            trackUrl: `https://daibilet.ru/orders/track?code=${shortCode}`,
            appUrl: 'https://daibilet.ru',
          }),
        }),
      );
    });

    it('sendOrderConfirmed should include operational info when present', async () => {
      await service.sendOrderConfirmed('buyer@test.com', {
        customerName: 'Buyer',
        shortCode: 'CS-CONF1',
        items: [{ title: 'Event', quantity: 1, price: 200 }],
        totalPrice: 200,
        operationalItems: [
          {
            eventTitle: 'Event',
            meetingPoint: 'Red Square',
            meetingInstructions: 'Near the fountain',
            operationalPhone: '+79990001122',
            operationalNote: null,
          },
        ],
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Заказ CS-CONF1 подтверждён — Дайбилет',
          template: 'order-confirmed',
          context: expect.objectContaining({
            hasOperationalInfo: true,
          }),
        }),
      );
    });

    it('notifyAdminNewTicket should send to admin email', async () => {
      await service.notifyAdminNewTicket({
        ticketCode: 'TK-100',
        name: 'Customer',
        email: 'customer@test.com',
        category: 'refund',
        message: 'I want a refund',
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@daibilet.ru',
          subject: expect.stringContaining('TK-100'),
        }),
      );
    });

    it('should return false and not throw when mailer throws', async () => {
      mockMailer.sendMail.mockRejectedValue(new Error('SMTP connection refused'));

      const result = await service.sendOrderCreated('fail@test.com', {
        customerName: 'Fail',
        shortCode: 'CS-FAIL',
        items: [{ title: 'Event', quantity: 1, price: 100 }],
        totalPrice: 100,
      });

      expect(result).toBe(false);
    });

    it('sendOrderExpired should use order-expired template', async () => {
      await service.sendOrderExpired('user@test.com', {
        customerName: 'User',
        shortCode: 'CS-EXP',
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'order-expired',
          subject: expect.stringContaining('CS-EXP'),
        }),
      );
    });

    it('sendTicketReply should use ticket-reply template', async () => {
      await service.sendTicketReply('user@test.com', {
        customerName: 'User',
        ticketCode: 'TK-42',
        message: 'Your issue has been resolved.',
      });

      expect(mockMailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          template: 'ticket-reply',
          subject: expect.stringContaining('TK-42'),
        }),
      );
    });
  });
});

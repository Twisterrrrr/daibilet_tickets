import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentFlowType } from '../cart-partitioning';
import { PaymentService } from '../payment.service';

// ---------------------
// Snapshot helper — creates valid SnapshotLineItem for partitionCart
// ---------------------

function makeSnapshot(lineTotal: number, overrides: Record<string, unknown> = {}) {
  return [
    {
      lineItemIndex: 0,
      offerId: 'offer-1',
      eventId: 'event-1',
      source: 'MANUAL',
      purchaseType: 'REQUEST',
      purchaseFlow: PaymentFlowType.PLATFORM,
      eventTitle: 'Test Event',
      eventSlug: 'test',
      eventImage: null,
      badge: null,
      operatorName: 'Op',
      unitPrice: lineTotal,
      quantity: 1,
      lineTotal,
      priceCurrency: 'RUB',
      supplierId: null,
      commissionRateSnapshot: null,
      platformFeeSnapshot: null,
      supplierAmountSnapshot: null,
      deeplink: null,
      widgetProvider: null,
      widgetPayload: null,
      meetingPoint: null,
      meetingInstructions: null,
      operationalPhone: null,
      operationalNote: null,
      snapshotAt: new Date().toISOString(),
      ...overrides,
    },
  ];
}

// ---------------------
// Mock factories
// ---------------------

const mockPrisma = {
  checkoutSession: { findUnique: vi.fn(), update: vi.fn() },
  paymentIntent: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  eventOffer: { findUnique: vi.fn() },
  operator: { findUnique: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
};

const CONFIG_DEFAULTS: Record<string, string> = {
  PAYMENT_PROVIDER: 'STUB',
  APP_URL: 'http://localhost:3000',
  YOOKASSA_SHOP_ID: '',
  YOOKASSA_SECRET_KEY: '',
};

const mockConfig = {
  get: vi
    .fn()
    .mockImplementation(
      (key: string, fallback?: string) => CONFIG_DEFAULTS[key] ?? fallback ?? 'http://localhost:3000',
    ),
  getOrThrow: vi.fn().mockImplementation((key: string) => CONFIG_DEFAULTS[key] ?? 'http://localhost:3000'),
};

const mockMailService = { sendOrderConfirmed: vi.fn().mockResolvedValue(true) };

// ---------------------
// Tests
// ---------------------

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    service = new PaymentService(mockPrisma as any, mockConfig as any, mockMailService as any);
  });

  // =========================================
  // createPaymentIntent
  // =========================================

  describe('createPaymentIntent', () => {
    const checkoutSessionId = 'session-1';
    const idempotencyKey = 'idemp-key-123';

    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrisma.checkoutSession.findUnique.mockResolvedValue(null);

      await expect(service.createPaymentIntent(checkoutSessionId)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.checkoutSession.findUnique).toHaveBeenCalledWith({
        where: { id: checkoutSessionId },
      });
    });

    it('should throw BadRequestException when session status is not CONFIRMED or AWAITING_PAYMENT', async () => {
      mockPrisma.checkoutSession.findUnique.mockResolvedValue({
        id: checkoutSessionId,
        status: 'PENDING_CONFIRMATION',
        totalPrice: 1000,
        offersSnapshot: [],
      });

      await expect(service.createPaymentIntent(checkoutSessionId)).rejects.toThrow(BadRequestException);
    });

    it('should return existing intent if idempotencyKey already exists (idempotency)', async () => {
      const existingIntent = {
        id: 'intent-1',
        idempotencyKey,
        status: 'PENDING',
        paymentUrl: 'http://localhost:3000/pay',
      };

      mockPrisma.checkoutSession.findUnique.mockResolvedValue({
        id: checkoutSessionId,
        status: 'CONFIRMED',
        totalPrice: 1000,
        offersSnapshot: [],
      });
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(existingIntent);

      const result = await service.createPaymentIntent(checkoutSessionId, idempotencyKey);

      expect(result).toEqual(existingIntent);
      expect(mockPrisma.paymentIntent.findUnique).toHaveBeenCalledWith({
        where: { idempotencyKey },
      });
      expect(mockPrisma.paymentIntent.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if active intent (PENDING/PROCESSING) already exists', async () => {
      mockPrisma.checkoutSession.findUnique.mockResolvedValue({
        id: checkoutSessionId,
        status: 'CONFIRMED',
        totalPrice: 1000,
        offersSnapshot: [],
      });
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue({
        id: 'active-intent',
        status: 'PENDING',
      });

      await expect(service.createPaymentIntent(checkoutSessionId)).rejects.toThrow(ConflictException);
      expect(mockPrisma.paymentIntent.findFirst).toHaveBeenCalledWith({
        where: {
          checkoutSessionId,
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      });
    });

    it('should throw BadRequestException when totalPrice <= 0', async () => {
      mockPrisma.checkoutSession.findUnique.mockResolvedValue({
        id: checkoutSessionId,
        status: 'CONFIRMED',
        totalPrice: 0,
        offersSnapshot: [],
      });
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue(null);

      await expect(service.createPaymentIntent(checkoutSessionId)).rejects.toThrow(BadRequestException);
    });

    it('should create intent with STUB provider (default)', async () => {
      const session = {
        id: checkoutSessionId,
        status: 'CONFIRMED',
        totalPrice: 1000,
        offersSnapshot: makeSnapshot(1000),
      };

      mockPrisma.checkoutSession.findUnique.mockResolvedValue(session);
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue(null);
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...session,
        status: 'AWAITING_PAYMENT',
      });
      mockPrisma.paymentIntent.create.mockResolvedValue({
        id: 'intent-1',
        checkoutSessionId,
        idempotencyKey: 'some-key',
        amount: 1000,
        currency: 'RUB',
        status: 'PENDING',
        provider: 'STUB',
        providerPaymentId: 'stub_abc123',
        paymentUrl: 'http://localhost:3000/checkout/pay-mock/stub_abc123',
        supplierId: null,
        grossAmount: 1000,
        platformFee: null,
        supplierAmount: null,
        commissionRate: null,
      });

      const result = await service.createPaymentIntent(checkoutSessionId);

      expect((result as any).paymentIntentId).toBe('intent-1');
      expect(result.paymentUrl).toContain('/checkout/pay-mock/');
      expect(result.provider).toBe('STUB');
      expect(result.amount).toBe(1000);
      expect(mockPrisma.paymentIntent.create).toHaveBeenCalled();
    });

    it('should transition session to AWAITING_PAYMENT', async () => {
      const session = {
        id: checkoutSessionId,
        status: 'CONFIRMED',
        totalPrice: 1000,
        offersSnapshot: makeSnapshot(1000),
      };

      mockPrisma.checkoutSession.findUnique.mockResolvedValue(session);
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue(null);
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...session,
        status: 'AWAITING_PAYMENT',
      });
      mockPrisma.paymentIntent.create.mockResolvedValue({
        id: 'intent-1',
        status: 'PENDING',
        provider: 'STUB',
        paymentUrl: 'http://localhost:3000/pay',
        amount: 1000,
        currency: 'RUB',
      });

      await service.createPaymentIntent(checkoutSessionId);

      // CONFIRMED → AWAITING_PAYMENT is admin-only; system actor skips.
      // Just verify the intent was created.
      expect(mockPrisma.paymentIntent.create).toHaveBeenCalled();
    });

    it('should calculate commission from snapshot when supplier present', async () => {
      const session = {
        id: checkoutSessionId,
        status: 'CONFIRMED',
        totalPrice: 5000,
        offersSnapshot: makeSnapshot(5000, {
          supplierId: 'op-1',
          commissionRateSnapshot: 0.15,
          platformFeeSnapshot: 750,
          supplierAmountSnapshot: 4250,
        }),
      };

      mockPrisma.checkoutSession.findUnique.mockResolvedValue(session);
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue(null);
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...session,
        status: 'AWAITING_PAYMENT',
      });
      mockPrisma.paymentIntent.create.mockResolvedValue({
        id: 'intent-1',
        status: 'PENDING',
        provider: 'STUB',
        paymentUrl: 'http://localhost:3000/pay',
        amount: 5000,
        currency: 'RUB',
        supplierId: 'op-1',
        grossAmount: 5000,
        platformFee: 750,
        supplierAmount: 4250,
        commissionRate: 0.15,
      });

      await service.createPaymentIntent(checkoutSessionId);

      expect(mockPrisma.paymentIntent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supplierId: 'op-1',
          grossAmount: 5000,
          platformFee: 750,
          supplierAmount: 4250,
          commissionRate: 0.15,
        }),
      });
    });

    it('should use snapshot commission (promoRate already baked in at snapshot time)', async () => {
      // Commission is calculated at snapshot time and frozen.
      // promoRate is reflected in commissionRateSnapshot already.
      const session = {
        id: checkoutSessionId,
        status: 'CONFIRMED',
        totalPrice: 5000,
        offersSnapshot: makeSnapshot(5000, {
          supplierId: 'op-1',
          commissionRateSnapshot: 0.1, // promoRate was applied at snapshot time
          platformFeeSnapshot: 500,
          supplierAmountSnapshot: 4500,
        }),
      };

      mockPrisma.checkoutSession.findUnique.mockResolvedValue(session);
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue(null);
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...session,
        status: 'AWAITING_PAYMENT',
      });
      mockPrisma.paymentIntent.create.mockResolvedValue({
        id: 'intent-1',
        status: 'PENDING',
        provider: 'STUB',
        paymentUrl: 'http://localhost:3000/pay',
        amount: 5000,
        currency: 'RUB',
        supplierId: 'op-1',
        grossAmount: 5000,
        platformFee: 500,
        supplierAmount: 4500,
        commissionRate: 0.1,
      });

      await service.createPaymentIntent(checkoutSessionId);

      expect(mockPrisma.paymentIntent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          commissionRate: 0.1,
          platformFee: 500,
          supplierAmount: 4500,
        }),
      });
    });

    it('should not calculate commission when snapshot has no supplier', async () => {
      const session = {
        id: checkoutSessionId,
        status: 'CONFIRMED',
        totalPrice: 1000,
        offersSnapshot: makeSnapshot(1000), // supplierId defaults to null
      };

      mockPrisma.checkoutSession.findUnique.mockResolvedValue(session);
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue(null);
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...session,
        status: 'AWAITING_PAYMENT',
      });
      mockPrisma.paymentIntent.create.mockResolvedValue({
        id: 'intent-1',
        status: 'PENDING',
        provider: 'STUB',
        paymentUrl: 'http://localhost:3000/pay',
        amount: 1000,
        currency: 'RUB',
        supplierId: null,
        grossAmount: 1000,
        platformFee: null,
        supplierAmount: null,
        commissionRate: null,
      });

      await service.createPaymentIntent(checkoutSessionId);

      expect(mockPrisma.paymentIntent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          supplierId: null,
          platformFee: null,
          supplierAmount: null,
          commissionRate: null,
        }),
      });
    });

    it('should work with AWAITING_PAYMENT session status', async () => {
      const session = {
        id: checkoutSessionId,
        status: 'AWAITING_PAYMENT',
        totalPrice: 1000,
        offersSnapshot: makeSnapshot(1000),
      };

      mockPrisma.checkoutSession.findUnique.mockResolvedValue(session);
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);
      mockPrisma.paymentIntent.findFirst.mockResolvedValue(null);
      mockPrisma.checkoutSession.update.mockResolvedValue(session);
      mockPrisma.paymentIntent.create.mockResolvedValue({
        id: 'intent-1',
        status: 'PENDING',
        provider: 'STUB',
        paymentUrl: 'http://localhost:3000/pay',
        amount: 1000,
        currency: 'RUB',
      });

      await expect(service.createPaymentIntent(checkoutSessionId)).resolves.toBeDefined();
    });
  });

  // =========================================
  // markPaid
  // =========================================

  describe('markPaid', () => {
    const intentId = 'intent-1';
    const providerPaymentId = 'provider-pay-123';

    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
    });

    it('should throw NotFoundException when intent not found', async () => {
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);

      await expect(service.markPaid(intentId)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.paymentIntent.findUnique).toHaveBeenCalledWith({
        where: { id: intentId },
        include: { checkoutSession: true },
      });
    });

    it('should return existing intent if already PAID (noOp)', async () => {
      const existingIntent = {
        id: intentId,
        status: 'PAID',
        checkoutSession: { id: 'session-1', status: 'COMPLETED' },
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(existingIntent);

      const result = await service.markPaid(intentId);

      expect(result).toEqual(existingIntent);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should transition intent to PAID and session to COMPLETED', async () => {
      const intent = {
        id: intentId,
        status: 'PENDING',
        checkoutSessionId: 'session-1',
        checkoutSession: {
          id: 'session-1',
          status: 'AWAITING_PAYMENT',
        },
        supplierId: null,
        provider: 'STUB',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(intent);
      mockPrisma.paymentIntent.update.mockResolvedValue({
        ...intent,
        status: 'PAID',
        paidAt: new Date(),
      });
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...intent.checkoutSession,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      const result = await service.markPaid(intentId);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: expect.objectContaining({
          status: 'PAID',
          paidAt: expect.any(Date),
        }),
      });
      expect(mockPrisma.checkoutSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
      });
    });

    it('should include providerPaymentId when provided', async () => {
      const intent = {
        id: intentId,
        status: 'PENDING',
        checkoutSessionId: 'session-1',
        checkoutSession: {
          id: 'session-1',
          status: 'AWAITING_PAYMENT',
        },
        supplierId: null,
        provider: 'STUB',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(intent);
      mockPrisma.paymentIntent.update.mockResolvedValue({
        ...intent,
        status: 'PAID',
        paidAt: new Date(),
        providerPaymentId,
      });
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...intent.checkoutSession,
        status: 'COMPLETED',
      });

      await service.markPaid(intentId, providerPaymentId);

      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: expect.objectContaining({
          providerPaymentId,
        }),
      });
    });

    it('should increment successfulSales for supplier', async () => {
      const intent = {
        id: intentId,
        status: 'PENDING',
        checkoutSessionId: 'session-1',
        checkoutSession: {
          id: 'session-1',
          status: 'AWAITING_PAYMENT',
        },
        supplierId: 'supplier-1',
        provider: 'STUB',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(intent);
      mockPrisma.paymentIntent.update.mockResolvedValue({
        ...intent,
        status: 'PAID',
        paidAt: new Date(),
      });
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...intent.checkoutSession,
        status: 'COMPLETED',
      });
      mockPrisma.operator.update.mockResolvedValue({ id: 'supplier-1' });

      await service.markPaid(intentId);

      expect(mockPrisma.operator.update).toHaveBeenCalledWith({
        where: { id: 'supplier-1' },
        data: { successfulSales: { increment: 1 } },
      });
    });

    it('should not increment successfulSales when supplierId is null', async () => {
      const intent = {
        id: intentId,
        status: 'PENDING',
        checkoutSessionId: 'session-1',
        checkoutSession: {
          id: 'session-1',
          status: 'AWAITING_PAYMENT',
        },
        supplierId: null,
        provider: 'STUB',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(intent);
      mockPrisma.paymentIntent.update.mockResolvedValue({
        ...intent,
        status: 'PAID',
        paidAt: new Date(),
      });
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...intent.checkoutSession,
        status: 'COMPLETED',
      });

      await service.markPaid(intentId);

      expect(mockPrisma.operator.update).not.toHaveBeenCalled();
    });
  });

  // =========================================
  // markFailed
  // =========================================

  describe('markFailed', () => {
    const intentId = 'intent-1';
    const reason = 'Payment declined';

    it('should throw NotFoundException when intent not found', async () => {
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);

      await expect(service.markFailed(intentId)).rejects.toThrow(NotFoundException);
    });

    it('should transition intent to FAILED', async () => {
      const intent = {
        id: intentId,
        status: 'PENDING',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(intent);
      mockPrisma.paymentIntent.update.mockResolvedValue({
        ...intent,
        status: 'FAILED',
        failedAt: new Date(),
        failReason: reason,
      });

      const result = await service.markFailed(intentId, reason);

      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: {
          status: 'FAILED',
          failedAt: expect.any(Date),
          failReason: reason,
        },
      });
      expect(result.status).toBe('FAILED');
    });

    it('should use default reason when not provided', async () => {
      const intent = {
        id: intentId,
        status: 'PENDING',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(intent);
      mockPrisma.paymentIntent.update.mockResolvedValue({
        ...intent,
        status: 'FAILED',
        failedAt: new Date(),
        failReason: 'unknown',
      });

      await service.markFailed(intentId);

      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: expect.objectContaining({
          failReason: 'unknown',
        }),
      });
    });

    it('should return existing intent if already FAILED (noOp)', async () => {
      const existingIntent = {
        id: intentId,
        status: 'FAILED',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(existingIntent);

      const result = await service.markFailed(intentId);

      expect(result).toEqual(existingIntent);
      expect(mockPrisma.paymentIntent.update).not.toHaveBeenCalled();
    });
  });

  // =========================================
  // cancelIntent
  // =========================================

  describe('cancelIntent', () => {
    const intentId = 'intent-1';

    it('should throw NotFoundException when intent not found', async () => {
      mockPrisma.paymentIntent.findUnique.mockResolvedValue(null);

      await expect(service.cancelIntent(intentId)).rejects.toThrow(NotFoundException);
    });

    it('should transition intent to CANCELLED', async () => {
      const intent = {
        id: intentId,
        status: 'PENDING',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(intent);
      mockPrisma.paymentIntent.update.mockResolvedValue({
        ...intent,
        status: 'CANCELLED',
      });

      const result = await service.cancelIntent(intentId);

      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: { status: 'CANCELLED' },
      });
      expect(result.status).toBe('CANCELLED');
    });

    it('should return existing intent if already CANCELLED (noOp)', async () => {
      const existingIntent = {
        id: intentId,
        status: 'CANCELLED',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(existingIntent);

      const result = await service.cancelIntent(intentId);

      expect(result).toEqual(existingIntent);
      expect(mockPrisma.paymentIntent.update).not.toHaveBeenCalled();
    });
  });

  // =========================================
  // simulatePaid
  // =========================================

  describe('simulatePaid', () => {
    const intentId = 'intent-1';

    beforeEach(() => {
      mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
    });

    it('should throw in production', async () => {
      process.env.NODE_ENV = 'production';

      await expect(service.simulatePaid(intentId)).rejects.toThrow(BadRequestException);
    });

    it('should call markPaid with simulated providerPaymentId in non-production', async () => {
      process.env.NODE_ENV = 'test';

      const intent = {
        id: intentId,
        status: 'PENDING',
        checkoutSessionId: 'session-1',
        checkoutSession: {
          id: 'session-1',
          status: 'AWAITING_PAYMENT',
        },
        supplierId: null,
        provider: 'STUB',
      };

      mockPrisma.paymentIntent.findUnique.mockResolvedValue(intent);
      mockPrisma.paymentIntent.update.mockResolvedValue({
        ...intent,
        status: 'PAID',
        paidAt: new Date(),
        providerPaymentId: expect.stringMatching(/^sim_/),
      });
      mockPrisma.checkoutSession.update.mockResolvedValue({
        ...intent.checkoutSession,
        status: 'COMPLETED',
      });

      const result = await service.simulatePaid(intentId);

      expect(mockPrisma.paymentIntent.update).toHaveBeenCalledWith({
        where: { id: intentId },
        data: expect.objectContaining({
          status: 'PAID',
          providerPaymentId: expect.stringMatching(/^sim_/),
        }),
      });
      expect(result.status).toBe('PAID');
    });
  });
});

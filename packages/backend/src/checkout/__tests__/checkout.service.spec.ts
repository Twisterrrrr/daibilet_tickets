import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from '../checkout.service';

// ---------------------
// Mock factories
// ---------------------

const mockPrisma = {
  event: { findFirst: vi.fn(), findUnique: vi.fn() },
  eventOffer: { findFirst: vi.fn(), findMany: vi.fn() },
  checkoutSession: { create: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
  orderRequest: { create: vi.fn() },
  package: { findUnique: vi.fn() },
  $transaction: vi.fn(),
};

const mockTcApi = {
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  finishOrder: vi.fn(),
};

const mockMailService = {
  sendOrderCreated: vi.fn().mockResolvedValue(true),
};

const mockConfig = {
  get: vi.fn().mockReturnValue(''),
  getOrThrow: vi.fn().mockReturnValue(''),
};

// ---------------------
// Helpers
// ---------------------

/** Minimal valid CartItemDto for tests */
function makeCartItem(overrides: Partial<Record<string, any>> = {}) {
  return {
    eventId: 'e1',
    offerId: 'o1',
    quantity: 1,
    eventTitle: 'Test Event',
    eventSlug: 'test-event',
    priceFrom: 1000,
    purchaseType: 'REQUEST',
    source: 'MANUAL',
    ...overrides,
  };
}

// ---------------------
// Tests
// ---------------------

describe('CheckoutService', () => {
  let service: CheckoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CheckoutService(
      mockPrisma as any,
      mockTcApi as any,
      mockMailService as any,
      mockConfig as any,
    );
  });

  // =========================================
  // validateCart
  // =========================================

  describe('validateCart', () => {
    it('should throw BadRequestException for empty items', async () => {
      await expect(service.validateCart([])).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for null/undefined items', async () => {
      await expect(service.validateCart(null as any)).rejects.toThrow(BadRequestException);
    });

    it('should mark invalid items when offer not found', async () => {
      mockPrisma.eventOffer.findFirst.mockResolvedValue(null);

      const result = await service.validateCart([makeCartItem()]);

      expect(result.items[0].valid).toBe(false);
      expect(result.items[0].currentPrice).toBeNull();
      expect(result.items[0].reason).toBeDefined();
      expect(result.allValid).toBe(false);
    });

    it('should mark invalid items when event is inactive', async () => {
      mockPrisma.eventOffer.findFirst.mockResolvedValue({
        id: 'o1',
        eventId: 'e1',
        status: 'ACTIVE',
        priceFrom: 1000,
        availabilityMode: 'AVAILABLE',
        event: { id: 'e1', title: 'Test', slug: 'test', imageUrl: null, isActive: false },
      });

      const result = await service.validateCart([makeCartItem()]);

      expect(result.items[0].valid).toBe(false);
      expect(result.items[0].reason).toContain('неактивно');
      expect(result.allValid).toBe(false);
    });

    it('should mark invalid items when sold out', async () => {
      mockPrisma.eventOffer.findFirst.mockResolvedValue({
        id: 'o1',
        eventId: 'e1',
        status: 'ACTIVE',
        priceFrom: 1000,
        availabilityMode: 'SOLD_OUT',
        event: { id: 'e1', title: 'Test', slug: 'test', imageUrl: null, isActive: true },
      });

      const result = await service.validateCart([makeCartItem()]);

      expect(result.items[0].valid).toBe(false);
      expect(result.items[0].reason).toContain('Распродано');
      expect(result.items[0].currentPrice).toBe(1000);
    });

    it('should return valid items with current prices', async () => {
      mockPrisma.eventOffer.findFirst.mockResolvedValue({
        id: 'o1',
        eventId: 'e1',
        status: 'ACTIVE',
        priceFrom: 1500, // price updated since user added to cart
        availabilityMode: 'AVAILABLE',
        event: { id: 'e1', title: 'Updated Title', slug: 'test', imageUrl: 'img.jpg', isActive: true },
      });

      const result = await service.validateCart([makeCartItem({ quantity: 2, priceFrom: 1000 })]);

      expect(result.items[0].valid).toBe(true);
      expect(result.items[0].currentPrice).toBe(1500);
      expect(result.items[0].eventTitle).toBe('Updated Title');
      expect(result.allValid).toBe(true);
      expect(result.totalPrice).toBe(3000); // 1500 * 2
    });

    it('should calculate totalPrice only from valid items', async () => {
      // First item: valid
      mockPrisma.eventOffer.findFirst
        .mockResolvedValueOnce({
          id: 'o1',
          eventId: 'e1',
          status: 'ACTIVE',
          priceFrom: 1000,
          availabilityMode: 'AVAILABLE',
          event: { id: 'e1', title: 'Good Event', slug: 'good', imageUrl: null, isActive: true },
        })
        // Second item: not found
        .mockResolvedValueOnce(null);

      const result = await service.validateCart([
        makeCartItem({ offerId: 'o1', quantity: 2 }),
        makeCartItem({ offerId: 'o2', eventId: 'e2' }),
      ]);

      expect(result.allValid).toBe(false);
      expect(result.totalPrice).toBe(2000); // only valid item: 1000 * 2
    });
  });

  // =========================================
  // createCheckoutSession
  // =========================================

  describe('createCheckoutSession', () => {
    const validItem = makeCartItem();
    const customer = { name: 'John', email: 'john@test.com', phone: '+79991234567' };

    beforeEach(() => {
      // validateCart will pass: findFirst returns a valid offer
      mockPrisma.eventOffer.findFirst.mockResolvedValue({
        id: 'o1',
        eventId: 'e1',
        status: 'ACTIVE',
        priceFrom: 1000,
        availabilityMode: 'AVAILABLE',
        event: { id: 'e1', title: 'Test Event', slug: 'test-event', imageUrl: null, isActive: true },
      });

      // Offers snapshot
      mockPrisma.eventOffer.findMany.mockResolvedValue([{
        id: 'o1',
        eventId: 'e1',
        source: 'MANUAL',
        purchaseType: 'REQUEST',
        priceFrom: 1000,
        deeplink: null,
        widgetProvider: null,
        widgetPayload: null,
        badge: null,
        meetingPoint: null,
        meetingInstructions: null,
        operationalPhone: null,
        operationalNote: null,
        event: { id: 'e1', title: 'Test Event', slug: 'test-event', imageUrl: null },
        operator: { id: 'op-1', name: 'Test Op' },
      }]);

      // Transaction: execute callback with mock tx
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          checkoutSession: {
            create: vi.fn().mockResolvedValue({
              id: 'session-1',
              status: 'PENDING_CONFIRMATION',
              totalPrice: 1000,
              expiresAt: new Date(Date.now() + 30 * 60_000),
            }),
          },
          orderRequest: {
            create: vi.fn().mockResolvedValue({ id: 'or-1' }),
          },
        });
      });
    });

    it('should throw BadRequestException for empty items', async () => {
      await expect(
        service.createCheckoutSession({ items: [], customer }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create session with PENDING_CONFIRMATION status for REQUEST items', async () => {
      const result = await service.createCheckoutSession({
        items: [validItem],
        customer,
      });

      expect(result.sessionId).toBe('session-1');
      expect(result.status).toBe('PENDING_CONFIRMATION');
      expect((result as any).requestItems).toBe(1);
    });

    it('should create session with REDIRECTED status for REDIRECT-only items', async () => {
      const redirectItem = makeCartItem({ purchaseType: 'REDIRECT', deeplink: 'https://example.com' });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          checkoutSession: {
            create: vi.fn().mockResolvedValue({
              id: 'session-2',
              status: 'REDIRECTED',
              totalPrice: 1000,
              expiresAt: new Date(Date.now() + 30 * 60_000),
            }),
          },
          orderRequest: {
            create: vi.fn(),
          },
        });
      });

      const result = await service.createCheckoutSession({
        items: [redirectItem],
        customer,
      });

      expect(result.status).toBe('REDIRECTED');
      expect((result as any).requestItems).toBe(0);
      expect((result as any).redirectItems).toHaveLength(1);
    });

    it('should send order-created email on successful creation', async () => {
      await service.createCheckoutSession({
        items: [validItem],
        customer,
      });

      expect(mockMailService.sendOrderCreated).toHaveBeenCalledWith(
        'john@test.com',
        expect.objectContaining({
          customerName: 'John',
        }),
      );
    });

    it('should not throw when email sending fails', async () => {
      mockMailService.sendOrderCreated.mockRejectedValue(new Error('SMTP error'));

      // Should NOT reject even though mail fails (fire-and-forget with .catch)
      const result = await service.createCheckoutSession({
        items: [validItem],
        customer,
      });

      expect(result.sessionId).toBe('session-1');
    });

    it('should include shortCode in result', async () => {
      const result = await service.createCheckoutSession({
        items: [validItem],
        customer,
      });

      expect(result.shortCode).toBeDefined();
      expect(result.shortCode).toMatch(/^CS-/);
    });
  });
});

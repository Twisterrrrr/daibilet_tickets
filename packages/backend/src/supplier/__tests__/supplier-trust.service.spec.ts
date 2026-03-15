import { describe, expect, it, beforeEach, vi } from 'vitest';

import { SupplierTrustService } from '../supplier-trust.service';

// Минимальный мок PrismaService только с теми методами, которые используются в тестах.
class PrismaMock {
  operator = {
    findUnique: vi.fn(),
    update: vi.fn(),
  };

  event = {
    count: vi.fn(),
  };

  paymentIntent = {
    count: vi.fn(),
  };

  review = {
    findMany: vi.fn(),
  };
}

describe('SupplierTrustService', () => {
  let prisma: PrismaMock;
  let service: SupplierTrustService;

  beforeEach(() => {
    prisma = new PrismaMock();
    service = new SupplierTrustService(prisma as any);
  });

  it('maps score to trust level by ranges', () => {
    expect(service.mapScoreToLevel(0)).toBe(0);
    expect(service.mapScoreToLevel(24)).toBe(0);
    expect(service.mapScoreToLevel(25)).toBe(1);
    expect(service.mapScoreToLevel(49)).toBe(1);
    expect(service.mapScoreToLevel(50)).toBe(2);
    expect(service.mapScoreToLevel(74)).toBe(2);
    expect(service.mapScoreToLevel(75)).toBe(3);
    expect(service.mapScoreToLevel(100)).toBe(3);
  });

  it('returns active events limit by trust level', () => {
    expect(service.getActiveEventsLimitByTrustLevel(0)).toBe(5);
    expect(service.getActiveEventsLimitByTrustLevel(1)).toBe(10);
    expect(service.getActiveEventsLimitByTrustLevel(2)).toBe(25);
    expect(service.getActiveEventsLimitByTrustLevel(3)).toBe(50);
    expect(service.getActiveEventsLimitByTrustLevel(10)).toBe(50);
  });

  it('assertSupplierCanActivateEvent passes when below limit', async () => {
    prisma.operator.findUnique.mockResolvedValue({ id: 'op1', trustLevel: 1 });
    prisma.event.count.mockResolvedValue(5); // limit for level 1 is 10

    await expect(service.assertSupplierCanActivateEvent('op1')).resolves.toBeUndefined();
  });

  it('assertSupplierCanActivateEvent throws when limit reached', async () => {
    prisma.operator.findUnique.mockResolvedValue({ id: 'op1', trustLevel: 0 });
    prisma.event.count.mockResolvedValue(5); // limit for level 0 is 5

    await expect(service.assertSupplierCanActivateEvent('op1')).rejects.toMatchObject({
      response: {
        message: 'Достигнут лимит активных событий для текущего уровня доверия.',
        code: 'SUPPLIER_ACTIVE_EVENTS_LIMIT_REACHED',
      },
    });
  });
});


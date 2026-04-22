import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { RoutePointTargetType } from '@/prisma-client';

import { AdminEventRouteService } from '../admin-event-route.service';

describe('AdminEventRouteService helpers', () => {
  const cache = { invalidateEventById: vi.fn() };
  const prisma = {} as any;
  const svc = new AdminEventRouteService(prisma, cache as any);

  it('normalizeOrders sorts and reindexes from 0', () => {
    const n = (svc as any).normalizeOrders([
      { order: 10, targetType: RoutePointTargetType.VENUE, venueId: 'a' },
      { order: 2, targetType: RoutePointTargetType.EVENT, eventId: 'b' },
    ]);
    expect(n[0].order).toBe(0);
    expect(n[1].order).toBe(1);
  });

  it('assertPointTarget rejects XOR violations', () => {
    expect(() =>
      (svc as any).assertPointTarget(RoutePointTargetType.VENUE, null, 'x'),
    ).toThrow(BadRequestException);
    expect(() =>
      (svc as any).assertPointTarget(RoutePointTargetType.EVENT, 'v', 'e'),
    ).toThrow(BadRequestException);
  });
});

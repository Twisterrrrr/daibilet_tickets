/**
 * Проверка аргументов Prisma для GET /admin/venues (сортировка до пагинации).
 */
import { describe, expect, it, vi } from 'vitest';

import { PrismaService } from '../../prisma/prisma.service';
import { PublishGateService } from '../../catalog/publish-gate.service';
import { VenueImportService } from '../../catalog/venue-import.service';
import { VenueLifecycleService } from '../../catalog/venue-lifecycle.service';
import { SubcategoryAssignmentService } from '../../subcategories/subcategory-assignment.service';
import { SubcategoryPolicyService } from '../../subcategories/subcategory-policy.service';
import { VenueAdminSummaryService } from '../venue-admin-summary.service';
import { AdminVenuesController } from '../admin-venues.controller';

function createController(prisma: PrismaService) {
  return new AdminVenuesController(
    prisma,
    {} as VenueAdminSummaryService,
    {} as SubcategoryPolicyService,
    {} as SubcategoryAssignmentService,
    {} as PublishGateService,
    {} as VenueImportService,
    {} as VenueLifecycleService,
  );
}

describe('AdminVenuesController.list', () => {
  it('sort=confidenceScore&order=desc: orderBy с nulls last до findMany', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { venue: { findMany, count } } as unknown as PrismaService;
    const c = createController(prisma);

    await c.list(
      undefined,
      '1',
      '20',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'confidenceScore',
      'desc',
    );

    expect(findMany).toHaveBeenCalledTimes(1);
    const arg = findMany.mock.calls[0]![0] as { orderBy: unknown; where: unknown; skip: number; take: number };
    expect(arg.orderBy).toEqual([
      { confidenceScore: { sort: 'desc', nulls: 'last' } },
      { updatedAt: 'desc' },
    ]);
    expect(arg.skip).toBe(0);
    expect(arg.take).toBe(21);
  });

  it('sort=confidenceScore&order=asc: nulls last', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { venue: { findMany, count } } as unknown as PrismaService;
    const c = createController(prisma);

    await c.list(
      undefined,
      '2',
      '10',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'confidenceScore',
      'asc',
    );

    const arg = findMany.mock.calls[0]![0] as { orderBy: unknown; skip: number };
    expect(arg.orderBy).toEqual([
      { confidenceScore: { sort: 'asc', nulls: 'last' } },
      { updatedAt: 'desc' },
    ]);
    expect(arg.skip).toBe(10);
  });

  it('needsReview=true не ломает сортировку по confidence', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { venue: { findMany, count } } as unknown as PrismaService;
    const c = createController(prisma);

    await c.list(
      undefined,
      '1',
      '20',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'true',
      'confidenceScore',
      'desc',
    );

    const arg = findMany.mock.calls[0]![0] as { orderBy: unknown; where: { needsReview?: boolean } };
    expect(arg.where.needsReview).toBe(true);
    expect(arg.orderBy).toEqual([
      { confidenceScore: { sort: 'desc', nulls: 'last' } },
      { updatedAt: 'desc' },
    ]);
  });

  it('cursor: фиксированный порядок, без кастомного sort', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { venue: { findMany, count } } as unknown as PrismaService;
    const c = createController(prisma);

    await c.list(
      'cursor-uuid',
      '1',
      '20',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'confidenceScore',
      'desc',
    );

    const arg = findMany.mock.calls[0]![0] as { orderBy: unknown };
    expect(arg.orderBy).toEqual([{ updatedAt: 'desc' }, { id: 'desc' }]);
  });

  it('readinessStatus=BLOCKED: where включает lifecycleStatus MERGED|REJECTED', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = { venue: { findMany, count } } as unknown as PrismaService;
    const c = createController(prisma);

    await c.list(
      undefined,
      '1',
      '20',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'updatedAt',
      'desc',
      undefined,
      undefined,
      undefined,
      'BLOCKED',
    );

    const arg = findMany.mock.calls[0]![0] as { where: { lifecycleStatus?: unknown } };
    expect(arg.where.lifecycleStatus).toEqual({ in: ['MERGED', 'REJECTED'] });
  });
});
